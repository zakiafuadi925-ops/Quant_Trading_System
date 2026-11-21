import React from 'react';
import { NAV_CATEGORIES, NavCategory } from '../../config/menu';

export interface CategoryPillarsProps {
  displayedCategory: NavCategory;
  activeTab: string;
  onSelectCategory: (cat: NavCategory) => void;
}

/**
 * Segmented switcher for the 3 primary institutional categories:
 * - Trading & Execution
 * - Quant & AI Models
 * - Risk & Portfolio
 */
export const CategoryPillars: React.FC<CategoryPillarsProps> = ({
  displayedCategory,
  activeTab,
  onSelectCategory,
}) => {
  return (
    <div 
      className="flex items-center p-0.5 bg-slate-950/80 rounded-xl border border-slate-800/90 shadow-inner"
      role="tablist"
      aria-label="Quantitative Categories"
    >
      {NAV_CATEGORIES.map((cat) => {
        const Icon = cat.icon;
        const isCurrent = displayedCategory.id === cat.id;
        const containsActiveTab = cat.items.some((item) => item.id === activeTab);

        return (
          <button
            key={cat.id}
            role="tab"
            aria-selected={isCurrent}
            onClick={() => onSelectCategory(cat)}
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
  );
};
