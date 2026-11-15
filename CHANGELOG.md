# 📜 Changelog: Bitcoin Quantitative Trading System

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [5.3.0] - 2026-11-15

### 🚀 Added
- **Binance WebSocket Live Stream Engine** ([`src/services/binanceWs.ts`](src/services/binanceWs.ts)):
  - Direct connection to Binance public WebSocket stream (`wss://stream.binance.com:9443/ws/btcusdt@ticker`).
  - Sub-second real-time tick streaming with automatic exponential backoff reconnection.
  - Header tick flash animations (green flash on tick up, red flash on tick down).
  - Live status indicator badges (`● WS STREAM LIVE`, `CONNECTING...`, `REST MODE`).
  - Unit tests for WebSocket manager state and callbacks ([`tests/binanceWs.test.ts`](tests/binanceWs.test.ts)).
- **Multi-Timeframe Backtest & Terminal Synchronization** ([`src/App.tsx`](src/App.tsx), [`src/components/BacktestTab.tsx`](src/components/BacktestTab.tsx), [`src/components/CandlestickChart.tsx`](src/components/CandlestickChart.tsx)):
  - Global timeframe selector supporting `1h`, `4h`, `1d`, and `1w` resolutions.
  - Backtest engine dynamically recomputes all 9 trading strategies and equity curves against active resolution bars.
  - Synchronized Candlestick Terminal and Backtest metrics in lockstep.
- **WebSocket Control & Status Integration** ([`src/components/LiveFeedModal.tsx`](src/components/LiveFeedModal.tsx)):
  - WebSocket status inspection and on-demand stream reconnection trigger.
- **Walk-Forward Analysis & Parameter Sweeper Engine** ([`src/utils/walkForward.ts`](src/utils/walkForward.ts), [`src/components/WalkForwardModal.tsx`](src/components/WalkForwardModal.tsx)):
  - Anti-overfitting framework splitting historical bars into In-Sample (IS, 50%–85%) and Out-of-Sample (OOS, 15%–50%) validation windows.
  - Automated grid search across parameter permutations (score thresholds, entry/exit levels, Stop-Loss, and Take-Profit).
  - Walk-Forward Efficiency (WFE %) calculation:
    $$\text{WFE} = \frac{\text{Annualized Return}_{\text{OOS}}}{\text{Annualized Return}_{\text{IS}}} \times 100\%$$
  - Automatic Overfit Risk classification (`LOW`, `MODERATE`, `HIGH`) and 0–100 Robustness Scoring.
  - Interactive candidate leaderboard modal with one-click "Apply Parameters" to immediately update backtest execution.
  - 6 unit tests covering metric calculations, parameter grid generation, and overfit risk detection ([`tests/walkForward.test.ts`](tests/walkForward.test.ts)).

---

## [5.2.1 PRO] - 2026-11-15

