import { CandleData } from '../types';
import { getSignal, StrategyModel, StrategyParams } from './strategy';

export interface BacktestMetrics {
  finalEquity: number;
  totalReturnPct: number;
  annualizedReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  tradesCount: number;
}

export interface SweepCandidate {
  id: string;
  params: StrategyParams & { stopLossPct?: number; takeProfitPct?: number };
  inSample: BacktestMetrics;
  outOfSample: BacktestMetrics;
  wfe: number; // Walk-Forward Efficiency (%) = (OOS Annualized Return / IS Annualized Return) * 100
  overfitRisk: 'LOW' | 'MODERATE' | 'HIGH';
  robustnessScore: number; // 0-100 composite score
}

export interface WalkForwardResult {
  totalBars: number;
  inSampleBars: number;
  outOfSampleBars: number;
  splitDate: string;
  candidates: SweepCandidate[];
  bestCandidate: SweepCandidate;
}

/**
 * Executes a fast, vectorized backtest simulation on a slice of candlestick data.
 */
export function simulateBacktestSlice(
  candles: CandleData[],
  model: StrategyModel,
  params: StrategyParams = {},
  initialCapital = 1000,
  feeRate = 0.001,
  stopLossPct = 0,
  takeProfitPct = 0
): BacktestMetrics {
  if (!candles || candles.length < 2) {
    return {
      finalEquity: initialCapital,
      totalReturnPct: 0,
      annualizedReturn: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      winRate: 0,
      profitFactor: 1,
      tradesCount: 0,
    };
  }

  let balance = initialCapital;
  let position = 0;
  let peakEquity = initialCapital;
  let maxDrawdown = 0;
  let winningTrades = 0;
  let losingTrades = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  let lastBuyPrice = 0;

  const dailyReturns: number[] = [];
  let prevEquity = initialCapital;

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const p = c.close;

    let { buy: isBuy, sell: isSell } = getSignal(c, model, params);

    // Stop Loss / Take Profit evaluation
    if (position > 0) {
      if (stopLossPct > 0 && p <= lastBuyPrice * (1 - stopLossPct / 100)) {
        isSell = true;
      } else if (takeProfitPct > 0 && p >= lastBuyPrice * (1 + takeProfitPct / 100)) {
        isSell = true;
      }
    }

    // Execution
    if (isBuy && position === 0) {
      const buyUnits = (balance * (1 - feeRate)) / p;
      position = buyUnits;
      balance = 0;
      lastBuyPrice = p;
    } else if (isSell && position > 0) {
      const sellProceeds = position * p * (1 - feeRate);
      const costBasis = position * lastBuyPrice;
      const tradePnl = sellProceeds - costBasis;

      if (tradePnl > 0) {
        winningTrades++;
        grossProfit += tradePnl;
      } else {
        losingTrades++;
        grossLoss += Math.abs(tradePnl);
      }

      balance = sellProceeds;
      position = 0;
    }

    const currentEquity = balance + position * p;
    if (currentEquity > peakEquity) {
      peakEquity = currentEquity;
    }
    const dd = ((peakEquity - currentEquity) / peakEquity) * 100;
    if (dd > maxDrawdown) {
      maxDrawdown = dd;
    }

    // Daily return for Sharpe calculation
    const barReturn = (currentEquity - prevEquity) / (prevEquity || 1);
    dailyReturns.push(barReturn);
    prevEquity = currentEquity;
  }

  const finalEquity = balance + position * candles[candles.length - 1].close;
  const totalReturnPct = ((finalEquity - initialCapital) / initialCapital) * 100;

  // Annualized return (assuming 365 daily crypto bars or scaled per bar count)
  const years = Math.max(candles.length / 365, 0.05);
  const annualizedReturn = ((Math.pow(Math.max(0.01, finalEquity / initialCapital), 1 / years) - 1)) * 100;

  // Annualized Sharpe Ratio (0% risk-free rate assumption)
  const meanReturn = dailyReturns.reduce((sum, r) => sum + r, 0) / dailyReturns.length;
  const variance = dailyReturns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / (dailyReturns.length || 1);
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev > 0 ? (meanReturn / stdDev) * Math.sqrt(365) : 0;

  const totalTrades = winningTrades + losingTrades;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99.9 : 1.0;

  return {
    finalEquity,
    totalReturnPct,
    annualizedReturn,
    sharpeRatio: Number.isFinite(sharpeRatio) ? sharpeRatio : 0,
    maxDrawdown,
    winRate,
    profitFactor,
    tradesCount: totalTrades,
  };
}

/**
 * Runs a rigorous Walk-Forward Parameter Optimization (In-Sample Training vs Out-of-Sample Testing).
 */
