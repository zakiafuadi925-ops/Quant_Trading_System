import {
  fetchCircuitBreaker,
  triggerEmergencyKill,
  resetCircuitBreakerApi,
  CircuitBreakerState
} from '../src/services/exchangeApi';

describe('Frontend Phase 3: Institutional Circuit Breaker & Emergency Kill-Switch', () => {
  it('parses normal circuit breaker telemetry correctly', async () => {
    const mockState: CircuitBreakerState = {
      status: 'NORMAL',
      tradingAllowed: true,
      consecutiveLosses: 1,
      hourlyDrawdownPct: 1.5,
      dailyDrawdownPct: 2.2,
      triggerReason: null,
      haltedAt: null
    };

    const mockAuthFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, accountId: 'default_user', status: mockState })
    });

    const status = await fetchCircuitBreaker(mockAuthFetch as any);

    expect(mockAuthFetch).toHaveBeenCalledWith('/api/exchange/circuit-breaker');
    expect(status).not.toBeNull();
    expect(status?.status).toBe('NORMAL');
    expect(status?.tradingAllowed).toBe(true);
    expect(status?.hourlyDrawdownPct).toBe(1.5);
  });

  it('detects HALTED status and triggers risk violation indicators', async () => {
    const mockHaltedState: CircuitBreakerState = {
      status: 'HALTED',
      tradingAllowed: false,
      consecutiveLosses: 3,
      hourlyDrawdownPct: 5.4,
      dailyDrawdownPct: 6.8,
      triggerReason: 'HOURLY_DRAWDOWN_LIMIT_EXCEEDED',
      haltedAt: new Date().toISOString()
    };

    const mockAuthFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, accountId: 'default_user', status: mockHaltedState })
    });

    const status = await fetchCircuitBreaker(mockAuthFetch as any);

    expect(status?.status).toBe('HALTED');
    expect(status?.tradingAllowed).toBe(false);
    expect(status?.triggerReason).toBe('HOURLY_DRAWDOWN_LIMIT_EXCEEDED');
  });

  it('triggers emergency kill-switch payload to exchange backend', async () => {
    const mockAuthFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        message: 'EMERGENCY KILL-SWITCH TRIGGERED: All orders cancelled, all positions closed.',
        result: {
          cancelledOrders: 4,
          closedPositions: 2,
          reason: 'BLACK_SWAN_VOLATILITY_ALERT'
        }
      })
    });

    const res = await triggerEmergencyKill('BLACK_SWAN_VOLATILITY_ALERT', mockAuthFetch as any);

    expect(res.success).toBe(true);
    expect(mockAuthFetch).toHaveBeenCalledWith(
      '/api/exchange/circuit-breaker/kill',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'BLACK_SWAN_VOLATILITY_ALERT' })
      })
    );
  });

  it('executes manual reset re-enabling trading back to NORMAL', async () => {
    const resetState: CircuitBreakerState = {
      status: 'NORMAL',
      tradingAllowed: true,
      consecutiveLosses: 0,
      hourlyDrawdownPct: 0,
      dailyDrawdownPct: 0,
      triggerReason: null,
      haltedAt: null
    };

    const mockAuthFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        message: 'Circuit breaker has been reset to NORMAL. Trading re-enabled.',
        status: resetState
      })
    });

    const res = await resetCircuitBreakerApi(mockAuthFetch as any);

    expect(res.success).toBe(true);
    expect(mockAuthFetch).toHaveBeenCalledWith(
      '/api/exchange/circuit-breaker/reset',
      expect.objectContaining({ method: 'POST' })
    );
    expect(res.status?.tradingAllowed).toBe(true);
  });
});
