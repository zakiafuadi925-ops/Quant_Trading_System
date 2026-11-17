import { runTradeBootstrap, BootstrapTradeInput } from '../src/utils/tradeBootstrap';

describe('Historical Monte Carlo Trade Bootstrap Engine', () => {
  const sampleTrades: BootstrapTradeInput[] = [
    { pnl: 45, pnlPct: 4.5 },
    { pnl: -20, pnlPct: -2.0 },
    { pnl: 35, pnlPct: 3.5 },
    { pnl: -15, pnlPct: -1.5 },
    { pnl: 60, pnlPct: 6.0 },
    { pnl: -30, pnlPct: -3.0 },
    { pnl: 25, pnlPct: 2.5 },
    { pnl: -10, pnlPct: -1.0 },
    { pnl: 50, pnlPct: 5.0 },
    { pnl: -25, pnlPct: -2.5 }
  ];

  it('executes 5,000-run trade sequence bootstrap accurately', () => {
    const result = runTradeBootstrap(sampleTrades, {
      initialCapital: 1000,
      iterations: 5000,
      ruinThresholdPct: 50
    });

    expect(result.iterations).toBe(5000);
    expect(result.tradeCount).toBe(10);
    expect(result.initialCapital).toBe(1000);
    expect(result.medianFinalEquity).toBeGreaterThan(0);
    expect(result.worstCaseDrawdown).toBeGreaterThanOrEqual(result.p99MaxDrawdown);
    expect(result.p99MaxDrawdown).toBeGreaterThanOrEqual(result.p95MaxDrawdown);
    expect(result.p95MaxDrawdown).toBeGreaterThanOrEqual(result.medianMaxDrawdown);
    expect(result.sampleCurves).toHaveLength(25);
  });

  it('correctly quantifies probability of ruin for heavily negative trade distribution', () => {
    // Loss-heavy trades (e.g., -15%, -20%, -10%, +2%)
    const lossyTrades: BootstrapTradeInput[] = [
      { pnl: -150, pnlPct: -15.0 },
      { pnl: -200, pnlPct: -20.0 },
      { pnl: -100, pnlPct: -10.0 },
      { pnl: 20, pnlPct: 2.0 },
      { pnl: -120, pnlPct: -12.0 }
    ];

    const result = runTradeBootstrap(lossyTrades, {
      initialCapital: 1000,
      iterations: 1000,
      tradeHorizon: 30, // 30-trade forward sequence
      ruinThresholdPct: 50 // Equity dropping below $500
    });

    expect(result.ruinProbabilityPct).toBeGreaterThan(50);
    expect(result.ruinCount).toBeGreaterThan(500);
  });

  it('generates consistent histogram buckets covering 100% of iterations', () => {
    const result = runTradeBootstrap(sampleTrades, {
      iterations: 2000
    });

    expect(result.drawdownBuckets.length).toBe(6);
    const totalCount = result.drawdownBuckets.reduce((acc, b) => acc + b.count, 0);
    expect(totalCount).toBe(2000);
  });

  it('measures consecutive losing streaks and Sharpe distributions', () => {
    const result = runTradeBootstrap(sampleTrades, {
      iterations: 1000
    });

    expect(result.maxConsecutiveLosses).toBeGreaterThanOrEqual(result.p95ConsecutiveLosses);
    expect(result.p95ConsecutiveLosses).toBeGreaterThanOrEqual(result.medianConsecutiveLosses);
    expect(result.medianSharpe).toBeDefined();
    expect(typeof result.medianSharpe).toBe('number');
  });
});
