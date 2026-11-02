import React, { useState, useMemo } from 'react';
import { CandleData } from '../types';
import { 
  ShieldAlert, 
  TrendingDown, 
  TrendingUp, 
  AlertTriangle, 
  Activity, 
  BarChart3, 
  DollarSign, 
  Percent, 
  HelpCircle, 
  Sliders, 
  ShieldCheck, 
  Zap,
  Clock,
  ArrowRight
} from 'lucide-react';

interface RiskManagementTabProps {
  candles: CandleData[];
  currentPrice: number;
}

export const RiskManagementTab: React.FC<RiskManagementTabProps> = ({ candles, currentPrice }) => {
  // Configurable holdings and risk parameters
  const [btcAmount, setBtcAmount] = useState<number>(0.125); // Default holdings from portfolio
  const [confidenceLevel, setConfidenceLevel] = useState<90 | 95 | 99>(95);
  const [holdingPeriodDays, setHoldingPeriodDays] = useState<1 | 7 | 14 | 30>(1);
  const [annualRiskFreeRate, setAnnualRiskFreeRate] = useState<number>(4.0); // 4% default risk-free rate

  // Calculate position value in USD
  const positionValueUsd = btcAmount * currentPrice;

  // Quantitative computations from historical candle returns
  const metrics = useMemo(() => {
    if (!candles || candles.length < 2) {
      return {
        returns: [],
        meanDailyReturn: 0,
        dailyVolatility: 0,
        annualizedReturn: 0,
        annualizedVol: 0,
        historicalVaRPct: 0,
        historicalVaRUsd: 0,
        parametricVaRPct: 0,
        parametricVaRUsd: 0,
        cvarPct: 0,
        cvarUsd: 0,
        sharpeRatio: 0,
        sortinoRatio: 0,
        maxDrawdown: 0,
        calmarRatio: 0,
        drawdownSeries: []
      };
    }

    // 1. Calculate Daily Simple Returns
    const returns: number[] = [];
    for (let i = 1; i < candles.length; i++) {
      const prevClose = candles[i - 1].close;
      const curClose = candles[i].close;
      if (prevClose > 0) {
        returns.push((curClose - prevClose) / prevClose);
      }
    }

    const n = returns.length;
    const sum = returns.reduce((acc, r) => acc + r, 0);
    const meanDailyReturn = sum / n;

    // Variance and Standard Deviation (Daily Volatility)
    const variance = returns.reduce((acc, r) => acc + Math.pow(r - meanDailyReturn, 2), 0) / (n - 1);
    const dailyVolatility = Math.sqrt(variance);

    // Downside Deviation (for Sortino Ratio)
    const dailyRf = (annualRiskFreeRate / 100) / 365;
    const negativeDeviations = returns.filter((r) => r < dailyRf);
    const downsideVariance = negativeDeviations.reduce((acc, r) => acc + Math.pow(r - dailyRf, 2), 0) / (n - 1);
    const downsideVolatility = Math.sqrt(downsideVariance || 0.0001);

    // Annualized Metrics
    const annualizedReturn = Math.pow(1 + meanDailyReturn, 365) - 1;
    const annualizedVol = dailyVolatility * Math.sqrt(365);

    // 2. Sharpe Ratio
    const dailySharpe = dailyVolatility > 0 ? (meanDailyReturn - dailyRf) / dailyVolatility : 0;
    const sharpeRatio = dailySharpe * Math.sqrt(365);

    // 3. Sortino Ratio
    const dailySortino = downsideVolatility > 0 ? (meanDailyReturn - dailyRf) / downsideVolatility : 0;
    const sortinoRatio = dailySortino * Math.sqrt(365);

    // 4. Value at Risk (VaR)
    // Z-score for Parametric VaR
    const zScores: Record<number, number> = { 90: 1.282, 95: 1.645, 99: 2.326 };
    const z = zScores[confidenceLevel] || 1.645;
    const horizonMultiplier = Math.sqrt(holdingPeriodDays);

    // Parametric VaR: - (mu * dt - z * sigma * sqrt(dt))
    const parametricVaRPct = Math.max(0, -(meanDailyReturn * holdingPeriodDays - z * dailyVolatility * horizonMultiplier)) * 100;
    const parametricVaRUsd = (parametricVaRPct / 100) * positionValueUsd;

    // Historical VaR: Percentile of actual sorted returns
    const sortedReturns = [...returns].sort((a, b) => a - b);
    const alphaPct = (100 - confidenceLevel) / 100;
    const cutoffIndex = Math.max(0, Math.floor(n * alphaPct));
    const historicalLossReturn = sortedReturns[cutoffIndex]; // negative number
    const historicalVaRPct = Math.max(0, -historicalLossReturn * horizonMultiplier * 100);
    const historicalVaRUsd = (historicalVaRPct / 100) * positionValueUsd;

    // Expected Shortfall (CVaR): Average loss beyond the VaR threshold
    const tailLosses = sortedReturns.slice(0, cutoffIndex + 1);
    const meanTailLoss = tailLosses.length > 0 ? tailLosses.reduce((a, b) => a + b, 0) / tailLosses.length : historicalLossReturn;
    const cvarPct = Math.max(0, -meanTailLoss * horizonMultiplier * 100);
    const cvarUsd = (cvarPct / 100) * positionValueUsd;

    // 5. Historical Maximum Drawdown & Series
    let peak = candles[0].close;
    let maxDrawdown = 0;
    const drawdownSeries: Array<{ date: string; dd: number }> = [];

    candles.forEach((c) => {
      if (c.close > peak) {
        peak = c.close;
      }
      const dd = ((peak - c.close) / peak) * 100;
      if (dd > maxDrawdown) {
        maxDrawdown = dd;
      }
      drawdownSeries.push({ date: c.timestamp, dd: -dd });
    });

    // Calmar Ratio: Annualized Return / Max Drawdown
    const calmarRatio = maxDrawdown > 0 ? (annualizedReturn * 100) / maxDrawdown : 0;

    return {
      returns,
      meanDailyReturn,
      dailyVolatility,
      annualizedReturn,
      annualizedVol,
      historicalVaRPct,
      historicalVaRUsd,
      parametricVaRPct,
      parametricVaRUsd,
      cvarPct,
      cvarUsd,
      sharpeRatio,
      sortinoRatio,
      maxDrawdown,
      calmarRatio,
      drawdownSeries
    };
  }, [candles, currentPrice, positionValueUsd, confidenceLevel, holdingPeriodDays, annualRiskFreeRate]);

  // Distribution histogram buckets for returns
  const histogramBuckets = useMemo(() => {
    if (metrics.returns.length === 0) return [];

    const numBuckets = 16;
    const minR = Math.min(...metrics.returns);
    const maxR = Math.max(...metrics.returns);
    const range = maxR - minR || 0.1;
    const bucketWidth = range / numBuckets;

    const buckets = Array.from({ length: numBuckets }, (_, i) => ({
      min: minR + i * bucketWidth,
      max: minR + (i + 1) * bucketWidth,
      mid: minR + (i + 0.5) * bucketWidth,
      count: 0
    }));

    metrics.returns.forEach((r) => {
      let bIdx = Math.floor((r - minR) / bucketWidth);
      if (bIdx >= numBuckets) bIdx = numBuckets - 1;
      if (bIdx < 0) bIdx = 0;
      buckets[bIdx].count++;
    });

    return buckets;
  }, [metrics.returns]);

  const maxBucketCount = useMemo(() => {
    return Math.max(...histogramBuckets.map((b) => b.count), 1);
  }, [histogramBuckets]);

  // SVG dimensions for underwater drawdown chart
  const ddWidth = 900;
  const ddHeight = 160;
  const ddPadding = { top: 15, right: 35, bottom: 25, left: 55 };

  const ddPointsCount = metrics.drawdownSeries.length;
  const ddScaleX = (idx: number) => ddPadding.left + (idx / (ddPointsCount - 1 || 1)) * (ddWidth - ddPadding.left - ddPadding.right);
  const ddScaleY = (val: number) => {
    // val is 0 to -maxDrawdown
    const minDd = -Math.max(10, metrics.maxDrawdown * 1.1);
    return ddPadding.top + ((0 - val) / (0 - minDd || 1)) * (ddHeight - ddPadding.top - ddPadding.bottom);
  };

  const ddAreaPath = useMemo(() => {
    if (metrics.drawdownSeries.length === 0) return '';
    const top = metrics.drawdownSeries.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${ddScaleX(i)},${ddScaleY(pt.dd)}`).join(' ');
    const close = `L ${ddScaleX(ddPointsCount - 1)},${ddScaleY(0)} L ${ddScaleX(0)},${ddScaleY(0)} Z`;
    return `${top} ${close}`;
  }, [metrics.drawdownSeries, ddPointsCount, metrics.maxDrawdown]);

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-rose-950/20 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold mb-2 font-mono">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              Institutional Risk Engine
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Value at Risk (VaR) &amp; Sharpe Ratio Analytics
            </h2>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Empirical downside risk estimation, tail-risk Expected Shortfall (CVaR), and risk-adjusted return ratios calculated dynamically from historical Bitcoin candles and real-time portfolio holdings.
            </p>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl font-mono text-xs text-right space-y-1">
            <span className="text-slate-400">Position Value:</span>
            <div className="text-lg font-bold text-emerald-400">
              ${positionValueUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-400">
              {btcAmount.toFixed(4)} BTC @ ${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Holdings and Risk Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-5 mt-4 border-t border-slate-800/80 font-mono text-xs">
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
            <span className="text-slate-400 block mb-1">BTC Holdings</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.01"
                min="0.001"
                value={btcAmount}
                onChange={(e) => setBtcAmount(Math.max(0.001, Number(e.target.value)))}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white font-bold w-full text-right focus:border-rose-500 focus:outline-none"
              />
              <span className="text-slate-400 font-semibold">BTC</span>
            </div>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
            <div className="flex justify-between items-center mb-1">
              <span className="text-slate-400">Confidence Level:</span>
              <span className="text-rose-400 font-bold">{confidenceLevel}%</span>
            </div>
            <div className="flex gap-1">
              {([90, 95, 99] as const).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setConfidenceLevel(lvl)}
                  className={`flex-1 py-1 rounded text-xs font-bold transition-all ${
                    confidenceLevel === lvl
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  {lvl}%
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
            <div className="flex justify-between items-center mb-1">
              <span className="text-slate-400">Holding Period:</span>
              <span className="text-cyan-400 font-bold">{holdingPeriodDays}d Horizon</span>
            </div>
            <div className="flex gap-1">
              {([1, 7, 14, 30] as const).map((days) => (
                <button
                  key={days}
                  onClick={() => setHoldingPeriodDays(days)}
                  className={`flex-1 py-1 rounded text-xs font-bold transition-all ${
                    holdingPeriodDays === days
                      ? 'bg-cyan-600 text-white shadow-sm'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  {days}d
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
            <div className="flex justify-between items-center mb-1">
              <span className="text-slate-400">Risk-Free Rate:</span>
              <span className="text-amber-400 font-bold">{annualRiskFreeRate.toFixed(1)}% p.a.</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="10.0"
              step="0.5"
              value={annualRiskFreeRate}
              onChange={(e) => setAnnualRiskFreeRate(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Primary Quantitative Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Parametric VaR Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Parametric VaR ({confidenceLevel}%)</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-lg font-bold font-mono text-rose-400 mt-0.5">
            ${metrics.parametricVaRUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] font-mono text-slate-400">
            -{metrics.parametricVaRPct.toFixed(2)}% over {holdingPeriodDays}d
          </div>
        </div>

        {/* Historical VaR Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Historical VaR ({confidenceLevel}%)</span>
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-lg font-bold font-mono text-amber-400 mt-0.5">
            ${metrics.historicalVaRUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] font-mono text-slate-400">
            -{metrics.historicalVaRPct.toFixed(2)}% quantile cutoff
          </div>
        </div>

        {/* Expected Shortfall (CVaR) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Expected Shortfall (CVaR)</span>
            <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="text-lg font-bold font-mono text-rose-500 mt-0.5">
            ${metrics.cvarUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] font-mono text-slate-400">
            -{metrics.cvarPct.toFixed(2)}% tail average
          </div>
        </div>

        {/* Sharpe Ratio Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Annualized Sharpe</span>
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className={`text-lg font-bold font-mono mt-0.5 ${metrics.sharpeRatio >= 1.0 ? 'text-emerald-400' : metrics.sharpeRatio >= 0 ? 'text-amber-400' : 'text-rose-400'}`}>
            {metrics.sharpeRatio.toFixed(2)}x
          </div>
          <div className="text-[10px] text-slate-400">
            {metrics.sharpeRatio >= 2.0 ? 'Exceptional' : metrics.sharpeRatio >= 1.0 ? 'Good risk-adjusted' : 'Sub-optimal'}
          </div>
        </div>

        {/* Sortino Ratio Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Sortino Ratio</span>
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-lg font-bold font-mono text-cyan-400 mt-0.5">
            {metrics.sortinoRatio.toFixed(2)}x
          </div>
          <div className="text-[10px] text-slate-400">
            Downside penalization only
          </div>
        </div>

        {/* Max Drawdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Historical Max DD</span>
            <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-lg font-bold font-mono text-rose-400 mt-0.5">
            -{metrics.maxDrawdown.toFixed(2)}%
          </div>
          <div className="text-[10px] text-slate-400">
            Calmar: {metrics.calmarRatio.toFixed(2)}x
          </div>
        </div>
      </div>

      {/* Returns Distribution & VaR Cutoff Histogram */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-rose-400" />
              Daily Return Distribution &amp; Value at Risk Thresholds
            </h3>
            <p className="text-xs text-slate-400">
              Histogram of daily returns showing empirical distribution frequency and left-tail loss thresholds
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-rose-400 font-semibold">
              <span className="w-2.5 h-2.5 bg-rose-500 rounded-sm" />
              VaR Left-Tail (Loss Region)
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm" />
              Normal / Profit Region
            </span>
          </div>
        </div>

        {/* Histogram Bar Graphic */}
        <div className="grid grid-cols-16 gap-1.5 h-44 items-end pt-4 px-2 pb-2 bg-slate-950/70 rounded-xl border border-slate-800/80">
          {histogramBuckets.map((b, idx) => {
            const heightPct = (b.count / maxBucketCount) * 100;
            const isTail = b.mid < -(metrics.historicalVaRPct / 100);
            const isPositive = b.mid >= 0;

            return (
              <div
                key={idx}
                className="flex flex-col items-center gap-1 h-full justify-end group relative"
              >
                <div
                  className={`w-full rounded-t transition-all ${
                    isTail 
                      ? 'bg-rose-500 group-hover:bg-rose-400 shadow-sm shadow-rose-500/30' 
                      : isPositive 
                      ? 'bg-emerald-500/80 group-hover:bg-emerald-400' 
                      : 'bg-amber-500/80 group-hover:bg-amber-400'
                  }`}
                  style={{ height: `${Math.max(4, heightPct)}%` }}
                />

                {/* Tooltip on hover */}
                <div className="absolute -top-12 z-20 hidden group-hover:flex flex-col items-center bg-slate-900 border border-slate-700 p-1.5 rounded text-[10px] text-white font-mono whitespace-nowrap shadow-xl">
                  <span>Return: {(b.mid * 100).toFixed(1)}%</span>
                  <span className="text-slate-400">{b.count} days</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 px-2">
          <span>Worst Historical Loss: {((Math.min(...metrics.returns, 0)) * 100).toFixed(2)}%</span>
          <span>Zero Line (0.00%)</span>
          <span>Best Historical Gain: {((Math.max(...metrics.returns, 0)) * 100).toFixed(2)}%</span>
        </div>
      </div>

      {/* Historical Underwater Drawdown Chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-rose-400" />
              Historical Underwater Drawdown Curve
            </h3>
            <p className="text-xs text-slate-400">
              Depth and duration of historical capital drawdowns relative to all-time highs
            </p>
          </div>
          <span className="text-xs font-mono text-rose-400 font-bold">
            Max Peak Drop: -{metrics.maxDrawdown.toFixed(2)}%
          </span>
        </div>

        {/* SVG Underwater Drawdown */}
        <div className="w-full overflow-x-auto">
          <svg viewBox={`0 0 ${ddWidth} ${ddHeight}`} className="w-full h-auto min-w-[700px]">
            <defs>
              <linearGradient id="underwaterGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.05" />
              </linearGradient>
            </defs>

            {/* Zero Line */}
            <line
              x1={ddPadding.left}
              y1={ddScaleY(0)}
              x2={ddWidth - ddPadding.right}
              y2={ddScaleY(0)}
              stroke="#64748b"
              strokeWidth="1"
            />
            <text
              x={ddPadding.left - 8}
              y={ddScaleY(0) + 3}
              textAnchor="end"
              fill="#94a3b8"
              fontSize="10"
              fontFamily="monospace"
            >
              0%
            </text>

            {/* Max Drawdown Threshold Reference */}
            <line
              x1={ddPadding.left}
              y1={ddScaleY(-metrics.maxDrawdown)}
              x2={ddWidth - ddPadding.right}
              y2={ddScaleY(-metrics.maxDrawdown)}
              stroke="#f43f5e"
              strokeDasharray="4 4"
              strokeWidth="1"
              opacity="0.7"
            />
            <text
              x={ddPadding.left - 8}
              y={ddScaleY(-metrics.maxDrawdown) + 3}
              textAnchor="end"
              fill="#f43f5e"
              fontSize="10"
              fontFamily="monospace"
            >
              -{Math.round(metrics.maxDrawdown)}%
            </text>

            {/* Shaded Underwater Area */}
            <path
              d={ddAreaPath}
              fill="url(#underwaterGrad)"
              stroke="#f43f5e"
              strokeWidth="1.5"
            />
          </svg>
        </div>
      </div>

      {/* Stress Testing & Scenario Shock Simulator */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-800">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          Portfolio Scenario Stress Testing (Shock Analysis)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
          <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-bold text-rose-400">Flash Crash (-10%)</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                Severe Dip
              </span>
            </div>
            <div className="text-slate-300">
              BTC Price: ${Math.round(currentPrice * 0.90).toLocaleString()}
            </div>
            <div className="text-base font-bold text-rose-400">
              -${(positionValueUsd * 0.10).toFixed(2)} USD
            </div>
            <p className="text-[10px] text-slate-500 font-sans">
              Expected loss on {btcAmount} BTC holding during rapid liquidity drain.
            </p>
          </div>

          <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-bold text-rose-500">Black Swan (-25%)</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                Extreme Shock
              </span>
            </div>
            <div className="text-slate-300">
              BTC Price: ${Math.round(currentPrice * 0.75).toLocaleString()}
            </div>
            <div className="text-base font-bold text-rose-500">
              -${(positionValueUsd * 0.25).toFixed(2)} USD
            </div>
            <p className="text-[10px] text-slate-500 font-sans">
              Historical macro capitulation shock (e.g. Luna / FTX collapse magnitude).
            </p>
          </div>

          <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-bold text-emerald-400">Bull Expansion (+20%)</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Breakout Surge
              </span>
            </div>
            <div className="text-slate-300">
              BTC Price: ${Math.round(currentPrice * 1.20).toLocaleString()}
            </div>
            <div className="text-base font-bold text-emerald-400">
              +${(positionValueUsd * 0.20).toFixed(2)} USD
            </div>
            <p className="text-[10px] text-slate-500 font-sans">
              Upside equity expansion if BTC breaks resistance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