### 🚀 Added
- **Formalized Documentation Suite**:
  - [`ARCHITECTURE.md`](ARCHITECTURE.md): Mathematical formulations (Wilder's ATR, Supertrend, EMA, RSI, MACD, Bollinger Bands), 9 strategy specs, 5-factor Ensemble scoring, and backtest execution mechanics.
  - [`DEPLOYMENT.md`](DEPLOYMENT.md): Production guide featuring Linux `systemd` service, PM2 ecosystem, multi-stage `Dockerfile`, `docker-compose.yml`, and Nginx reverse proxy with SSL.
  - [`AGENT.md`](AGENT.md): Operational guidelines and mandatory 4-step verification pipeline for AI coding assistants.
- **Dedicated Web Worker for Monte Carlo Engine** ([`src/workers/monteCarlo.worker.ts`](src/workers/monteCarlo.worker.ts)):
  - Offloaded 1,000–10,000 Geometric Brownian Motion stochastic path computations to background thread.
  - UI remains at 60–120 FPS with zero frame drop during parameter adjustment.
  - Added pure math engine ([`src/workers/monteCarloCore.ts`](src/workers/monteCarloCore.ts)) and 3 unit tests ([`tests/monteCarlo.test.ts`](tests/monteCarlo.test.ts)).
- **Native View Transitions API** ([`src/App.tsx`](src/App.tsx)):
  - Smooth, cross-fade tab navigation without external animation libraries.
  - Scoped to `.tab-panel-container` to keep header ticker and footer status bar fixed.
- **Supertrend Visual Overlays in Candlestick Terminal** ([`src/components/CandlestickChart.tsx`](src/components/CandlestickChart.tsx)):
  - Segmented colored SVG path (green for bullish, red for bearish).
  - Buy/Sell triangle signal badges upon Supertrend direction flip.
  - Interactive HUD values displaying Supertrend price and trend direction badge.
  - Toolbar toggle buttons for Supertrend and Buy/Sell Signals.
- **Server Response Caching**:
  - In-memory cache in [`server.ts`](server.ts) for live ticker (8s TTL) and klines (30s TTL).

### ⚡ Changed
- **Modernized Modal Dialog** ([`src/components/LiveFeedModal.tsx`](src/components/LiveFeedModal.tsx)):
  - Refactored legacy `div fixed inset-0` into native HTML `<dialog>` element.
  - Built-in Top Layer rendering, automatic keyboard focus trapping, native `Escape` dismissal, and backdrop click-to-close.
- **Replaced Monolithic Hardcoded Dataset**:
  - Reduced [`src/data/historicalData.ts`](src/data/historicalData.ts) from 1,354 lines to 63 lines (-95% LOC).
  - Dynamically loads from server CSV archives (`trading_data/BTC_trading_data.csv`, 4,200+ bars) or live Binance REST API.
  - Added `/api/crypto/candles` and `/api/crypto/symbols` endpoints.
- **Manual On-Demand Market Data Sync**:
  - Disabled automatic 15-second background polling by default (`isAutoSync: false`).
  - Data sync is now on-demand via the Header Refresh button or Live Feed Modal to prevent network spam.

### 🛠️ Fixed
- **Proxy Console Warning Flood**:
  - Silenced repeated `[Proxy] Binance fetch failed: This operation was aborted` timeout spam in `server.ts`.
  - Added quiet debug logger (`DEBUG_PROXY=true` flag) with fast 2,000ms failover to local archives.

---

## [5.1.0] - 2026-11-06

### 🚀 Added
- **Ensemble Multi-Factor Confluence Strategy** (`ensemble`):
  - 100-point scoring algorithm combining Macro Regime (25 pts), Volatility Stop (25 pts), Momentum (20 pts), RSI Health Zone (15 pts), and ML Direction (15 pts).
- **Supertrend ATR Strategy** (`supertrend`):
  - 10-period, 3x multiplier trailing stop based on Wilder's Average True Range.
- **Trend-Filtered Momentum Strategy** (`trend_filter`):
  - Macro filter requiring price above 200 EMA combined with 9/21 EMA crossover.
- **MACD Crossover Strategy** (`macd_cross`):
  - Momentum trend following triggered by MACD and 9-period signal line cross.
- **Unit Test Coverage**:
  - Added 14 strategy tests in [`tests/strategy.test.ts`](tests/strategy.test.ts).
  - Added 3 technical indicator mathematical checks in [`tests/technicalIndicators.test.ts`](tests/technicalIndicators.test.ts).

### ⚡ Changed
- **Backtesting Lab UI** ([`src/components/BacktestTab.tsx`](src/components/BacktestTab.tsx)):
  - Added selector pills for all 9 strategies.
  - Enforced strict TypeScript `StrategyModel` union typing.
- **TypeScript & Jest Configuration**:
  - Added `esModuleInterop: true` in `tsconfig.json` to eliminate ts-jest warnings.

---

## [5.0.0] - 2026-11-03

### 🚀 Added
- **Risk Management Dashboard** ([`src/components/RiskManagementTab.tsx`](src/components/RiskManagementTab.tsx)):
  - Multi-asset correlation matrix across BTC, ETH, SOL, BNB, ADA.
  - Maximum Drawdown (MDD) tracking and risk heatmaps.
  - Custom date range and horizon filtering.
- **Interactive Candlestick Terminal** ([`src/components/CandlestickChart.tsx`](src/components/CandlestickChart.tsx)):
  - Pure SVG rendering without external chart libraries.
  - Overlay toggles: EMA 9, EMA 21, EMA 50, EMA 200, Bollinger Bands (20, 2).
  - Subplot selector: RSI (14) and MACD (12, 26, 9) histogram.
  - Celestial Apogee and Retrograde marker indicators.

---

## [4.0.0] - 2026-11-02

### 🚀 Added
- **Full-Stack Express Proxy Server** ([`server.ts`](server.ts)):
  - Live ticker endpoint with 4-tier fallback: Binance $\to$ CoinGecko $\to$ Kraken $\to$ Coinbase $\to$ Verified Snapshot.
  - Multi-coin price feeds (`/api/crypto/multi`).
  - Vite dev server middleware integration with Hot Module Replacement (HMR).
- **Core Research Tabs**:
  - **Astronacci Cycle Tab**: Lunar apogee windows and planetary harmonic monitoring.
  - **LSTM Model Observatory**: v1 hybrid vs v5.2.1 bidirectional neural network comparison.
  - **Portfolio Tracker & Rebalancer**: Automated weight variance and rebalancing calculator.
  - **Spot Grid Simulator**: Limit ladder visualization with arithmetic spacing.
  - **Research Curriculum**: Guided modules 1 through 5.
- **Historical Crypto Datasets**:
  - Populated multi-year historical datasets in `trading_data/` for BTC, ETH, SOL, BNB, and ADA.
  - Added Keras model weights and metadata manifests in `models/`.

---

## [1.0.0] - 2026-11-02

### 🚀 Added
- Initial project scaffolding with React 19, Vite, TypeScript, and Tailwind CSS v4.
- Basic quantitative strategy prototypes.
