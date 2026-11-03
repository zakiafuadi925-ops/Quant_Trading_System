# Bitcoin Research & Quantitative Trading Lab

A high‑performance interactive cryptocurrency quantitative research platform built with **React 19**, **Vite**, **TypeScript**, and **Tailwind CSS v4**.  The application ports a multi‑stage Python research workflow (Astronacci cycle analysis, LSTM deep learning, Monte‑Carlo stochastic projections, multi‑asset rebalancing & grid trading) into a modern, responsive web UI.

---

## 📦 Key Modules & Capabilities

| Module | Description |
|--------|-------------|
| **Backtesting Lab** (`overview`) | Simulates trading logic, order‑execution fees, equity‑curve chart, KPI metrics, and filterable trade ledger. |
| **Astronacci Cycle** (`astronacci`) | Statistical alpha analysis around lunar apogee windows, planetary harmonic monitoring, and confluence strategy. |
| **LSTM Model Observatory** (`lstm`) | Compare v1 (Astronacci hybrid) vs v5.2.1 (bidirectional return forecaster), inspect 17‑dimensional feature vectors, and sweep thresholds. |
| **Monte‑Carlo Engine** (`monte-carlo`) | GBM simulation (1 k‑10 k paths) over 7‑60 day horizons with confidence fan‑charts and VaR/CVaR analytics. |
| **Portfolio Tracker & Rebalancer** (`portfolio`) | Real‑time weight allocation, automatic rebalancing calculations, alerts, and trade‑ledger view. |
| **Grid Trading Simulator** (`grid`) | Configurable long‑only spot‑grid model with interactive ladder visualisation. |
| **Interactive Research Curriculum** (`modules`) | Guided notebooks for Modules 1‑5 (Python fundamentals → automated quant trading). |

---

## 🛠️ Development & Build

```bash
# 1️⃣ Install dependencies (Node & Python)
npm ci                     # installs exact versions from package‑lock.json
# optional: set up a Python venv for notebooks & model scripts
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt   # create this file if missing

# 2️⃣ Run the development server (Vite) – listens on http://localhost:3000
npm run dev

# 3️⃣ (Optional) Start the lightweight API server used by the UI
npm run server   # defined in package.json (ts-node server.ts)
```

### Scripts
| Script | Purpose |
|--------|---------|
| `dev` | Starts Vite dev server (HMR enabled by default). |
| `build` | Produces a production bundle in `dist/`. |
| `lint` | Runs ESLint/Prettier checks. |
| `server` | Starts the Node/TS API server (exposes `/api/crypto`). |
| `data:refresh` | (To be added) Executes notebooks head‑less to pull fresh market data and regenerate CSV/NPY artifacts. |

---

## ⚙️ Configuration

Create a local `.env` file (or copy the example below) with the required environment variables:

```env
# API endpoint for market data (e.g. CoinGecko, Binance, etc.)
CRYPTO_API_BASE_URL=https://api.example.com
# API key if the provider requires authentication
CRYPTO_API_KEY=your_api_key_here

# Optional: disable Vite HMR (useful in CI or low‑resource environments)
DISABLE_HMR=false
```

The project already ships an `.env.example` you can copy:

```bash
cp .env.example .env
```

> **Note:** Never commit real secrets; `.env` is ignored via `.gitignore`.

---

## 📂 Data & Model Management

The repository currently contains many CSV/NPY/Keras model files. To keep the Git history lightweight we recommend:

1. **Move large assets to external storage** (e.g., an S3 bucket or Google Drive).  Store only a small lookup table (`data/manifest.json`) that maps logical names → URLs.
2. **Enable Git LFS** for any remaining binary model files (`*.keras`, `*.h5`).
3. **Add a data‑download script** (`scripts/download_data.sh`) that fetches the assets at runtime.

A simple manifest example (`data/manifest.json`):
```json
{
  "btc_historical_data.csv": "https://my-bucket.s3.amazonaws.com/btc_historical_data.csv",
  "btc_lstm_v5_2_1.keras": "https://my-bucket.s3.amazonaws.com/models/btc_lstm_v5_2_1.keras"
}
```

---

## 🧪 Testing

At the moment the repo lacks automated tests.  Adding a test suite will improve reliability and enable CI checks.

