# Bitcoin Research & Quantitative Trading Lab

A high‑performance interactive cryptocurrency quantitative research platform built with **React 19**, **Vite**, **TypeScript**, and **Tailwind CSS v4**. The application bridges multi‑stage Python quantitative workflows (Astronacci lunar/planetary cycle analysis, LSTM deep learning return forecasting, Monte‑Carlo stochastic projections, multi‑asset rebalancing, risk management, and grid trading) into a modern, responsive analytical dashboard.

---

## 📦 Key Modules & Capabilities

| Module | Tab ID | Description |
|--------|--------|-------------|
| **Backtesting Lab** | `overview` | Simulates trading logic, order execution fees, equity curves, KPI metrics (Sharpe, profit factor, win rate), and filterable trade ledger. |
| **Trading Strategy Engine** | — | Modular signal dispatcher supporting LSTM thresholds, Astronacci cycles, EMA cross, RSI reversal, Bollinger Bands breakout, and MACD crossover. |
| **Astronacci Cycle** | `astronacci` | Statistical alpha analysis around lunar apogee windows, planetary harmonic monitoring, and confluence cycle strategies. |
| **LSTM Model Observatory** | `lstm` | Compare model architectures (v1 Astronacci hybrid vs v5.2.1 bidirectional forecaster), inspect 17-dimensional feature vectors, and sweep classification thresholds. |
| **Monte‑Carlo Engine** | `monte-carlo` | Geometric Brownian Motion (GBM) simulation (1k–10k paths) over 7–60 day horizons with confidence fan charts, VaR, and CVaR analytics. |
| **Risk Management** | `risk` | Multi-asset correlation matrices, maximum drawdown (MDD) tracking, portfolio risk metrics, and exposure heatmaps. |
| **Portfolio Tracker & Rebalancer** | `portfolio` | Real-time weight allocation, target vs. actual variance, automated rebalancing order calculations, and trade ledgers. |
| **Grid Trading Simulator** | `grid` | Configurable spot-grid model with arithmetic spacing, limit ladder visualisation, and profit-per-grid tracking. |
| **Interactive Research Curriculum** | `modules` | Guided quantitative modules (Python fundamentals, market data processing, statistical arbitrage, and ML deployment). |

---

## 📈 Supported Trading Strategies