export function runWalkForwardOptimization(
  candles: CandleData[],
  model: StrategyModel,
  paramGrid: Array<StrategyParams & { stopLossPct?: number; takeProfitPct?: number }>,
  trainRatio = 0.70
): WalkForwardResult {
  const cleanRatio = Math.max(0.5, Math.min(0.9, trainRatio));
  const splitIndex = Math.floor(candles.length * cleanRatio);

  const inSampleCandles = candles.slice(0, splitIndex);
  const outOfSampleCandles = candles.slice(splitIndex);
  const splitDate = candles[splitIndex]?.timestamp || 'N/A';

  const candidates: SweepCandidate[] = paramGrid.map((pSet, idx) => {
    const isMetrics = simulateBacktestSlice(
      inSampleCandles,
      model,
      pSet,
      1000,
      0.001,
      pSet.stopLossPct ?? 0,
      pSet.takeProfitPct ?? 0
    );

    const oosMetrics = simulateBacktestSlice(
      outOfSampleCandles,
      model,
      pSet,
      1000,
      0.001,
      pSet.stopLossPct ?? 0,
      pSet.takeProfitPct ?? 0
    );

    // Walk Forward Efficiency (WFE %)
    // Robust if > 50%; Overfitted if negative or severely decayed
    let wfe = 0;
    if (isMetrics.annualizedReturn > 0) {
      wfe = (oosMetrics.annualizedReturn / isMetrics.annualizedReturn) * 100;
    } else if (oosMetrics.annualizedReturn > 0) {
      wfe = 100;
    } else {
      wfe = 0;
    }

    // Overfit risk assessment
    let overfitRisk: 'LOW' | 'MODERATE' | 'HIGH' = 'LOW';
    if (wfe < 20 || (isMetrics.totalReturnPct > 20 && oosMetrics.totalReturnPct < -10)) {
      overfitRisk = 'HIGH';
    } else if (wfe < 50 || oosMetrics.maxDrawdown > isMetrics.maxDrawdown * 1.5) {
      overfitRisk = 'MODERATE';
    } else {
      overfitRisk = 'LOW';
    }

    // Robustness score (0 - 100) combining OOS Sharpe, WFE stability, and drawdown containment
    const sharpeScore = Math.min(40, Math.max(0, oosMetrics.sharpeRatio * 20));
    const wfeScore = Math.min(35, Math.max(0, (wfe / 100) * 35));
    const ddPenalty = Math.min(25, (oosMetrics.maxDrawdown / 50) * 25);
    const robustnessScore = Math.max(0, Math.min(100, Math.round(sharpeScore + wfeScore + (25 - ddPenalty))));

    return {
      id: `param-${idx}`,
      params: pSet,
      inSample: isMetrics,
      outOfSample: oosMetrics,
      wfe: Math.round(wfe),
      overfitRisk,
      robustnessScore,
    };
  });

  // Sort candidates by combined robustness score descending
  candidates.sort((a, b) => b.robustnessScore - a.robustnessScore || b.outOfSample.sharpeRatio - a.outOfSample.sharpeRatio);

  const bestCandidate = candidates[0] || {
    id: 'default',
    params: {},
    inSample: simulateBacktestSlice(inSampleCandles, model),
    outOfSample: simulateBacktestSlice(outOfSampleCandles, model),
    wfe: 0,
    overfitRisk: 'LOW',
    robustnessScore: 50,
  };

  return {
    totalBars: candles.length,
    inSampleBars: inSampleCandles.length,
    outOfSampleBars: outOfSampleCandles.length,
    splitDate,
    candidates,
    bestCandidate,
  };
}

/**
 * Generates an exhaustive parameter grid adapted to the selected strategy model.
 */
export function generateDefaultParamGrid(
  model: StrategyModel
): Array<StrategyParams & { stopLossPct?: number; takeProfitPct?: number }> {
  const grid: Array<StrategyParams & { stopLossPct?: number; takeProfitPct?: number }> = [];

  if (model === 'ensemble') {
    const entryScores = [60, 65, 70, 75];
    const exitScores = [35, 40, 45];
    const stopLosses = [0, 3, 5];

    for (const entry of entryScores) {
      for (const exit of exitScores) {
        for (const sl of stopLosses) {
          grid.push({
            scoreThreshold: entry,
            exitScoreThreshold: exit,
            stopLossPct: sl,
          });
        }
      }
    }
  } else if (model === 'lstm') {
    const thresholds = [0.45, 0.48, 0.50, 0.51, 0.53, 0.55];
    const stopLosses = [0, 3, 5];
    const takeProfits = [0, 8, 15];

    for (const th of thresholds) {
      for (const sl of stopLosses) {
        for (const tp of takeProfits) {
          grid.push({
            threshold: th,
            stopLossPct: sl,
            takeProfitPct: tp,
          });
        }
      }
    }
  } else {
    // General technical strategies (Supertrend, Trend Filter, MACD, etc.)
    const stopLosses = [0, 2, 4, 6];
    const takeProfits = [0, 6, 12, 18];

    for (const sl of stopLosses) {
      for (const tp of takeProfits) {
        grid.push({
          stopLossPct: sl,
          takeProfitPct: tp,
        });
      }
    }
  }

  return grid;
}
