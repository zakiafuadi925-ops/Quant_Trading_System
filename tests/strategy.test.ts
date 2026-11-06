import { getSignal, calculateConfluenceScore, getSignalEnsemble } from '../src/utils/strategy';
import { CandleData } from '../src/types';

describe('MACD Cross strategy signal', () => {
  const baseCandle: CandleData = {
    timestamp: '2021-01-01',
    open: 1,
    high: 2,
    low: 0.5,
    close: 1.5,
    volume: 100,
    rsi: 50,
    macd: 0,
    macdSignal: 0,
    macdHist: 0,
    ema9: 0,
    ema21: 0,
    ema50: 0,
    ema200: 0,
    bbUpper: 0,
    bbLower: 0,
    bbMid: 0,
    bbPosition: 0,
  };

  test('bullish when macd > signal', () => {
    const candle = { ...baseCandle, macd: 1.2, macdSignal: 0.8 };
    const { buy, sell } = getSignal(candle, 'macd_cross');
    expect(buy).toBe(true);
    expect(sell).toBe(false);
  });

  test('bearish when macd < signal', () => {
    const candle = { ...baseCandle, macd: -0.4, macdSignal: 0.1 };
    const { buy, sell } = getSignal(candle, 'macd_cross');
    expect(buy).toBe(false);
    expect(sell).toBe(true);
  });

  test('neutral when macd equals signal', () => {
    const candle = { ...baseCandle, macd: 0.5, macdSignal: 0.5 };
    const { buy, sell } = getSignal(candle, 'macd_cross');
    expect(buy).toBe(false);
    expect(sell).toBe(false);
  });
});

describe('Trend Filtered (EMA 200 + EMA 9/21) strategy signal', () => {
  const baseCandle: CandleData = {
    timestamp: '2021-01-01',
    open: 100,
    high: 110,
    low: 95,
    close: 105,
    volume: 1000,
    rsi: 50,
    macd: 0,
    macdSignal: 0,
    macdHist: 0,
    ema9: 100,
    ema21: 90,
    ema50: 80,
    ema200: 70,
    bbUpper: 115,
    bbLower: 85,
    bbMid: 100,
    bbPosition: 0.6,
  };

  test('bullish when price is above 200 EMA and EMA 9 > EMA 21', () => {
    // Macro uptrend: close (105) > ema200 (70) AND fast (100) > slow (90)
    const candle = { ...baseCandle, close: 105, ema200: 70, ema9: 100, ema21: 90 };
    const { buy, sell } = getSignal(candle, 'trend_filter');
    expect(buy).toBe(true);
    expect(sell).toBe(false);
  });

  test('filters out bullish crossover when price is below 200 EMA (bear market trap)', () => {
    // Macro downtrend: close (60) < ema200 (70) even though fast (100) > slow (90)
    const candle = { ...baseCandle, close: 60, ema200: 70, ema9: 100, ema21: 90 };
    const { buy, sell } = getSignal(candle, 'trend_filter');
    expect(buy).toBe(false);
    expect(sell).toBe(true);
  });

  test('bearish / exit when EMA 9 crosses below EMA 21 during bull regime', () => {
    // Macro uptrend: close (105) > ema200 (70), but fast (85) < slow (90)
    const candle = { ...baseCandle, close: 105, ema200: 70, ema9: 85, ema21: 90 };
    const { buy, sell } = getSignal(candle, 'trend_filter');
    expect(buy).toBe(false);
    expect(sell).toBe(true);
  });

  test('bearish when both macro regime and EMA crossover are down', () => {
    const candle = { ...baseCandle, close: 50, ema200: 70, ema9: 45, ema21: 55 };
    const { buy, sell } = getSignal(candle, 'trend_filter');
    expect(buy).toBe(false);
    expect(sell).toBe(true);
  });
});

