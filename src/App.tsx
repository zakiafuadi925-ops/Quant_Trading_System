import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { BacktestTab } from './components/BacktestTab';
import { AstroCycleTab } from './components/AstroCycleTab';
import { LstmModelTab } from './components/LstmModelTab';
import { MonteCarloTab } from './components/MonteCarloTab';
import { PortfolioTab } from './components/PortfolioTab';
import { GridTradingTab } from './components/GridTradingTab';
import { ModulesTab } from './components/ModulesTab';
import { RiskManagementTab } from './components/RiskManagementTab';
import { LiveFeedModal } from './components/LiveFeedModal';
import { BTC_CANDLES } from './data/historicalData';
import { fetchLiveBtcPrice, fetchHistoricalCandles, LiveTicker } from './services/cryptoApi';
import { CandleData } from './types';
import { Sparkles, Terminal, Activity, ShieldCheck, Zap, Database } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isAutoSync, setIsAutoSync] = useState<boolean>(false); // Manual on-demand API calls by default
  const [syncInterval, setSyncInterval] = useState<number>(30);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [isLoadingCandles, setIsLoadingCandles] = useState<boolean>(false);

  // Dynamic Candles Dataset state (initialized with seed, hydrated dynamically)
  const [candles, setCandles] = useState<CandleData[]>(BTC_CANDLES);
  const [datasetSource, setDatasetSource] = useState<string>('Compact Seed Fallback');

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

  // Fetch live market data (ticker + full dynamic candle dataset)
  const handleFetchAllData = useCallback(async () => {
    setIsFetching(true);
    setIsLoadingCandles(true);
    try {
      const [tickerData, dynamicCandles] = await Promise.all([
        fetchLiveBtcPrice(),
        fetchHistoricalCandles('BTC', 120, '1d')
      ]);

      setTicker(tickerData);
      if (dynamicCandles.candles && dynamicCandles.candles.length > 0) {
        setCandles(dynamicCandles.candles);
        setDatasetSource(dynamicCandles.source);
      }
    } catch (e) {
      console.warn('Failed to fetch dynamic market data', e);
    } finally {
      setIsFetching(false);
      setIsLoadingCandles(false);
    }
  }, []);

  // Fetch immediately on mount
  useEffect(() => {
    handleFetchAllData();
  }, [handleFetchAllData]);

  // Periodic Auto-Sync Timer
  useEffect(() => {
    if (!isAutoSync) return;

    const timer = setInterval(() => {
      handleFetchAllData();
    }, syncInterval * 1000);

    return () => clearInterval(timer);
  }, [isAutoSync, syncInterval, handleFetchAllData]);

  // Modern Web Guidance: Native View Transitions API for buttery smooth tab switches
  const handleTabChange = useCallback((newTab: string) => {
    if (newTab === activeTab) return;
    if (typeof document !== 'undefined' && 'startViewTransition' in document) {
      (document as unknown as { startViewTransition: (cb: () => void) => void }).startViewTransition(() => {
        setActiveTab(newTab);
      });
    } else {
      setActiveTab(newTab);
    }
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Top Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        ticker={ticker}
        isFetching={isFetching || isLoadingCandles}
        onRefresh={handleFetchAllData}
        onOpenFeedModal={() => setIsModalOpen(true)}
        isAutoSync={isAutoSync}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 tab-panel-container">
        {activeTab === 'overview' && <BacktestTab candles={candles} currentPrice={ticker.price} />}
        {activeTab === 'risk' && <RiskManagementTab candles={candles} currentPrice={ticker.price} />}
        {activeTab === 'astronacci' && <AstroCycleTab candles={candles} />}
        {activeTab === 'lstm' && <LstmModelTab candles={candles} />}
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
        onManualFetch={handleFetchAllData}
        isFetching={isFetching || isLoadingCandles}
      />

      {/* Bottom Global Status Bar */}
      <footer className="border-t border-slate-800 bg-slate-900/60 backdrop-blur text-xs py-4 text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 font-mono">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5 text-slate-300 font-semibold">
              <span className={`w-2 h-2 rounded-full ${isAutoSync ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              Mode: {isAutoSync ? `Auto-Sync (${syncInterval}s)` : 'Manual Refresh (Click to sync)'}
            </span>
            <span>•</span>
            <span className="text-slate-400">
              Source: {ticker.source} ({ticker.symbol})
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <Database className="w-3.5 h-3.5" />
              Dataset: {datasetSource} ({candles.length} candles)
            </span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <span>Last Sync: {ticker.lastUpdated}</span>
            <span>Fee: 0.1%</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
