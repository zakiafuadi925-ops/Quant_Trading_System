import React from "react";
import { CircuitBreakerState } from "../../services/exchangeApi";

interface HeaderBannersProps {
  tradingMode?: "paper" | "live";
  circuitBreaker?: CircuitBreakerState | null;
  onOpenCircuitBreakerModal?: () => void;
  onOpenVaultModal?: () => void;
}

export const HeaderBanners: React.FC<HeaderBannersProps> = ({
  tradingMode,
  circuitBreaker,
  onOpenCircuitBreakerModal,
  onOpenVaultModal,
}) => {
  return (
    <>
      {/* Circuit Breaker Emergency Halted Banner */}
      {circuitBreaker?.status === "HALTED" && (
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
                Order routing is halted due to safety kill-switch (
                {circuitBreaker.triggerReason || "Drawdown limit"}).
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
      {tradingMode === "live" && circuitBreaker?.status !== "HALTED" && (
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
                Signed orders will be transmitted directly to exchange futures matching engines.
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
    </>
  );
};
