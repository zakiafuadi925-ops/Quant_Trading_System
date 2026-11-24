import React from "react";

interface BrandBadgeProps {
  selectedSymbol: string;
}

const SYMBOL_ICONS: Record<string, string> = {
  BTC: "₿",
  ETH: "Ξ",
  SOL: "◎",
  BNB: "🔶",
  ADA: "₳",
};

export const BrandBadge: React.FC<BrandBadgeProps> = ({ selectedSymbol }) => {
  return (
    <div className="flex items-center gap-2.5 shrink-0">
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 via-orange-600 to-amber-700 flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
        <span className="font-bold text-white text-base font-mono">
          {SYMBOL_ICONS[selectedSymbol.toUpperCase()] || "₿"}
        </span>
      </div>
      <div>
        <div className="flex items-center gap-1.5">
          <span className="text-sm sm:text-base font-bold tracking-tight text-white whitespace-nowrap">
            Quant Trading System
          </span>
          <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            v6.2.0
          </span>
        </div>
        <p className="text-[11px] text-slate-400 hidden 2xl:block truncate max-w-xs">
          Institutional Matrix • Alpha Engine
        </p>
      </div>
    </div>
  );
};
