export interface CandleData {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  rsi: number;
  macd: number;
  macdSignal: number;
  macdHist: number;
  ema9: number;
  ema21: number;
  ema50: number;
  ema200: number;
  bbUpper: number;
  bbLower: number;
  bbMid: number;
  bbPosition: number;
  isApogee?: boolean;
  retrograde?: boolean;
  predictedClose?: number;
  directionProb?: number;
  actualDirection?: number;
  predictedDirection?: number;
  signal?: number;
}

export interface TradeRecord {
  id: string;
  timestamp: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  amount: number;
  price: number;
  total: number;
  fee: number;
  pnl?: number;
  pnlPct?: number;
}

export interface ThresholdResult {
  threshold: number;
  finalEquity: number;
  returnPct: number;
  nBuys: number;
  maxDrawdownPct: number;
}

export interface AssetAllocation {
  symbol: string;
  name: string;
  targetPct: number;
  currentHolding: number;
  price: number;
  color: string;
}

export interface SimulationParams {
  startingPrice: number;
  muDaily: number;
  sigmaDaily: number;
  horizonDays: number;
  nPaths: number;
  initialBalance: number;
  feeRate: number;
}

export interface SimulationSummary {
  startingPrice: number;
  muDaily: number;
  sigmaDaily: number;
  annualizedVol: number;
  annualizedDrift: number;
  horizonDays: number;
  nPaths: number;
  terminalMean: number;
  terminalMedian: number;
  terminalMin: number;
  terminalMax: number;
  probLoss: number;
  probGain20: number;
  probGain50: number;
  var95: number;
  cvar95: number;
}

export interface GridLevel {
  level: number;
  price: number;
  type: 'BUY' | 'SELL';
  distancePct: number;
  status: 'PENDING' | 'FILLED';
  amount: number;
}
