import { CandleData } from '../types';

export type StrategyParams = {
  threshold?: number; // for LSTM
};

export type StrategyModel = 
  | 'lstm' 
  | 'astronacci' 
  | 'ema_cross' 
  | 'rsi_reversal' 
  | 'bb_breakout' 
  | 'macd_cross' 
  | 'trend_filter';

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
    default:
      return { buy: false, sell: false };
  }
}

