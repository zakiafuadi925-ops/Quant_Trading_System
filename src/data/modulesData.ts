export interface ModuleChapter {
  id: string;
  moduleNum: number;
  title: string;
  subtitle: string;
  description: string;
  topics: string[];
  codeSample: string;
  outputExample: string;
}

export const CURRICULUM_MODULES: ModuleChapter[] = [
  {
    id: 'mod-1',
    moduleNum: 1,
    title: 'Modul 1: Python Trading Fundamentals',
    subtitle: 'Data Types, Watchlists, Logic & Alert Systems',
    description: 'Foundations of quantitative programming: handling cryptocurrency ticks, float precisions, watchlist dictionaries, and multi-condition price triggers.',
    topics: ['Tipe Data & Watchlist', 'If/Else Logic & Multi-timeframe Filter', 'Loop Automation', 'Custom Function Library', 'Price Alert System'],
    codeSample: [
      '# Price Alert & Watchlist',
      "def check_price_alert(symbol, current_price, target_price, condition='above'):",
      "    if condition == 'above' and current_price >= target_price:",
      '        return f"🚨 ALERT: {symbol} hit ${current_price:,.2f} (Target: >={target_price})"',
      "    elif condition == 'below' and current_price <= target_price:",
      '        return f"⚠️ ALERT: {symbol} fell to ${current_price:,.2f} (Target: <={target_price})"',
      '    return "Status: Normal range"'
    ].join('\\n'),
    outputExample: `>>> check_price_alert('BTC', 85263.08, 85000, 'above')
🚨 ALERT: BTC hit $85,263.08 (Target: >=85000)`
  },
  {
    id: 'mod-2',
    moduleNum: 2,
    title: 'Modul 2: Advanced Control Flow & Trading Architecture',
    subtitle: 'Loop Patterns, Modular Architecture & Trading Tools',
    description: 'Designing professional modular trading tools: calculation functions, signal generators, risk managers, and structured performance reporting.',
    topics: ['Advance Conditional Operators', 'Iterative Loop Optimization', 'Design Patterns for Trading Bots', 'Modular Tooling (my_trading_tools)'],
    codeSample: `# Modular Trading Engine Pipeline
from my_trading_tools.data_functions import clean_ticks
from my_trading_tools.calculation_functions import calculate_rsi, calculate_ema
from my_trading_tools.analysis_functions import generate_confluence_signal

def evaluate_candle(candle):
    rsi = calculate_rsi(candle['closes'], period=14)
    ema21 = calculate_ema(candle['closes'], period=21)
    return generate_confluence_signal(rsi, ema21, candle['close'])`,
    outputExample: `Signal Generated: BUY [Confluence: RSI=34.2 (Oversold), EMA21 Support Hit]`
  },
  {
    id: 'mod-3',
    moduleNum: 3,
    title: 'Modul 3: Real Crypto Market Data & Persistence',
    subtitle: 'CCXT Exchanges, CSV I/O, Return Calculation & Portfolios',
    description: 'Working with real-world Binance and exchange feeds via CCXT, computing log/simple returns, and persisting balances into JSON & CSV ledger stores.',
    topics: ['CCXT Exchange API Integration', 'CSV Historical Ingestion', 'Log vs Simple Returns', 'Portfolio State Persistence', 'Daily Ingestion Automation (v3)'],
    codeSample: `import ccxt
import pandas as pd

def fetch_binance_ohlcv(symbol='BTC/USDT', timeframe='1d', limit=100):
    exchange = ccxt.binance({'enableRateLimit': True})
    ohlcv = exchange.fetch_ohlcv(symbol, timeframe, limit=limit)
    df = pd.DataFrame(ohlcv, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
    df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
    df['return'] = df['close'].pct_change()
    return df`,
    outputExample: `Loaded 100 daily candles for BTC/USDT. Average daily volatility: 2.18%`
  },
  {
    id: 'mod-4',
    moduleNum: 4,
    title: 'Modul 4: Data Analysis, Visualization & Astronacci Cycle Research',
    subtitle: 'Pandas Time Series, Matplotlib/Plotly, and Astronomical Correlators',
    description: 'Deep time series research combining technical momentum (RSI, MACD, Bollinger Bands) with astronomical lunar & planetary harmonic turning cycles.',
    topics: ['Astronacci Dataset Merging', 'Apogee & Perigee Window Analysis', 'RSI & MACD Divergence Detection', 'Clean Data Pipeline', 'Plotly Interactive Visuals'],
    codeSample: `# Apogee Window Impact Tester
def test_apogee_window(df, window_days=2):
    apogee_days = df[df['is_apogee'] == 1].index
    in_window_mask = df.index.isin([d + pd.Timedelta(days=i) for d in apogee_days for i in range(-window_days, window_days+1)])
    return df[in_window_mask]['return'].mean(), df[~in_window_mask]['return'].mean()`,
    outputExample: `In-Window Mean Return: +0.395% vs Out-Window: +0.118% (p-value: 0.045*)`
  },
  {
    id: 'mod-5',
    moduleNum: 5,
    title: 'Modul 5: Automated Quant Trading System & Intelligence Reporting',
    subtitle: 'Automated Collector, Indicator Engine, HTML Reporting & Bot System',
    description: 'End-to-end production quantitative system: batch data ingestion, indicator pipelines, interactive HTML report generation, and multi-asset position management.',
    topics: ['Batch Data Collection Cron', 'Automated Indicator Engine', 'HTML Executive Report Builder', 'Production Trading Loop', 'Multi-Asset Bot Controller'],
    codeSample: `# Production Trading System Loop
class CryptoTradingSystem:
    def __init__(self, config_path):
        self.config = load_config(config_path)
        self.tracker = PortfolioTracker(self.config['assests'])
        
    def run_daily_cycle(self):
        prices = fetch_latest_prices(list(self.config['assests'].keys()))
        rebalance_orders = self.tracker.calculate_rebalance(prices)
        return self.tracker.execute_orders(rebalance_orders)`,
    outputExample: `Report Generated: reports/report_2026-05-09 113331.html. Portfolio Net Worth: $33,260`
  }
];
