import { CandleData } from '../types';

// Calculate ATR (Average True Range) using Wilder's smoothing
export function calcATR(
  candles: Array<{ high: number; low: number; close: number }>,
  period = 10
): number[] {
  if (candles.length === 0) return [];
  const tr: number[] = [];

  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      tr.push(candles[i].high - candles[i].low);
    } else {
      const hl = candles[i].high - candles[i].low;
      const hc = Math.abs(candles[i].high - candles[i - 1].close);
      const lc = Math.abs(candles[i].low - candles[i - 1].close);
      tr.push(Math.max(hl, hc, lc));
    }
  }

  const atr: number[] = [];
  let sum = 0;
  for (let i = 0; i < candles.length; i++) {
    if (i < period) {
      sum += tr[i];
      if (i === period - 1) {
        atr.push(sum / period);
      } else {
        atr.push(sum / (i + 1));
      }
    } else {
      const prev = atr[i - 1];
      atr.push((prev * (period - 1) + tr[i]) / period);
    }
  }

  return atr;
}

// Calculate Supertrend indicator (ATR Trailing Stop)
export function calcSupertrend(
  candles: Array<{ high: number; low: number; close: number }>,
  period = 10,
  multiplier = 3
): { supertrend: number[]; direction: number[] } {
  const n = candles.length;
  if (n === 0) return { supertrend: [], direction: [] };

  const atr = calcATR(candles, period);
  const supertrend: number[] = new Array(n).fill(0);
  const direction: number[] = new Array(n).fill(1); // 1 = Bullish, -1 = Bearish

  let prevUpper = 0;
  let prevLower = 0;

  for (let i = 0; i < n; i++) {
    const hl2 = (candles[i].high + candles[i].low) / 2;
    const curAtr = atr[i] ?? 0;
    const basicUpper = hl2 + multiplier * curAtr;
    const basicLower = hl2 - multiplier * curAtr;

    if (i === 0) {
      prevUpper = basicUpper;
      prevLower = basicLower;
      supertrend[0] = basicLower;
      direction[0] = 1;
      continue;
    }

    const prevClose = candles[i - 1].close;
    const finalUpper = (basicUpper < prevUpper || prevClose > prevUpper) ? basicUpper : prevUpper;
    const finalLower = (basicLower > prevLower || prevClose < prevLower) ? basicLower : prevLower;

    let dir = direction[i - 1];
    if (dir === 1 && candles[i].close < finalLower) {
      dir = -1;
    } else if (dir === -1 && candles[i].close > finalUpper) {
      dir = 1;
    }

    direction[i] = dir;
    supertrend[i] = dir === 1 ? finalLower : finalUpper;
    prevUpper = finalUpper;
    prevLower = finalLower;
  }

  return { supertrend, direction };
}

export function calculateIndicators(rawCandles: Array<{
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}>): CandleData[] {
  const result: CandleData[] = [];
  const closes = rawCandles.map((c) => c.close);

  // Helper for EMA
  function calcEMA(data: number[], period: number): number[] {
    const k = 2 / (period + 1);
    const ema: number[] = [];
    let prev = data[0];
    ema.push(prev);

    for (let i = 1; i < data.length; i++) {
      const val = data[i] * k + prev * (1 - k);
      ema.push(val);
      prev = val;
    }
    return ema;
  }

  // Helper for RSI
  function calcRSI(data: number[], period = 14): number[] {
    const rsi: number[] = new Array(data.length).fill(50);
    if (data.length <= period) return rsi;

    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i++) {
      const diff = data[i] - data[i - 1];
      if (diff >= 0) gains += diff;
      else losses += Math.abs(diff);
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;
    rsi[period] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));

    for (let i = period + 1; i < data.length; i++) {
      const diff = data[i] - data[i - 1];
      const gain = diff > 0 ? diff : 0;
      const loss = diff < 0 ? Math.abs(diff) : 0;

      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;

      if (avgLoss === 0) {
        rsi[i] = 100;
      } else {
        const rs = avgGain / avgLoss;
        rsi[i] = 100 - (100 / (1 + rs));
      }
    }
    return rsi;
  }

  // Calculate EMAs
  const ema9Arr = calcEMA(closes, 9);
  const ema21Arr = calcEMA(closes, 21);
  const ema50Arr = calcEMA(closes, 50);
  const ema200Arr = calcEMA(closes, 200);

  // Calculate MACD (12, 26, 9)
  const ema12 = calcEMA(closes, 12);
  const ema26 = calcEMA(closes, 26);
  const macdLine = ema12.map((e, idx) => e - ema26[idx]);
  const macdSignal = calcEMA(macdLine, 9);
  const macdHist = macdLine.map((m, idx) => m - macdSignal[idx]);

  // Calculate RSI
  const rsiArr = calcRSI(closes, 14);

  // Calculate ATR and Supertrend
  const atrArr = calcATR(rawCandles, 10);
  const stResult = calcSupertrend(rawCandles, 10, 3);

  // Bollinger Bands (20, 2)
  for (let i = 0; i < rawCandles.length; i++) {
    const start = Math.max(0, i - 19);
    const window = closes.slice(start, i + 1);
    const mean = window.reduce((a, b) => a + b, 0) / window.length;
    const variance = window.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / window.length;
    const stdDev = Math.sqrt(variance);

    const bbUpper = mean + 2 * stdDev;
    const bbLower = mean - 2 * stdDev;
    const bbMid = mean;
    const bbWidth = bbMid > 0 ? (bbUpper - bbLower) / bbMid : 0;
    const bbPos = bbUpper - bbLower > 0 ? (closes[i] - bbLower) / (bbUpper - bbLower) : 0.5;

    // Detect cyclical celestial simulation for Apogee windows
    const isApogee = (i % 27 === 3 || i % 27 === 4);
    const retrograde = (i >= 5 && i <= 8) || (i >= 20 && i <= 24);

    result.push({
      ...rawCandles[i],
      rsi: rsiArr[i] ?? 50,
      macd: macdLine[i] ?? 0,
      macdSignal: macdSignal[i] ?? 0,
      macdHist: macdHist[i] ?? 0,
      ema9: ema9Arr[i] ?? closes[i],
      ema21: ema21Arr[i] ?? closes[i],
      ema50: ema50Arr[i] ?? closes[i],
      ema200: ema200Arr[i] ?? closes[i],
      bbUpper,
      bbLower,
      bbMid,
      bbPosition: bbPos,
      isApogee,
      retrograde,
      directionProb: rsiArr[i] < 45 ? 0.55 : rsiArr[i] > 65 ? 0.42 : 0.51,
      atr: atrArr[i],
      supertrend: stResult.supertrend[i],
      supertrendDirection: stResult.direction[i]
    });
  }

  return result;
}
