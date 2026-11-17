# 📜 Changelog: Bitcoin Quantitative Trading System

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [6.2.0] - 2026-11-17

### 🚀 Added
- **Historical Monte Carlo Trade Bootstrap Engine** ([`src/utils/tradeBootstrap.ts`](src/utils/tradeBootstrap.ts), [`src/components/MonteCarloTab.tsx`](src/components/MonteCarloTab.tsx)):
  - 5,000-run stochastic bootstrap sampling with replacement across historical trade distributions.
  - Mathematical quantification of Probability of Ruin under configurable capital loss thresholds (-30%, -50%, -70%).
  - Detailed Drawdown Percentile distributions (Median, 95th %tile, 99th %tile, and worst-case drawdown).
  - 6-bin drawdown frequency histogram matrix covering 100% of iteration mass.
  - Longest consecutive loss streak analysis and bootstrap Sharpe confidence intervals.
  - Interactive dual-mode selector in Monte Carlo Observatory toggling between Stochastic GBM Price Projection and 5,000-Run Trade Sequence Bootstrap.
- **Institutional Analytics & One-Click Fact Sheet Suite** ([`src/utils/factSheet.ts`](src/utils/factSheet.ts), [`src/components/FactSheetModal.tsx`](src/components/FactSheetModal.tsx), [`src/components/BacktestTab.tsx`](src/components/BacktestTab.tsx)):
  - Automated Monthly Return Heatmap matrix calculation (Year $\times$ 12 Months + compounded YTD).
  - Hedge-fund tier ratio calculations: Annualized Sharpe, Downside-only Sortino, Calmar (CAGR / Max DD), Recovery Factor, and Payoff Ratio.
  - Historical Value at Risk (VaR 95% and VaR 99%) and Conditional VaR / Expected Shortfall (CVaR 95% & CVaR 99%).
  - One-click CSV Audit export downloading complete executive metrics, monthly heatmap tables, and full transactional ledger.
  - High-resolution, printable Institutional PDF Fact Sheet generator with print styling and dark/light presentation theme (`openPrintableFactSheet`).
- **Unit Test Coverage for Institutional Suite** ([`tests/tradeBootstrap.test.ts`](tests/tradeBootstrap.test.ts), [`tests/factSheet.test.ts`](tests/factSheet.test.ts)):
  - 7 new comprehensive unit tests verifying 5,000-run bootstrap accuracy, ruin calculations, drawdown histogram coverage, monthly return compounding, and CSV report formatting (total test suite elevated to 62 passing tests across 10 suites).

---

## [6.1.0] - 2026-11-17

### 🚀 Added
- **Virtual Paper Trading Wallet & Perpetual Futures Execution Engine** ([`src/utils/paperTrading.ts`](src/utils/paperTrading.ts), [`src/components/PaperTradingTab.tsx`](src/components/PaperTradingTab.tsx)):
  - In-memory simulated exchange account initialized with default $10,000 USDT balance and localStorage persistence.
  - Perpetual Futures simulator supporting 1x–10x configurable leverage, initial & maintenance margin modeling, and real-time liquidation price calculation.
  - Market and Limit order routing with tick-level fill verification against live Binance WebSocket prices.
  - Dynamic slippage modeling based on order notional size ($2.0\text{--}22.0\text{ bps}$) and maker/taker fee structures.
  - Automated triggers for Trailing Stop-Loss (USD peak offset), hard Stop-Loss, Take-Profit, and catastrophic Liquidation.
  - Periodic Perpetual Funding Rate simulation (8-hour interval, 1 bps) adjusting cash balances across open positions.
  - Immutable Execution Audit Ledger tracking timestamps, executed prices, realized PnL, fees, and trigger reasons.
- **Alert & Multi-Channel Webhook Notification Engine** ([`src/utils/alertEngine.ts`](src/utils/alertEngine.ts)):
  - Real-time rule evaluation for high-conviction Ensemble Confluence triggers ($\ge 70$), Supertrend direction flips (Bullish/Bearish), price threshold breakouts, and critical margin call warnings ($< 20\%$).
  - Instant Telegram Bot API dispatcher with formatted markdown alerts (`formatTelegramMessage`).
  - Discord Channel Webhook dispatcher with structured embed payloads (`formatDiscordPayload`).
  - Configurable cooldown windows per rule to prevent notification flooding, accompanied by in-app trigger history logs and interactive test pings.
- **Paper Trading & Alert Management Console** ([`src/components/PaperTradingTab.tsx`](src/components/PaperTradingTab.tsx)):
  - Performance HUD displaying real-time Account Equity, Cash Balance, Unrealized PnL, Realized Net PnL, Margin Level, and Win Rate.
  - Order entry terminal with multi-asset quick switcher (BTC/ETH/SOL/BNB/ADA), leverage slider, quick margin percentage selectors (10%, 25%, 50%, 100%), and pre-flight execution parameter breakdown.
  - Interactive table of active positions with live mark-to-market PnL and manual market close action.
  - Webhook & alert rules configuration modal supporting Telegram token/chat ID and Discord webhook URL setup.
- **Comprehensive Unit Test Suites** ([`tests/paperTrading.test.ts`](tests/paperTrading.test.ts), [`tests/alertEngine.test.ts`](tests/alertEngine.test.ts)):
  - 20 new unit tests covering wallet initialization, leverage margin, liquidation pricing, market/limit orders, trailing stops, stop losses, liquidations, funding fees, performance statistics, and multi-channel webhook dispatching (bringing total test coverage to 55 passing tests across 8 suites).

