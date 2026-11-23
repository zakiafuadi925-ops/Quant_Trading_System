/**
 * Client-Side API Service for Live Exchange & AES Key Vault Operations
 *
 * Communicates with backend endpoints (/api/exchange/*).
 * Supports authenticated calls with JWT Bearer tokens.
 */

export interface VaultKeyItem {
  keyId: string;
  exchange: 'binance' | 'bybit' | 'okx';
  label: string;
  maskedKey: string;
  isTestnet: boolean;
  isActive: boolean;
  lastTestedAt?: string;
}

export interface SaveKeyPayload {
  exchange: 'binance' | 'bybit' | 'okx';
  label: string;
  apiKey: string;
  apiSecret: string;
  passphrase?: string;
  isTestnet: boolean;
}

export interface TestKeyResult {
  success: boolean;
  keyId?: string;
  exchange?: string;
  isTestnet?: boolean;
  latencyMs?: number;
  message?: string;
  serverTime?: number;
}

export interface LiveOrderPayload {
  keyId?: string;
  orderParams: {
    symbol: string;
    side: 'BUY' | 'SELL';
    type: 'MARKET' | 'LIMIT';
    quantity: number;
    price?: number;
    leverage?: number;
  };
}

export interface LiveOrderResult {
  success: boolean;
  message?: string;
  order?: {
    orderId: string;
    symbol: string;
    status: 'FILLED' | 'NEW' | 'PARTIALLY_FILLED' | 'CANCELED' | 'REJECTED';
    executedQty: number;
    avgPrice: number;
    exchange: string;
    side: string;
    timestamp: number;
  };
  error?: string;
}

export interface CircuitBreakerState {
  status: 'NORMAL' | 'WARNING' | 'HALTED';
  tradingAllowed: boolean;
  consecutiveLosses: number;
  hourlyDrawdownPct: number;
  dailyDrawdownPct: number;
  triggerReason: string | null;
  haltedAt: string | null;
}

export async function fetchVaultKeys(
  authFetch?: (url: string, init?: RequestInit) => Promise<Response>
): Promise<VaultKeyItem[]> {
  try {
    const fetcher = authFetch || fetch;
    const res = await fetcher('/api/exchange/keys');
    if (!res.ok) return [];
    const data = await res.json();
    return data.keys || [];
  } catch (err) {
    console.debug('[exchangeApi] fetchVaultKeys error:', err);
    return [];
  }
}

export async function saveVaultKey(
  payload: SaveKeyPayload,
  authFetch?: (url: string, init?: RequestInit) => Promise<Response>
): Promise<{ success: boolean; message: string; key?: VaultKeyItem }> {
  try {
    const fetcher = authFetch || fetch;
    const res = await fetcher('/api/exchange/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    return { success: false, message: err?.message || 'Network error saving API key' };
  }
}

export async function deleteVaultKey(
  keyId: string,
  authFetch?: (url: string, init?: RequestInit) => Promise<Response>
): Promise<{ success: boolean; message: string }> {
  try {
    const fetcher = authFetch || fetch;
    const res = await fetcher(`/api/exchange/keys/${keyId}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    return { success: false, message: err?.message || 'Network error deleting API key' };
  }
}

export async function testVaultKey(
  keyId: string,
  authFetch?: (url: string, init?: RequestInit) => Promise<Response>
): Promise<TestKeyResult> {
  try {
    const fetcher = authFetch || fetch;
    const res = await fetcher(`/api/exchange/keys/${keyId}/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyId })
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    return { success: false, message: err?.message || 'Network error testing API key' };
  }
}

export async function submitLiveOrder(
  payload: LiveOrderPayload,
  authFetch?: (url: string, init?: RequestInit) => Promise<Response>
): Promise<LiveOrderResult> {
  try {
    const fetcher = authFetch || fetch;
    const res = await fetcher('/api/exchange/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    return { success: false, message: err?.message || 'Network error executing live order' };
  }
}

export async function fetchCircuitBreaker(
  authFetch?: (url: string, init?: RequestInit) => Promise<Response>
): Promise<CircuitBreakerState | null> {
  try {
    const fetcher = authFetch || fetch;
    const res = await fetcher('/api/exchange/circuit-breaker');
    if (!res.ok) return null;
    const data = await res.json();
    return data.status || null;
  } catch (err) {
    console.debug('[exchangeApi] fetchCircuitBreaker error:', err);
    return null;
  }
}

export async function triggerEmergencyKill(
  reason?: string,
  authFetch?: (url: string, init?: RequestInit) => Promise<Response>
): Promise<{ success: boolean; message: string; result?: any }> {
  try {
    const fetcher = authFetch || fetch;
    const res = await fetcher('/api/exchange/circuit-breaker/kill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: reason || 'MANUAL_EMERGENCY_PANIC' })
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    return { success: false, message: err?.message || 'Error triggering emergency kill-switch' };
  }
}

export async function resetCircuitBreakerApi(
  authFetch?: (url: string, init?: RequestInit) => Promise<Response>
): Promise<{ success: boolean; message: string; status?: CircuitBreakerState }> {
  try {
    const fetcher = authFetch || fetch;
    const res = await fetcher('/api/exchange/circuit-breaker/reset', {
      method: 'POST'
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    return { success: false, message: err?.message || 'Error resetting circuit breaker' };
  }
}
