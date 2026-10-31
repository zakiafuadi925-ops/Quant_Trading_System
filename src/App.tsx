import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { BacktestTab } from './components/BacktestTab';
import { AstroCycleTab } from './components/AstroCycleTab';
import { LstmModelTab } from './components/LstmModelTab';
import { MonteCarloTab } from './components/MonteCarloTab';
import { PortfolioTab } from './components/PortfolioTab';
import { GridTradingTab } from './components/GridTradingTab';
import { ModulesTab } from './components/ModulesTab';
import { LiveFeedModal } from './components/LiveFeedModal';
import { BTC_CANDLES } from './data/historicalData';
import { fetchLiveBtcPrice, LiveTicker } from './services/cryptoApi';
import { Sparkles, Terminal, Activity, ShieldCheck, Zap } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isAutoSync, setIsAutoSync] = useState<boolean>(true);
  const [syncInterval, setSyncInterval] = useState<number>(15);
  const [isFetching, setIsFetching] = useState<boolean>(false);

  const [ticker, setTicker] = useState<LiveTicker>({
    symbol: 'BTC/USDT',
    price: 85263.08,
    change24h: 2.61,
    high24h: 86400.0,
    low24h: 83500.0,
    volume24h: 42100,
    lastUpdated: 'Initial Data',
    source: 'Binance API'
  });

  // Fetch live price function
  const handleFetchLivePrice = useCallback(async () => {
    setIsFetching(true);
    try {
      const data = await fetchLiveBtcPrice();
      setTicker(data);
    } catch (e) {
      console.warn('Failed to fetch live price', e);
    } finally {
      setIsFetching(false);
    }
  }, []);

  // Fetch immediately on mount
  useEffect(() => {
    handleFetchLivePrice();
  }, [handleFetchLivePrice]);

  // Periodic Auto-Sync Timer
  useEffect(() => {
    if (!isAutoSync) return;

    const timer = setInterval(() => {
      handleFetchLivePrice();
    }, syncInterval * 1000);

    return () => clearInterval(timer);
  }, [isAutoSync, syncInterval, handleFetchLivePrice]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Top Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        ticker={ticker}
        isFetching={isFetching}
        onRefresh={handleFetchLivePrice}
        onOpenFeedModal={() => setIsModalOpen(true)}
        isAutoSync={isAutoSync}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'overview' && <BacktestTab candles={BTC_CANDLES} currentPrice={ticker.price} />}
        {activeTab === 'astronacci' && <AstroCycleTab candles={BTC_CANDLES} />}
        {activeTab === 'lstm' && <LstmModelTab candles={BTC_CANDLES} />}
        {activeTab === 'monte-carlo' && <MonteCarloTab currentBtcPrice={ticker.price} />}
        {activeTab === 'portfolio' && <PortfolioTab btcPrice={ticker.price} />}
        {activeTab === 'grid' && <GridTradingTab initialPrice={ticker.price} />}
        {activeTab === 'modules' && <ModulesTab />}
      </main>

      {/* Live Data Configuration Modal */}
      <LiveFeedModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        ticker={ticker}
        isAutoSync={isAutoSync}
        setIsAutoSync={setIsAutoSync}
        syncInterval={syncInterval}
        setSyncInterval={setSyncInterval}
        onManualFetch={handleFetchLivePrice}
        isFetching={isFetching}
      />

      {/* Bottom Global Status Bar */}
      <footer className="border-t border-slate-800 bg-slate-900/60 backdrop-blur text-xs py-4 text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 font-mono">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-slate-300 font-semibold">
              <span className={`w-2 h-2 rounded-full ${isAutoSync ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
              Live Feed: {ticker.source} ({ticker.symbol})
            </span>
            <span>•</span>
            <span>Keras LSTM v5.2.1</span>
            <span>•</span>
            <span>Astronacci Cycle Engine</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <span>Last Sync: {ticker.lastUpdated}</span>
            <span>Poll: {syncInterval}s</span>
            <span>Fee: 0.1%</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
