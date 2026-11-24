import React from "react";
import { LiveTicker } from "../../services/cryptoApi";
import { WsStatus } from "../../services/binanceWs";

interface MarketTickerCardProps {
  ticker: LiveTicker;
  priceFlash: "up" | "down" | null;
  wsStatus: WsStatus;
  isAutoSync: boolean;
  onOpenFeedModal: () => void;
}

export const MarketTickerCard: React.FC<MarketTickerCardProps> = ({
  ticker,
  priceFlash,
  wsStatus,
  isAutoSync,
  onOpenFeedModal,
}) => {
  return (
    <div
      onClick={onOpenFeedModal}
      className={`cursor-pointer hover:border-slate-700 bg-slate-950/80 border px-2.5 py-1.5 rounded-lg flex items-center gap-2 font-mono transition-all duration-300 group shrink-0 ${
        priceFlash === "up"
          ? "border-emerald-500/60 bg-emerald-950/20 shadow-md shadow-emerald-500/20"
          : priceFlash === "down"
          ? "border-rose-500/60 bg-rose-950/20 shadow-md shadow-rose-500/20"
          : "border-slate-800"
      }`}
      title="Click to configure Market Data Stream"
    >
      <div className="flex items-center gap-1.5">
        <div
          className={`w-2 h-2 rounded-full ${
            wsStatus === "connected"
              ? "bg-emerald-400"
              : isAutoSync
              ? "bg-emerald-400 animate-ping"
              : "bg-slate-500"
          }`}
        />
        <span className="text-xs font-semibold text-slate-400 group-hover:text-slate-200">
          {ticker.symbol}
        </span>
      </div>

      <span
        className={`text-xs sm:text-sm font-bold transition-colors ${
          priceFlash === "up"
            ? "text-emerald-300 font-extrabold scale-105"
            : priceFlash === "down"
            ? "text-rose-300 font-extrabold scale-105"
            : "text-emerald-400"
        }`}
      >
        $
        {ticker.price.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </span>

      <span
        className={`text-[10px] font-medium px-1.5 py-0.2 rounded hidden sm:inline ${
          ticker.change24h >= 0
            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
            : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
        }`}
      >
        {ticker.change24h >= 0 ? "+" : ""}
        {ticker.change24h.toFixed(2)}%
      </span>
    </div>
  );
};
