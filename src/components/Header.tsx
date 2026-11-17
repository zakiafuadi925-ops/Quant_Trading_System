import React, { useState, useEffect } from 'react';
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
  Zap,
  ShieldAlert,
  Radio,
  Clock,
  Wallet
} from 'lucide-react';
import { LiveTicker, SUPPORTED_SYMBOLS } from '../services/cryptoApi';
import { WsStatus } from '../services/binanceWs';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  ticker: LiveTicker;
  isFetching: boolean;
  onRefresh: () => void;
  onOpenFeedModal: () => void;
  isAutoSync: boolean;
  wsStatus?: WsStatus;
  selectedTimeframe?: '1h' | '4h' | '1d' | '1w';
  onTimeframeChange?: (tf: '1h' | '4h' | '1d' | '1w') => void;
  selectedSymbol?: string;
  onSymbolChange?: (symbol: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  activeTab, 
  setActiveTab, 
  ticker,
  isFetching,
  onRefresh,
  onOpenFeedModal,
  isAutoSync,
  wsStatus = 'disconnected',
  selectedTimeframe = '1d',
  onTimeframeChange,
  selectedSymbol = 'BTC',
  onSymbolChange
}) => {
  const [prevPrice, setPrevPrice] = useState<number>(ticker.price);
  const [priceFlash, setPriceFlash] = useState<'up' | 'down' | null>(null);

  const SYMBOL_ICONS: Record<string, string> = {
    BTC: '₿',
    ETH: 'Ξ',
    SOL: '◎',
    BNB: '🔶',
    ADA: '₳',
  };

  useEffect(() => {
    if (ticker.price > prevPrice) {
      setPriceFlash('up');
    } else if (ticker.price < prevPrice) {
      setPriceFlash('down');
    }
    setPrevPrice(ticker.price);

    const t = setTimeout(() => setPriceFlash(null), 800);
    return () => clearTimeout(t);
  }, [ticker.price]);

  const tabs = [
    { id: 'overview', label: 'Market & Backtest', icon: TrendingUp },
    { id: 'paper-trading', label: 'Paper Trading & Perp', icon: Wallet },
    { id: 'risk', label: 'Risk & VaR', icon: ShieldAlert },
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
              <span className="font-bold text-white text-lg font-mono">
                {SYMBOL_ICONS[selectedSymbol.toUpperCase()] || '₿'}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                  Quant Trading System
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    v6.2.0
                  </span>
                </h1>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Multi-Asset Matrix • WebSocket Streaming • L2 Depth &amp; CVD • Ensemble Alpha • Paper Trading
              </p>
            </div>
          </div>

          {/* Right Market Status Bar & Auto Fetch Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Multi-Asset Universe Quick Switcher */}
            {onSymbolChange && (
              <div className="flex items-center p-0.5 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs shadow-inner">
                {SUPPORTED_SYMBOLS.map((s) => (
                  <button
                    key={s.symbol}
                    onClick={() => onSymbolChange(s.symbol)}
                    className={`px-2 py-1 rounded text-[11px] font-bold transition-all uppercase flex items-center gap-1 ${
                      selectedSymbol.toUpperCase() === s.symbol
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title={`Switch active asset to ${s.name} (${s.pair})`}
                  >
                    <span>{s.symbol}</span>
                  </button>
                ))}
              </div>
            )}

            {/* WebSocket Stream Badge */}
            <div className="hidden md:flex items-center">
              {wsStatus === 'connected' ? (
                <span className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-bold flex items-center gap-1.5 shadow-sm shadow-emerald-500/10">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  WS STREAM LIVE
                </span>
              ) : wsStatus === 'connecting' ? (
                <span className="px-2 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-mono font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  CONNECTING...
                </span>
              ) : (
                <span className="px-2 py-1 rounded-lg bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-mono font-bold flex items-center gap-1.5">
                  <Radio className="w-3 h-3 text-slate-500" />
                  REST MODE
                </span>
              )}
            </div>

            {/* Global Timeframe Quick Switcher */}
            {onTimeframeChange && (
              <div className="hidden lg:flex items-center p-0.5 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs">
                {(['1h', '4h', '1d', '1w'] as const).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => onTimeframeChange(tf)}
                    className={`px-2 py-1 rounded text-[11px] font-bold transition-all uppercase ${
                      selectedTimeframe === tf
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title={`Switch system to ${tf} timeframe`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            )}

            {/* Live Ticker Card with tick flash */}
            <div 
              onClick={onOpenFeedModal}
              className={`cursor-pointer hover:border-slate-700 bg-slate-950/80 border px-3 py-1.5 rounded-lg flex items-center gap-2.5 font-mono transition-all duration-300 group ${
                priceFlash === 'up'
                  ? 'border-emerald-500/60 bg-emerald-950/20 shadow-md shadow-emerald-500/20'
                  : priceFlash === 'down'
                  ? 'border-rose-500/60 bg-rose-950/20 shadow-md shadow-rose-500/20'
                  : 'border-slate-800'
              }`}
              title="Click to configure Market Data Stream"
            >
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${wsStatus === 'connected' ? 'bg-emerald-400' : isAutoSync ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
                <span className="text-xs font-semibold text-slate-400 group-hover:text-slate-200">
                  {ticker.symbol}
                </span>
              </div>
              
              <span className={`text-sm font-bold transition-colors ${
                priceFlash === 'up' 
                  ? 'text-emerald-300 font-extrabold scale-105' 
                  : priceFlash === 'down'
                  ? 'text-rose-300 font-extrabold scale-105'
                  : 'text-emerald-400'
              }`}>
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
              title="Manual Fetch latest BTC data"
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
