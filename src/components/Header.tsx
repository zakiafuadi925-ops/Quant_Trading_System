import React, { useState, useEffect, useRef } from 'react';
import { 
  RefreshCw,
  SlidersHorizontal,
  Radio,
  User,
  LogOut,
  Wallet,
  ChevronDown,
  KeyRound,
  Link2
} from 'lucide-react';
import { WsStatus } from '../services/binanceWs';
import { LiveTicker, SUPPORTED_SYMBOLS } from '../services/cryptoApi';
import { useAuth } from '../context/AuthContext';
import { CircuitBreakerState } from '../services/exchangeApi';

export interface HeaderProps {
  ticker: LiveTicker;
  isFetching: boolean;
  onRefresh: () => void;
  onOpenFeedModal: () => void;
  onOpenAuthModal?: () => void;
  onOpenVaultModal?: () => void;
  onOpenCircuitBreakerModal?: () => void;
  onOpenLedgerModal?: () => void;
  circuitBreaker?: CircuitBreakerState | null;
  tradingMode?: 'paper' | 'live';
  onTradingModeChange?: (mode: 'paper' | 'live') => void;
  isAutoSync: boolean;
  wsStatus?: WsStatus;
  selectedTimeframe?: '1h' | '4h' | '1d' | '1w';
  onTimeframeChange?: (tf: '1h' | '4h' | '1d' | '1w') => void;
  selectedSymbol?: string;
  onSymbolChange?: (symbol: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  ticker,
  isFetching,
  onRefresh,
  onOpenFeedModal,
  onOpenAuthModal,
  onOpenVaultModal,
  onOpenCircuitBreakerModal,
  onOpenLedgerModal,
  circuitBreaker,
  tradingMode = 'paper',
  onTradingModeChange,
  isAutoSync,
  wsStatus = 'disconnected',
  selectedTimeframe = '1d',
  onTimeframeChange,
  selectedSymbol = 'BTC',
  onSymbolChange
}) => {
  const { user, account, isAuthenticated, logout } = useAuth();
  const [prevPrice, setPrevPrice] = useState<number>(ticker.price);
  const [priceFlash, setPriceFlash] = useState<'up' | 'down' | null>(null);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  return (
    <header className="border-b border-slate-800/80 bg-slate-900/95 backdrop-blur-md">
      {/* Top Banner with live stats and quick controls */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between min-h-16 py-1 sm:py-0">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-orange-600 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
              <span className="font-bold text-white text-lg font-mono">
                {SYMBOL_ICONS[selectedSymbol.toUpperCase()] || '₿'}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2 whitespace-nowrap">
                  Quant Trading System
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    v6.2.0
                  </span>
                </h1>
              </div>
              <p className="text-xs text-slate-400 hidden 2xl:block truncate max-w-xs md:max-w-md">
                Institutional Matrix • Alpha Engine • L2 CVD
              </p>
            </div>
          </div>

          {/* Right Market Status Bar & Auto Fetch Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Multi-Asset Universe Quick Switcher */}
            {onSymbolChange && (
              <div className="hidden xl:flex items-center p-0.5 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs shadow-inner">
                {SUPPORTED_SYMBOLS.map((s) => (
                  <button
                    key={s.symbol}
                    onClick={() => onSymbolChange(s.symbol)}
                    className={`px-2 py-1 rounded text-[11px] font-bold transition-all uppercase flex items-center gap-1 cursor-pointer ${
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
            <div className="hidden lg:flex items-center">
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

            {/* Circuit Breaker Safety Telemetry Pill */}
            {onOpenCircuitBreakerModal && (
              <button
                type="button"
                onClick={onOpenCircuitBreakerModal}
                className={`hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-mono font-bold transition-all cursor-pointer ${
                  circuitBreaker?.status === 'HALTED'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm shadow-rose-500/20 animate-pulse'
                    : circuitBreaker?.status === 'WARNING'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                }`}
                title={`Circuit Breaker: ${circuitBreaker?.status || 'NORMAL'} (Click for Telemetry HUD & Kill-Switch)`}
              >
                <span className="relative flex h-2 w-2">
                  {circuitBreaker?.status === 'HALTED' ? (
                    <>
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                    </>
                  ) : (
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${circuitBreaker?.status === 'WARNING' ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
                  )}
                </span>
                <span>CB: {circuitBreaker?.status || 'NORMAL'}</span>
              </button>
            )}

            {/* Global Timeframe Quick Switcher */}
            {onTimeframeChange && (
              <div className="hidden 2xl:flex items-center p-0.5 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs">
                {(['1h', '4h', '1d', '1w'] as const).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => onTimeframeChange(tf)}
                    className={`px-2 py-1 rounded text-[11px] font-bold transition-all uppercase cursor-pointer ${
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
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors disabled:opacity-50 cursor-pointer"
              title="Manual Fetch latest BTC data"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin text-amber-400' : ''}`} />
            </button>

            {/* Feed Config Modal Trigger */}
            <button
              onClick={onOpenFeedModal}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Feed</span>
            </button>

            {/* API Key Vault Trigger */}
            {onOpenVaultModal && (
              <button
                onClick={onOpenVaultModal}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-400 text-xs font-medium border border-slate-700/80 transition-colors cursor-pointer"
                title="Manage Encrypted Exchange API Keys"
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Vault</span>
              </button>
            )}

            {/* Dual-Mode Trading Switcher (Paper vs Live) */}
            {onTradingModeChange && (
              <div className="flex items-center p-0.5 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs shadow-inner">
                <button
                  type="button"
                  onClick={() => onTradingModeChange('paper')}
                  className={`px-2 py-1 rounded text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    tradingMode === 'paper'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Virtual Paper Trading ($10k Isolated Equity)"
                >
                  <span>🧪</span>
                  <span className="hidden md:inline">PAPER</span>
                </button>
                <button
                  type="button"
                  onClick={() => onTradingModeChange('live')}
                  className={`px-2 py-1 rounded text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    tradingMode === 'live'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm animate-pulse'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Live Exchange Order Execution"
                >
                  <span>⚡</span>
                  <span className="hidden md:inline">LIVE</span>
                </button>
              </div>
            )}

            {/* User Profile / Auth Control */}
            {isAuthenticated && user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  className="flex items-center gap-2 p-1 pl-2.5 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700/60 text-white text-xs transition-colors cursor-pointer"
                >
                  <div className="flex flex-col text-left">
                    <span className="font-bold text-slate-200 leading-none truncate max-w-[90px]">
                      {user.name.split(' ')[0]}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono leading-none mt-0.5">
                      {user.role.toUpperCase()}
                    </span>
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center font-bold text-slate-950 text-xs shadow-sm">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {/* Profile Dropdown Menu */}
                {isProfileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 p-3 space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-150 font-sans">
                    <div className="pb-2 border-b border-slate-800">
                      <div className="text-xs font-bold text-white truncate">{user.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono truncate">{user.email}</div>
                      <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono">
                        ID: {user.userId.slice(0, 12)}...
                      </div>
                    </div>

                    {/* Virtual Wallet Preview */}
                    <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800/80">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <Wallet className="w-3 h-3 text-amber-400" />
                          Isolated Equity
                        </span>
                        <span className="text-emerald-400 font-mono font-bold">
                          ${(account?.equity || 10000).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    {/* Financial Ledger Audit Shortcut */}
                    {onOpenLedgerModal && (
                      <button
                        onClick={() => {
                          onOpenLedgerModal();
                          setIsProfileDropdownOpen(false);
                        }}
                        className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/20 text-xs font-medium transition-colors cursor-pointer"
                      >
                        <Link2 className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Audit Financial Ledger</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        logout();
                        setIsProfileDropdownOpen(false);
                      }}
                      className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-medium transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenAuthModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-amber-500/10 cursor-pointer"
              >
                <User className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Circuit Breaker Emergency Halted Banner */}
      {circuitBreaker?.status === 'HALTED' && (
        <div className="bg-rose-950 border-t border-rose-500/50 px-4 py-1.5 text-xs text-rose-200 animate-pulse font-sans">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
              <span className="font-bold text-white tracking-wide font-mono">
                🚨 CIRCUIT BREAKER HALTED:
              </span>
              <span className="text-rose-200 text-[11px]">
                Order routing is halted due to safety kill-switch ({circuitBreaker.triggerReason || 'Drawdown limit'}).
              </span>
            </div>
            {onOpenCircuitBreakerModal && (
              <button
                onClick={onOpenCircuitBreakerModal}
                className="underline hover:text-white text-[11px] font-mono cursor-pointer ml-2 text-rose-300 font-bold"
              >
                Inspect Telemetry / Reset →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Live Trading Warning Banner */}
      {tradingMode === 'live' && circuitBreaker?.status !== 'HALTED' && (
        <div className="bg-gradient-to-r from-rose-950 via-amber-950 to-rose-950 border-t border-rose-500/30 px-4 py-1.5 text-xs text-rose-200 animate-fade-in font-sans">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
              <span className="font-bold text-white tracking-wide font-mono">
                ⚠️ LIVE EXCHANGE MODE ACTIVE:
              </span>
              <span className="text-rose-200/90 text-[11px] hidden sm:inline">
                Signed orders will be transmitted directly to exchange futures matching engines. Exercise strict risk control.
              </span>
            </div>
            {onOpenVaultModal && (
              <button
                onClick={onOpenVaultModal}
                className="underline hover:text-white text-[11px] font-mono cursor-pointer ml-2 text-amber-300 font-semibold"
              >
                Key Vault →
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
