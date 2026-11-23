import React, { useState, useMemo, useEffect, useRef } from 'react';
import { runMonteCarloSimulation, MonteCarloResult } from '../workers/monteCarloCore';
import { runTradeBootstrap, BootstrapResult, BootstrapTradeInput } from '../utils/tradeBootstrap';
import { 
  Activity, 
  RotateCw, 
  ShieldAlert, 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Cpu,
  Layers,
  Flame,
  AlertTriangle,
  Award,
  Sliders,
  DollarSign
} from 'lucide-react';
import { submitMonteCarloJob } from '../services/jobApi';

interface MonteCarloTabProps {
  currentBtcPrice: number;
  onOpenJobDrawer?: () => void;
}

export const MonteCarloTab: React.FC<MonteCarloTabProps> = ({ currentBtcPrice, onOpenJobDrawer }) => {
  // Engine Mode Switch: GBM Price Paths vs Historical Trade Bootstrap
  const [engineMode, setEngineMode] = useState<'GBM_PRICE' | 'TRADE_BOOTSTRAP'>('GBM_PRICE');

  // --- Mode 1: GBM Price Simulation State ---
  const [horizonDays, setHorizonDays] = useState<number>(28);
  const [nPaths, setNPaths] = useState<number>(2000);
  const [dailyDriftPct, setDailyDriftPct] = useState<number>(0.461);
  const [dailyVolPct, setDailyVolPct] = useState<number>(2.182);
  const [seedVersion, setSeedVersion] = useState<number>(1);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [isWorkerActive, setIsWorkerActive] = useState<boolean>(true);
  const [isAsyncEnqueuing, setIsAsyncEnqueuing] = useState<boolean>(false);

  // --- Mode 2: Trade Bootstrap State ---
  const [bootstrapIterations, setBootstrapIterations] = useState<number>(5000);
  const [ruinThresholdPct, setRuinThresholdPct] = useState<number>(50);
  const [tradeHorizon, setTradeHorizon] = useState<number>(50);
  const [bootstrapCapital, setBootstrapCapital] = useState<number>(10000);
  const [bootstrapSeed, setBootstrapSeed] = useState<number>(1);

  // Initialize GBM simulation
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

  // Baseline representative trade distribution for bootstrap
  const baselineTrades: BootstrapTradeInput[] = useMemo(() => [
    { pnl: 420, pnlPct: 4.2 },
    { pnl: -180, pnlPct: -1.8 },
    { pnl: 650, pnlPct: 6.5 },
    { pnl: -240, pnlPct: -2.4 },
    { pnl: 310, pnlPct: 3.1 },
    { pnl: -120, pnlPct: -1.2 },
    { pnl: 520, pnlPct: 5.2 },
    { pnl: -350, pnlPct: -3.5 },
    { pnl: 280, pnlPct: 2.8 },
    { pnl: -160, pnlPct: -1.6 },
    { pnl: 710, pnlPct: 7.1 },
    { pnl: -290, pnlPct: -2.9 },
    { pnl: 190, pnlPct: 1.9 },
    { pnl: -90, pnlPct: -0.9 },
    { pnl: 480, pnlPct: 4.8 }
  ], []);

  // Compute Trade Bootstrap Result
  const bootstrapResult: BootstrapResult = useMemo(() => {
    return runTradeBootstrap(baselineTrades, {
      initialCapital: bootstrapCapital,
      iterations: bootstrapIterations,
      ruinThresholdPct,
      tradeHorizon,
      sampleCurveCount: 25
    });
  }, [baselineTrades, bootstrapCapital, bootstrapIterations, ruinThresholdPct, tradeHorizon, bootstrapSeed]);

  const workerRef = useRef<Worker | null>(null);
  const activeRequestId = useRef<number>(0);

  // Dedicated Web Worker setup for GBM
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

  // Trigger GBM Simulation Run
  useEffect(() => {
    activeRequestId.current += 1;
    const reqId = activeRequestId.current;
    setIsSimulating(true);

    const params = {
      currentBtcPrice,
      horizonDays,
      nPaths,
      dailyDriftPct,
      dailyVolPct,
      seedVersion
    };

    if (workerRef.current && isWorkerActive) {
      workerRef.current.postMessage({ id: reqId, params });
    } else {
      setTimeout(() => {
        const res = runMonteCarloSimulation(params);
        setSimulation(res);
        setIsSimulating(false);
      }, 0);
    }
  }, [currentBtcPrice, horizonDays, nPaths, dailyDriftPct, dailyVolPct, seedVersion, isWorkerActive]);

  // SVG Chart Scales for GBM
  const chartHeight = 320;
  const chartWidth = 900;
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

  const area95Path = useMemo(() => {
    const pts = simulation.percentileCurve;
    const top = pts.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(pt.day)},${scaleY(pt.p95)}`).join(' ');
    const btm = pts.slice().reverse().map((pt) => `L ${scaleX(pt.day)},${scaleY(pt.p5)}`).join(' ');
    return `${top} ${btm} Z`;
  }, [simulation.percentileCurve, minChartPrice, maxChartPrice, horizonDays]);

  const area50Path = useMemo(() => {
    const pts = simulation.percentileCurve;
    const top = pts.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(pt.day)},${scaleY(pt.p75)}`).join(' ');
    const btm = pts.slice().reverse().map((pt) => `L ${scaleX(pt.day)},${scaleY(pt.p25)}`).join(' ');
    return `${top} ${btm} Z`;
  }, [simulation.percentileCurve, minChartPrice, maxChartPrice, horizonDays]);

  const medianPath = useMemo(() => {
    return simulation.percentileCurve.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(pt.day)},${scaleY(pt.p50)}`).join(' ');
  }, [simulation.percentileCurve, minChartPrice, maxChartPrice, horizonDays]);

  // Bootstrap Chart Coordinates
  const { minBootstrapEq, maxBootstrapEq } = useMemo(() => {
    let min = bootstrapResult.worstCaseFinalEquity;
    let max = bootstrapResult.bestCaseFinalEquity;
    bootstrapResult.sampleCurves.forEach((c) => {
      c.forEach((v) => {
        if (v < min) min = v;
        if (v > max) max = v;
      });
    });
    return {
      minBootstrapEq: Math.max(0, min * 0.9),
      maxBootstrapEq: max * 1.1
    };
  }, [bootstrapResult]);

  const scaleBsX = (step: number) => padding.left + (step / tradeHorizon) * (chartWidth - padding.left - padding.right);
  const scaleBsY = (eq: number) => chartHeight - padding.bottom - ((eq - minBootstrapEq) / (maxBootstrapEq - minBootstrapEq || 1)) * (chartHeight - padding.top - padding.bottom);

  const handleDispatchAsyncMonteCarlo = async () => {
    setIsAsyncEnqueuing(true);
    try {
      const res = await submitMonteCarloJob({
        numSimulations: 10000,
        days: horizonDays,
        currentPrice: currentBtcPrice,
        drift: dailyDriftPct / 100,
        volatility: dailyVolPct / 100
      });
      if (res.success && onOpenJobDrawer) {
        onOpenJobDrawer();
      }
    } finally {
      setIsAsyncEnqueuing(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-100">
      {/* Top Engine Navigation Tabs */}
      <div className="flex items-center justify-between p-1 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
        <div className="flex items-center gap-1.5 p-1 w-full sm:w-auto">
          <button
            onClick={() => setEngineMode('GBM_PRICE')}
            className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold font-mono transition-all flex items-center justify-center gap-2 ${
              engineMode === 'GBM_PRICE'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-4 h-4 text-emerald-300" />
            GBM Price Path Simulator
          </button>

          <button
            onClick={() => setEngineMode('TRADE_BOOTSTRAP')}
            className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold font-mono transition-all flex items-center justify-center gap-2 ${
              engineMode === 'TRADE_BOOTSTRAP'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Flame className="w-4 h-4 text-amber-300" />
            Historical Trade Bootstrap (5,000 Runs)
          </button>
        </div>

        <div className="hidden lg:flex items-center gap-2 px-4 text-xs font-mono text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>v6.2.0 Institutional Engine</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: STOCHASTIC GBM PRICE SIMULATION                                   */}
      {/* ========================================================================= */}
      {engineMode === 'GBM_PRICE' && (
        <>
          {/* Controls Card */}
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

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDispatchAsyncMonteCarlo}
                  disabled={isAsyncEnqueuing}
                  className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-cyan-500/20 text-slate-200 hover:text-cyan-300 border border-slate-700 hover:border-cyan-500/40 font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
                  title="Enqueue heavy 10,000 paths simulation to background compute queue"
                >
                  <Cpu className={`w-4 h-4 text-cyan-400 ${isAsyncEnqueuing ? 'animate-spin' : ''}`} />
                  <span>{isAsyncEnqueuing ? 'Enqueuing...' : 'Async 10k Paths'}</span>
                </button>

                <button
                  onClick={() => setSeedVersion((prev) => prev + 1)}
                  disabled={isSimulating}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <RotateCw className={`w-4 h-4 ${isSimulating ? 'animate-spin' : ''}`} />
                  Re-run Simulation ({nPaths.toLocaleString()} Paths)
                </button>
              </div>
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
                        horizonDays === d ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
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
                        nPaths === n ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {n >= 1000 ? `${n / 1000}k` : n}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-slate-400">Daily Drift (μ):</span>
                  <span className="text-amber-400 font-bold">{(dailyDriftPct).toFixed(3)}%</span>
                </div>
                <input
                  type="range"
                  min="-0.5"
                  max="1.5"
                  step="0.05"
                  value={dailyDriftPct}
                  onChange={(e) => setDailyDriftPct(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-slate-400">Daily Volatility (σ):</span>
                  <span className="text-rose-400 font-bold">{(dailyVolPct).toFixed(2)}%</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="6.0"
                  step="0.1"
                  value={dailyVolPct}
                  onChange={(e) => setDailyVolPct(parseFloat(e.target.value))}
                  className="w-full accent-rose-500 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* KPI Outcome Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
              <span className="text-[11px] font-medium text-slate-400 block uppercase">Median Target</span>
              <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                ${simulation.terminalMedian.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                50th Percentile
              </span>
            </div>

            <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
              <span className="text-[11px] font-medium text-slate-400 block uppercase">Expected Shortfall (CVaR)</span>
              <div className="text-xl font-bold font-mono text-rose-400 mt-1">
                -{simulation.cvar95Pct.toFixed(1)}%
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                VaR 95%: -{simulation.var95Pct.toFixed(1)}%
              </span>
            </div>

            <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
              <span className="text-[11px] font-medium text-slate-400 block uppercase">Prob of Loss</span>
              <div className={`text-xl font-bold font-mono mt-1 ${simulation.probLoss < 40 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {simulation.probLoss.toFixed(1)}%
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                P(ST &lt; S0)
              </span>
            </div>

            <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
              <span className="text-[11px] font-medium text-slate-400 block uppercase">Prob &gt; +20%</span>
              <div className="text-xl font-bold font-mono text-cyan-400 mt-1">
                {simulation.probGain20.toFixed(1)}%
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                Bullish Expansion
              </span>
            </div>

            <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
              <span className="text-[11px] font-medium text-slate-400 block uppercase">Annualized Drift</span>
              <div className="text-xl font-bold font-mono text-amber-400 mt-1">
                +{simulation.annualizedDrift.toFixed(1)}%
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                Compound Drift
              </span>
            </div>

            <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
              <span className="text-[11px] font-medium text-slate-400 block uppercase">Annualized Vol</span>
              <div className="text-xl font-bold font-mono text-indigo-400 mt-1">
                {simulation.annualizedVol.toFixed(1)}%
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                σ * sqrt(365)
              </span>
            </div>
          </div>

          {/* SVG Price Fan Chart */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                GBM Quantile Fan Chart ({horizonDays} Days Ahead)
              </h3>
              <div className="flex items-center gap-4 text-xs font-mono">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-3 h-1 bg-emerald-500 rounded" /> Median Path
                </span>
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span className="w-3 h-3 bg-emerald-500/20 border border-emerald-500/40 rounded-sm" /> 5th-95th Percentile
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto">
                <path d={area95Path} fill="#10b981" fillOpacity="0.12" stroke="#10b981" strokeOpacity="0.3" strokeWidth="1" />
                <path d={area50Path} fill="#10b981" fillOpacity="0.25" stroke="#10b981" strokeOpacity="0.5" strokeWidth="1" />
                {simulation.samplePaths.map((path, idx) => {
                  const dStr = path.map((p, d) => `${d === 0 ? 'M' : 'L'} ${scaleX(d)},${scaleY(p)}`).join(' ');
                  return <path key={idx} d={dStr} fill="none" stroke="#38bdf8" strokeWidth="0.75" opacity="0.18" />;
                })}
                <path d={medianPath} fill="none" stroke="#10b981" strokeWidth="2.5" />
                <line x1={padding.left} y1={scaleY(simulation.s0)} x2={chartWidth - padding.right} y2={scaleY(simulation.s0)} stroke="#f59e0b" strokeDasharray="3 3" strokeWidth="1.5" opacity="0.8" />
              </svg>
            </div>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: HISTORICAL TRADE BOOTSTRAP (5,000 RUNS)                           */}
      {/* ========================================================================= */}
      {engineMode === 'TRADE_BOOTSTRAP' && (
        <>
          {/* Controls Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                    Monte Carlo Trade Sequence Bootstrap Engine
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                    5,000 Stochastic Iterations
                  </span>
                </div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Probability of Ruin &amp; Drawdown Distribution Bootstrap
                </h2>
                <p className="text-xs text-slate-400">
                  Reshuffles trade sequences with replacement across 5,000 paths to evaluate sequence risk and tail liabilities
                </p>
              </div>

              <button
                onClick={() => setBootstrapSeed((prev) => prev + 1)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs shadow-lg shadow-amber-600/25 transition-all"
              >
                <RotateCw className="w-4 h-4" />
                Re-run Bootstrap (5,000 Runs)
              </button>
            </div>

            {/* Bootstrap Parameter Sliders */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 text-xs font-mono">
              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-slate-400">Iterations:</span>
                  <span className="text-amber-400 font-bold">{bootstrapIterations.toLocaleString()}</span>
                </div>
                <div className="flex gap-1.5">
                  {[2000, 5000, 10000].map((n) => (
                    <button
                      key={n}
                      onClick={() => setBootstrapIterations(n)}
                      className={`flex-1 py-1 rounded text-[11px] font-bold ${
                        bootstrapIterations === n ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {n / 1000}k
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-slate-400">Ruin Threshold (% Drop):</span>
                  <span className="text-rose-400 font-bold">-{ruinThresholdPct}%</span>
                </div>
                <div className="flex gap-1.5">
                  {[30, 50, 70].map((pct) => (
                    <button
                      key={pct}
                      onClick={() => setRuinThresholdPct(pct)}
                      className={`flex-1 py-1 rounded text-[11px] font-bold ${
                        ruinThresholdPct === pct ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      -{pct}%
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-slate-400">Sequence Horizon:</span>
                  <span className="text-cyan-400 font-bold">{tradeHorizon} Trades</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  step="5"
                  value={tradeHorizon}
                  onChange={(e) => setTradeHorizon(parseInt(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>

              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-slate-400">Initial Account Capital:</span>
                  <span className="text-emerald-400 font-bold">${bootstrapCapital.toLocaleString()}</span>
                </div>
                <div className="flex gap-1.5">
                  {[1000, 10000, 50000].map((c) => (
                    <button
                      key={c}
                      onClick={() => setBootstrapCapital(c)}
                      className={`flex-1 py-1 rounded text-[11px] font-bold ${
                        bootstrapCapital === c ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      ${c >= 1000 ? `${c / 1000}k` : c}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bootstrap Key Risk Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
              <span className="text-[11px] font-medium text-slate-400 block uppercase">Probability of Ruin</span>
              <div className={`text-xl font-bold font-mono mt-1 ${
                bootstrapResult.ruinProbabilityPct === 0 
                  ? 'text-emerald-400' 
                  : bootstrapResult.ruinProbabilityPct < 5 
                  ? 'text-amber-400' 
                  : 'text-rose-400'
              }`}>
                {bootstrapResult.ruinProbabilityPct === 0 ? '< 0.02%' : `${bootstrapResult.ruinProbabilityPct}%`}
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                {bootstrapResult.ruinCount} / {bootstrapResult.iterations} paths ruined
              </span>
            </div>

            <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
              <span className="text-[11px] font-medium text-slate-400 block uppercase">Median Max Drawdown</span>
              <div className="text-xl font-bold font-mono text-slate-200 mt-1">
                {bootstrapResult.medianMaxDrawdown}%
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                Typical drawdowns
              </span>
            </div>

            <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
              <span className="text-[11px] font-medium text-slate-400 block uppercase">95th Percentile DD</span>
              <div className="text-xl font-bold font-mono text-amber-400 mt-1">
                {bootstrapResult.p95MaxDrawdown}%
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                99th %tile: {bootstrapResult.p99MaxDrawdown}%
              </span>
            </div>

            <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
              <span className="text-[11px] font-medium text-slate-400 block uppercase">Worst-Case Drawdown</span>
              <div className="text-xl font-bold font-mono text-rose-400 mt-1">
                {bootstrapResult.worstCaseDrawdown}%
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                Tail tail tail loss
              </span>
            </div>

            <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
              <span className="text-[11px] font-medium text-slate-400 block uppercase">Median Final Capital</span>
              <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                ${bootstrapResult.medianFinalEquity.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                p5: ${bootstrapResult.p5FinalEquity.toFixed(0)}
              </span>
            </div>

            <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
              <span className="text-[11px] font-medium text-slate-400 block uppercase">Max Loss Streak</span>
              <div className="text-xl font-bold font-mono text-indigo-400 mt-1">
                {bootstrapResult.maxConsecutiveLosses} Trades
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                p95: {bootstrapResult.p95ConsecutiveLosses} consecutive
              </span>
            </div>
          </div>

          {/* SVG Fan Chart & Drawdown Histogram */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: 25 Bootstrap Sample Curves (8 cols) */}
            <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-amber-400" />
                  Bootstrap Equity Fan ({bootstrapResult.sampleCurves.length} Sample Runs)
                </h3>
                <span className="text-xs font-mono text-slate-400">
                  Horizon: {tradeHorizon} Trades Ahead
                </span>
              </div>

              <div className="overflow-x-auto">
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto">
                  {/* Sample Curves */}
                  {bootstrapResult.sampleCurves.map((curve, idx) => {
                    const dStr = curve.map((val, step) => `${step === 0 ? 'M' : 'L'} ${scaleBsX(step)},${scaleBsY(val)}`).join(' ');
                    return (
                      <path
                        key={idx}
                        d={dStr}
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="1.2"
                        opacity="0.35"
                      />
                    );
                  })}

                  {/* Initial Capital Line */}
                  <line
                    x1={padding.left}
                    y1={scaleBsY(bootstrapCapital)}
                    x2={chartWidth - padding.right}
                    y2={scaleBsY(bootstrapCapital)}
                    stroke="#10b981"
                    strokeDasharray="4 4"
                    strokeWidth="1.5"
                  />
                  <text
                    x={chartWidth - padding.right}
                    y={scaleBsY(bootstrapCapital) - 6}
                    textAnchor="end"
                    fill="#10b981"
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    Capital Anchor: ${bootstrapCapital.toLocaleString()}
                  </text>
                </svg>
              </div>
            </div>

            {/* Right: Drawdown Histogram Distribution (4 cols) */}
            <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="border-b border-slate-800/80 pb-3">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  Drawdown Frequency Matrix
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Probability mass distribution across {bootstrapIterations.toLocaleString()} iterations
                </p>
              </div>

              <div className="space-y-3 font-mono text-xs">
                {bootstrapResult.drawdownBuckets.map((bucket) => {
                  const isSevere = bucket.range.includes('50%');
                  return (
                    <div key={bucket.range} className="space-y-1">
                      <div className="flex justify-between text-slate-300 text-[11px]">
                        <span>{bucket.range}</span>
                        <span className={isSevere && bucket.count > 0 ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                          {bucket.pct}% ({bucket.count})
                        </span>
                      </div>
                      <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isSevere 
                              ? 'bg-rose-500' 
                              : bucket.range.includes('30%') || bucket.range.includes('40%')
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, bucket.pct * 1.5)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
