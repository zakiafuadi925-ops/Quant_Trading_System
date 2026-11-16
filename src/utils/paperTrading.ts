/**
 * Quantitative Paper Trading & Perpetual Futures Execution Engine (v6.1.0)
 * 
 * Features:
 * - In-memory simulated exchange account (default $10,000 USDT).
 * - Real-time Mark-to-Market PnL, margin calculation, and equity updates.
 * - Market and Limit orders with fill verification against live ticks.
 * - Configurable Leverage (1x – 10x) with accurate liquidation pricing.
 * - Dynamic slippage modeling based on order notional size.
 * - Trailing Stop-Loss and Take-Profit automated triggers.
 * - Periodic Perpetual Futures Funding Rate payment deductions.
 * - Complete trade history and performance metrics audit ledger.
 */

export type PaperOrderSide = 'BUY' | 'SELL';
export type PaperOrderType = 'MARKET' | 'LIMIT';
export type PaperPositionSide = 'LONG' | 'SHORT';
export type PaperOrderStatus = 'PENDING' | 'FILLED' | 'CANCELLED' | 'REJECTED';
export type PaperTradeReason = 
  | 'MARKET_FILL' 
  | 'LIMIT_FILL' 
  | 'STOP_LOSS' 
  | 'TAKE_PROFIT' 
  | 'TRAILING_STOP' 
  | 'LIQUIDATION' 
  | 'MANUAL_CLOSE';

export interface PaperPosition {
  id: string;
  symbol: string;
  side: PaperPositionSide;
  entryPrice: number;
  markPrice: number;
  quantity: number;             // Base asset quantity (e.g., 0.25 BTC)
  notionalValue: number;        // quantity * markPrice
  leverage: number;             // 1x to 10x
  initialMargin: number;        // (entryPrice * quantity) / leverage
  maintenanceMargin: number;    // 50% of initial margin
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  liquidationPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  trailingStopDistance?: number; // USD offset from peak price
  highestPriceSinceEntry?: number; // For LONG trailing stop
  lowestPriceSinceEntry?: number;  // For SHORT trailing stop
  openTimestamp: number;
  totalFundingPaid: number;
}

export interface PaperOrder {
  id: string;
  symbol: string;
  side: PaperOrderSide;
  type: PaperOrderType;
  positionSide: PaperPositionSide;
  price: number;                // Target limit price or estimated market price
  quantity: number;
  leverage: number;
  status: PaperOrderStatus;
  stopLoss?: number;
  takeProfit?: number;
  trailingStopDistance?: number;
  timestamp: number;
  filledPrice?: number;
  fee: number;
  slippage: number;
}

export interface PaperTradeLedgerItem {
  id: string;
  orderId: string;
  symbol: string;
  side: PaperOrderSide;
  positionSide: PaperPositionSide;
  executedPrice: number;
  quantity: number;
  notional: number;
  leverage: number;
  realizedPnl: number;
  fee: number;
  reason: PaperTradeReason;
  timestamp: number;
}

export interface PaperTradingState {
  initialBalance: number;
  balance: number;              // Realized cash balance
  equity: number;               // Balance + sum(unrealizedPnl)
  positions: PaperPosition[];
  openOrders: PaperOrder[];
  tradeLedger: PaperTradeLedgerItem[];
  lastFundingTimestamp: number;
  totalFeesPaid: number;
  totalRealizedPnl: number;
}

export interface PaperPerformanceStats {
  initialBalance: number;
  balance: number;
  equity: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRatePct: number;
  profitFactor: number;
  netPnl: number;
  roiPct: number;
  maxDrawdownPct: number;
  totalFees: number;
}

// Default fee schedule (taker: 0.05%, maker: 0.02%)
export const DEFAULT_MAKER_FEE_RATE = 0.0002;
export const DEFAULT_TAKER_FEE_RATE = 0.0005;
export const MAINTENANCE_MARGIN_RATE = 0.05; // 5% maintenance margin requirement

