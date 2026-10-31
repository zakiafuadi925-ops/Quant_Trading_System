# Bitcoin Research & Quantitative Trading Lab

A high-performance interactive cryptocurrency quantitative research platform ported to **React 19**, **Vite**, **TypeScript**, and **Tailwind CSS v4**.

Originally developed by Zaki Afuadi as a multi-stage Python research workspace combining **Astronacci Cycle Analysis**, **Keras/TensorFlow Deep Learning (LSTM v1 & v5.2.1)**, **Monte Carlo Stochastic Projections (GBM)**, and **Multi-Asset Rebalancing & Grid Trading**, this application has been fully ported into a modern, responsive web application.

---

## 🚀 Key Modules & Capabilities

### 1. Algorithmic Backtesting Lab (`overview`)
- Simulates trading logic from `backtest_from_python.py`
- Realistic order execution modeling exchange trading fees (0.1% default) and cash/coin balance tracking
- Interactive Signal Threshold tuning (0.30 - 0.65)
- Real-time Strategy Equity curve vs. Buy & Hold benchmark curve
- Metrics: Net Profit, ROI %, Win Rate %, Profit Factor, Max Drawdown (MDD), and Alpha spread
- Filterable execution trade ledger (BUY, SELL, ALL)

### 2. Astronacci Cycle & Apogee Intelligence (`astronacci`)
- Empirical Apogee window analysis across ±1, ±2, ±3, and ±5 days with two-sample t-test statistical significance
- Proves statistical alpha during lunar apogee windows (+0.395% inside vs +0.118% outside, p=0.045*)
- 3-Tier Confluence Strategy: Celestial Timing Trigger + Momentum Mean Reversion (RSI & MACD) + Volatility Envelope (Bollinger Bands)
- Planetary resonance harmonic monitoring (Jupiter and Saturn orbital harmonic sine waves, Venus/Mercury retrograde cycles)

### 3. Deep Learning Model Observatory (`lstm`)
- Architecture comparisons between Model v1 (Astronacci Hybrid LSTM) and Model v5.2.1 (Bidirectional Return Forecaster)
- Full 17-dimensional quantitative feature vector inspector (lookback: 60 periods)
- Interactive Threshold Sweep optimization based on `threshold_sweep_results.csv`
- Actual price vs. Model forecast feed with prediction delta and directional probability

### 4. Monte Carlo Stochastic Projection Engine (`monte-carlo`)
- Geometric Brownian Motion (GBM) simulation using historical 60-day drift ($\mu = 0.0046$) and volatility ($\sigma = 0.0218$)
- Simulates 1,000 to 10,000 future price paths across 7, 14, 28, and 60-day horizons
- Multi-quantile confidence fan chart (5th, 25th, 50th median, 75th, and 95th percentiles)
- Risk analytics: Loss probability, probability of >20% and >50% gains, Value at Risk (VaR 95%), and Conditional Value at Risk (CVaR / Expected Shortfall)

### 5. Multi-Asset Portfolio Tracker & Rebalancer (`portfolio`)
- Manages portfolio across BTC, ETH, SOL, and USDT based on `portofolio_config.json`
- Real-time target vs actual weight allocation variance bars
- One-click automatic rebalancing calculation generating exact buy/sell orders
- Price alerts and risk parameters (Max drawdown 20%, Stop loss 10%, Take profit 25%)
- Historical trade ledger ported from `trade_history.csv`

### 6. Spot Grid Trading Simulator (`grid`)
- Implements the long-only spot grid model from `grid_trading.py`
- Configurable grid spacing % (0.5% - 3.5%), number of grid levels, and allocated capital
- Visual Grid Ladder displaying pending buy limit and sell target orders
- Interactive tick simulator to test volatility harvesting and track accumulated grid profits

### 7. Interactive Research Curriculum (`modules`)
- Interactive documentation of Modules 1 through 5:
  - **Module 1**: Python Trading Fundamentals (Data types, watchlists, alerts)
  - **Module 2**: Advanced Control Flow & Modular Trading Tools
  - **Module 3**: Real Crypto Market Data & Persistence (CCXT, returns, portfolio JSON)
  - **Module 4**: Time Series Analysis, Matplotlib/Plotly, and Astronacci Cycles
  - **Module 5**: Automated Quant Trading System & Intelligence Reporting
- Interactive test runner allowing live function execution

---

## 🛠️ Development & Build

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run TypeScript linter
npm run lint

# Build production bundle
npm run build
```
