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
  ArrowRight,
  Calendar,
  Filter,
  Check,
  Flag,
  Layers,
  History,
  Target,
  Network,
  Grid3X3,
  Info
} from 'lucide-react';

interface RiskManagementTabProps {
  candles: CandleData[];
  currentPrice: number;
}

export const RiskManagementTab: React.FC<RiskManagementTabProps> = ({ candles, currentPrice }) => {
  // Configurable holdings and risk parameters
  const [btcAmount, setBtcAmount] = useState<number>(0.125); // Default holdings from portfolio
  const [confidenceLevel, setConfidenceLevel] = useState<90 | 95 | 99>(95);
  const [annualRiskFreeRate, setAnnualRiskFreeRate] = useState<number>(4.0); // 4% default risk-free rate

  // Custom Horizon (Forward Holding Period in Days)
  const [holdingPeriodDays, setHoldingPeriodDays] = useState<number>(1);
  const [isCustomHorizon, setIsCustomHorizon] = useState<boolean>(false);

  // Custom Historical Lookback Window / Date Range Filter
  const minDate = candles[0]?.timestamp?.split(' ')[0] || '2026-01-15';
  const maxDate = candles[candles.length - 1]?.timestamp?.split(' ')[0] || '2026-03-05';

  const [lookbackMode, setLookbackMode] = useState<'all' | '14d' | '30d' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState<string>(minDate);
  const [customEndDate, setCustomEndDate] = useState<string>(maxDate);

  // Interactive Hover State for Drawdown Tracker
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Interactive Selected Cell in Correlation Matrix
  const [selectedCorrPair, setSelectedCorrPair] = useState<{ row: number; col: number } | null>({ row: 0, col: 2 });

  // Filter historical candles based on selected period
  const activeCandles = useMemo(() => {
    if (!candles || candles.length === 0) return [];

    if (lookbackMode === '14d') {
      return candles.slice(-14);
    }
    if (lookbackMode === '30d') {
      return candles.slice(-30);
    }
    if (lookbackMode === 'custom') {
      const filtered = candles.filter((c) => {
        const d = c.timestamp.split(' ')[0];
        return d >= customStartDate && d <= customEndDate;
      });
      return filtered.length >= 2 ? filtered : candles;
    }
    return candles;
  }, [candles, lookbackMode, customStartDate, customEndDate]);

  // Calculate position value in USD
  const positionValueUsd = btcAmount * currentPrice;

  // Quantitative computations & Maximum Drawdown (MDD) tracking
  const metrics = useMemo(() => {
    if (!activeCandles || activeCandles.length < 2) {
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
        drawdownSeries: [],
        mddPeak: 0,
        mddPeakDate: '',
        mddPeakIdx: 0,
        mddTrough: 0,
        mddTroughDate: '',
        mddTroughIdx: 0,
        mddLossPerBtc: 0,
        mddLossPosition: 0,
        declineDays: 0,
        recoveryDays: null as number | null,
        recoveryDate: null as string | null,
        isRecovered: false,
        athPrice: 0,
        currentDdPct: 0,
        currentDdUsd: 0,
        ulcerIndex: 0,
        drawdownEpisodes: []
      };
    }

    // 1. Calculate Daily Simple Returns
    const returns: number[] = [];
    for (let i = 1; i < activeCandles.length; i++) {
      const prevClose = activeCandles[i - 1].close;
      const curClose = activeCandles[i].close;
      if (prevClose > 0) {
        returns.push((curClose - prevClose) / prevClose);
      }
    }

    const n = returns.length;
    const sum = returns.reduce((acc, r) => acc + r, 0);
    const meanDailyReturn = sum / n;

    // Variance and Standard Deviation (Daily Volatility)
    const variance = returns.reduce((acc, r) => acc + Math.pow(r - meanDailyReturn, 2), 0) / (n - 1 || 1);
    const dailyVolatility = Math.sqrt(variance);

    // Downside Deviation (for Sortino Ratio)
    const dailyRf = (annualRiskFreeRate / 100) / 365;
    const negativeDeviations = returns.filter((r) => r < dailyRf);
    const downsideVariance = negativeDeviations.reduce((acc, r) => acc + Math.pow(r - dailyRf, 2), 0) / (n - 1 || 1);
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
    const zScores: Record<number, number> = { 90: 1.282, 95: 1.645, 99: 2.326 };
    const z = zScores[confidenceLevel] || 1.645;
    const horizonMultiplier = Math.sqrt(Math.max(1, holdingPeriodDays));

    const parametricVaRPct = Math.max(0, -(meanDailyReturn * holdingPeriodDays - z * dailyVolatility * horizonMultiplier)) * 100;
    const parametricVaRUsd = (parametricVaRPct / 100) * positionValueUsd;

    const sortedReturns = [...returns].sort((a, b) => a - b);
    const alphaPct = (100 - confidenceLevel) / 100;
    const cutoffIndex = Math.max(0, Math.floor(n * alphaPct));
    const historicalLossReturn = sortedReturns[cutoffIndex] ?? -0.02;
    const historicalVaRPct = Math.max(0, -historicalLossReturn * horizonMultiplier * 100);
    const historicalVaRUsd = (historicalVaRPct / 100) * positionValueUsd;

    const tailLosses = sortedReturns.slice(0, cutoffIndex + 1);
    const meanTailLoss = tailLosses.length > 0 ? tailLosses.reduce((a, b) => a + b, 0) / tailLosses.length : historicalLossReturn;
    const cvarPct = Math.max(0, -meanTailLoss * horizonMultiplier * 100);
    const cvarUsd = (cvarPct / 100) * positionValueUsd;

    // 5. MAXIMUM DRAWDOWN (MDD) DETAILED TRACKER
    let peak = activeCandles[0].close;
    let peakDate = activeCandles[0].timestamp;
    let peakIdx = 0;

    let maxDrawdown = 0;
    let mddPeak = activeCandles[0].close;
    let mddPeakDate = activeCandles[0].timestamp;
    let mddPeakIdx = 0;
    let mddTrough = activeCandles[0].close;
    let mddTroughDate = activeCandles[0].timestamp;
    let mddTroughIdx = 0;

    let sumSquaredDd = 0;
    const drawdownSeries: Array<{
      date: string;
      price: number;
      peak: number;
      dd: number;
      lossUsd: number;
    }> = [];

    activeCandles.forEach((c, idx) => {
      if (c.close > peak) {
        peak = c.close;
        peakDate = c.timestamp;
        peakIdx = idx;
      }
      const dd = ((peak - c.close) / peak) * 100;
      sumSquaredDd += Math.pow(dd, 2);

      if (dd > maxDrawdown) {
        maxDrawdown = dd;
        mddPeak = peak;
        mddPeakDate = peakDate;
        mddPeakIdx = peakIdx;
        mddTrough = c.close;
        mddTroughDate = c.timestamp;
        mddTroughIdx = idx;
      }

      drawdownSeries.push({
        date: c.timestamp,
        price: c.close,
        peak,
        dd: -dd,
        lossUsd: (peak - c.close) * btcAmount
      });
    });

    // Check if price recovered from worst MDD trough
    let recoveryDate: string | null = null;
    let recoveryIdx: number | null = null;
    for (let i = mddTroughIdx + 1; i < activeCandles.length; i++) {
      if (activeCandles[i].close >= mddPeak) {
        recoveryDate = activeCandles[i].timestamp;
        recoveryIdx = i;
        break;
      }
    }

    const declineDays = mddTroughIdx - mddPeakIdx;
    const recoveryDays = recoveryIdx !== null ? recoveryIdx - mddTroughIdx : null;
    const isRecovered = recoveryIdx !== null;

    const mddLossPerBtc = mddPeak - mddTrough;
    const mddLossPosition = mddLossPerBtc * btcAmount;

    // Ulcer Index: sqrt(sum(dd^2) / N)
    const ulcerIndex = Math.sqrt(sumSquaredDd / (activeCandles.length || 1));

    // Calmar Ratio: Annualized Return / Max Drawdown
    const calmarRatio = maxDrawdown > 0 ? (annualizedReturn * 100) / maxDrawdown : 0;

    // Current drawdown from ATH
    const athPrice = Math.max(...activeCandles.map((c) => c.close));
    const currentDdPct = athPrice > 0 ? ((athPrice - currentPrice) / athPrice) * 100 : 0;
    const currentDdUsd = (currentDdPct / 100) * positionValueUsd;

    // Top Historical Drawdown Episodes List
    const drawdownEpisodes: Array<{
      rank: number;
      peakDate: string;
      peakPrice: number;
      troughDate: string;
      troughPrice: number;
      dropPct: number;
      dropUsd: number;
      declineDays: number;
      status: string;
    }> = [
      {
        rank: 1,
        peakDate: mddPeakDate,
        peakPrice: mddPeak,
        troughDate: mddTroughDate,
        troughPrice: mddTrough,
        dropPct: maxDrawdown,
        dropUsd: mddLossPosition,
        declineDays: declineDays,
        status: isRecovered ? `Recovered in ${recoveryDays}d` : 'Active / Unrecovered'
      }
    ];

    // Identify second worst distinct drawdown episode if applicable
    let secondWorstDd = 0;
    let sPeak = activeCandles[0].close;
    let sPeakDate = activeCandles[0].timestamp;
    let sTrough = activeCandles[0].close;
    let sTroughDate = activeCandles[0].timestamp;
    let sDeclineDays = 0;

    let curP = activeCandles[0].close;
    let curPDate = activeCandles[0].timestamp;
    let curPIdx = 0;

    activeCandles.forEach((c, idx) => {
      if (c.close > curP) {
        curP = c.close;
        curPDate = c.timestamp;
        curPIdx = idx;
      }
      const dd = ((curP - c.close) / curP) * 100;
      if ((idx < mddPeakIdx || idx > (recoveryIdx ?? activeCandles.length - 1)) && dd > secondWorstDd) {
        secondWorstDd = dd;
        sPeak = curP;
        sPeakDate = curPDate;
        sTrough = c.close;
        sTroughDate = c.timestamp;
        sDeclineDays = idx - curPIdx;
      }
    });

    if (secondWorstDd > 2.0) {
      drawdownEpisodes.push({
        rank: 2,
        peakDate: sPeakDate,
        peakPrice: sPeak,
        troughDate: sTroughDate,
        troughPrice: sTrough,
        dropPct: secondWorstDd,
        dropUsd: (sPeak - sTrough) * btcAmount,
        declineDays: sDeclineDays,
        status: 'Recovered'
      });
    }

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
      drawdownSeries,
      mddPeak,
      mddPeakDate,
      mddPeakIdx,
      mddTrough,
      mddTroughDate,
      mddTroughIdx,
      mddLossPerBtc,
      mddLossPosition,
      declineDays,
      recoveryDays,
      recoveryDate,
      isRecovered,
      athPrice,
      currentDdPct,
      currentDdUsd,
      ulcerIndex,
      drawdownEpisodes
    };
  }, [activeCandles, currentPrice, positionValueUsd, btcAmount, confidenceLevel, holdingPeriodDays, annualRiskFreeRate]);

  // -------------------------------------------------------------
  // CORRELATION MATRIX CALCULATIONS
  // Variables: BTC Return vs Historical Volatility Metrics
  // -------------------------------------------------------------
  const corrData = useMemo(() => {
    if (!activeCandles || activeCandles.length < 5) return null;

    // Helper for Pearson correlation
    function calcPearson(x: number[], y: number[]): number {
      const len = Math.min(x.length, y.length);
      if (len < 2) return 0;
      const xSlice = x.slice(0, len);
      const ySlice = y.slice(0, len);
      const meanX = xSlice.reduce((a, b) => a + b, 0) / len;
      const meanY = ySlice.reduce((a, b) => a + b, 0) / len;

      let num = 0;
      let denX = 0;
      let denY = 0;
      for (let i = 0; i < len; i++) {
        const dx = xSlice[i] - meanX;
        const dy = ySlice[i] - meanY;
        num += dx * dy;
        denX += dx * dx;
        denY += dy * dy;
      }
      const den = Math.sqrt(denX * denY);
      if (den === 0) return 0;
      return Math.max(-1, Math.min(1, num / den));
    }

    // Prepare time series arrays starting from candle index 1
    const retArr: number[] = [];
    const vol7Arr: number[] = [];
    const vol14Arr: number[] = [];
    const rangeArr: number[] = [];
    const bbWidthArr: number[] = [];
    const volumeArr: number[] = [];
    const ddArr: number[] = [];

    let runningAth = activeCandles[0].close;

    for (let i = 1; i < activeCandles.length; i++) {
      const prevC = activeCandles[i - 1].close;
      const curC = activeCandles[i].close;
      const ret = prevC > 0 ? ((curC - prevC) / prevC) * 100 : 0;
      retArr.push(ret);

      // Intraday True Range %
      const high = activeCandles[i].high;
      const low = activeCandles[i].low;
      const range = curC > 0 ? ((high - low) / curC) * 100 : 0;
      rangeArr.push(range);

      // Volume
      volumeArr.push(activeCandles[i].volume || 1);

      // Bollinger Bandwidth %
      const bbMid = activeCandles[i].bbMid || curC;
      const bbUpper = activeCandles[i].bbUpper || curC * 1.02;
      const bbLower = activeCandles[i].bbLower || curC * 0.98;
      const bbWidth = bbMid > 0 ? ((bbUpper - bbLower) / bbMid) * 100 : 0;
      bbWidthArr.push(bbWidth);

      // Running Drawdown %
      if (curC > runningAth) runningAth = curC;
      const dd = runningAth > 0 ? ((runningAth - curC) / runningAth) * 100 : 0;
      ddArr.push(dd);

      // 7-day Rolling Volatility
      const start7 = Math.max(0, retArr.length - 7);
      const slice7 = retArr.slice(start7);
      const m7 = slice7.reduce((a, b) => a + b, 0) / slice7.length;
      const var7 = slice7.reduce((a, b) => a + Math.pow(b - m7, 2), 0) / (slice7.length || 1);
      vol7Arr.push(Math.sqrt(var7));

      // 14-day Rolling Volatility
      const start14 = Math.max(0, retArr.length - 14);
      const slice14 = retArr.slice(start14);
      const m14 = slice14.reduce((a, b) => a + b, 0) / slice14.length;
      const var14 = slice14.reduce((a, b) => a + Math.pow(b - m14, 2), 0) / (slice14.length || 1);
      vol14Arr.push(Math.sqrt(var14));
    }

    const variables = [
      { id: 'ret', label: 'BTC Return', desc: 'Daily % price change', data: retArr },
      { id: 'vol7', label: '7d Realized Vol', desc: '7-day rolling return volatility', data: vol7Arr },
      { id: 'vol14', label: '14d Realized Vol', desc: '14-day rolling return volatility', data: vol14Arr },
      { id: 'range', label: 'Intraday Range', desc: '(High - Low) / Close spread', data: rangeArr },
      { id: 'bbWidth', label: 'BB Bandwidth', desc: 'Bollinger envelope expansion', data: bbWidthArr },
      { id: 'volume', label: 'Trading Volume', desc: 'Daily market dollar volume', data: volumeArr },
      { id: 'dd', label: 'ATH Drawdown', desc: 'Distance below running peak', data: ddArr }
    ];

    // Compute NxN correlation matrix
    const matrix: number[][] = [];
    for (let r = 0; r < variables.length; r++) {
      const row: number[] = [];
      for (let c = 0; c < variables.length; c++) {
        if (r === c) {
          row.push(1.0);
        } else {
          row.push(calcPearson(variables[r].data, variables[c].data));
        }
      }
      matrix.push(row);
    }

    return { variables, matrix };
  }, [activeCandles]);

  // Helper color for correlation cell
  const getCorrColor = (val: number) => {
    if (val >= 0.7) return 'bg-emerald-500/35 text-emerald-200 border-emerald-500/50 font-bold';
    if (val >= 0.3) return 'bg-teal-500/20 text-teal-300 border-teal-500/30';
    if (val > -0.3 && val < 0.3) return 'bg-slate-950/70 text-slate-400 border-slate-800';
    if (val <= -0.7) return 'bg-rose-500/35 text-rose-200 border-rose-500/50 font-bold';
    return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
  };

  // Interpretation helper for selected pair
  const selectedInsight = useMemo(() => {
    if (!corrData || !selectedCorrPair) return null;
    const v1 = corrData.variables[selectedCorrPair.row];
    const v2 = corrData.variables[selectedCorrPair.col];
    const r = corrData.matrix[selectedCorrPair.row][selectedCorrPair.col];
    const r2 = Math.pow(r, 2) * 100;

    let relationship = 'Neutral / Weak Co-movement';
    let explanation = '';

    if (selectedCorrPair.row === selectedCorrPair.col) {
      relationship = 'Perfect Identity Correlation (1.00)';
      explanation = 'Each metric correlates perfectly with itself.';
    } else if (r >= 0.6) {
      relationship = 'Strong Positive Coupling (Direct Co-movement)';
      explanation = `When ${v1.label} expands, ${v2.label} strongly tends to rise alongside it. Explains ${r2.toFixed(1)}% of co-variance.`;
    } else if (r >= 0.25) {
      relationship = 'Moderate Positive Correlation';
      explanation = `Mild tendency for ${v1.label} and ${v2.label} to expand in tandem during directional momentum regimes.`;
    } else if (r <= -0.6) {
      relationship = 'Strong Inverse Decoupling / Asymmetric Response';
      explanation = `When ${v1.label} experiences negative momentum, ${v2.label} surges significantly. Typical of leverage unwinds where volatility escalates on price decline.`;
    } else if (r <= -0.25) {
      relationship = 'Moderate Inverse Correlation';
      explanation = `Inverse tendency between ${v1.label} and ${v2.label}. Serves as an effective hedge indicator in risk sizing.`;
    } else {
      explanation = `Near-zero linear correlation (${r.toFixed(2)}). Indicates ${v1.label} and ${v2.label} behave as statistically independent orthogonal risk dimensions.`;
    }

    return { v1, v2, r, r2, relationship, explanation };
  }, [corrData, selectedCorrPair]);

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

  // SVG dimensions for Dual MDD & Price Corridor Chart
  const svgWidth = 920;
  const priceH = 170;
  const ddH = 140;
  const totalSvgH = priceH + ddH + 20;
  const padding = { top: 25, right: 65, bottom: 25, left: 60 };

  const pointsCount = metrics.drawdownSeries.length;
  const scaleX = (idx: number) => padding.left + (idx / (pointsCount - 1 || 1)) * (svgWidth - padding.left - padding.right);

  // Price Scale Extents
  const { minP, maxP } = useMemo(() => {
    if (metrics.drawdownSeries.length === 0) return { minP: 0, maxP: 100000 };
    const prices = metrics.drawdownSeries.map((d) => d.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const span = max - min || 1000;
    return { minP: Math.max(0, min - span * 0.08), maxP: max + span * 0.08 };
  }, [metrics.drawdownSeries]);

  const scalePriceY = (val: number) => {
    const effH = priceH - padding.top - 10;
    return priceH - 10 - ((val - minP) / (maxP - minP || 1)) * effH;
  };

  // Drawdown Scale Extents (0% to -maxDrawdown * 1.15)
  const minDd = -Math.max(10, metrics.maxDrawdown * 1.15);
  const scaleDdY = (val: number) => {
    const top = priceH + 15;
    const effH = ddH - padding.bottom;
    return top + ((0 - val) / (0 - minDd || 1)) * effH;
  };

  // Price Path
  const priceLinePath = useMemo(() => {
    if (metrics.drawdownSeries.length === 0) return '';
    return metrics.drawdownSeries
      .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i)},${scalePriceY(pt.price)}`)
      .join(' ');
  }, [metrics.drawdownSeries, minP, maxP]);

  // Peak ATH Running Line
  const peakLinePath = useMemo(() => {
    if (metrics.drawdownSeries.length === 0) return '';
    return metrics.drawdownSeries
      .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i)},${scalePriceY(pt.peak)}`)
      .join(' ');
  }, [metrics.drawdownSeries, minP, maxP]);

  // Shaded MDD Decline Corridor on Price Chart
  const mddCorridorPath = useMemo(() => {
    if (metrics.mddPeakIdx >= metrics.mddTroughIdx) return '';
    const slice = metrics.drawdownSeries.slice(metrics.mddPeakIdx, metrics.mddTroughIdx + 1);
    const top = slice.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(metrics.mddPeakIdx + i)},${scalePriceY(metrics.mddPeak)}`).join(' ');
    const btm = slice.slice().reverse().map((pt) => `L ${scaleX(metrics.drawdownSeries.indexOf(pt))},${scalePriceY(pt.price)}`).join(' ');
    return `${top} ${btm} Z`;
  }, [metrics.drawdownSeries, metrics.mddPeakIdx, metrics.mddTroughIdx, metrics.mddPeak, minP, maxP]);

  // Underwater Drawdown Area Path
  const ddAreaPath = useMemo(() => {
    if (metrics.drawdownSeries.length === 0) return '';
    const top = metrics.drawdownSeries.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i)},${scaleDdY(pt.dd)}`).join(' ');
    const close = `L ${scaleX(pointsCount - 1)},${scaleDdY(0)} L ${scaleX(0)},${scaleDdY(0)} Z`;
    return `${top} ${close}`;
  }, [metrics.drawdownSeries, pointsCount, minDd]);

  // Active hovered point
  const activeHover = useMemo(() => {
    if (hoveredIdx !== null && metrics.drawdownSeries[hoveredIdx]) {
      return metrics.drawdownSeries[hoveredIdx];
    }
    return metrics.drawdownSeries[metrics.drawdownSeries.length - 1];
  }, [hoveredIdx, metrics.drawdownSeries]);

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-rose-950/20 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold mb-2 font-mono">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              Maximum Drawdown, VaR &amp; Correlation Analytics
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Value at Risk (VaR), Maximum Drawdown &amp; Volatility Correlation
            </h2>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Analyze historical peak-to-trough capital declines, empirical tail risk (VaR &amp; CVaR), and quantify how Bitcoin price momentum correlates with volatility regime shifts.
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

        {/* Custom Historical Analysis Period Filter Toolbar */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 space-y-3 font-mono text-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-slate-200">Historical Lookback Window:</span>
            </div>

            {/* Presets + Custom Button */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'all', label: 'All History' },
                { id: '14d', label: 'Last 14d' },
                { id: '30d', label: 'Last 30d' },
                { id: 'custom', label: 'Custom Date Range' }
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setLookbackMode(p.id as any)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    lookbackMode === p.id
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date Pickers when 'custom' is active */}
          {lookbackMode === 'custom' && (
            <div className="p-3 bg-slate-950/90 rounded-xl border border-amber-500/30 flex flex-wrap items-center gap-4 animate-fadeIn">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-xs">Start Date:</span>
                <input
                  type="date"
                  min={minDate}
                  max={customEndDate}
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white font-mono text-xs focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-xs">End Date:</span>
                <input
                  type="date"
                  min={customStartDate}
                  max={maxDate}
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white font-mono text-xs focus:border-amber-500 focus:outline-none"
                />
              </div>

              <span className="text-amber-400 text-[11px] ml-auto">
                Evaluating {activeCandles.length} candles in range
              </span>
            </div>
          )}

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
            <span>
              Active Data Scope: <strong className="text-slate-300">{activeCandles[0]?.timestamp?.split(' ')[0]}</strong> to <strong className="text-slate-300">{activeCandles[activeCandles.length - 1]?.timestamp?.split(' ')[0]}</strong>
            </span>
            <span className="text-cyan-400 font-semibold">
              Sample Size: {activeCandles.length} trading sessions
            </span>
          </div>
        </div>

        {/* Holdings and Risk Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4 mt-3 border-t border-slate-800/80 font-mono text-xs">
          {/* BTC Holdings Input */}
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

          {/* Confidence Level */}
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

          {/* Custom Holding Horizon Days */}
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
            <div className="flex justify-between items-center mb-1">
              <span className="text-slate-400">Forward Horizon (VaR):</span>
              <span className="text-cyan-400 font-bold">{holdingPeriodDays}d Horizon</span>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="flex flex-1 gap-1">
                {[1, 7, 14, 30].map((days) => (
                  <button
                    key={days}
                    onClick={() => {
                      setHoldingPeriodDays(days);
                      setIsCustomHorizon(false);
                    }}
                    className={`flex-1 py-1 rounded text-[11px] font-bold transition-all ${
                      holdingPeriodDays === days && !isCustomHorizon
                        ? 'bg-cyan-600 text-white shadow-sm'
                        : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    {days}d
                  </button>
                ))}
              </div>

              <div className="w-20 relative">
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={holdingPeriodDays}
                  onChange={(e) => {
                    const val = Math.max(1, Math.min(365, Number(e.target.value) || 1));
                    setHoldingPeriodDays(val);
                    setIsCustomHorizon(true);
                  }}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white font-bold w-full text-right focus:border-cyan-500 focus:outline-none text-[11px]"
                  placeholder="Custom"
                />
                <span className="absolute right-6 top-1 text-[10px] text-slate-500 pointer-events-none">
                  d
                </span>
              </div>
            </div>
          </div>

          {/* Risk-Free Rate */}
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

      {/* PRIMARY QUANTITATIVE METRIC CARDS */}
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

        {/* Calmar Ratio */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Calmar Ratio</span>
            <AwardIcon />
          </div>
          <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
            {metrics.calmarRatio.toFixed(2)}x
          </div>
          <div className="text-[10px] text-slate-400">
            Annual Return / MDD
          </div>
        </div>
      </div>

      {/* MAXIMUM DRAWDOWN (MDD) EXECUTIVE SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Card 1: Worst Historical Peak-to-Trough Decline */}
        <div className="bg-slate-900 border border-rose-500/30 rounded-2xl p-5 shadow-xl space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-rose-400 flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4 text-rose-500" />
              Maximum Drawdown (MDD)
            </span>
            <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 text-[10px] font-mono font-bold border border-rose-500/30">
              HISTORICAL WORST
            </span>
          </div>

          <div className="text-2xl font-bold font-mono text-rose-400">
            -{metrics.maxDrawdown.toFixed(2)}%
          </div>

          <div className="text-xs font-mono text-slate-300">
            -${metrics.mddLossPosition.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} on your position
          </div>

          <div className="pt-2 border-t border-slate-800 text-[11px] font-mono text-slate-400 space-y-0.5">
            <div>Peak: <strong className="text-white">${metrics.mddPeak.toLocaleString()}</strong> ({metrics.mddPeakDate})</div>
            <div>Trough: <strong className="text-rose-400">${metrics.mddTrough.toLocaleString()}</strong> ({metrics.mddTroughDate})</div>
          </div>
        </div>

        {/* Card 2: Decline & Recovery Duration */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-amber-400 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-400" />
              Drawdown Timeline
            </span>
            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px] font-mono">
              CYCLE DURATION
            </span>
          </div>

          <div className="text-2xl font-bold font-mono text-white">
            {metrics.declineDays} Days
          </div>

          <div className="text-xs text-slate-400">
            Peak to Valley Capitulation
          </div>

          <div className="pt-2 border-t border-slate-800 text-[11px] font-mono text-slate-300 flex items-center justify-between">
            <span>Recovery Status:</span>
            <span className={`font-bold ${metrics.isRecovered ? 'text-emerald-400' : 'text-amber-400'}`}>
              {metrics.isRecovered ? `Recovered in ${metrics.recoveryDays}d` : 'In Drawdown'}
            </span>
          </div>
        </div>

        {/* Card 3: Current Distance from All-Time High */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-cyan-400 flex items-center gap-1.5">
              <Target className="w-4 h-4 text-cyan-400" />
              Current Drop from Peak
            </span>
            <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 text-[10px] font-mono">
              REAL-TIME ATH
            </span>
          </div>

          <div className="text-2xl font-bold font-mono text-slate-100">
            -{metrics.currentDdPct.toFixed(2)}%
          </div>

          <div className="text-xs text-slate-400">
            ATH: ${metrics.athPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>

          <div className="pt-2 border-t border-slate-800 text-[11px] font-mono text-slate-400 flex items-center justify-between">
            <span>Gap to New ATH:</span>
            <span className="text-rose-400 font-bold">-${metrics.currentDdUsd.toFixed(2)} USD</span>
          </div>
        </div>

        {/* Card 4: Ulcer Index & Calmar Ratio */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-purple-400 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-purple-400" />
              Ulcer Index &amp; Calmar
            </span>
            <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 text-[10px] font-mono">
              STRESS SCORE
            </span>
          </div>

          <div className="text-2xl font-bold font-mono text-purple-400">
            {metrics.ulcerIndex.toFixed(2)}
          </div>

          <div className="text-xs text-slate-400">
            Ulcer Index (Depth × Duration)
          </div>

          <div className="pt-2 border-t border-slate-800 text-[11px] font-mono text-slate-300 flex items-center justify-between">
            <span>Calmar Ratio:</span>
            <span className="text-emerald-400 font-bold">{metrics.calmarRatio.toFixed(2)}x</span>
          </div>
        </div>
      </div>

      {/* DUAL INTERACTIVE VISUALIZER: PRICE PEAK-TO-TROUGH CORRIDOR & UNDERWATER CURVE */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-rose-400" />
              Historical Peak-to-Trough Decline &amp; Underwater Drawdown Dual Visualizer
            </h3>
            <p className="text-xs text-slate-400">
              Corridor view showing the exact crash episode from peak to valley and the corresponding underwater drawdown depth
            </p>
          </div>

          {/* Interactive HUD */}
          {activeHover && (
            <div className="p-2 px-3 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono flex items-center gap-4">
              <span>Date: <strong className="text-white">{activeHover.date}</strong></span>
              <span>Price: <strong className="text-slate-200">${Math.round(activeHover.price).toLocaleString()}</strong></span>
              <span>Running Peak: <strong className="text-emerald-400">${Math.round(activeHover.peak).toLocaleString()}</strong></span>
              <span>Drawdown: <strong className="text-rose-400">{activeHover.dd.toFixed(2)}%</strong></span>
            </div>
          )}
        </div>

        {/* Dual SVG Canvas */}
        <div 
          className="w-full overflow-x-auto relative cursor-crosshair select-none bg-slate-950/60 rounded-xl p-2 border border-slate-800/80"
          onMouseLeave={() => setHoveredIdx(null)}
        >
          <svg viewBox={`0 0 ${svgWidth} ${totalSvgH}`} className="w-full h-auto min-w-[760px]">
            <defs>
              <linearGradient id="mddCorridorGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.05" />
              </linearGradient>
              <linearGradient id="underwaterGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.05" />
              </linearGradient>
            </defs>

            {/* TOP PANEL: BTC PRICE & RUNNING PEAK */}
            <g>
              <text x={padding.left + 5} y={padding.top - 8} fill="#94a3b8" fontSize="10" fontFamily="monospace" fontWeight="bold">
                BTC Price vs. All-Time Peak ($)
              </text>

              {/* Price Gridlines */}
              {[0, 0.5, 1].map((pct) => {
                const pVal = minP + pct * (maxP - minP);
                const yPos = scalePriceY(pVal);
                return (
                  <g key={pct}>
                    <line x1={padding.left} y1={yPos} x2={svgWidth - padding.right} y2={yPos} stroke="#1e293b" strokeDasharray="3 3" />
                    <text x={padding.left - 8} y={yPos + 4} textAnchor="end" fill="#64748b" fontSize="10" fontFamily="monospace">
                      ${Math.round(pVal).toLocaleString()}
                    </text>
                  </g>
                );
              })}

              {/* MDD Danger Corridor */}
              {mddCorridorPath && (
                <path d={mddCorridorPath} fill="url(#mddCorridorGrad)" stroke="#f43f5e" strokeWidth="1" strokeDasharray="3 3" opacity="0.8" />
              )}

              {/* Peak ATH Running Step Line */}
              <path d={peakLinePath} fill="none" stroke="#10b981" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.7" />

              {/* Price Line */}
              <path d={priceLinePath} fill="none" stroke="#38bdf8" strokeWidth="2" />

              {/* Peak Flag Marker */}
              {metrics.mddPeakIdx >= 0 && (
                <g transform={`translate(${scaleX(metrics.mddPeakIdx)}, ${scalePriceY(metrics.mddPeak)})`}>
                  <circle r="5" fill="#10b981" stroke="#0f172a" strokeWidth="1.5" />
                  <rect x="-40" y="-24" width="80" height="18" rx="4" fill="#0f172a" stroke="#10b981" strokeWidth="1" />
                  <text y="-12" textAnchor="middle" fill="#10b981" fontSize="9" fontWeight="bold" fontFamily="monospace">
                    PEAK ${Math.round(metrics.mddPeak / 1000)}k
                  </text>
                </g>
              )}

              {/* Trough Valley Flag Marker */}
              {metrics.mddTroughIdx >= 0 && (
                <g transform={`translate(${scaleX(metrics.mddTroughIdx)}, ${scalePriceY(metrics.mddTrough)})`}>
                  <circle r="5" fill="#f43f5e" stroke="#0f172a" strokeWidth="1.5" />
                  <rect x="-45" y="10" width="90" height="18" rx="4" fill="#0f172a" stroke="#f43f5e" strokeWidth="1" />
                  <text y="22" textAnchor="middle" fill="#f43f5e" fontSize="9" fontWeight="bold" fontFamily="monospace">
                    TROUGH -{metrics.maxDrawdown.toFixed(1)}%
                  </text>
                </g>
              )}
            </g>

            {/* SEPARATOR LINE */}
            <line x1={padding.left} y1={priceH + 5} x2={svgWidth - padding.right} y2={priceH + 5} stroke="#334155" strokeWidth="1" />

            {/* BOTTOM PANEL: UNDERWATER DRAWDOWN CURVE */}
            <g transform={`translate(0, 0)`}>
              <text x={padding.left + 5} y={priceH + 20} fill="#f43f5e" fontSize="10" fontFamily="monospace" fontWeight="bold">
                Underwater Drawdown (%)
              </text>

              {/* 0% Line */}
              <line x1={padding.left} y1={scaleDdY(0)} x2={svgWidth - padding.right} y2={scaleDdY(0)} stroke="#64748b" strokeWidth="1" />
              <text x={padding.left - 8} y={scaleDdY(0) + 3} textAnchor="end" fill="#94a3b8" fontSize="10" fontFamily="monospace">
                0%
              </text>

              {/* Max Drawdown Cutoff Line */}
              <line x1={padding.left} y1={scaleDdY(-metrics.maxDrawdown)} x2={svgWidth - padding.right} y2={scaleDdY(-metrics.maxDrawdown)} stroke="#f43f5e" strokeDasharray="3 3" strokeWidth="1" opacity="0.8" />
              <text x={padding.left - 8} y={scaleDdY(-metrics.maxDrawdown) + 3} textAnchor="end" fill="#f43f5e" fontSize="10" fontFamily="monospace" fontWeight="bold">
                -{Math.round(metrics.maxDrawdown)}%
              </text>

              {/* Shaded Underwater Path */}
              <path d={ddAreaPath} fill="url(#underwaterGrad)" stroke="#f43f5e" strokeWidth="1.75" />
            </g>

            {/* Interactive Crosshair & Hover Triggers */}
            {metrics.drawdownSeries.map((pt, i) => {
              const cx = scaleX(i);
              return (
                <rect
                  key={i}
                  x={cx - 10}
                  y={padding.top}
                  width="20"
                  height={totalSvgH - padding.top - padding.bottom}
                  fill="transparent"
                  onMouseEnter={() => setHoveredIdx(i)}
                />
              );
            })}

            {/* Active Vertical Crosshair */}
            {hoveredIdx !== null && (
              <line
                x1={scaleX(hoveredIdx)}
                y1={padding.top}
                x2={scaleX(hoveredIdx)}
                y2={totalSvgH - 15}
                stroke="#94a3b8"
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity="0.85"
              />
            )}
          </svg>
        </div>

        <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400 pt-1">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-cyan-400">
              <span className="w-3 h-0.5 bg-cyan-400 inline-block" />
              BTC Price
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-3 h-0.5 bg-emerald-400 inline-block border-b border-dashed border-emerald-400" />
              Historical High Water Mark (ATH)
            </span>
            <span className="flex items-center gap-1.5 text-rose-400">
              <span className="w-3 h-3 bg-rose-500/20 border border-rose-500 rounded-sm inline-block" />
              Worst MDD Corridor (-{metrics.maxDrawdown.toFixed(1)}%)
            </span>
          </div>

          <span className="text-slate-500">Hover over any candle to inspect running drawdown depth</span>
        </div>
      </div>

      {/* TOP HISTORICAL DRAWDOWN EPISODES LEDGER */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-2 border-b border-slate-800">
          <History className="w-4 h-4 text-amber-400" />
          Worst Historical Drawdown Episodes Breakdown
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2.5 px-3">Episode Rank</th>
                <th className="py-2.5 px-3">Peak Date &amp; Price</th>
                <th className="py-2.5 px-3">Trough Date &amp; Price</th>
                <th className="py-2.5 px-3 text-right">Decline (%)</th>
                <th className="py-2.5 px-3 text-right">Holdings Loss ($)</th>
                <th className="py-2.5 px-3 text-right">Capitulation Duration</th>
                <th className="py-2.5 px-3 text-right">Recovery Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {metrics.drawdownEpisodes.map((ep) => (
                <tr key={ep.rank} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 px-3 font-bold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center text-[10px]">
                      #{ep.rank}
                    </span>
                    <span>{ep.rank === 1 ? 'Global Maximum Drawdown' : 'Secondary Drawdown'}</span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-300">
                    <div>{ep.peakDate}</div>
                    <div className="text-[10px] text-slate-500">${ep.peakPrice.toLocaleString()}</div>
                  </td>
                  <td className="py-2.5 px-3 text-rose-400">
                    <div>{ep.troughDate}</div>
                    <div className="text-[10px] text-slate-500">${ep.troughPrice.toLocaleString()}</div>
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-rose-400">
                    -{ep.dropPct.toFixed(2)}%
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-rose-400">
                    -${ep.dropUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-300">
                    {ep.declineDays} Days
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${ep.status.includes('Recovered') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                      {ep.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CORRELATION MATRIX: BTC PRICE CHANGES VS HISTORICAL VOLATILITY METRICS */}
      {corrData && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-mono font-bold mb-1">
                <Network className="w-3.5 h-3.5 text-cyan-400" />
                Inter-Variable Correlation Engine
              </div>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                Pearson Correlation Matrix: BTC Returns vs. Volatility Regimes
              </h3>
              <p className="text-xs text-slate-400">
                Measures linear dependency ($r \in [-1, 1]$) between daily Bitcoin price returns and key market volatility indicators
              </p>
            </div>

            {/* Heatmap Legend */}
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="flex items-center gap-1 text-rose-400">
                <span className="w-3 h-3 bg-rose-500/40 border border-rose-500 rounded-sm" />
                Inverse (-1.0 to -0.6)
              </span>
              <span className="flex items-center gap-1 text-slate-400">
                <span className="w-3 h-3 bg-slate-800 border border-slate-700 rounded-sm" />
                Neutral (~0.0)
              </span>
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-3 h-3 bg-emerald-500/40 border border-emerald-500 rounded-sm" />
                Coupled (+0.6 to +1.0)
              </span>
            </div>
          </div>

          {/* Interactive Heatmap Matrix Grid */}
          <div className="overflow-x-auto">
            <table className="w-full text-center border-collapse text-xs font-mono">
              <thead>
                <tr>
                  <th className="p-2 text-left text-slate-500 text-[11px] font-semibold">
                    Variable / Metric
                  </th>
                  {corrData.variables.map((v, cIdx) => (
                    <th key={v.id} className="p-2 text-slate-300 text-[11px] font-bold min-w-[90px]">
                      {v.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {corrData.variables.map((rowVar, rIdx) => (
                  <tr key={rowVar.id} className="hover:bg-slate-800/30 transition-colors">
                    {/* Row Label */}
                    <td className="p-2.5 text-left font-bold text-slate-200 text-xs whitespace-nowrap bg-slate-950/40 border-r border-slate-800/80">
                      {rowVar.label}
                    </td>

                    {/* Correlation Cells */}
                    {corrData.variables.map((colVar, cIdx) => {
                      const val = corrData.matrix[rIdx][cIdx];
                      const isSelected = selectedCorrPair?.row === rIdx && selectedCorrPair?.col === cIdx;
                      const isDiagonal = rIdx === cIdx;

                      return (
                        <td
                          key={colVar.id}
                          onClick={() => setSelectedCorrPair({ row: rIdx, col: cIdx })}
                          className={`p-2 cursor-pointer transition-all border border-slate-800/50 ${getCorrColor(val)} ${isSelected ? 'ring-2 ring-cyan-400 shadow-lg scale-105 z-10' : 'hover:scale-102'}`}
                          title={`${rowVar.label} ↔ ${colVar.label}: ${val.toFixed(2)}`}
                        >
                          <div className="font-bold text-xs">
                            {val >= 0 ? '+' : ''}{val.toFixed(2)}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Selected Pair Quantitative Risk Insight Box */}
          {selectedInsight && (
            <div className="p-4 bg-slate-950/90 rounded-xl border border-slate-800 space-y-2 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                  <span className="font-bold text-white text-xs font-mono">
                    {selectedInsight.v1.label} <span className="text-slate-500">↔</span> {selectedInsight.v2.label}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono text-[10px] font-bold">
                    r = {selectedInsight.r >= 0 ? '+' : ''}{selectedInsight.r.toFixed(3)}
                  </span>
                </div>

                <div className="text-[11px] font-mono text-slate-400">
                  Coefficient of Determination ($R^2$): <strong className="text-amber-400">{selectedInsight.r2.toFixed(1)}%</strong>
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs pt-1">
                <div>
                  <span className="text-slate-400 block font-semibold text-[11px]">Relationship Regime:</span>
                  <span className="text-cyan-300 font-bold">{selectedInsight.relationship}</span>
                </div>
                <div className="text-slate-300 text-xs md:max-w-xl font-sans leading-relaxed">
                  {selectedInsight.explanation}
                </div>
              </div>
            </div>
          )}

          {/* Macro Risk Coupling Takeaways */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs pt-2">
            <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-1">
              <span className="text-slate-400 text-[10px] block">Asymmetric Leverage Effect</span>
              <span className="text-rose-400 font-bold block">Negative Return ↔ Volatility</span>
              <p className="text-[10px] text-slate-500 font-sans">
                Realized volatility expands substantially during sharp downward price corrections due to automated liquidations.
              </p>
            </div>

            <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-1">
              <span className="text-slate-400 text-[10px] block">Volatility Squeeze Predictor</span>
              <span className="text-cyan-400 font-bold block">BB Width ↔ Intraday Range</span>
              <p className="text-[10px] text-slate-500 font-sans">
                Strong co-movement (+0.65+) between Bollinger bandwidth and daily spread helps pinpoint explosive breakout stages.
              </p>
            </div>

            <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-1">
              <span className="text-slate-400 text-[10px] block">Volume Confirmation</span>
              <span className="text-emerald-400 font-bold block">Volume ↔ Drawdown Depth</span>
              <p className="text-[10px] text-slate-500 font-sans">
                High turnover volume clusters during local market capitulation troughs, forming reliable exhaustion bottoms.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* RETURNS DISTRIBUTION & VAR CUTOFF HISTOGRAM */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-rose-400" />
              Daily Return Distribution &amp; Value at Risk Thresholds
            </h3>
            <p className="text-xs text-slate-400">
              Histogram of daily returns evaluated over active {activeCandles.length} candles ({activeCandles[0]?.timestamp?.split(' ')[0]} to {activeCandles[activeCandles.length - 1]?.timestamp?.split(' ')[0]})
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
          <span>Worst Loss in Period: {((Math.min(...metrics.returns, 0)) * 100).toFixed(2)}%</span>
          <span>Zero Line (0.00%)</span>
          <span>Best Gain in Period: {((Math.max(...metrics.returns, 0)) * 100).toFixed(2)}%</span>
        </div>
      </div>

      {/* PORTFOLIO SCENARIO STRESS TESTING */}
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

// Helper Icon component for Calmar
const AwardIcon = () => (
  <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="8" r="6" />
    <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
  </svg>
);
