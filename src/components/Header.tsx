import React from 'react';
import { 
  TrendingUp, 
  Orbit, 
  BrainCircuit, 
  Activity, 
  PieChart, 
  Grid3X3, 
  BookOpen, 
  Sparkles,
  RefreshCw,
  SlidersHorizontal,
  Zap
} from 'lucide-react';
import { LiveTicker } from '../services/cryptoApi';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  ticker: LiveTicker;
  isFetching: boolean;
  onRefresh: () => void;
  onOpenFeedModal: () => void;
  isAutoSync: boolean;
}

export const Header: React.FC<HeaderProps> = ({ 
  activeTab, 
  setActiveTab, 
  ticker,
  isFetching,
  onRefresh,
  onOpenFeedModal,
  isAutoSync
}) => {
  const tabs = [
    { id: 'overview', label: 'Market & Backtest', icon: TrendingUp },
    { id: 'astronacci', label: 'Astronacci & Apogee', icon: Orbit },
    { id: 'lstm', label: 'LSTM Deep Learning', icon: BrainCircuit },
    { id: 'monte-carlo', label: 'Monte Carlo Engine', icon: Activity },
    { id: 'portfolio', label: 'Portfolio & Rebalancing', icon: PieChart },
    { id: 'grid', label: 'Spot Grid Bot', icon: Grid3X3 },
    { id: 'modules', label: 'Research Modules (1-5)', icon: BookOpen }
  ];

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40">
      {/* Top Banner with live stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 border-b border-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-orange-600 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <span className="font-bold text-white text-lg font-mono">₿</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                  Bitcoin Research &amp; Quant Lab
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    v5.2.1 PRO
                  </span>
                </h1>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Astronacci Cycles • Bidirectional LSTM • Geometric Brownian Motion • Dynamic Allocation
              </p>
            </div>
          </div>

          {/* Right Market Status Bar & Auto Fetch Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Live Ticker Card */}
            <div 
              onClick={onOpenFeedModal}
              className="cursor-pointer hover:border-slate-700 bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-2.5 font-mono transition-colors group"
              title="Click to configure Automated Data Feed"
            >
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${isAutoSync ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
                <span className="text-xs font-semibold text-slate-400 group-hover:text-slate-200">
                  {ticker.symbol}
                </span>
              </div>
              
              <span className="text-sm font-bold text-emerald-400">
                ${ticker.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>

              <span className={`text-[11px] font-medium px-1.5 py-0.2 rounded ${
                ticker.change24h >= 0 
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}>
                {ticker.change24h >= 0 ? '+' : ''}{ticker.change24h.toFixed(2)}%
              </span>
            </div>

            {/* Quick Fetch Button */}
            <button
              onClick={onRefresh}
              disabled={isFetching}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors disabled:opacity-50"
              title="Fetch latest BTC price from Binance"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin text-amber-400' : ''}`} />
            </button>

            {/* Feed Config Modal Trigger */}
            <button
              onClick={onOpenFeedModal}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Feed</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex space-x-1 sm:space-x-2 py-2 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
