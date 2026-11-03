import React, { useState, useMemo, useCallback } from 'react';
import { SimulationSummary } from '../types';
import { 
  Activity, 
  Play, 
  RotateCw, 
  ShieldAlert, 
  TrendingUp, 
  TrendingDown, 
  Info, 
  Sliders, 
  Target,
  BarChart3
} from 'lucide-react';

interface MonteCarloTabProps {
  currentBtcPrice: number;
}

export const MonteCarloTab: React.FC<MonteCarloTabProps> = ({ currentBtcPrice }) => {
  const [horizonDays, setHorizonDays] = useState<number>(28);
  const [nPaths, setNPaths] = useState<number>(2000);
  const [dailyDriftPct, setDailyDriftPct] = useState<number>(0.461); // 0.004609
  const [dailyVolPct, setDailyVolPct] = useState<number>(2.182); // 0.021816
  const [seedVersion, setSeedVersion] = useState<number>(1);

  // Box-Muller transform for pseudo-random standard normal numbers
  const standardNormal = useCallback(() => {
    let u1 = 0;
    let u2 = 0;
    while (u1 === 0) u1 = Math.random();
    while (u2 === 0) u2 = Math.random();
    return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  }, []);

  // Run GBM simulation
  const simulation = useMemo(() => {
    const s0 = currentBtcPrice;
    const mu = dailyDriftPct / 100;
    const sigma = dailyVolPct / 100;
    const dt = 1.0;
    const drift = (mu - 0.5 * sigma * sigma) * dt;
    const diffusion = sigma * Math.sqrt(dt);

    // Store day-by-day prices for quantile fan chart
    // days x paths
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
    const percentileCurve: Array<{
      day: number;
      p5: number;
      p25: number;
      p50: number;
      p75: number;
      p95: number;
    }> = [];

    for (let d = 0; d <= horizonDays; d++) {
      const sorted = [...dayPrices[d]].sort((a, b) => a - b);
      percentileCurve.push({
        day: d,
        p5: sorted[Math.floor(sorted.length * 0.05)],
        p25: sorted[Math.floor(sorted.length * 0.25)],
        p50: sorted[Math.floor(sorted.length * 0.50)],
        p75: sorted[Math.floor(sorted.length * 0.75)],
        p95: sorted[Math.floor(sorted.length * 0.95)],
      });
    }

    terminalPrices.sort((a, b) => a - b);

    const sum = terminalPrices.reduce((acc, v) => acc + v, 0);
    const terminalMean = sum / nPaths;
    const terminalMedian = terminalPrices[Math.floor(nPaths / 2)];
    const terminalMin = terminalPrices[0];
    const terminalMax = terminalPrices[nPaths - 1];

    const lossCount = terminalPrices.filter((p) => p < s0).length;
    const probLoss = (lossCount / nPaths) * 100;

    const gain20Count = terminalPrices.filter((p) => p >= s0 * 1.2).length;
    const probGain20 = (gain20Count / nPaths) * 100;

    const gain50Count = terminalPrices.filter((p) => p >= s0 * 1.5).length;
    const probGain50 = (gain50Count / nPaths) * 100;

    // VaR 95%: 5th percentile price vs starting price
    const p5Val = terminalPrices[Math.floor(nPaths * 0.05)];
    const var95Pct = Math.max(0, ((s0 - p5Val) / s0) * 100);

    // Expected Shortfall (CVaR 95%): average of bottom 5%
    const bottom5 = terminalPrices.slice(0, Math.floor(nPaths * 0.05));
    const avgBottom5 = bottom5.reduce((a, b) => a + b, 0) / (bottom5.length || 1);
    const cvar95Pct = Math.max(0, ((s0 - avgBottom5) / s0) * 100);

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
  }, [currentBtcPrice, horizonDays, nPaths, dailyDriftPct, dailyVolPct, seedVersion, standardNormal]);

  // Chart coordinate mapping
  const chartWidth = 900;
  const chartHeight = 320;
  const padding = { top: 25, right: 30, bottom: 35, left: 70 };

  const { minChartPrice, maxChartPrice } = useMemo(() => {
    const p5Min = simulation.percentileCurve.reduce((min, pt) => Math.min(min, pt.p5), Infinity);
    const p95Max = simulation.percentileCurve.reduce((max, pt) => Math.max(max, pt.p95), -Infinity);
    return {
      minChartPrice: Math.max(1000, p5Min * 0.92),
      maxChartPrice: p95Max * 1.08
    };
  }, [simulation.percentileCurve]);

  const scaleX = (day: number) => padding.left + (day / horizonDays) * (chartWidth - padding.left - padding.right);
  const scaleY = (price: number) => chartHeight - padding.bottom - ((price - minChartPrice) / (maxChartPrice - minChartPrice || 1)) * (chartHeight - padding.top - padding.bottom);

  // SVG Fan Area: 5th to 95th percentile
  const area95Path = useMemo(() => {
    const pts = simulation.percentileCurve;
    const top = pts.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(pt.day)},${scaleY(pt.p95)}`).join(' ');
    const btm = pts.slice().reverse().map((pt) => `L ${scaleX(pt.day)},${scaleY(pt.p5)}`).join(' ');
    return `${top} ${btm} Z`;
  }, [simulation.percentileCurve, minChartPrice, maxChartPrice, horizonDays]);

  // SVG Fan Area: 25th to 75th percentile
  const area50Path = useMemo(() => {
    const pts = simulation.percentileCurve;
    const top = pts.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(pt.day)},${scaleY(pt.p75)}`).join(' ');
    const btm = pts.slice().reverse().map((pt) => `L ${scaleX(pt.day)},${scaleY(pt.p25)}`).join(' ');
    return `${top} ${btm} Z`;
  }, [simulation.percentileCurve, minChartPrice, maxChartPrice, horizonDays]);

  // Median Path
  const medianPath = useMemo(() => {
    return simulation.percentileCurve.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(pt.day)},${scaleY(pt.p50)}`).join(' ');
  }, [simulation.percentileCurve, minChartPrice, maxChartPrice, horizonDays]);

  return (
    <div className="space-y-6">
      {/* Simulation Controls Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold mb-2">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              Stochastic GBM Projection Engine
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Monte Carlo Multi-Path Price Simulation
            </h2>
            <p className="text-xs text-slate-400">
              Geometric Brownian Motion with historical drift (μ) and volatility (σ) derived from 60-day window
            </p>
          </div>

          <button
            onClick={() => setSeedVersion((prev) => prev + 1)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 transition-all"
          >
            <RotateCw className="w-4 h-4 animate-spin-hover" />
            Re-run Simulation ({nPaths.toLocaleString()} Paths)
          </button>
        </div>

        {/* Parameter Sliders */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 text-xs font-mono">
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-slate-400">Horizon:</span>
              <span className="text-emerald-400 font-bold">{horizonDays} Days</span>
            </div>
            <div className="flex gap-1.5">
              {[7, 14, 28, 60].map((d) => (
                <button
                  key={d}
                  onClick={() => setHorizonDays(d)}
                  className={`flex-1 py-1 rounded text-[11px] font-bold ${
                    horizonDays === d
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-slate-400">Sample Paths:</span>
              <span className="text-cyan-400 font-bold">{nPaths.toLocaleString()}</span>
            </div>
            <div className="flex gap-1.5">
              {[1000, 2000, 5000, 10000].map((n) => (
                <button
                  key={n}
                  onClick={() => setNPaths(n)}
                  className={`flex-1 py-1 rounded text-[11px] font-bold ${
                    nPaths === n
                      ? 'bg-cyan-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {n >= 1000 ? `${n / 1000}k` : n}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
            <div className="flex justify-between items-center mb-1">
              <span className="text-slate-400">Daily Drift (μ):</span>
              <span className="text-amber-400 font-bold">+{dailyDriftPct.toFixed(3)}%/day</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.2"
              step="0.05"
              value={dailyDriftPct}
              onChange={(e) => setDailyDriftPct(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <span className="text-[10px] text-slate-500">Ann. drift: +{simulation.annualizedDrift.toFixed(1)}%</span>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
            <div className="flex justify-between items-center mb-1">
              <span className="text-slate-400">Daily Volatility (σ):</span>
              <span className="text-purple-400 font-bold">{dailyVolPct.toFixed(3)}%/day</span>
            </div>
            <input
              type="range"
              min="1.0"
              max="5.0"
              step="0.1"
              value={dailyVolPct}
              onChange={(e) => setDailyVolPct(Number(e.target.value))}
              className="w-full accent-purple-500 cursor-pointer"
            />
            <span className="text-[10px] text-slate-500">Ann. vol: {simulation.annualizedVol.toFixed(1)}%</span>
          </div>
        </div>

        {/* Quant Metric Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-4 border-t border-slate-800/80">
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[11px] text-slate-400 block">Terminal Median</span>
            <span className="text-base font-bold font-mono text-emerald-400 mt-0.5 block">
              ${simulation.terminalMedian.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </span>
            <span className="text-[10px] text-slate-400">Mean: ${simulation.terminalMean.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[11px] text-slate-400 block">95th Percentile Bull</span>
            <span className="text-base font-bold font-mono text-cyan-400 mt-0.5 block">
              ${simulation.percentileCurve[horizonDays]?.p95.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </span>
            <span className="text-[10px] text-slate-400">Upper confidence bound</span>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[11px] text-slate-400 block">5th Percentile Bear</span>
            <span className="text-base font-bold font-mono text-rose-400 mt-0.5 block">
              ${simulation.percentileCurve[horizonDays]?.p5.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </span>
            <span className="text-[10px] text-slate-400">Lower confidence bound</span>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[11px] text-slate-400 block">Loss Probability</span>
            <span className="text-base font-bold font-mono text-amber-400 mt-0.5 block">
              {simulation.probLoss.toFixed(1)}%
            </span>
            <span className="text-[10px] text-slate-400">P(P_T &lt; P_0)</span>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[11px] text-slate-400 block">P(&gt;20% Gain)</span>
            <span className="text-base font-bold font-mono text-emerald-400 mt-0.5 block">
              {simulation.probGain20.toFixed(1)}%
            </span>
            <span className="text-[10px] text-slate-400">P(P_T &gt;= 1.2 * P_0)</span>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[11px] text-slate-400 block">Value at Risk (95%)</span>
            <span className="text-base font-bold font-mono text-rose-300 mt-0.5 block">
              -{simulation.var95Pct.toFixed(1)}%
            </span>
            <span className="text-[10px] text-slate-400">CVaR: -{simulation.cvar95Pct.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* Fan Chart Projection Canvas */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              Monte Carlo Confidence Fan Chart ({horizonDays}-Day Outlook)
            </h3>
            <p className="text-xs text-slate-400">
              Starting from ${simulation.s0.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} with 5th, 25th, 50th, 75th, and 95th percentiles
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-2 bg-emerald-500/20 border border-emerald-500/40 rounded inline-block" />
              <span className="text-slate-300">5% - 95% Interval</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-2 bg-emerald-500/40 border border-emerald-500/60 rounded inline-block" />
              <span className="text-slate-300">25% - 75% Interquartile</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-emerald-400 inline-block" />
              <span className="text-emerald-300 font-bold">Median Path</span>
            </div>
          </div>
        </div>

        {/* SVG Projection Fan */}
        <div className="w-full overflow-x-auto py-2">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto min-w-[700px]">
            {/* Grid Lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
              const yVal = minChartPrice + pct * (maxChartPrice - minChartPrice);
              const yPos = scaleY(yVal);
              return (
                <g key={pct}>
                  <line
                    x1={padding.left}
                    y1={yPos}
                    x2={chartWidth - padding.right}
                    y2={yPos}
                    stroke="#1e293b"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={padding.left - 8}
                    y={yPos + 4}
                    textAnchor="end"
                    fill="#64748b"
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    ${Math.round(yVal).toLocaleString()}
                  </text>
                </g>
              );
            })}

            {/* 5-95 Percentile Shaded Fan */}
            <path
              d={area95Path}
              fill="#10b981"
              fillOpacity="0.12"
              stroke="#10b981"
              strokeOpacity="0.3"
              strokeWidth="1"
            />

            {/* 25-75 Percentile Shaded Fan */}
            <path
              d={area50Path}
              fill="#10b981"
              fillOpacity="0.25"
              stroke="#10b981"
              strokeOpacity="0.5"
              strokeWidth="1"
            />

            {/* Individual Sample Paths */}
            {simulation.samplePaths.map((path, idx) => {
              const dStr = path
                .map((p, d) => `${d === 0 ? 'M' : 'L'} ${scaleX(d)},${scaleY(p)}`)
                .join(' ');
              return (
                <path
                  key={idx}
                  d={dStr}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="0.75"
                  opacity="0.18"
                />
              );
            })}

            {/* Median Line */}
            <path
              d={medianPath}
              fill="none"
              stroke="#10b981"
              strokeWidth="2.5"
            />

            {/* Starting Price Benchmark Line */}
            <line
              x1={padding.left}
              y1={scaleY(simulation.s0)}
              x2={chartWidth - padding.right}
              y2={scaleY(simulation.s0)}
              stroke="#f59e0b"
              strokeDasharray="3 3"
              strokeWidth="1.5"
              opacity="0.8"
            />
            <text
              x={chartWidth - padding.right}
              y={scaleY(simulation.s0) - 6}
              textAnchor="end"
              fill="#f59e0b"
              fontSize="10"
              fontFamily="monospace"
            >
              Anchor: ${simulation.s0.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </text>
          </svg>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pt-2 border-t border-slate-800/60">
          <span>Day 0 (Current)</span>
          <span>Forward Horizon: {horizonDays} trading days</span>
          <span>Day {horizonDays} Terminal</span>
        </div>
      </div>
    </div>
  );
};
