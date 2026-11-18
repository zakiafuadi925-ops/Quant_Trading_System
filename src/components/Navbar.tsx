import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutGrid, 
  X, 
  Sparkles,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';
import { NAV_CATEGORIES, getCategoryForTab } from '../config/menu';
import { SUPPORTED_SYMBOLS } from '../services/cryptoApi';

export interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedSymbol?: string;
  onSymbolChange?: (symbol: string) => void;
  selectedTimeframe?: '1h' | '4h' | '1d' | '1w';
  onTimeframeChange?: (tf: '1h' | '4h' | '1d' | '1w') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  selectedSymbol,
  onSymbolChange,
  selectedTimeframe,
  onTimeframeChange,
}) => {
  // Current active category based on activeTab
  const activeCategory = getCategoryForTab(activeTab);
  const [selectedCatId, setSelectedCatId] = useState<string>(activeCategory.id);
  const [isBentoOpen, setIsBentoOpen] = useState<boolean>(false);

  const bentoRef = useRef<HTMLDivElement>(null);
  const bentoButtonRef = useRef<HTMLButtonElement>(null);

  // Sync selected category if activeTab changes externally
  useEffect(() => {
    setSelectedCatId(getCategoryForTab(activeTab).id);
  }, [activeTab]);

  // Close Bento menu on Escape or click outside
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsBentoOpen(false);
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (
        bentoRef.current &&
        !bentoRef.current.contains(e.target as Node) &&
        bentoButtonRef.current &&
        !bentoButtonRef.current.contains(e.target as Node)
      ) {
        setIsBentoOpen(false);
      }
    };

    if (isBentoOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isBentoOpen]);

  // Current category being displayed in the sub-nav
  const displayedCategory =
    NAV_CATEGORIES.find((cat) => cat.id === selectedCatId) || activeCategory;

  return (
    <nav className="border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md sticky top-16 z-30 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 relative">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          {/* Left: Fluid Two-Stage Interactive Navigation */}
          <div className="flex flex-wrap items-center gap-2">
            {/* 1. Category Pillars Segmented Switcher */}
            <div className="flex items-center p-0.5 bg-slate-950/80 rounded-xl border border-slate-800/90 shadow-inner">
              {NAV_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isCurrent = displayedCategory.id === cat.id;
                const containsActiveTab = cat.items.some((item) => item.id === activeTab);

                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedCatId(cat.id);
                      // If switching to a category that doesn't contain current tab, jump to its 1st tab
                      if (!containsActiveTab) {
                        setActiveTab(cat.items[0].id);
                      }
                    }}
                    className={`relative px-2.5 py-1 rounded-lg text-xs font-semibold font-mono flex items-center gap-1.5 transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-slate-800/90 text-amber-400 shadow-sm border border-slate-700/80'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isCurrent ? 'text-amber-400' : 'text-slate-500'}`} />
                    <span className="hidden sm:inline">{cat.shortName}</span>
                    {/* Active category subtle indicator dot */}
                    {containsActiveTab && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Subtle Divider */}
            <div className="hidden sm:block h-4 w-px bg-slate-800/80" />

            {/* 2. Sub-Modules Fluid Pill Strip (Always 3 Items - ZERO SCROLLBAR!) */}
            <div className="flex items-center gap-1.5 bg-slate-950/40 p-0.5 rounded-xl border border-slate-800/50">
              {displayedCategory.items.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`group relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer select-none ${
                      isActive
                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold shadow-md shadow-amber-500/25 scale-[1.02]'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/70 border border-transparent hover:border-slate-700/60'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 transition-transform group-hover:scale-110 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                    <span>{tab.label}</span>
                    {tab.badge && (
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono font-bold transition-colors ${
                          isActive
                            ? 'bg-slate-950/30 text-slate-950'
                            : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Quick Module Explorer Button (Opens 3-Column Bento Modal) */}
          <div className="flex items-center justify-end gap-2 shrink-0">
            <button
              ref={bentoButtonRef}
              onClick={() => setIsBentoOpen((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border shadow-sm cursor-pointer ${
                isBentoOpen
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-amber-500/20'
                  : 'bg-slate-950/80 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-800 hover:border-slate-700'
              }`}
              title="Open full interactive catalog of all 9 institutional trading modules"
              aria-label="Toggle all modules bento explorer"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>All 9 Modules</span>
              <span className="hidden sm:inline-block ml-0.5 text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-900 border border-slate-700 text-slate-400">
                Alt+M
              </span>
            </button>
          </div>
        </div>

        {/* Interactive 3-Column Bento Grid Popover (No document blocking, fluid layout) */}
        {isBentoOpen && (
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
                    Direct access to all 9 execution, deep learning, and risk engines
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBentoOpen(false)}
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
                            setIsBentoOpen(false);
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
                            setIsBentoOpen(false);
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

                    {/* Module Cards */}
                    <div className="space-y-2">
                      {category.items.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;

                        return (
                          <div
                            key={tab.id}
                            onClick={() => {
                              setActiveTab(tab.id);
                              setIsBentoOpen(false);
                            }}
                            className={`p-3 rounded-xl border transition-all cursor-pointer text-left flex flex-col justify-between group ${
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
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
