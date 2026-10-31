import React, { useState } from 'react';
import { Header } from './components/Header';
import { BacktestTab } from './components/BacktestTab';
import { AstroCycleTab } from './components/AstroCycleTab';
import { LstmModelTab } from './components/LstmModelTab';
import { MonteCarloTab } from './components/MonteCarloTab';
import { PortfolioTab } from './components/PortfolioTab';
import { GridTradingTab } from './components/GridTradingTab';
import { ModulesTab } from './components/ModulesTab';
import { BTC_CANDLES } from './data/historicalData';
import { Sparkles, Terminal, Activity, Github } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const latestPrice = BTC_CANDLES[BTC_CANDLES.length - 1]?.close || 85263.08;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Top Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        btcPrice={latestPrice}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'overview' && <BacktestTab candles={BTC_CANDLES} />}
        {activeTab === 'astronacci' && <AstroCycleTab candles={BTC_CANDLES} />}
        {activeTab === 'lstm' && <LstmModelTab candles={BTC_CANDLES} />}
        {activeTab === 'monte-carlo' && <MonteCarloTab currentBtcPrice={latestPrice} />}
        {activeTab === 'portfolio' && <PortfolioTab />}
        {activeTab === 'grid' && <GridTradingTab initialPrice={latestPrice} />}
        {activeTab === 'modules' && <ModulesTab />}
      </main>

      {/* Bottom Global Status Bar */}
      <footer className="border-t border-slate-800 bg-slate-900/60 backdrop-blur text-xs py-4 text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 font-mono">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-slate-300 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Bitcoin Quantitative Research Lab
            </span>
            <span>•</span>
            <span>Keras LSTM v5.2.1</span>
            <span>•</span>
            <span>Astronacci Cycle Engine</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <span>Lookback: 60 Periods</span>
            <span>GBM Paths: 10,000</span>
            <span>Fee: 0.1%</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
