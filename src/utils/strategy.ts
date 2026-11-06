import { CandleData } from '../types';

export type StrategyParams = {
  threshold?: number; // for LSTM (default 0.51)
  scoreThreshold?: number; // for Ensemble entry (default 70)
  exitScoreThreshold?: number; // for Ensemble exit (default 40)
};

export type StrategyModel = 
  | 'lstm' 
  | 'astronacci' 
  | 'ema_cross' 
  | 'rsi_reversal' 
  | 'bb_breakout' 
  | 'macd_cross' 
  | 'trend_filter'
  | 'supertrend'
  | 'ensemble';

export function getSignalLSTM(candle: CandleData, params: StrategyParams) {
  const prob = candle.directionProb ?? 0.5;
  const thresh = params.threshold ?? 0.51;
  return { buy: prob >= thresh, sell: prob < thresh };
}

export function getSignalAstronacci(candle: CandleData) {
  const buy = Boolean(candle.isApogee && (candle.rsi < 48 || candle.macdHist > 0));
  const sell = Boolean(!candle.isApogee && candle.rsi > 65);
  return { buy, sell };
}

export function getSignalEMACross(candle: CandleData) {
  return { buy: candle.ema9 > candle.ema21, sell: candle.ema9 < candle.ema21 };
}

export function getSignalRSIReversal(candle: CandleData) {
  return { buy: candle.rsi < 35, sell: candle.rsi > 65 };
}

export function getSignalBBBreakout(candle: CandleData) {
  const buy = candle.close > candle.bbMid && candle.bbPosition > 0.5;
  const sell = candle.close < candle.bbMid;
  return { buy, sell };
}

export function getSignalMACDCross(candle: CandleData) {
  // MACD cross: bullish when macd > signal, bearish when macd < signal
  return { buy: candle.macd > candle.macdSignal, sell: candle.macd < candle.macdSignal };
}

export function getSignalTrendFiltered(candle: CandleData) {
  // Macro filter: price above 200 EMA defines bullish macro regime
  // Combined with EMA 9 crossing above EMA 21 to prevent bear-market whipsaws
  const isMacroBull = candle.close > candle.ema200;
  const isBullCross = candle.ema9 > candle.ema21;
  const buy = isMacroBull && isBullCross;
  const sell = !isMacroBull || candle.ema9 < candle.ema21;
  return { buy, sell };
}

export function getSignalSupertrend(candle: CandleData) {
  // Supertrend (ATR-based trailing stop):
  // Bullish when direction is 1 (close > supertrend line)
  // Bearish when direction is -1 (close < supertrend line)
  if (candle.supertrendDirection !== undefined) {
    return {
      buy: candle.supertrendDirection === 1,
      sell: candle.supertrendDirection === -1
    };
  }
  if (candle.supertrend !== undefined) {
    return {
      buy: candle.close > candle.supertrend,
      sell: candle.close < candle.supertrend
    };
  }
  if (candle.atr !== undefined) {
    const hl2 = (candle.high + candle.low) / 2;
    const lowerBand = hl2 - 3 * candle.atr;
    return {
      buy: candle.close > lowerBand,
      sell: candle.close < lowerBand
    };
  }
  return { buy: false, sell: false };
}

export function calculateConfluenceScore(
  candle: CandleData,
  params: StrategyParams = {}
): number {
  let score = 0;

  // 1. Macro Trend Regime (25 pts): Price above 200 EMA
  if (candle.close > candle.ema200) {
    score += 25;
  }

  // 2. Volatility Trailing Stop / Supertrend (25 pts): Supertrend bullish
  const isSupertrendBull = candle.supertrendDirection !== undefined
    ? candle.supertrendDirection === 1
    : (candle.supertrend !== undefined ? candle.close > candle.supertrend : false);
  if (isSupertrendBull) {
    score += 25;
  }

  // 3. Momentum & Short-Term Trend Alignment (20 pts):
  if (candle.ema9 > candle.ema21) {
    score += 10;
  }
  if (candle.macdHist > 0 || candle.macd > candle.macdSignal) {
    score += 10;
  }

  // 4. RSI Expansion / Health Zone (15 pts):
  // Safe zone between 40 and 65 (neither dumping nor severely overextended)
  if (candle.rsi >= 40 && candle.rsi <= 65) {
    score += 15;
  } else if (candle.rsi > 65 && candle.rsi <= 75) {
    score += 8;
  }

  // 5. Machine Learning Directional Forecast (15 pts):
  const mlThresh = params.threshold ?? 0.52;
  const prob = candle.directionProb ?? 0.50;
  if (prob >= mlThresh) {
    score += 15;
  } else if (prob >= 0.50) {
    score += 8;
  }

  return score;
}

export function getSignalEnsemble(
  candle: CandleData,
  params: StrategyParams = {}
) {
  const score = calculateConfluenceScore(candle, params);
  const entryThresh = params.scoreThreshold ?? 70;
  const exitThresh = params.exitScoreThreshold ?? 40;

  const buy = score >= entryThresh;
  const isMacroBreakdown = candle.close < candle.ema200 && (candle.supertrendDirection === -1 || (candle.supertrend !== undefined && candle.close < candle.supertrend));
  const sell = score < exitThresh || isMacroBreakdown;

  return { buy, sell, score };
}

export function getSignal(
  candle: CandleData,
  model: StrategyModel,
  params: StrategyParams = {}
) {
  switch (model) {
    case 'lstm':
      return getSignalLSTM(candle, params);
    case 'astronacci':
      return getSignalAstronacci(candle);
    case 'ema_cross':
      return getSignalEMACross(candle);
    case 'rsi_reversal':
      return getSignalRSIReversal(candle);
    case 'bb_breakout':
      return getSignalBBBreakout(candle);
    case 'macd_cross':
      return getSignalMACDCross(candle);
    case 'trend_filter':
      return getSignalTrendFiltered(candle);
    case 'supertrend':
      return getSignalSupertrend(candle);
    case 'ensemble':
      return getSignalEnsemble(candle, params);
    default:
      return { buy: false, sell: false };
  }
}