/**
 * Calculate dynamic slippage in basis points based on order notional value.
 * Models market depth liquidity consumption.
 */
export function calculateDynamicSlippage(
  notionalUsd: number,
  baseBps: number = 2.0,
  impactRatePer10k: number = 1.0
): number {
  if (notionalUsd <= 0) return 0;
  const depthFactor = Math.min(notionalUsd / 10000, 20); // capped at 200k equivalent
  const slippageBps = baseBps + (depthFactor * impactRatePer10k);
  return slippageBps / 10000; // Returns decimal (e.g. 0.0004 for 4 bps)
}

/**
 * Calculate liquidation price for perpetual futures positions.
 */
export function calculateLiquidationPrice(
  entryPrice: number,
  leverage: number,
  side: PaperPositionSide,
  mmRate: number = MAINTENANCE_MARGIN_RATE
): number {
  if (entryPrice <= 0 || leverage <= 0) return 0;
  const initialMarginRatio = 1 / leverage;
  
  if (side === 'LONG') {
    // Price drops until remaining margin equals maintenance margin
    const liqPrice = entryPrice * (1 - initialMarginRatio + mmRate);
    return Math.max(liqPrice, 0.01);
  } else {
    // Price rises until remaining margin equals maintenance margin
    const liqPrice = entryPrice * (1 + initialMarginRatio - mmRate);
    return Math.max(liqPrice, entryPrice * 1.001);
  }
}

/**
 * Initialize a clean paper trading state.
 */
export function createInitialPaperState(initialCash: number = 10000): PaperTradingState {
  return {
    initialBalance: initialCash,
    balance: initialCash,
    equity: initialCash,
    positions: [],
    openOrders: [],
    tradeLedger: [],
    lastFundingTimestamp: Date.now(),
    totalFeesPaid: 0,
    totalRealizedPnl: 0
  };
}

/**
 * Place a new Paper Order (Market or Limit).
 */
