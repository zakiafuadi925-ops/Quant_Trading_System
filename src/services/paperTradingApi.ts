/**
 * Client-Side API Service for MongoDB Cloud Paper Trading & Alerts
 * 
 * Communicates with backend endpoints (/api/paper/* and /api/alerts/*).
 * Gracefully falls back to local storage if API is unreachable.
 */

import { PaperTradingState } from '../utils/paperTrading';

export interface CloudPaperSummaryResponse {
  success: boolean;
  data?: {
    account: {
      initialBalance: number;
      balance: number;
      equity: number;
      freeMargin: number;
      totalMarginUsed: number;
      totalFeesPaid: number;
      totalRealizedPnl: number;
    };
    positions: any[];
    openOrders: any[];
    tradeLedger: any[];
  };
  message?: string;
}

export async function fetchCloudPaperSummary(): Promise<CloudPaperSummaryResponse | null> {
  try {
    const res = await fetch('/api/paper/summary');
    if (!res.ok) return null;
    const json = await res.json();
    return json;
  } catch (e) {
    console.debug('[PaperTradingApi] Cloud fetch skipped, running in local mode:', e);
    return null;
  }
}

export async function submitCloudPaperOrder(
  params: {
    symbol: string;
    side: 'BUY' | 'SELL';
    type: 'MARKET' | 'LIMIT';
    positionSide: 'LONG' | 'SHORT';
    quantity: number;
    price: number;
    leverage?: number;
    stopLoss?: number;
    takeProfit?: number;
    trailingStopDistance?: number;
  },
  currentMarketPrice: number
) {
  try {
    const res = await fetch('/api/paper/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ params, currentMarketPrice })
    });
    const json = await res.json();
    return json;
  } catch (e) {
    console.warn('[PaperTradingApi] Failed to submit cloud order:', e);
    return { success: false, message: 'Network error or backend unreachable.' };
  }
}

export async function closeCloudPaperPosition(positionId: string, closePrice: number, reason = 'MANUAL_CLOSE') {
  try {
    const res = await fetch(`/api/paper/positions/${positionId}/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ closePrice, reason })
    });
    const json = await res.json();
    return json;
  } catch (e) {
    console.warn('[PaperTradingApi] Failed to close cloud position:', e);
    return { success: false, message: 'Network error.' };
  }
}

export async function cancelCloudPaperOrder(orderId: string) {
  try {
    const res = await fetch(`/api/paper/orders/${orderId}/cancel`, {
      method: 'POST'
    });
    const json = await res.json();
    return json;
  } catch (e) {
    console.warn('[PaperTradingApi] Failed to cancel cloud order:', e);
    return { success: false, message: 'Network error.' };
  }
}

export async function resetCloudPaperAccount() {
  try {
    const res = await fetch('/api/paper/reset', {
      method: 'POST'
    });
    const json = await res.json();
    return json;
  } catch (e) {
    console.warn('[PaperTradingApi] Failed to reset cloud account:', e);
    return { success: false, message: 'Network error.' };
  }
}

export async function fetchCloudAlertRules() {
  try {
    const res = await fetch('/api/alerts/rules');
    if (!res.ok) return null;
    const json = await res.json();
    return json.rules || null;
  } catch (e) {
    return null;
  }
}

export async function toggleCloudAlertRule(ruleId: string, enabled: boolean) {
  try {
    const res = await fetch(`/api/alerts/rules/${ruleId}/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled })
    });
    const json = await res.json();
    return json;
  } catch (e) {
    return { success: false };
  }
}