Trading signals are modularized under [`src/utils/strategy.ts`](file:///mnt/data/BACK_UP/Code/Quant_Trading_System/src/utils/strategy.ts) via the `getSignal()` dispatcher:

1. **LSTM Directional Model (`lstm`)**: Emits signals based on predicted direction probability evaluated against a configurable threshold.
2. **Astronacci Confluence (`astronacci`)**: Combines lunar apogee windows with momentum confirmation (RSI < 48 or positive MACD histogram for entry; RSI > 65 outside apogee for exit).
3. **EMA Cross (`ema_cross`)**: Golden cross / death cross between 9 EMA and 21 EMA.
4. **Trend-Filtered Momentum (`trend_filter`)**: Macro regime filter combining the 200-day EMA with 9/21 EMA crossover. Prevents bear-market traps by requiring `close > ema200` for long entries.
5. **RSI Reversal (`rsi_reversal`)**: Mean reversion targeting oversold (RSI < 35) and overbought (RSI > 65) extremes.
6. **Bollinger Bands Breakout (`bb_breakout`)**: Volatility breakouts relative to moving average mid-band and band percentage positioning.
7. **MACD Cross (`macd_cross`)**: Dynamic trend-following signal triggered by crossover between the MACD line and the 9-period signal line.

### Adding New Strategies
To add a new strategy:
1. Implement a signal generator function `getSignal<Name>(candle: CandleData)` in [`src/utils/strategy.ts`](file:///mnt/data/BACK_UP/Code/Quant_Trading_System/src/utils/strategy.ts).
2. Add your strategy key to the `getSignal` dispatcher switch statement.
3. Expose the strategy pill in [`src/components/BacktestTab.tsx`](file:///mnt/data/BACK_UP/Code/Quant_Trading_System/src/components/BacktestTab.tsx) selector array.
4. Write corresponding unit tests in [`tests/strategy.test.ts`](file:///mnt/data/BACK_UP/Code/Quant_Trading_System/tests/strategy.test.ts).

---

## 🛠️ Development & Quickstart

### Prerequisites
- **Node.js** >= 20.x
- **npm** >= 10.x
- *(Optional)* **Python** >= 3.10 with `virtualenv` for running model notebooks.

### 1. Installation
```bash
# Clone the repository
git clone https://github.com/zakiafuadi925-ops/Quant_Trading_System.git
cd Quant_Trading_System

# Install Node dependencies
npm install
```

### 2. Environment Configuration
Copy `.env.example` to create your local `.env`:
```bash
cp .env.example .env
```

Configure your variables:
```env
# Base URL for market data feeds (e.g. CoinGecko, Binance, etc.)
CRYPTO_API_BASE_URL=https://api.example.com

# API key for authenticated endpoints
CRYPTO_API_KEY=YOUR_API_KEY_HERE

# Vite HMR toggle (set to true in headless CI environments)
DISABLE_HMR=false
```

### 3. Running the Application
```bash
# Start the full-stack development server (API + Vite frontend via tsx)
npm run dev

# The app will be accessible at http://localhost:3000
```

---

## 📜 Available NPM Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `npm run dev` | `tsx server.ts` | Runs backend server and mounts Vite dev middleware with HMR. |
| `npm run start` | `tsx server.ts` | Runs the production/staging server. |
| `npm run build` | `vite build` | Compiles frontend assets into `dist/`. |
| `npm run test` | `jest` | Executes Jest test suites in `tests/` (`ts-jest`). |
| `npm run lint` | `tsc --noEmit` | Performs TypeScript static type checking without emitting files. |
| `npm run clean` | `rm -rf dist server.js` | Cleans build artifacts. |

---

## 🧪 Testing Suite

Automated testing is configured using **Jest** and **ts-jest** for TypeScript coverage:

```bash
# Run all unit tests
npm test

# Run tests in watch mode
npx jest --watch

# Run a specific test suite
npx jest tests/strategy.test.ts
```

### Test Files
- [`tests/strategy.test.ts`](file:///mnt/data/BACK_UP/Code/Quant_Trading_System/tests/strategy.test.ts): Unit tests validating trading signals (including bullish, bearish, and neutral conditions for MACD Cross).
- [`tests/technicalIndicators.test.ts`](file:///mnt/data/BACK_UP/Code/Quant_Trading_System/tests/technicalIndicators.test.ts): Unit tests verifying technical indicator transformations (SMA, EMA, RSI, MACD, Bollinger Bands).

---

## 📂 Data & Model Management

### Git LFS
Large neural network binary models (`*.keras`, `*.h5`) are tracked via Git LFS to keep repository history compact:
```bash
# Ensure Git LFS is installed and initialized
git lfs install
git lfs pull
```
Configuration is stored in [`.gitattributes`](file:///mnt/data/BACK_UP/Code/Quant_Trading_System/.gitattributes).

### Asset Manifests & Downloader
- **Model Versioning Manifest** ([`models/manifest.json`](file:///mnt/data/BACK_UP/Code/Quant_Trading_System/models/manifest.json)): Maps model family and version identifiers (`astronacci` v1/v2, `lstm` v1/v5.2.1) to target binary files.
- **Data Manifest** ([`data/manifest.json`](file:///mnt/data/BACK_UP/Code/Quant_Trading_System/data/manifest.json)): Remote URLs for large datasets and model files.
- **Download Utility** ([`scripts/download_data.sh`](file:///mnt/data/BACK_UP/Code/Quant_Trading_System/scripts/download_data.sh)): Bash utility using `jq` and `curl` to fetch assets listed in the data manifest:
  ```bash
  chmod +x scripts/download_data.sh
  ./scripts/download_data.sh
  ```

---

## 📁 Project Structure

```
Quant_Trading_System/
├── .env.example             # Template for environment variables
├── .gitattributes          # Git LFS configuration (*.keras, *.h5)
├── package.json             # NPM dependencies, scripts, and Jest config
├── tsconfig.json            # TypeScript compiler configuration
├── server.ts                # Express backend & Vite dev server integration
├── data/                    # Market datasets and data manifest
│   ├── manifest.json
│   └── *.csv
├── models/                  # ML models, metadata, and version manifest
│   ├── manifest.json
│   └── *.keras / *.h5 / *.pkl
├── scripts/                 # Automation & maintenance scripts
│   └── download_data.sh
├── src/                     # React application source code
│   ├── App.tsx
│   ├── types.ts             # Data and model type definitions
│   ├── components/          # Tab views and modular dashboard widgets
│   │   ├── BacktestTab.tsx
│   │   ├── AstroCycleTab.tsx
│   │   ├── LstmModelTab.tsx
│   │   ├── MonteCarloTab.tsx
│   │   ├── PortfolioTab.tsx
│   │   ├── RiskManagementTab.tsx
│   │   ├── GridTradingTab.tsx
│   │   ├── ModulesTab.tsx
│   │   └── CandlestickChart.tsx
│   └── utils/               # Core quantitative logic
│       ├── strategy.ts      # Trading strategy signal dispatcher
│       └── technicalIndicators.ts # Mathematical indicators (EMA, RSI, MACD, BB)
└── tests/                   # Jest test suites
    ├── strategy.test.ts
    └── technicalIndicators.test.ts
```

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).
