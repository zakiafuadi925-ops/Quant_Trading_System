import React, { useState, useMemo, useEffect } from 'react';
import { CandleData } from '../types';
import {
  RiskHeaderCard,
  MetricCards,
  DrawdownSummaryCards,
  DrawdownVisualizer,
  DrawdownEpisodesTable,
  CorrelationMatrix,
  ReturnDistribution,
  StressTestCards,
} from './risk';

interface RiskManagementTabProps {
  candles: CandleData[];
  currentPrice: number;
}

export const RiskManagementTab: React.FC<RiskManagementTabProps> = ({ candles, currentPrice }) => {
  // Configurable holdings and risk parameters
  const [btcAmount, setBtcAmount] = useState<number>(0.125);
  const [confidenceLevel, setConfidenceLevel] = useState<90 | 95 | 99>(95);
  const [annualRiskFreeRate, setAnnualRiskFreeRate] = useState<number>(4.0);

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

  // Cross-Asset Universe Correlation Matrix States
  const [matrixMode, setMatrixMode] = useState<'cross-asset' | 'factor'>('cross-asset');
  const [crossAssetWindow, setCrossAssetWindow] = useState<30 | 90>(90);
  const [crossAssetData, setCrossAssetData] = useState<{
    assets: string[];
    matrix: number[][];
    averageCorrelation: number;
    diversificationScore: number;
    window: number;
  } | null>(null);
  const [selectedAssetPair, setSelectedAssetPair] = useState<{ row: number; col: number }>({ row: 0, col: 1 });
  const [isLoadingCrossAsset, setIsLoadingCrossAsset] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const fetchCrossAssetCorrelation = async () => {
      setIsLoadingCrossAsset(true);
      try {
        const res = await fetch(`/api/crypto/correlation?window=${crossAssetWindow}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.success) {
            setCrossAssetData(data);
          }
        }
      } catch (err) {
        console.warn('Cross asset correlation fetch error:', err);
      } finally {
        if (isMounted) setIsLoadingCrossAsset(false);
      }
    };
    fetchCrossAssetCorrelation();
    return () => { isMounted = false; };
  }, [crossAssetWindow]);

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

  // CORRELATION MATRIX CALCULATIONS
  const corrData = useMemo(() => {
    if (!activeCandles || activeCandles.length < 5) return null;

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

      const high = activeCandles[i].high;
      const low = activeCandles[i].low;
      const range = curC > 0 ? ((high - low) / curC) * 100 : 0;
      rangeArr.push(range);

      volumeArr.push(activeCandles[i].volume || 1);

      const bbMid = activeCandles[i].bbMid || curC;
      const bbUpper = activeCandles[i].bbUpper || curC * 1.02;
      const bbLower = activeCandles[i].bbLower || curC * 0.98;
      const bbWidth = bbMid > 0 ? ((bbUpper - bbLower) / bbMid) * 100 : 0;
      bbWidthArr.push(bbWidth);

      if (curC > runningAth) runningAth = curC;
      const dd = runningAth > 0 ? ((runningAth - curC) / runningAth) * 100 : 0;
      ddArr.push(dd);

      const start7 = Math.max(0, retArr.length - 7);
      const slice7 = retArr.slice(start7);
      const m7 = slice7.reduce((a, b) => a + b, 0) / slice7.length;
      const var7 = slice7.reduce((a, b) => a + Math.pow(b - m7, 2), 0) / (slice7.length || 1);
      vol7Arr.push(Math.sqrt(var7));

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

  // Interpretation helper for selected cross-asset pair
  const selectedCrossAssetInsight = useMemo(() => {
    if (!crossAssetData || !selectedAssetPair) return null;
    const a1 = crossAssetData.assets[selectedAssetPair.row];
    const a2 = crossAssetData.assets[selectedAssetPair.col];
    const r = crossAssetData.matrix[selectedAssetPair.row]?.[selectedAssetPair.col] ?? 1.0;
    const r2 = Math.pow(r, 2) * 100;

    let relationship = 'High Positive Co-movement';
    let explanation = '';

    if (selectedAssetPair.row === selectedAssetPair.col) {
      return {
        a1, a2, r: 1.0, r2: 100,
        relationship: 'Self-Correlation Identity',
        explanation: `${a1} perfectly correlates with itself ($r = 1.0$). Baseline identity diagonal.`
      };
    }

    if (r >= 0.8) {
      relationship = 'High Positive Correlation';
      explanation = `${a1} and ${a2} exhibit strong synchrony ($r = ${r.toFixed(2)}$). Adding both provides minimal diversification benefit (${(100 - r2).toFixed(1)}% variance independence).`;
    } else if (r >= 0.5) {
      relationship = 'Moderate Positive Correlation';
      explanation = `${a1} and ${a2} have moderate co-movement ($r = ${r.toFixed(2)}$). Provides decent diversification buffer during localized token events.`;
    } else if (r >= 0.2) {
      relationship = 'Low Positive Correlation';
      explanation = `${a1} and ${a2} move somewhat independently ($r = ${r.toFixed(2)}$). High portfolio diversification value.`;
    } else {
      relationship = 'Independent / Orthogonal';
      explanation = `${a1} and ${a2} show near-zero or inverse correlation ($r = ${r.toFixed(2)}$), functioning as an effective natural hedge.`;
    }

    return { a1, a2, r, r2, relationship, explanation };
  }, [crossAssetData, selectedAssetPair]);

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

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header Card with Controls */}
      <RiskHeaderCard
        positionValueUsd={positionValueUsd}
        btcAmount={btcAmount}
        setBtcAmount={setBtcAmount}
        currentPrice={currentPrice}
        confidenceLevel={confidenceLevel}
        setConfidenceLevel={setConfidenceLevel}
        holdingPeriodDays={holdingPeriodDays}
        setHoldingPeriodDays={setHoldingPeriodDays}
        isCustomHorizon={isCustomHorizon}
        setIsCustomHorizon={setIsCustomHorizon}
        annualRiskFreeRate={annualRiskFreeRate}
        setAnnualRiskFreeRate={setAnnualRiskFreeRate}
        lookbackMode={lookbackMode}
        setLookbackMode={setLookbackMode}
        customStartDate={customStartDate}
        setCustomStartDate={setCustomStartDate}
        customEndDate={customEndDate}
        setCustomEndDate={setCustomEndDate}
        minDate={minDate}
        maxDate={maxDate}
        activeCandles={activeCandles}
      />

      {/* Primary Quantitative Metric Cards */}
      <MetricCards
        metrics={metrics}
        confidenceLevel={confidenceLevel}
        holdingPeriodDays={holdingPeriodDays}
      />

      {/* Maximum Drawdown Executive Summary */}
      <DrawdownSummaryCards
        metrics={metrics}
        positionValueUsd={positionValueUsd}
      />

      {/* Dual Interactive Visualizer */}
      <DrawdownVisualizer
        drawdownSeries={metrics.drawdownSeries}
        maxDrawdown={metrics.maxDrawdown}
        mddPeak={metrics.mddPeak}
        mddPeakIdx={metrics.mddPeakIdx}
        mddTroughIdx={metrics.mddTroughIdx}
        hoveredIdx={hoveredIdx}
        setHoveredIdx={setHoveredIdx}
      />

      {/* Historical Drawdown Episodes Ledger */}
      <DrawdownEpisodesTable episodes={metrics.drawdownEpisodes} />

      {/* Dual-Mode Correlation Matrix */}
      <CorrelationMatrix
        corrData={corrData}
        crossAssetData={crossAssetData}
        isLoadingCrossAsset={isLoadingCrossAsset}
        matrixMode={matrixMode}
        setMatrixMode={setMatrixMode}
        crossAssetWindow={crossAssetWindow}
        setCrossAssetWindow={setCrossAssetWindow}
        selectedCorrPair={selectedCorrPair}
        setSelectedCorrPair={setSelectedCorrPair}
        selectedAssetPair={selectedAssetPair}
        setSelectedAssetPair={setSelectedAssetPair}
        selectedInsight={selectedInsight}
        selectedCrossAssetInsight={selectedCrossAssetInsight}
      />

      {/* Returns Distribution Histogram */}
      <ReturnDistribution
        histogramBuckets={histogramBuckets}
        maxBucketCount={maxBucketCount}
        historicalVaRPct={metrics.historicalVaRPct}
        returns={metrics.returns}
        activeCandles={activeCandles}
      />

      {/* Portfolio Scenario Stress Testing */}
      <StressTestCards
        currentPrice={currentPrice}
        positionValueUsd={positionValueUsd}
        btcAmount={btcAmount}
      />
    </div>
  );
};