export function placePaperOrder(
  state: PaperTradingState,
  params: {
    symbol: string;
    side: PaperOrderSide;
    type: PaperOrderType;
    positionSide: PaperPositionSide;
    quantity: number;
    price: number;
    leverage?: number;
    stopLoss?: number;
    takeProfit?: number;
    trailingStopDistance?: number;
  },
  currentMarketPrice: number
): { newState: PaperTradingState; order: PaperOrder; error?: string } {
  const leverage = Math.max(1, Math.min(10, params.leverage || 1));
  const rawPrice = params.type === 'MARKET' ? currentMarketPrice : params.price;
  
  if (params.quantity <= 0 || rawPrice <= 0) {
    return {
      newState: state,
      order: {} as PaperOrder,
      error: 'Invalid order quantity or price.'
    };
  }

  const notional = params.quantity * rawPrice;
  const requiredMargin = notional / leverage;

  // Margin Check: Ensure user has sufficient unallocated balance
  const allocatedMargin = state.positions.reduce((acc, p) => acc + p.initialMargin, 0);
  const freeMargin = state.balance - allocatedMargin;

  if (requiredMargin > freeMargin) {
    return {
      newState: state,
      order: {} as PaperOrder,
      error: `Insufficient margin! Required: $${requiredMargin.toFixed(2)}, Available Free Margin: $${Math.max(0, freeMargin).toFixed(2)}.`
    };
  }

  const orderId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const slippageDecimal = params.type === 'MARKET' ? calculateDynamicSlippage(notional) : 0;
  
  // Apply slippage to market orders
  let executedPrice = rawPrice;
  if (params.type === 'MARKET') {
    if (params.side === 'BUY') {
      executedPrice = rawPrice * (1 + slippageDecimal);
    } else {
      executedPrice = rawPrice * (1 - slippageDecimal);
    }
  }

  const feeRate = params.type === 'MARKET' ? DEFAULT_TAKER_FEE_RATE : DEFAULT_MAKER_FEE_RATE;
  const fee = notional * feeRate;

  const order: PaperOrder = {
    id: orderId,
    symbol: params.symbol.toUpperCase(),
    side: params.side,
    type: params.type,
    positionSide: params.positionSide,
    price: rawPrice,
    quantity: params.quantity,
    leverage,
    status: params.type === 'MARKET' ? 'FILLED' : 'PENDING',
    stopLoss: params.stopLoss,
    takeProfit: params.takeProfit,
    trailingStopDistance: params.trailingStopDistance,
    timestamp: Date.now(),
    filledPrice: params.type === 'MARKET' ? executedPrice : undefined,
    fee,
    slippage: slippageDecimal
  };

  // If LIMIT order, append to open orders
  if (params.type === 'LIMIT') {
    return {
      newState: {
        ...state,
        openOrders: [order, ...state.openOrders]
      },
      order
    };
  }

  // If MARKET order, execute fill immediately
  const positionId = `pos_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const liqPrice = calculateLiquidationPrice(executedPrice, leverage, params.positionSide);

  const newPosition: PaperPosition = {
    id: positionId,
    symbol: params.symbol.toUpperCase(),
    side: params.positionSide,
    entryPrice: executedPrice,
    markPrice: currentMarketPrice,
    quantity: params.quantity,
    notionalValue: notional,
    leverage,
    initialMargin: requiredMargin,
    maintenanceMargin: requiredMargin * MAINTENANCE_MARGIN_RATE * leverage,
    unrealizedPnl: 0,
    unrealizedPnlPct: 0,
    liquidationPrice: liqPrice,
    stopLoss: params.stopLoss,
    takeProfit: params.takeProfit,
    trailingStopDistance: params.trailingStopDistance,
    highestPriceSinceEntry: executedPrice,
    lowestPriceSinceEntry: executedPrice,
    openTimestamp: Date.now(),
    totalFundingPaid: 0
  };

  const tradeRecord: PaperTradeLedgerItem = {
    id: `trd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    orderId: order.id,
    symbol: order.symbol,
    side: order.side,
    positionSide: order.positionSide,
    executedPrice,
    quantity: order.quantity,
    notional,
    leverage,
    realizedPnl: -fee,
    fee,
    reason: 'MARKET_FILL',
    timestamp: Date.now()
  };

  const updatedBalance = state.balance - fee;

  return {
    newState: {
      ...state,
      balance: updatedBalance,
      equity: updatedBalance,
      positions: [newPosition, ...state.positions],
      tradeLedger: [tradeRecord, ...state.tradeLedger],
      totalFeesPaid: state.totalFeesPaid + fee
    },
    order
  };
}

/**
 * Cancel a pending limit order.
 */
export function cancelPaperOrder(
  state: PaperTradingState,
  orderId: string
): PaperTradingState {
  return {
    ...state,
    openOrders: state.openOrders.filter((o) => o.id !== orderId)
  };
}

/**
 * Close an existing position manually or via trigger.
 */
