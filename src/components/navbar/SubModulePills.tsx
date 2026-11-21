import React from 'react';
import { NavCategory } from '../../config/menu';

export interface SubModulePillsProps {
  displayedCategory: NavCategory;
  activeTab: string;
  onNavigate: (tabId: string) => void;
}

/**
 * Fluid 3-item sub-module pill strip for the currently selected category.
 * Each pill functions as a semantic route link with dedicated URL path.
 */
export const SubModulePills: React.FC<SubModulePillsProps> = ({
  displayedCategory,
  activeTab,
  onNavigate,
}) => {
  return (
    <div 
      className="flex items-center gap-1.5 bg-slate-950/40 p-0.5 rounded-xl border border-slate-800/50"
      role="navigation"
      aria-label="Sub-module routes"
    >
      {displayedCategory.items.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <a
            key={tab.id}
            href={tab.path}
            onClick={(e) => {
              // Prevent full page reload for SPA client-side route transition
              if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
                e.preventDefault();
                onNavigate(tab.id);
              }
            }}
            className={`group relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer select-none no-underline ${
              isActive
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold shadow-md shadow-amber-500/25 scale-[1.02]'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/70 border border-transparent hover:border-slate-700/60'
            }`}
          >
            <Icon
              className={`w-3.5 h-3.5 transition-transform group-hover:scale-110 ${
                isActive ? 'text-slate-950' : 'text-slate-400'
              }`}
            />
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
          </a>
        );
      })}
    </div>
  );
};