describe('Supertrend (ATR) strategy signal', () => {
  const baseCandle: CandleData = {
    timestamp: '2021-01-01',
    open: 100,
    high: 110,
    low: 95,
    close: 105,
    volume: 1000,
    rsi: 50,
    macd: 0,
    macdSignal: 0,
    macdHist: 0,
    ema9: 100,
    ema21: 90,
    ema50: 80,
    ema200: 70,
    bbUpper: 115,
    bbLower: 85,
    bbMid: 100,
    bbPosition: 0.6,
  };

  test('bullish signal when supertrendDirection is 1', () => {
    const candle = { ...baseCandle, supertrendDirection: 1, supertrend: 95 };
    const { buy, sell } = getSignal(candle, 'supertrend');
    expect(buy).toBe(true);
    expect(sell).toBe(false);
  });

  test('bearish signal when supertrendDirection is -1', () => {
    const candle = { ...baseCandle, supertrendDirection: -1, supertrend: 115 };
    const { buy, sell } = getSignal(candle, 'supertrend');
    expect(buy).toBe(false);
    expect(sell).toBe(true);
  });

  test('fallback to close > supertrend comparison', () => {
    const candle = { ...baseCandle, close: 110, supertrend: 100 };
    const { buy, sell } = getSignal(candle, 'supertrend');
    expect(buy).toBe(true);
    expect(sell).toBe(false);
  });

  test('fallback to close < supertrend comparison', () => {
    const candle = { ...baseCandle, close: 90, supertrend: 100 };
    const { buy, sell } = getSignal(candle, 'supertrend');
    expect(buy).toBe(false);
    expect(sell).toBe(true);
  });
});

describe('Multi-Signal Confluence Ensemble strategy', () => {
  const baseCandle: CandleData = {
    timestamp: '2021-01-01',
    open: 100,
    high: 110,
    low: 95,
    close: 105,
    volume: 1000,
    rsi: 55,
    macd: 1,
    macdSignal: 0.5,
    macdHist: 0.5,
    ema9: 100,
    ema21: 90,
    ema50: 80,
    ema200: 70,
    bbUpper: 115,
    bbLower: 85,
    bbMid: 100,
    bbPosition: 0.6,
    supertrend: 95,
    supertrendDirection: 1,
    directionProb: 0.58,
  };

  test('high confluence generates buy signal and high score', () => {
    const score = calculateConfluenceScore(baseCandle);
    expect(score).toBeGreaterThanOrEqual(70);
    const { buy, sell } = getSignal(baseCandle, 'ensemble');
    expect(buy).toBe(true);
    expect(sell).toBe(false);
  });

  test('bearish breakdown generates sell signal and low score', () => {
    const bearCandle: CandleData = {
      ...baseCandle,
      close: 60,
      ema200: 70,
      supertrend: 75,
      supertrendDirection: -1,
      ema9: 55,
      ema21: 65,
      macd: -1,
      macdSignal: 0,
      macdHist: -1,
      rsi: 30,
      directionProb: 0.35,
    };
    const score = calculateConfluenceScore(bearCandle);
    expect(score).toBeLessThan(40);
    const { buy, sell } = getSignal(bearCandle, 'ensemble');
    expect(buy).toBe(false);
    expect(sell).toBe(true);
  });

  test('moderate score holds neutral state', () => {
    // Only macro bull (25) + supertrend bull (25) = 50 pts
    const neutralCandle: CandleData = {
      ...baseCandle,
      close: 105,
      ema200: 70,
      supertrendDirection: 1,
      ema9: 80,
      ema21: 85, // bearish EMA cross
      macd: -0.5,
      macdSignal: 0,
      macdHist: -0.5, // bearish MACD
      rsi: 78, // overbought
      directionProb: 0.45,
    };
    const score = calculateConfluenceScore(neutralCandle);
    expect(score).toBe(50);
    const { buy, sell } = getSignal(neutralCandle, 'ensemble');
    expect(buy).toBe(false);
    expect(sell).toBe(false);
  });
});

