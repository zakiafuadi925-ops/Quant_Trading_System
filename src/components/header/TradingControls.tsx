import React from "react";
import { KeyRound, RefreshCw, SlidersHorizontal } from "lucide-react";

interface TradingControlsProps {
  tradingMode?: "paper" | "live";
  onTradingModeChange?: (mode: "paper" | "live") => void;
  onOpenVaultModal?: () => void;
  onOpenFeedModal: () => void;
  onRefresh: () => void;
  isFetching: boolean;
}

export const TradingControls: React.FC<TradingControlsProps> = ({
  tradingMode,
  onTradingModeChange,
  onOpenVaultModal,
  onOpenFeedModal,
  onRefresh,
  isFetching,
}) => {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      {/* Dual-Mode Switcher */}
      {onTradingModeChange && (
        <div className="flex items-center p-0.5 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs shadow-inner">
          <button
            type="button"
            onClick={() => onTradingModeChange("paper")}
            className={`px-2 py-1 rounded text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
              tradingMode === "paper"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
            title="Virtual Paper Trading ($10k Isolated Equity)"
          >
            <span>🧪</span>
            <span className="hidden sm:inline">PAPER</span>
          </button>
          <button
            type="button"
            onClick={() => onTradingModeChange("live")}
            className={`px-2 py-1 rounded text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
              tradingMode === "live"
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm animate-pulse"
                : "text-slate-400 hover:text-white"
            }`}
            title="Live Exchange Order Execution"
          >
            <span>⚡</span>
            <span className="hidden sm:inline">LIVE</span>
          </button>
        </div>
      )}

      {/* Key Vault Trigger */}
      {onOpenVaultModal && (
        <button
          onClick={onOpenVaultModal}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-400 text-xs font-medium border border-slate-700/80 transition-colors cursor-pointer"
          title="Manage Encrypted Exchange API Keys"
        >
          <KeyRound className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden md:inline">Vault</span>
        </button>
      )}

      {/* Manual Refresh */}
      <button
        onClick={onRefresh}
        disabled={isFetching}
        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors disabled:opacity-50 cursor-pointer"
        title="Manual Fetch latest data"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin text-amber-400" : ""}`} />
      </button>

      {/* Feed Config */}
      <button
        onClick={onOpenFeedModal}
        className="hidden lg:flex items-center gap-1 px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
        title="Configure Feed Parameters"
      >
        <SlidersHorizontal className="w-3.5 h-3.5" />
        <span>Feed</span>
      </button>
    </div>
  );
};