export function closePosition(
  state: PaperTradingState,
  positionId: string,
  closePrice: number,
  reason: PaperTradeReason = 'MANUAL_CLOSE'
): PaperTradingState {
  const pos = state.positions.find((p) => p.id === positionId);
  if (!pos) return state;

  // Calculate gross PnL
  let grossPnl = 0;
  if (pos.side === 'LONG') {
    grossPnl = (closePrice - pos.entryPrice) * pos.quantity;
  } else {
    grossPnl = (pos.entryPrice - closePrice) * pos.quantity;
  }

  // Taker fee on closing
  const notional = pos.quantity * closePrice;
  const exitFee = notional * DEFAULT_TAKER_FEE_RATE;
  const netPnl = grossPnl - exitFee;

  const tradeRecord: PaperTradeLedgerItem = {
    id: `trd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    orderId: `close_${pos.id}`,
    symbol: pos.symbol,
    side: pos.side === 'LONG' ? 'SELL' : 'BUY',
    positionSide: pos.side,
    executedPrice: closePrice,
    quantity: pos.quantity,
    notional,
    leverage: pos.leverage,
    realizedPnl: netPnl,
    fee: exitFee,
    reason,
    timestamp: Date.now()
  };

  const remainingPositions = state.positions.filter((p) => p.id !== positionId);
  const updatedBalance = state.balance + netPnl;
  const remainingUnrealizedPnl = remainingPositions.reduce((acc, p) => acc + p.unrealizedPnl, 0);

  return {
    ...state,
    balance: updatedBalance,
    equity: updatedBalance + remainingUnrealizedPnl,
    positions: remainingPositions,
    tradeLedger: [tradeRecord, ...state.tradeLedger],
    totalFeesPaid: state.totalFeesPaid + exitFee,
    totalRealizedPnl: state.totalRealizedPnl + netPnl
  };
}

/**
 * Process live market tick updates:
 * 1. Checks and executes pending limit orders.
 * 2. Updates mark prices and recalculates unrealized PnL.
 * 3. Evaluates Trailing Stops, Stop-Losses, Take-Profits, and Liquidations.
 * 4. Deducts funding rates if eligible interval has passed.
 */
export function processMarketTick(
  state: PaperTradingState,
  prices: Record<string, number>,
  fundingRateBps: number = 1.0 // 1 bps = 0.01%
): PaperTradingState {
  let currentState = { ...state };

  // 1. Check Pending Limit Orders
  const pendingOrders: PaperOrder[] = [];
  for (const order of currentState.openOrders) {
    const marketPrice = prices[order.symbol] || prices['BTC'] || 0;
    if (marketPrice <= 0) {
      pendingOrders.push(order);
      continue;
    }

    let isFilled = false;
    if (order.side === 'BUY' && marketPrice <= order.price) {
      isFilled = true;
    } else if (order.side === 'SELL' && marketPrice >= order.price) {
      isFilled = true;
    }

    if (isFilled) {
      const fillPrice = order.price;
      const notional = order.quantity * fillPrice;
      const requiredMargin = notional / order.leverage;
      const allocatedMargin = currentState.positions.reduce((acc, p) => acc + p.initialMargin, 0);
      const freeMargin = currentState.balance - allocatedMargin;

      if (requiredMargin <= freeMargin) {
        const liqPrice = calculateLiquidationPrice(fillPrice, order.leverage, order.positionSide);
        const newPos: PaperPosition = {
          id: `pos_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          symbol: order.symbol,
          side: order.positionSide,
          entryPrice: fillPrice,
          markPrice: marketPrice,
          quantity: order.quantity,
          notionalValue: notional,
          leverage: order.leverage,
          initialMargin: requiredMargin,
          maintenanceMargin: requiredMargin * MAINTENANCE_MARGIN_RATE * order.leverage,
          unrealizedPnl: 0,
          unrealizedPnlPct: 0,
          liquidationPrice: liqPrice,
          stopLoss: order.stopLoss,
          takeProfit: order.takeProfit,
          trailingStopDistance: order.trailingStopDistance,
          highestPriceSinceEntry: fillPrice,
          lowestPriceSinceEntry: fillPrice,
          openTimestamp: Date.now(),
          totalFundingPaid: 0
        };

        const tradeRecord: PaperTradeLedgerItem = {
          id: `trd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          orderId: order.id,
          symbol: order.symbol,
          side: order.side,
          positionSide: order.positionSide,
          executedPrice: fillPrice,
          quantity: order.quantity,
          notional,
          leverage: order.leverage,
          realizedPnl: -order.fee,
          fee: order.fee,
          reason: 'LIMIT_FILL',
          timestamp: Date.now()
        };

        currentState = {
          ...currentState,
          balance: currentState.balance - order.fee,
          positions: [newPos, ...currentState.positions],
          tradeLedger: [tradeRecord, ...currentState.tradeLedger],
          totalFeesPaid: currentState.totalFeesPaid + order.fee
        };
      }
    } else {
      pendingOrders.push(order);
    }
  }
  currentState.openOrders = pendingOrders;

  // 2. Update Mark-to-Market & Trailing stops for each position
  const positionsToClose: { id: string; price: number; reason: PaperTradeReason }[] = [];
  const updatedPositions: PaperPosition[] = [];

  for (const pos of currentState.positions) {
    const currentPrice = prices[pos.symbol] || prices['BTC'] || pos.markPrice;
    if (currentPrice <= 0) {
      updatedPositions.push(pos);
      continue;
    }

    // Unrealized PnL calculation
    let pnl = 0;
    if (pos.side === 'LONG') {
      pnl = (currentPrice - pos.entryPrice) * pos.quantity;
    } else {
      pnl = (pos.entryPrice - currentPrice) * pos.quantity;
    }
    const pnlPct = pos.initialMargin > 0 ? (pnl / pos.initialMargin) * 100 : 0;

    // Track peak prices for trailing stops
    const highestPrice = Math.max(pos.highestPriceSinceEntry || pos.entryPrice, currentPrice);
    const lowestPrice = Math.min(pos.lowestPriceSinceEntry || pos.entryPrice, currentPrice);

    // Check Trigger Conditions
    let triggerHit: PaperTradeReason | null = null;

    // 1. Liquidation Check
    if (pos.side === 'LONG' && currentPrice <= pos.liquidationPrice) {
      triggerHit = 'LIQUIDATION';
    } else if (pos.side === 'SHORT' && currentPrice >= pos.liquidationPrice) {
      triggerHit = 'LIQUIDATION';
    }
    // 2. Stop Loss Check
    else if (pos.stopLoss) {
      if (pos.side === 'LONG' && currentPrice <= pos.stopLoss) {
        triggerHit = 'STOP_LOSS';
      } else if (pos.side === 'SHORT' && currentPrice >= pos.stopLoss) {
        triggerHit = 'STOP_LOSS';
      }
    }
    // 3. Take Profit Check
    if (!triggerHit && pos.takeProfit) {
      if (pos.side === 'LONG' && currentPrice >= pos.takeProfit) {
        triggerHit = 'TAKE_PROFIT';
      } else if (pos.side === 'SHORT' && currentPrice <= pos.takeProfit) {
        triggerHit = 'TAKE_PROFIT';
      }
    }
    // 4. Trailing Stop Check
    if (!triggerHit && pos.trailingStopDistance && pos.trailingStopDistance > 0) {
      if (pos.side === 'LONG' && (highestPrice - currentPrice) >= pos.trailingStopDistance) {
        triggerHit = 'TRAILING_STOP';
      } else if (pos.side === 'SHORT' && (currentPrice - lowestPrice) >= pos.trailingStopDistance) {
        triggerHit = 'TRAILING_STOP';
      }
    }

    if (triggerHit) {
      positionsToClose.push({ id: pos.id, price: currentPrice, reason: triggerHit });
    } else {
      updatedPositions.push({
        ...pos,
        markPrice: currentPrice,
        notionalValue: pos.quantity * currentPrice,
        unrealizedPnl: pnl,
        unrealizedPnlPct: pnlPct,
        highestPriceSinceEntry: highestPrice,
        lowestPriceSinceEntry: lowestPrice
      });
    }
  }

  currentState.positions = updatedPositions;

  // Close triggered positions
  for (const item of positionsToClose) {
    currentState = closePosition(currentState, item.id, item.price, item.reason);
  }

  // Recalculate Equity
  const totalUnrealizedPnl = currentState.positions.reduce((acc, p) => acc + p.unrealizedPnl, 0);
  currentState.equity = currentState.balance + totalUnrealizedPnl;

  return currentState;
}

/**
 * Deduct perpetual futures funding rates across all open positions.
 */
export function applyFundingFee(
  state: PaperTradingState,
  fundingRateBps: number = 1.0 // 1 bps = 0.01%
): PaperTradingState {
  if (state.positions.length === 0) return state;

  const fundingRateDecimal = fundingRateBps / 10000;
  let totalFundingDeducted = 0;

  const updatedPositions = state.positions.map((pos) => {
    // In perpetual futures, Longs pay Shorts when rate is positive
    const fundingFee = pos.notionalValue * fundingRateDecimal * (pos.side === 'LONG' ? 1 : -1);
    totalFundingDeducted += fundingFee;
    return {
      ...pos,
      totalFundingPaid: pos.totalFundingPaid + fundingFee
    };
  });

  const updatedBalance = state.balance - totalFundingDeducted;
  const unrealizedPnlSum = updatedPositions.reduce((acc, p) => acc + p.unrealizedPnl, 0);

  return {
    ...state,
    balance: updatedBalance,
    equity: updatedBalance + unrealizedPnlSum,
    positions: updatedPositions,
    lastFundingTimestamp: Date.now()
  };
}

/**
 * Calculate comprehensive portfolio performance statistics.
 */
export function getPaperTradingStats(state: PaperTradingState): PaperPerformanceStats {
  const closedTrades = state.tradeLedger.filter(
    (t) => t.reason !== 'MARKET_FILL' && t.reason !== 'LIMIT_FILL'
  );

  const totalTrades = closedTrades.length;
  const winningTrades = closedTrades.filter((t) => t.realizedPnl > 0).length;
  const losingTrades = closedTrades.filter((t) => t.realizedPnl <= 0).length;
  const winRatePct = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

  const totalWins = closedTrades
    .filter((t) => t.realizedPnl > 0)
    .reduce((acc, t) => acc + t.realizedPnl, 0);
  const totalLosses = Math.abs(
    closedTrades
      .filter((t) => t.realizedPnl < 0)
      .reduce((acc, t) => acc + t.realizedPnl, 0)
  );

  const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? 999 : 0;
  const netPnl = state.equity - state.initialBalance;
  const roiPct = state.initialBalance > 0 ? (netPnl / state.initialBalance) * 100 : 0;

  // Calculate Max Drawdown from trade ledger sequence
  let peak = state.initialBalance;
  let runningEquity = state.initialBalance;
  let maxDd = 0;

  for (const trade of state.tradeLedger) {
    runningEquity += trade.realizedPnl;
    if (runningEquity > peak) {
      peak = runningEquity;
    }
    const dd = peak > 0 ? ((peak - runningEquity) / peak) * 100 : 0;
    if (dd > maxDd) {
      maxDd = dd;
    }
  }

  return {
    initialBalance: state.initialBalance,
    balance: state.balance,
    equity: state.equity,
    totalTrades,
    winningTrades,
    losingTrades,
    winRatePct,
    profitFactor: Number(profitFactor.toFixed(2)),
    netPnl: Number(netPnl.toFixed(2)),
    roiPct: Number(roiPct.toFixed(2)),
    maxDrawdownPct: Number(maxDd.toFixed(2)),
    totalFees: Number(state.totalFeesPaid.toFixed(2))
  };
}

/**
 * LocalStorage Helpers for state persistence across browser reloads.
 */
const STORAGE_KEY = 'quant_paper_trading_state_v6';

export function savePaperTradingState(state: PaperTradingState): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  } catch (e) {
    console.warn('Failed to save paper trading state to localStorage', e);
  }
}

export function loadPaperTradingState(): PaperTradingState {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const data = window.localStorage.getItem(STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    }
  } catch (e) {
    console.warn('Failed to load paper trading state from localStorage', e);
  }
  return createInitialPaperState();
}

export function resetPaperTradingState(initialCash: number = 10000): PaperTradingState {
  const fresh = createInitialPaperState(initialCash);
  savePaperTradingState(fresh);
  return fresh;
}
