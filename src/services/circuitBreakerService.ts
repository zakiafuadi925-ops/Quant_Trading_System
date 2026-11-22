import { broadcastTradeAlert } from './webhookService.js';
import { PaperPositionModel } from '../db/models/PaperPosition.js';
import { PaperOrderModel } from '../db/models/PaperOrder.js';
import { connectToDatabase } from '../db/mongodb.js';
import { closePositionInDb } from '../controllers/paperTradingController.js';

export type CircuitBreakerState = 'NORMAL' | 'TRIGGERED' | 'HALTED';

export interface CircuitBreakerStatus {
  state: CircuitBreakerState;
  maxHourlyDrawdownPct: number;
  currentDrawdownPct: number;
  consecutiveLosses: number;
  maxConsecutiveLosses: number;
  lastTriggeredAt: number | null;
  triggerReason: string | null;
  tradingAllowed: boolean;
}

// In-memory circuit breaker state store (per account)
const circuitBreakerMap = new Map<string, CircuitBreakerStatus>();

const DEFAULT_DRAWDOWN_LIMIT_PCT = 5.0; // 5% maximum 1-hour drawdown
const DEFAULT_CONSECUTIVE_LOSS_LIMIT = 4;

function getOrCreateCircuitStatus(accountId: string): CircuitBreakerStatus {
  let status = circuitBreakerMap.get(accountId);
  if (!status) {
    status = {
      state: 'NORMAL',
      maxHourlyDrawdownPct: DEFAULT_DRAWDOWN_LIMIT_PCT,
      currentDrawdownPct: 0,
      consecutiveLosses: 0,
      maxConsecutiveLosses: DEFAULT_CONSECUTIVE_LOSS_LIMIT,
      lastTriggeredAt: null,
      triggerReason: null,
      tradingAllowed: true
    };
    circuitBreakerMap.set(accountId, status);
  }
  return status;
}

/**
 * Checks risk thresholds and automatically trips the circuit breaker if drawdown breaches limit.
 */
export async function evaluateRiskThresholds(
  accountId: string,
  currentEquity: number,
  hourlyStartEquity: number
): Promise<{ breached: boolean; drawdownPct: number; status: CircuitBreakerStatus }> {
  const status = getOrCreateCircuitStatus(accountId);

  if (status.state === 'HALTED' || status.state === 'TRIGGERED') {
    return { breached: true, drawdownPct: status.currentDrawdownPct, status };
  }

  const drawdownPct =
    hourlyStartEquity > 0
      ? ((hourlyStartEquity - currentEquity) / hourlyStartEquity) * 100
      : 0;

  status.currentDrawdownPct = Math.max(0, Number(drawdownPct.toFixed(2)));

  if (status.currentDrawdownPct >= status.maxHourlyDrawdownPct) {
    await triggerEmergencyKillSwitch(
      accountId,
      `HOURLY_DRAWDOWN_BREACH: Drawdown reached ${status.currentDrawdownPct}% (Limit: ${status.maxHourlyDrawdownPct}%)`
    );
    return { breached: true, drawdownPct: status.currentDrawdownPct, status };
  }

  return { breached: false, drawdownPct: status.currentDrawdownPct, status };
}

/**
 * Institutional Safety Kill-Switch:
 * 1. Cancels all pending orders.
 * 2. Panic-closes all open positions at market price.
 * 3. Halts new trading requests.
 * 4. Dispatches high-priority alert via Telegram & Discord.
 */
export async function triggerEmergencyKillSwitch(
  accountId: string,
  reason: string
): Promise<{
  canceledOrdersCount: number;
  closedPositionsCount: number;
  reason: string;
  state: CircuitBreakerState;
}> {
  const status = getOrCreateCircuitStatus(accountId);
  status.state = 'HALTED';
  status.tradingAllowed = false;
  status.lastTriggeredAt = Date.now();
  status.triggerReason = reason;

  let canceledOrdersCount = 0;
  let closedPositionsCount = 0;

  try {
    const db = await connectToDatabase();
    if (db) {
      // 1. Cancel all open orders
      const cancelRes = await PaperOrderModel.updateMany(
        { accountId, status: 'PENDING' },
        { status: 'CANCELLED' }
      );
      canceledOrdersCount = cancelRes.modifiedCount || 0;

      // 2. Panic-close all active positions
      const openPositions = await PaperPositionModel.find({ accountId });
      for (const pos of openPositions) {
        await closePositionInDb(
          pos.positionId,
          pos.markPrice || pos.entryPrice,
          'CIRCUIT_BREAKER_PANIC_CLOSE',
          accountId
        );
        closedPositionsCount++;
      }
    }
  } catch (err) {
    console.error('[Circuit Breaker Execution Error]:', err);
  }

  // 3. Dispatch critical alert to Telegram / Discord
  broadcastTradeAlert({
    title: '🚨 INSTITUTIONAL CIRCUIT BREAKER ACTIVATED!',
    symbol: 'ALL',
    side: 'SELL',
    price: 0,
    reason: `EMERGENCY_KILL_SWITCH: ${reason}`
  }).catch(() => {});

  return {
    canceledOrdersCount,
    closedPositionsCount,
    reason,
    state: status.state
  };
}

/**
 * Resets the circuit breaker and resumes normal trading mode.
 */
export function resetCircuitBreaker(accountId: string): CircuitBreakerStatus {
  const status = getOrCreateCircuitStatus(accountId);
  status.state = 'NORMAL';
  status.currentDrawdownPct = 0;
  status.consecutiveLosses = 0;
  status.lastTriggeredAt = null;
  status.triggerReason = null;
  status.tradingAllowed = true;
  return status;
}

/**
 * Gets current circuit breaker status for an account.
 */
export function getCircuitBreakerStatus(accountId: string): CircuitBreakerStatus {
  return getOrCreateCircuitStatus(accountId);
}
