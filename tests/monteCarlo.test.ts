import { runMonteCarloSimulation, MonteCarloParams } from '../src/workers/monteCarloCore';

describe('Monte Carlo Stochastic Engine', () => {
  const baseParams: MonteCarloParams = {
    currentBtcPrice: 85000,
    horizonDays: 14,
    nPaths: 500,
    dailyDriftPct: 0.45,
    dailyVolPct: 2.2,
    seedVersion: 1
  };

  test('generates correct structure and path dimensions', () => {
    const result = runMonteCarloSimulation(baseParams);

    expect(result.s0).toBe(85000);
    expect(result.percentileCurve).toHaveLength(15); // days 0 to 14
    expect(result.terminalPrices).toHaveLength(500);
    expect(result.samplePaths).toHaveLength(30);
    expect(result.samplePaths[0]).toHaveLength(15);
  });

  test('validates quantile consistency: p5 <= p25 <= p50 <= p75 <= p95', () => {
    const result = runMonteCarloSimulation(baseParams);

    result.percentileCurve.forEach((pt) => {
      expect(pt.p5).toBeLessThanOrEqual(pt.p25);
      expect(pt.p25).toBeLessThanOrEqual(pt.p50);
      expect(pt.p50).toBeLessThanOrEqual(pt.p75);
      expect(pt.p75).toBeLessThanOrEqual(pt.p95);
    });
  });

  test('calculates valid risk metrics within probability boundaries', () => {
    const result = runMonteCarloSimulation(baseParams);

    expect(result.probLoss).toBeGreaterThanOrEqual(0);
    expect(result.probLoss).toBeLessThanOrEqual(100);

    expect(result.probGain20).toBeGreaterThanOrEqual(0);
    expect(result.probGain20).toBeLessThanOrEqual(100);

    expect(result.probGain50).toBeGreaterThanOrEqual(0);
    expect(result.probGain50).toBeLessThanOrEqual(100);

    expect(result.var95Pct).toBeGreaterThanOrEqual(0);
    expect(result.cvar95Pct).toBeGreaterThanOrEqual(0);

    expect(result.terminalMin).toBeLessThanOrEqual(result.terminalMean);
    expect(result.terminalMean).toBeLessThanOrEqual(result.terminalMax);
  });
});
