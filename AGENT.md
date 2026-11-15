# 🤖 Agent Guidelines: Bitcoin Quantitative Trading System

> **Document Version**: 1.0.0  
> **Target Audience**: AI Agents (Claude Code, Antigravity, Cursor, Copilot) & Human Engineers  
> **Workspace Root**: `/mnt/data/BACK_UP/Code/Quant_Trading_System`

---

## 🧭 Project Overview

**Bitcoin Research & Quantitative Trading Lab** is a high-performance quantitative trading research platform built on **React 19**, **TypeScript 5**, **Vite 6**, **Tailwind CSS v4**, and an **Express 5 proxy server**.

The platform provides end-to-end quantitative tools:
- **9 Trading Strategies** (LSTM, Astronacci, EMA Cross, Supertrend, Trend-Filtered, Ensemble Confluence, etc.)
- **Vectorized Backtesting Engine** with stop-loss/take-profit, fee modeling, and trade ledgers
- **Interactive SVG Candlestick Terminal** with multi-timeframe feeds, overlay toggles, and signal badges
- **Multi-Path Monte Carlo Engine** powered by dedicated native Web Workers (1k–10k paths)
- **Portfolio & Risk Management** with correlation matrices, VaR/CVaR, and maximum drawdown tracking
- **Dynamic Multi-Tier Data Pipeline** (Binance REST API + Historical CSV Archives + Seed Fallback)

---

## ⚡ Quick Reference Commands

All agents must use these exact commands for development, linting, testing, and building:

| Action | Command | Purpose |
|---|---|---|
| **Development** | `npm run dev` | Runs Express proxy + Vite HMR development server |
| **Lint / Typecheck** | `npm run lint` | Runs `tsc --noEmit` (strict TypeScript validation) |
| **Unit Testing** | `npm test` | Runs Jest test runner (`ts-jest`) on all test suites |
| **Single Test Suite** | `npx jest tests/<file>.test.ts` | Runs an isolated test suite |
| **Production Build** | `npm run build` | Compiles frontend assets into `dist/` |
| **Clean Artifacts** | `npm run clean` | Removes `dist/` and build output files |
| **Production Server** | `npm run start` | Boots the full-stack server with production build |

---

## 🧱 Repository Architecture

```
Quant_Trading_System/
├── AGENT.md                       # This instruction file for AI agents
├── README.md                      # Human-facing project documentation
├── package.json                   # Dependencies, scripts, and Jest config
├── tsconfig.json                  # Strict TypeScript configuration
├── vite.config.ts                 # Vite bundler plugins and alias setup
├── server.ts                      # Express API proxy with 4-tier fallback
│
├── data/                          # Manifest and dataset descriptors
│   └── manifest.json
├── models/                        # Keras / H5 ML models and metadata
│   ├── manifest.json
│   └── btc_lstm_v5_2_1_metadata.json
├── trading_data/                  # Multi-year historical crypto datasets
│   ├── BTC_trading_data.csv       # 4,200+ historical bars
│   ├── ETH_trading_data.csv       # 3,100+ historical bars
│   ├── SOL_trading_data.csv       # 2,200+ historical bars
│   ├── BNB_trading_data.csv       # 3,100+ historical bars
│   └── ADA_trading_data.csv       # 3,100+ historical bars
│
├── src/
│   ├── App.tsx                    # Root component, global state, View Transitions
│   ├── main.tsx                   # React 19 DOM entry point
│   ├── index.css                  # Tailwind v4 theme, View Transitions, Dialog styling
│   ├── types/
│   │   └── index.ts               # CandleData, SimulationSummary, StrategyModel types
│   ├── services/
│   │   └── cryptoApi.ts           # Dynamic multi-tiered market data loader
│   ├── data/
│   │   ├── historicalData.ts      # Compact OHLCV seed dataset for offline resilience
│   │   ├── modelsData.ts          # ML architecture metadata & sweep matrices
│   │   └── portfolioData.ts       # Default multi-asset allocation parameters
│   ├── utils/
│   │   ├── strategy.ts            # 9 trading strategies & Ensemble scoring dispatcher
│   │   └── technicalIndicators.ts # ATR, Supertrend, EMA, RSI, MACD, Bollinger Bands
│   ├── workers/
│   │   ├── monteCarloCore.ts      # Pure math engine for GBM stochastic simulations
│   │   └── monteCarlo.worker.ts   # Dedicated Web Worker offloading computation from UI
│   └── components/
│       ├── Header.tsx             # Navbar, live ticker indicator, tab switcher
│       ├── BacktestTab.tsx        # Strategy backtest simulator & trade ledger
│       ├── CandlestickChart.tsx   # Interactive SVG chart with Supertrend/EMA overlays
│       ├── RiskManagementTab.tsx  # Correlation matrix, MDD, asset exposure
│       ├── AstroCycleTab.tsx      # Lunar apogee & celestial harmonic cycles
│       ├── LstmModelTab.tsx       # Neural network architecture & threshold sweep
│       ├── MonteCarloTab.tsx      # Fan-chart stochastic simulation interface
│       ├── PortfolioTab.tsx       # Rebalancing calculator & asset allocation
│       ├── GridTradingTab.tsx     # Spot grid bot ladder configuration
│       ├── ModulesTab.tsx         # Quantitative curriculum lessons (Modul 1-5)
│       └── LiveFeedModal.tsx      # Native HTML <dialog> live feed configuration modal
│
└── tests/
    ├── strategy.test.ts           # Strategy signal verification (14 tests)
    ├── technicalIndicators.test.ts# Mathematical indicator checks (3 tests)
    └── monteCarlo.test.ts         # Stochastic quantile & risk boundaries (3 tests)
```

