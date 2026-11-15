# 🤝 Contributing to Bitcoin Research & Quantitative Trading Lab

Thank you for your interest in contributing to the **Bitcoin Research & Quantitative Trading Lab**! We welcome contributions from quantitative researchers, software engineers, data scientists, and algorithmic trading enthusiasts.

Please read this document carefully before submitting issues, features, or pull requests to ensure consistency with our architectural standards, code quality, and mathematical rigor.

---

## 📑 Table of Contents
1. [Code of Conduct](#1-code-of-conduct)
2. [Prerequisites & Development Setup](#2-prerequisites--development-setup)
3. [Branching Model & Git Workflow](#3-branching-model--git-workflow)
4. [Coding Standards & Architectural Principles](#4-coding-standards--architectural-principles)
5. [How to Contribute Specific Features](#5-how-to-contribute-specific-features)
6. [Mandatory Pre-Commit Verification Pipeline](#6-mandatory-pre-commit-verification-pipeline)
7. [Commit Message Guidelines (Conventional Commits)](#7-commit-message-guidelines-conventional-commits)
8. [Pull Request (PR) Submission Checklist](#8-pull-request-pr-submission-checklist)

---

## 1. Code of Conduct

We are committed to providing a welcoming, respectful, and harassment-free environment for all contributors regardless of experience level, background, or identity. Please maintain professional, constructive, and respectful communication in all interactions.

---

## 2. Prerequisites & Development Setup

### 2.1. System Requirements
- **Node.js**: `>= 20.10.0 LTS` (recommended: `Node.js 22.x LTS`)
- **NPM**: `>= 10.x`
- **Git**: `>= 2.40+`
- **Git LFS**: Required for tracking neural network binary weights (`*.keras`, `*.h5`)

### 2.2. Setting Up Your Local Environment

```bash
# 1. Fork the repository on GitHub, then clone your fork
git clone https://github.com/<your-username>/Quant_Trading_System.git
cd Quant_Trading_System

# 2. Initialize and pull large model weights via Git LFS
git lfs install
git lfs pull

# 3. Install project dependencies
npm install

# 4. Copy the environment template
cp .env.example .env

# 5. Start the local full-stack development server
npm run dev
```

The application will be accessible at `http://localhost:3002`.

---

## 3. Branching Model & Git Workflow

We use a standard feature-branch workflow based on `main`:

```
main ─────────────────────────────────────────────────────────────► (Production Ready)
       \                                                /
        └── feat/supertrend-overlay ───────────────────┘ (Pull Request)
```

### Branch Naming Conventions:
- `feat/<short-description>`: New strategies, UI tabs, or data features.
- `fix/<short-description>`: Bug fixes, mathematical adjustments, or UI corrections.
- `perf/<short-description>`: Computational optimizations (e.g. Web Workers, caching).
- `docs/<short-description>`: Documentation, architecture specs, or changelog updates.
- `refactor/<short-description>`: Code improvements without behavioral change.
- `test/<short-description>`: Adding or enhancing test suites.

Example:
```bash
git checkout -b feat/bollinger-band-width
```

---

## 4. Coding Standards & Architectural Principles

### 4.1. Strict TypeScript Standards
- **Zero `any` Policy**: Avoid `any` at all costs. Use strict interfaces, generics, or unknown with type guards.
- **Shared Types**: Place global data structures, strategy models, and indicator fields in [`src/types/index.ts`](src/types/index.ts).
- **Type Unions**: Model identifiers must belong to the exported `StrategyModel` union in [`src/utils/strategy.ts`](src/utils/strategy.ts).

### 4.2. Modern Web Platform Guidance
In conformance with Google Chrome's **Modern Web Guidance**:
- **Native `<dialog>` Elements**: Always use native HTML `<dialog>` with `.showModal()`, `::backdrop`, and accessible focus trapping for modals (refer to [`src/components/LiveFeedModal.tsx`](src/components/LiveFeedModal.tsx)).
- **Native View Transitions**: Use `document.startViewTransition()` for view and tab transitions without heavy external animation libraries.
- **Web Worker Concurrency**: Heavy stochastic loops or numerical simulations (> 1,000 iterations) must be placed in a dedicated Web Worker in `src/workers/` to preserve a 60–120 FPS UI framerate.
- **On-Demand Data Sync**: Avoid continuous background polling loops that create network congestion. Prefer user-initiated manual refreshes with server-side caching.

### 4.3. UI & Styling Guidelines
- **Tailwind CSS v4**: Use utility classes with `@import "tailwindcss";` in `src/index.css`.
- **Palette**: Dark theme palette using `slate-950` (backgrounds), `slate-900` (cards), `slate-800` (borders), `emerald-400` (bullish/success), `rose-400` (bearish/danger), and `amber-400` (Bitcoin/warning).
- **Typography**: Apply `font-mono` to all numerical prices, timestamps, percentages, and metrics.

---

## 5. How to Contribute Specific Features

### 5.1. Adding a New Trading Strategy
1. **Define Signal Logic** in [`src/utils/strategy.ts`](src/utils/strategy.ts):
   - Add the strategy key to `StrategyModel` type union.
   - Implement `getSignal<StrategyName>(candle: CandleData)`.
   - Register it in the `getSignal()` dispatcher switch statement.
2. **Expose in UI** in [`src/components/BacktestTab.tsx`](src/components/BacktestTab.tsx):
   - Add the strategy selector pill to the options list.
3. **Write Unit Tests** in [`tests/strategy.test.ts`](tests/strategy.test.ts):
   - Cover bullish entry, bearish exit, and neutral scenarios.
4. **Document Strategy** in [`ARCHITECTURE.md`](ARCHITECTURE.md) and [`README.md`](README.md).

### 5.2. Adding a Technical Indicator
1. **Define Field** in [`src/types/index.ts`](src/types/index.ts) under `CandleData`.
2. **Implement Calculation** in [`src/utils/technicalIndicators.ts`](src/utils/technicalIndicators.ts):
   - Export standalone calculation function (e.g. `calcVWAP()`).
   - Integrate into `calculateIndicators()` to populate across raw feeds.
3. **Add Unit Tests** in [`tests/technicalIndicators.test.ts`](tests/technicalIndicators.test.ts).

---

## 6. Mandatory Pre-Commit Verification Pipeline

Before committing any code or submitting a pull request, you **must run and pass all 4 steps of our verification pipeline**:

```bash
# Step 1: Strict TypeScript Compilation (Must pass with 0 errors)
npm run lint

# Step 2: Unit Test Suite (All 20+ tests must pass)
npm test

# Step 3: Production Asset Bundling (Vite build must succeed)
npm run build

# Step 4: Clean Temporary Build Artifacts
npm run clean
```

If any step fails, diagnose and resolve the issue before committing.

---

## 7. Commit Message Guidelines (Conventional Commits)

We enforce the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification:

```
<type>(<scope>): <short description in imperative mood>

[optional body explaining context or rationale]

[optional footer(s), e.g. Closes #123]
```

### Allowed Types:
- `feat`: A new feature or strategy.
- `fix`: A bug fix or mathematical calculation correction.
- `perf`: Performance optimization (e.g. Web Worker, caching).
- `docs`: Documentation updates (`README.md`, `ARCHITECTURE.md`, etc.).
- `refactor`: Code reorganization without functional changes.
- `test`: Adding or updating test suites.
- `chore`: Dependency updates, tooling, or build configuration.

### Examples:
```bash
git commit -m "feat(strategy): add Ichimoku Cloud breakout strategy"
git commit -m "fix(chart): resolve SVG crosshair boundary clipping on mobile viewports"
git commit -m "perf(monte-carlo): vectorise random walk path generator"
```

---

## 8. Pull Request (PR) Submission Checklist

Before opening a Pull Request, ensure that:

- [ ] Branch is rebased onto the latest `origin/main`.
- [ ] TypeScript typecheck passes cleanly (`npm run lint` $\to$ 0 errors).
- [ ] All automated unit tests pass (`npm test`).
- [ ] Production build succeeds without warnings (`npm run build`).
- [ ] Any new strategy or indicator is documented in [`ARCHITECTURE.md`](ARCHITECTURE.md) and [`README.md`](README.md).
- [ ] New features include corresponding unit tests in `tests/`.
- [ ] Changes are summarized in [`CHANGELOG.md`](CHANGELOG.md) under the `[Unreleased]` section.
- [ ] PR description clearly explains the quantitative or architectural motivation.

---

Thank you for helping make the **Bitcoin Research & Quantitative Trading Lab** a world-class open-source quantitative platform! 🚀
