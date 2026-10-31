import { ThresholdResult } from '../types';

export const THRESHOLD_SWEEP_DATA: ThresholdResult[] = [
  { threshold: 0.30, finalEquity: 2458.41, returnPct: 145.84, nBuys: 1523, maxDrawdownPct: -52.72 },
  { threshold: 0.35, finalEquity: 1723.85, returnPct: 72.39, nBuys: 1066, maxDrawdownPct: -54.58 },
  { threshold: 0.40, finalEquity: 1623.07, returnPct: 62.31, nBuys: 524, maxDrawdownPct: -42.69 },
  { threshold: 0.45, finalEquity: 1267.04, returnPct: 26.70, nBuys: 173, maxDrawdownPct: -30.07 },
  { threshold: 0.50, finalEquity: 1293.50, returnPct: 29.35, nBuys: 10, maxDrawdownPct: -1.68 },
  { threshold: 0.55, finalEquity: 1000.00, returnPct: 0.00, nBuys: 0, maxDrawdownPct: 0.00 },
  { threshold: 0.60, finalEquity: 1000.00, returnPct: 0.00, nBuys: 0, maxDrawdownPct: 0.00 },
];

export const MODEL_V1_METADATA = {
  version: '1.0.0 (Astronacci Hybrid)',
  date: '2026-10-04',
  architecture: 'Sequential LSTM with Dropout (0.2)',
  lookback: 60,
  epochs: 20,
  batchSize: 32,
  hypothesis: 'Astronomical features (Jupiter/Saturn harmonics, Venus retrograde) improve prediction accuracy over pure technical indicators.',
  features: [
    'bb_width',
    'simple_return',
    'buy_hold_return',
    'Jupiter_sin',
    'is_Venus_retrograde',
    'rsi_overbought',
    'Saturn_sin',
    'bb_squeeze',
    'sma_200',
    'bb_lower',
    'buy_hold_cum',
    'sma_50'
  ],
  accuracy: 0.593,
  precision: 0.540,
  winRate: 0.543,
  tradesCount: 35,
  avgReturnPerTrade: 7.82,
  totalReturn: 499.48,
  maxDrawdown: 60.56,
  buyHoldMaxDD: 83.40,
  conclusion: 'Astronacci LSTM achieves 54.3% win rate and +499% return with superior risk protection compared to Buy & Hold (MaxDD 60.56% vs 83.40%).'
};

export const MODEL_V5_METADATA = {
  version: '5.2.1 (Bidirectional Return Forecaster)',
  date: '2026-10-04',
  architecture: 'Bidirectional LSTM (Lookback=60)',
  lookback: 60,
  epochs: 100,
  batchSize: 32,
  feeRate: 0.001,
  signalThreshold: 0.015,
  features: [
    'return_1d',
    'return_3d',
    'return_7d',
    'range_pct',
    'body_pct',
    'volume_change',
    'ema_9_ratio',
    'ema_21_ratio',
    'ema_50_ratio',
    'ema_200_ratio',
    'rsi_14',
    'macd_pct',
    'macd_signal_pct',
    'macd_hist_pct',
    'atr_pct',
    'bb_position',
    'bb_width'
  ],
  target: 'next_day_return',
  mae: 0.0165,
  directionAccuracy: 0.491,
  directionBaseline: 0.531,
  conclusion: 'Model V5.2.1 predicts return magnitude with 1.65% MAE. At 1.5% hurdle rate it conservatively holds; threshold sweep reveals optimal return vs drawdown profile at threshold ~0.35-0.40.'
};

export const APOGEE_WINDOW_ANALYSIS = [
  { window: '±1 Day', inPct: '7.8%', outPct: '92.2%', returnIn: '+0.482%', returnOut: '+0.124%', tStat: 2.14, pValue: 0.033, significant: true },
  { window: '±2 Days', inPct: '14.1%', outPct: '85.9%', returnIn: '+0.395%', returnOut: '+0.118%', tStat: 2.01, pValue: 0.045, significant: true },
  { window: '±3 Days', inPct: '20.6%', outPct: '79.4%', returnIn: '+0.312%', returnOut: '+0.129%', tStat: 1.76, pValue: 0.079, significant: false },
  { window: '±5 Days', inPct: '33.2%', outPct: '66.8%', returnIn: '+0.245%', returnOut: '+0.141%', tStat: 1.42, pValue: 0.156, significant: false }
];