- **TypeScript**: Use **Jest** with `ts-jest` for unit tests of utilities (`src/utils/ntechnicalIndicators.ts`, React components, API wrappers).
- **Python**: Use **pytest** for notebook‑derived scripts, model‑training pipelines, and data‑cleaning functions.

Create a `tests/` folder and add a basic example:
```tsx
// tests/indicator.test.ts
import { ema } from '../src/utils/ntechnicalIndicators';

test('EMA computes correct length', () => {
  const series = [1,2,3,4,5];
  const result = ema(series, 3);
  expect(result.length).toBe(series.length);
});
```

---

## 📦 CI / GitHub Actions

A minimal CI workflow (`.github/workflows/ci.yml`) can:
1. Install Node & Python dependencies.
2. Run lint & type‑checking.
3. Execute Jest tests.
4. Run `pytest` on Python notebooks (via `nbconvert` to scripts).
5. Optionally build the production bundle.

---

## 📚 Model Version Manifest

Because several Astronacci/LSTM models coexist, a manifest helps the UI pick the right version:
```json
// models/manifest.json
{
  "astronacci": {
    "v1": "model_astronacci_v1.keras",
    "v2": "model_astronacci_v2.keras"
  },
  "lstm": {
    "v1": "btc_lstm_v1.keras",
    "v5_2_1": "btc_lstm_v5_2_1.keras"
  }
}
```
Load this file in the React app to populate a drop‑down selector for model choice.

---

## 📜 License

Add an appropriate open‑source license (e.g., MIT) and a `LICENSE` file.

---

## ✅ Next Steps (you can pick one to start)
1. **Add `.env.example`** – a quick file with placeholder keys.
2. **Create `models/manifest.json`** – formalise model versioning.
3. **Introduce a small `download_data.sh` script** and a `data/manifest.json` for external assets.
4. **Add a basic Jest test** for a utility function.
5. **Set up a GitHub Actions CI workflow**.
6. **Enable Git LFS** for heavy model files.

Let me know which of these you’d like to tackle first, or if you’d like me to implement several of them automatically.
---

## 🧪 Testing

At the moment the repo lacks automated tests.  Adding a test suite will improve reliability and enable CI checks.

- **TypeScript**: Use **Jest** with `ts-jest` for unit tests of utilities (`src/utils/ntechnicalIndicators.ts`, React components, API wrappers).
- **Python**: Use **pytest** for notebook‑derived scripts, model‑training pipelines, and data‑cleaning functions.

Create a `tests/` folder and add a basic example:
```tsx
// tests/indicator.test.ts
import { ema } from '../src/utils/ntechnicalIndicators';

test('EMA computes correct length', () => {
  const series = [1,2,3,4,5];
  const result = ema(series, 3);
  expect(result.length).toBe(series.length);
});
```

---

## 📦 CI / GitHub Actions

A minimal CI workflow (`.github/workflows/ci.yml`) can:
1. Install Node & Python dependencies.
2. Run lint & type‑checking.
3. Execute Jest tests.
4. Run `pytest` on Python notebooks (via `nbconvert` to scripts).
5. Optionally build the production bundle.

---

## 📚 Model Version Manifest

Because several Astronacci/LSTM models coexist, a manifest helps the UI pick the right version:
```json
// models/manifest.json
{
  "astronacci": {
    "v1": "model_astronacci_v1.keras",
    "v2": "model_astronacci_v2.keras"
  },
  "lstm": {
    "v1": "btc_lstm_v1.keras",
    "v5_2_1": "btc_lstm_v5_2_1.keras"
  }
}
```
Load this file in the React app to populate a drop‑down selector for model choice.

---

## 📜 License

Add an appropriate open‑source license (e.g., MIT) and a `LICENSE` file.

---

## ✅ Next Steps (you can pick one to start)
1. **Add `.env.example`** – a quick file with placeholder keys.
2. **Create `models/manifest.json`** – formalise model versioning.
3. **Introduce a small `download_data.sh` script** and a `data/manifest.json` for external assets.
4. **Add a basic Jest test** for a utility function.
5. **Set up a GitHub Actions CI workflow**.
6. **Enable Git LFS** for heavy model files.

Let me know which of these you’d like to tackle first, or if you’d like me to implement several of them automatically.
