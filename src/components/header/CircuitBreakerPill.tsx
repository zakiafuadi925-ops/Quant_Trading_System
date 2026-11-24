import React from "react";
import { CircuitBreakerState } from "../../services/exchangeApi";

interface CircuitBreakerPillProps {
  circuitBreaker?: CircuitBreakerState | null;
  onOpenCircuitBreakerModal?: () => void;
}

export const CircuitBreakerPill: React.FC<CircuitBreakerPillProps> = ({
  circuitBreaker,
  onOpenCircuitBreakerModal,
}) => {
  if (!onOpenCircuitBreakerModal) return null;

  return (
    <button
      type="button"
      onClick={onOpenCircuitBreakerModal}
      className={`hidden md:flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-mono font-bold transition-all cursor-pointer ${
        circuitBreaker?.status === "HALTED"
          ? "bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm shadow-rose-500/20 animate-pulse"
          : circuitBreaker?.status === "WARNING"
          ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
      }`}
      title={`Circuit Breaker: ${circuitBreaker?.status || "NORMAL"} (Click for Telemetry HUD & Kill-Switch)`}
    >
      <span className="relative flex h-2 w-2">
        {circuitBreaker?.status === "HALTED" ? (
          <>
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
          </>
        ) : (
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${
              circuitBreaker?.status === "WARNING" ? "bg-amber-400" : "bg-emerald-400"
            }`}
          ></span>
        )}
      </span>
      <span>CB: {circuitBreaker?.status || "NORMAL"}</span>
    </button>
  );
};
