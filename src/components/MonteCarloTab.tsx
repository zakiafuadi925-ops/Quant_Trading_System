import React, { useState, useMemo, useEffect, useRef } from 'react';
import { SimulationSummary } from '../types';
import { runMonteCarloSimulation, MonteCarloParams, MonteCarloResult } from '../workers/monteCarloCore';
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
  BarChart3,
  Cpu
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

  // Background computation state via native Web Worker
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [isWorkerActive, setIsWorkerActive] = useState<boolean>(true);

  // Initialize simulation with synchronous default
  const [simulation, setSimulation] = useState<MonteCarloResult>(() =>
    runMonteCarloSimulation({
      currentBtcPrice,
      horizonDays: 28,
      nPaths: 2000,
      dailyDriftPct: 0.461,
      dailyVolPct: 2.182,
      seedVersion: 1
    })
  );

  const workerRef = useRef<Worker | null>(null);
  const activeRequestId = useRef<number>(0);

  // Modern Web Guidance: Initialize Dedicated Web Worker to offload heavy stochastic paths
  useEffect(() => {
    try {
      if (typeof Worker !== 'undefined') {
        const worker = new Worker(new URL('../workers/monteCarlo.worker.ts', import.meta.url), {
          type: 'module'
        });

        worker.onmessage = (e: MessageEvent<{ id: number; result: MonteCarloResult }>) => {
          if (e.data && e.data.id === activeRequestId.current) {
            setSimulation(e.data.result);
            setIsSimulating(false);
          }
        };

        worker.onerror = (err) => {
          console.warn('[MonteCarlo Worker Error, falling back to sync]', err);
          setIsWorkerActive(false);
        };

        workerRef.current = worker;
        setIsWorkerActive(true);

        return () => {
          worker.terminate();
          workerRef.current = null;
        };
      } else {
        setIsWorkerActive(false);
      }
    } catch (e) {
      console.warn('[Web Workers unsupported, fallback to main thread]', e);
      setIsWorkerActive(false);
    }
  }, []);

  // Post simulation job to background worker whenever parameters change
  useEffect(() => {
    const params: MonteCarloParams = {
      currentBtcPrice,
      horizonDays,
      nPaths,
      dailyDriftPct,
      dailyVolPct,
      seedVersion
    };

    if (workerRef.current && isWorkerActive) {
      setIsSimulating(true);
      const reqId = ++activeRequestId.current;
      workerRef.current.postMessage({ id: reqId, params });
    } else {
      // Synchronous fallback for headless test runners / environments without Web Worker
      const result = runMonteCarloSimulation(params);
      setSimulation(result);
      setIsSimulating(false);
    }
  }, [currentBtcPrice, horizonDays, nPaths, dailyDriftPct, dailyVolPct, seedVersion, isWorkerActive]);

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
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                Stochastic GBM Projection Engine
              </div>
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono border transition-all ${
                isSimulating
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse'
                  : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20'
              }`}>
                <Cpu className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin text-amber-400' : 'text-indigo-400'}`} />
                {isSimulating ? 'Worker Computing...' : isWorkerActive ? 'Web Worker Thread (Off-UI)' : 'Main Thread Fallback'}
              </div>
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
            disabled={isSimulating}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 transition-all disabled:opacity-50"
          >
            <RotateCw className={`w-4 h-4 ${isSimulating ? 'animate-spin' : 'animate-spin-hover'}`} />
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
