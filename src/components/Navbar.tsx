import React, { useState, useEffect, useRef } from "react";
import { LayoutGrid } from "lucide-react";
import { NAV_CATEGORIES, getCategoryForTab, NavCategory } from "../config/menu";
import { CategoryPillars, SubModulePills, BentoDirectory } from "./navbar";

export interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedSymbol?: string;
  onSymbolChange?: (symbol: string) => void;
  selectedTimeframe?: "1h" | "4h" | "1d" | "1w";
  onTimeframeChange?: (tf: "1h" | "4h" | "1d" | "1w") => void;
}

/**
 * Modular Institutional Navigation Bar orchestrating:
 * 1. CategoryPillars (Segmented Switcher Div)
 * 2. SubModulePills (Fluid 3-item Sub-module Routes Strip)
 * 3. BentoDirectory (Full 9-module Popover Directory)
 */
export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  selectedSymbol,
  onSymbolChange,
  selectedTimeframe,
  onTimeframeChange,
}) => {
  // Current active category derived from activeTab
  const activeCategory = getCategoryForTab(activeTab);
  const [selectedCatId, setSelectedCatId] = useState<string>(activeCategory.id);
  const [isBentoOpen, setIsBentoOpen] = useState<boolean>(false);

  const bentoRef = useRef<HTMLDivElement>(null);
  const bentoButtonRef = useRef<HTMLButtonElement>(null);

  // Sync selected category if activeTab changes externally or via browser navigation
  useEffect(() => {
    setSelectedCatId(getCategoryForTab(activeTab).id);
  }, [activeTab]);

  // Close Bento menu on Escape or click outside
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsBentoOpen(false);
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
      document.addEventListener("keydown", handleKeyDown);
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isBentoOpen]);

  // Current category being displayed in the sub-nav
  const displayedCategory =
    NAV_CATEGORIES.find((cat) => cat.id === selectedCatId) || activeCategory;

  const handleCategorySelect = (cat: NavCategory) => {
    setSelectedCatId(cat.id);
    const containsActiveTab = cat.items.some((item) => item.id === activeTab);
    // If switching to a category that doesn't contain current tab, navigate to its first tab route
    if (!containsActiveTab && cat.items.length > 0) {
      setActiveTab(cat.items[0].id);
    }
  };

  return (
    <nav className="border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md z-30 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 relative">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          {/* Left: Fluid Two-Stage Interactive Navigation */}
          <div className="flex flex-wrap items-center gap-2">
            {/* 1. Category Pillars Segmented Switcher */}
            <CategoryPillars
              displayedCategory={displayedCategory}
              activeTab={activeTab}
              onSelectCategory={handleCategorySelect}
            />

            {/* Subtle Divider */}
            <div className="hidden sm:block h-4 w-px bg-slate-800/80" />

            {/* 2. Sub-Modules Fluid Pill Strip (Semantic Route Links) */}
            <SubModulePills
              displayedCategory={displayedCategory}
              activeTab={activeTab}
              onNavigate={setActiveTab}
            />
          </div>

          {/* Right: Quick Module Explorer Button (Opens 3-Column Bento Modal) */}
          <div className="flex items-center justify-end gap-2 shrink-0">
            <button
              ref={bentoButtonRef}
              onClick={() => setIsBentoOpen((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border shadow-sm cursor-pointer ${
                isBentoOpen
                  ? "bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-amber-500/20"
                  : "bg-slate-950/80 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-800 hover:border-slate-700"
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

        {/* 3. Interactive 3-Column Bento Grid Popover (Direct Module Route Launcher) */}
        <BentoDirectory
          isOpen={isBentoOpen}
          onClose={() => setIsBentoOpen(false)}
          activeTab={activeTab}
          onNavigate={setActiveTab}
          bentoRef={bentoRef}
          selectedSymbol={selectedSymbol}
          onSymbolChange={onSymbolChange}
          selectedTimeframe={selectedTimeframe}
          onTimeframeChange={onTimeframeChange}
        />
      </div>
    </nav>
  );
};

export default Navbar;