---

## [6.0.0] - 2026-11-16

### 🚀 Added
- **17-Feature Synchronization Pipeline Engine** ([`src/utils/featurePipeline.ts`](src/utils/featurePipeline.ts)):
  - Real-time extraction of 17-dimensional quantitative input vector matching trained Bidirectional LSTM v5.2.1 architecture specifications (`return_1d`, `return_3d`, `return_7d`, `range_pct`, `body_pct`, `volume_change`, `ema_9/21/50/200_ratio`, `rsi_14`, `macd_pct`, `macd_signal_pct`, `macd_hist_pct`, `atr_pct`, `bb_position`, `bb_width`).
  - Exponential time-decay kernel over rolling 60-bar lookback window generating next-period return forecasts and directional probabilities.
  - Signal hurdle rate classifier (`STRONG_BUY`, `BUY`, `HOLD`, `SELL`, `STRONG_SELL`).
  - Unit tests covering feature boundaries, inference validity, and hurdle threshold sensitivity ([`tests/featurePipeline.test.ts`](tests/featurePipeline.test.ts)).
- **Python FastAPI Inference Microservice Bridge** ([`inference_service.py`](inference_service.py), [`server.ts`](server.ts)):
  - Dedicated FastAPI service on port 8000 loading deep learning model binaries (`models/btc_lstm_v5_2_1.keras`, `models/btc_astronacci_model.keras`).
  - REST endpoints: `GET /health`, `GET /models`, and `POST /predict`.
  - Express full-stack proxy integration via `/api/ml/predict` with automatic candle hydration from server CSV archives.
- **Live Sequential Inference Console in Model Observatory** ([`src/components/LstmModelTab.tsx`](src/components/LstmModelTab.tsx)):
  - Real-time forecast badge displaying next-period return percentage, directional confidence gauge, input tensor dimensions `[1, 60, 17]`, and recommended trade signal.
  - Interactive Hurdle Rate slider ($0.5\%\text{--}4.0\%$) allowing live calibration of signal sensitivity.
  - Active 17-feature value inspector grid displaying real-time values from the latest candle bar.

---

## [5.4.0] - 2026-11-16

### 🚀 Added
- **Multi-Asset Universe Engine & Dynamic Symbol Switching** ([`src/App.tsx`](src/App.tsx), [`src/components/Header.tsx`](src/components/Header.tsx), [`src/services/binanceWs.ts`](src/services/binanceWs.ts)):
  - Full support for 5 high-liquidity crypto assets: `BTC/USDT`, `ETH/USDT`, `SOL/USDT`, `BNB/USDT`, and `ADA/USDT`.
  - Header symbol quick-selector with dynamic coin branding icons (`₿`, `Ξ`, `◎`, `🔶`, `₳`) and tick flash animation.
  - Seamless WebSocket stream hot-swapping via `binanceWs.switchSymbol()` without tearing down UI listeners.
  - Dynamic dataset hydration supporting multi-timeframe backtests and candlestick rendering per selected coin.
- **Dynamic Cross-Asset Risk & Correlation Matrix** ([`src/components/RiskManagementTab.tsx`](src/components/RiskManagementTab.tsx), [`server.ts`](server.ts)):
  - Rolling Pearson correlation matrix endpoint (`/api/crypto/correlation`) with configurable `30D` and `90D` lookback windows.
  - Dual-mode matrix interface toggling between **Cross-Asset Universe** and **Factor Volatility Regimes**.
  - Real-time **Diversification Score** ($0\text{--}100$) based on average pairwise correlation and concentration risk.
  - Detailed pair-level quantitative breakdown: $R^2$ variance co-movement, relationship regime classification, and portfolio hedging guidance.
- **Unit Testing for Multi-Asset Operations** ([`tests/binanceWs.test.ts`](tests/binanceWs.test.ts)):
  - Added unit tests verifying dynamic symbol switching, state reset, and active symbol retrieval.

---

## [5.3.0] - 2026-11-15

### 🚀 Added
- **Level 2 Order Book Depth Visualizer** ([`src/components/OrderBookDepthWidget.tsx`](src/components/OrderBookDepthWidget.tsx), [`server.ts`](server.ts)):
  - Live 20-level bid/ask order book depth ladder with cumulative liquidity bars.
  - Dynamic mid-market price, spread readout (USDT & basis points), and dual-bar liquidity imbalance ratio meter.
  - Multiplexed Binance WebSocket combined stream (`@depth20@100ms`) with server proxy endpoint (`/api/crypto/depth`) fallback.
  - Interactive split-view terminal integration in [`src/components/CandlestickChart.tsx`](src/components/CandlestickChart.tsx) with depth level selectors (5L, 10L, 15L).
- **Cumulative Volume Delta (CVD) Analytics Engine** ([`src/services/binanceWs.ts`](src/services/binanceWs.ts), [`src/components/CandlestickChart.tsx`](src/components/CandlestickChart.tsx)):
  - Real-time classification of taker buy volume vs. taker sell volume via trade stream (`@trade`).
  - CVD line and delta volume histogram subplot in the Candlestick Terminal with HUD readout.
  - Institutional divergence detection (`BULLISH_ABSORPTION`, `BEARISH_EXHAUSTION`, `CONVERGENT`, `NEUTRAL`).
  - Unit tests for depth listeners, CVD accumulation, and session reset ([`tests/binanceWs.test.ts`](tests/binanceWs.test.ts)).
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