---

## 🛡️ Coding Standards & Web Platform Principles

### 1. Modern Web Guidance (Baseline Principles)
Follow the standards defined by Google Chrome's **Modern Web Guidance**:
- **Native `<dialog>` Elements**: Never use custom `div fixed inset-0` overlays for modals. Always use HTML `<dialog>` with `.showModal()`, `::backdrop`, and native focus-trapping.
- **Native View Transitions API**: Use `document.startViewTransition()` for smooth cross-fades when transitioning between tabs and views.
- **Web Workers for Intensive Math**: Any simulation or heavy computation (> 1,000 iterations) must be offloaded to a dedicated Web Worker in `src/workers/` to prevent UI frame drops (maintaining optimal INP - Interaction to Next Paint).
- **CSS Container Queries (`@container`)**: Use container-relative sizing over viewport-only queries for responsive data visualization widgets.

### 2. TypeScript & Type Safety
- **Strict Typing**: Never use `any` unless interacting with untyped browser globals.
- **Exported Type Unions**: Always use `StrategyModel` union (`'lstm' | 'astronacci' | 'ema_cross' | ...`) from `src/utils/strategy.ts` instead of raw strings.
- **Centralized Types**: Put shared data structures in `src/types/index.ts`.

### 3. Styling & UI Consistency
- **Tailwind CSS v4**: Use utility classes with `@import "tailwindcss";` in `src/index.css`.
- **Dark Theme Palette**:
  - Background: `bg-slate-950`, Panels: `bg-slate-900`, Borders: `border-slate-800`
  - Accents: `emerald-400` (Bullish/Success), `rose-400` (Bearish/Danger), `amber-400` (Warning/BTC), `cyan-400` / `indigo-400` (Quant/ML)
- **Monospace Fonts**: Use `font-mono` for all numerical prices, percentages, dates, and trade metrics.

---

## 🔄 Standard Verification Pipeline (MANDATORY)

Before completing any task or committing changes, **always execute and verify this 4-step sequence**:

```bash
# 1. Type Check (Must report 0 errors)
npm run lint

# 2. Run All Unit Tests (All 20+ tests must pass)
npm test

# 3. Verify Production Bundling
npm run build

# 4. Clean Temporary Build Artifacts
npm run clean
```

If any step fails, diagnose and fix the error before reporting back to the user.

---

## 🚀 How-To Guides for Common Extensions

### 1. Adding a New Trading Strategy
1. In [`src/utils/strategy.ts`](file:///mnt/data/BACK_UP/Code/Quant_Trading_System/src/utils/strategy.ts):
   - Add the strategy identifier to `StrategyModel` type union:
     ```ts
     export type StrategyModel = 'lstm' | ... | 'my_new_strategy';
     ```
   - Implement the signal generator function:
     ```ts
     export function getSignalMyNewStrategy(candle: CandleData): { buy: boolean; sell: boolean } {
       return { buy: /* condition */, sell: /* condition */ };
     }
     ```
   - Add the case to the `getSignal()` dispatcher function switch statement.
2. In [`src/components/BacktestTab.tsx`](file:///mnt/data/BACK_UP/Code/Quant_Trading_System/src/components/BacktestTab.tsx):
   - Add the pill button to the strategy selector list.
3. In [`tests/strategy.test.ts`](file:///mnt/data/BACK_UP/Code/Quant_Trading_System/tests/strategy.test.ts):
   - Write unit tests covering bullish, bearish, and neutral conditions.
4. Update `README.md` to document the new strategy logic.

### 2. Adding a New Technical Indicator
1. In [`src/types/index.ts`](file:///mnt/data/BACK_UP/Code/Quant_Trading_System/src/types/index.ts):
   - Add the indicator field to the `CandleData` interface (e.g. `vwap?: number;`).
2. In [`src/utils/technicalIndicators.ts`](file:///mnt/data/BACK_UP/Code/Quant_Trading_System/src/utils/technicalIndicators.ts):
   - Export a calculation function (e.g. `calcVWAP()`).
   - Integrate it into `calculateIndicators()` so it automatically populates on all raw candle feeds.
3. In [`tests/technicalIndicators.test.ts`](file:///mnt/data/BACK_UP/Code/Quant_Trading_System/tests/technicalIndicators.test.ts):
   - Add unit tests verifying expected mathematical outputs.

### 3. Adding Support for a New Cryptocurrency Symbol
1. Verify historical CSV archive exists in `trading_data/<SYMBOL>_trading_data.csv`.
2. In `server.ts`:
   - Add the symbol to the `/api/crypto/symbols` endpoint list.
3. In `src/services/cryptoApi.ts`:
   - Add the option to `SUPPORTED_SYMBOLS` array.

---

## 🔒 Security & Git Commit Conventions

- **Git Commit Messages**: Use Conventional Commits formatting:
  - `feat(scope): add new capability`
  - `fix(scope): resolve bug or glitch`
  - `perf(scope): performance optimization`
  - `refactor(scope): structural cleanup`
  - `test(scope): add or improve unit tests`
- **File System Permissions**: On sandbox environments where git lock files (`.git/index.lock`) require elevated permissions, run the git commit tool with `BypassSandbox: true`. Keep all other tasks sandboxed.
- **No Secret Leaks**: Never hardcode private API keys in client-side code; use `.env` server-side variables via `process.env`.
