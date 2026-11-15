export interface PercentilePoint {
  day: number;
  p5: number;
  p25: number;
  p50: number;
  p75: number;
  p95: number;
}

export interface MonteCarloParams {
  currentBtcPrice: number;
  horizonDays: number;
  nPaths: number;
  dailyDriftPct: number;
  dailyVolPct: number;
  seedVersion?: number;
}

export interface MonteCarloResult {
  percentileCurve: PercentilePoint[];
  samplePaths: number[][];
  terminalPrices: number[];
  terminalMean: number;
  terminalMedian: number;
  terminalMin: number;
  terminalMax: number;
  probLoss: number;
  probGain20: number;
  probGain50: number;
  var95Pct: number;
  cvar95Pct: number;
  annualizedVol: number;
  annualizedDrift: number;
  s0: number;
}

// Box-Muller transform for pseudo-random standard normal numbers
function standardNormal(): number {
  let u1 = 0;
  let u2 = 0;
  while (u1 === 0) u1 = Math.random();
  while (u2 === 0) u2 = Math.random();
  return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

/**
 * Pure stochastic computation of Geometric Brownian Motion paths
 * Executes inside native Web Worker off the browser's UI thread
 */
export function runMonteCarloSimulation(params: MonteCarloParams): MonteCarloResult {
  const { currentBtcPrice: s0, horizonDays, nPaths, dailyDriftPct, dailyVolPct } = params;
  const mu = dailyDriftPct / 100;
  const sigma = dailyVolPct / 100;
  const dt = 1.0;
  const drift = (mu - 0.5 * sigma * sigma) * dt;
  const diffusion = sigma * Math.sqrt(dt);

  // Store day-by-day prices for quantile fan chart
  const dayPrices: number[][] = Array.from({ length: horizonDays + 1 }, () => []);
  for (let p = 0; p < nPaths; p++) {
    dayPrices[0].push(s0);
  }

  const terminalPrices: number[] = [];
  const samplePathsCount = 30; // representative paths to draw
  const samplePaths: number[][] = Array.from({ length: samplePathsCount }, () => [s0]);

  for (let p = 0; p < nPaths; p++) {
    let currentP = s0;
    const isSample = p < samplePathsCount;

    for (let d = 1; d <= horizonDays; d++) {
      const z = standardNormal();
      currentP = currentP * Math.exp(drift + diffusion * z);
      dayPrices[d].push(currentP);
      if (isSample) {
        samplePaths[p].push(currentP);
      }
    }
    terminalPrices.push(currentP);
  }

  // Sort day-by-day for percentiles
  const percentileCurve: PercentilePoint[] = [];

  for (let d = 0; d <= horizonDays; d++) {
    const sorted = [...dayPrices[d]].sort((a, b) => a - b);
    percentileCurve.push({
      day: d,
      p5: sorted[Math.floor(sorted.length * 0.05)] ?? s0,
      p25: sorted[Math.floor(sorted.length * 0.25)] ?? s0,
      p50: sorted[Math.floor(sorted.length * 0.50)] ?? s0,
      p75: sorted[Math.floor(sorted.length * 0.75)] ?? s0,
      p95: sorted[Math.floor(sorted.length * 0.95)] ?? s0,
    });
  }

  terminalPrices.sort((a, b) => a - b);

  const sum = terminalPrices.reduce((acc, v) => acc + v, 0);
  const terminalMean = sum / (nPaths || 1);
  const terminalMedian = terminalPrices[Math.floor(nPaths / 2)] ?? s0;
  const terminalMin = terminalPrices[0] ?? s0;
  const terminalMax = terminalPrices[nPaths - 1] ?? s0;

  const lossCount = terminalPrices.filter((p) => p < s0).length;
  const probLoss = (lossCount / (nPaths || 1)) * 100;

  const gain20Count = terminalPrices.filter((p) => p >= s0 * 1.2).length;
  const probGain20 = (gain20Count / (nPaths || 1)) * 100;

  const gain50Count = terminalPrices.filter((p) => p >= s0 * 1.5).length;
  const probGain50 = (gain50Count / (nPaths || 1)) * 100;

  // VaR 95%: 5th percentile price vs starting price
  const p5Val = terminalPrices[Math.floor(nPaths * 0.05)] ?? s0;
  const var95Pct = Math.max(0, ((s0 - p5Val) / (s0 || 1)) * 100);

  // Expected Shortfall (CVaR 95%): average of bottom 5%
  const bottom5 = terminalPrices.slice(0, Math.floor(nPaths * 0.05));
  const avgBottom5 = bottom5.length > 0 ? bottom5.reduce((a, b) => a + b, 0) / bottom5.length : s0;
  const cvar95Pct = Math.max(0, ((s0 - avgBottom5) / (s0 || 1)) * 100);

  const annualizedVol = sigma * Math.sqrt(365) * 100;
  const annualizedDrift = (Math.exp(mu * 365) - 1) * 100;

  return {
    percentileCurve,
    samplePaths,
    terminalPrices,
    terminalMean,
    terminalMedian,
    terminalMin,
    terminalMax,
    probLoss,
    probGain20,
    probGain50,
    var95Pct,
    cvar95Pct,
    annualizedVol,
    annualizedDrift,
    s0
  };
}
