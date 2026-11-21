import React from 'react';
import { Sparkles, X, CheckCircle2, ArrowRight } from 'lucide-react';
import { NAV_CATEGORIES } from '../../config/menu';
import { SUPPORTED_SYMBOLS } from '../../services/cryptoApi';

export interface BentoDirectoryProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  onNavigate: (tabId: string) => void;
  bentoRef: React.RefObject<HTMLDivElement | null>;
  selectedSymbol?: string;
  onSymbolChange?: (symbol: string) => void;
  selectedTimeframe?: '1h' | '4h' | '1d' | '1w';
  onTimeframeChange?: (tf: '1h' | '4h' | '1d' | '1w') => void;
}

/**
 * 3-Column Bento Grid Popover Directory providing instant direct access
 * to all 9 quantitative modules with corresponding route links.
 */
export const BentoDirectory: React.FC<BentoDirectoryProps> = ({
  isOpen,
  onClose,
  activeTab,
  onNavigate,
  bentoRef,
  selectedSymbol,
  onSymbolChange,
  selectedTimeframe,
  onTimeframeChange,
}) => {
  if (!isOpen) return null;

  return (
    <div
      ref={bentoRef}
      className="absolute right-4 sm:right-6 lg:right-8 top-full mt-2 w-[calc(100vw-2rem)] sm:w-[620px] md:w-[740px] max-h-[80vh] overflow-y-auto bg-slate-900/98 backdrop-blur-2xl border border-slate-700/80 rounded-2xl shadow-2xl p-5 z-50 text-xs no-scrollbar animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Bento Header */}
      <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              Quantitative Modules Directory
              <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                v6.2.0 Institutional
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Direct route access to all 9 execution, deep learning, and risk engines
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Close directory"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Asset & Timeframe Switcher in Bento */}
      {(onSymbolChange || onTimeframeChange) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-3.5 mb-4 border-b border-slate-800/80">
          {onSymbolChange && (
            <div>
              <span className="text-[10px] font-mono uppercase font-semibold text-slate-400 block mb-1">
                Target Trading Pair:
              </span>
              <div className="grid grid-cols-5 gap-1 font-mono text-[11px]">
                {SUPPORTED_SYMBOLS.map((s) => (
                  <button
                    key={s.symbol}
                    onClick={() => {
                      onSymbolChange(s.symbol);
                      onClose();
                    }}
                    className={`py-1 rounded text-center font-bold transition-all cursor-pointer ${
                      selectedSymbol?.toUpperCase() === s.symbol
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    {s.symbol}
                  </button>
                ))}
              </div>
            </div>
          )}

          {onTimeframeChange && (
            <div>
              <span className="text-[10px] font-mono uppercase font-semibold text-slate-400 block mb-1">
                Candle Resolution:
              </span>
              <div className="grid grid-cols-4 gap-1 font-mono text-[11px]">
                {(['1h', '4h', '1d', '1w'] as const).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => {
                      onTimeframeChange(tf);
                      onClose();
                    }}
                    className={`py-1 rounded text-center font-bold transition-all uppercase cursor-pointer ${
                      selectedTimeframe === tf
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3-Column Bento Grid of All 9 Modules */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {NAV_CATEGORIES.map((category) => {
          const CatIcon = category.icon;
          return (
            <div key={category.id} className="space-y-2">
              {/* Category Title */}
              <div className="flex items-center gap-1.5 px-1 font-mono text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <CatIcon className="w-3.5 h-3.5 text-amber-400" />
                <span>{category.category}</span>
              </div>

              {/* Module Cards with Route Links */}
              <div className="space-y-2">
                {category.items.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;

                  return (
                    <a
                      key={tab.id}
                      href={tab.path}
                      onClick={(e) => {
                        if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
                          e.preventDefault();
                          onNavigate(tab.id);
                          onClose();
                        }
                      }}
                      className={`p-3 rounded-xl border transition-all cursor-pointer text-left flex flex-col justify-between group no-underline block ${
                        isActive
                          ? 'bg-amber-500/10 border-amber-500/80 shadow-md shadow-amber-500/10'
                          : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <div
                            className={`p-1.5 rounded-lg ${
                              isActive
                                ? 'bg-amber-500 text-slate-950'
                                : 'bg-slate-900 border border-slate-800 text-slate-400 group-hover:text-amber-400'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <span
                            className={`text-xs font-bold ${
                              isActive ? 'text-amber-300' : 'text-white group-hover:text-amber-400'
                            }`}
                          >
                            {tab.label}
                          </span>
                        </div>
                        {isActive && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        )}
                      </div>

                      <p className="text-[10px] text-slate-400 leading-relaxed mb-2">
                        {tab.description}
                      </p>

                      <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-800/40">
                        {tab.badge ? (
                          <span className="px-1.5 py-0.2 rounded font-mono font-bold text-[9px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            {tab.badge}
                          </span>
                        ) : (
                          <span className="text-slate-500 font-mono text-[9px]">Module Ready</span>
                        )}
                        <span className="flex items-center gap-0.5 text-slate-400 group-hover:text-amber-400 text-[10px] font-medium transition-colors">
                          Launch <ArrowRight className="w-2.5 h-2.5" />
                        </span>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
