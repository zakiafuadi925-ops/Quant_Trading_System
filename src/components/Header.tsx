import React, { useState, useEffect } from "react";
import { LiveTicker } from "../services/cryptoApi";
import { WsStatus } from "../services/binanceWs";
import { useAuth } from "../context/AuthContext";
import { CircuitBreakerState } from "../services/exchangeApi";
import {
  BrandBadge,
  MarketTickerCard,
  TradingControls,
  CircuitBreakerPill,
  UserProfileHud,
  HeaderBanners,
} from "./header";

export interface HeaderProps {
  ticker: LiveTicker;
  isAutoSync?: boolean;
  setIsAutoSync?: (val: boolean) => void;
  syncInterval?: number;
  setSyncInterval?: (val: number) => void;
  onRefresh: () => void;
  isFetching: boolean;
  onOpenFeedModal: () => void;
  onOpenAuthModal: () => void;
  onOpenVaultModal?: () => void;
  onOpenCircuitBreakerModal?: () => void;
  onOpenLedgerModal?: () => void;
  wsStatus?: WsStatus;
  tradingMode?: "paper" | "live";
  onTradingModeChange?: (mode: "paper" | "live") => void;
  circuitBreaker?: CircuitBreakerState | null;
  selectedSymbol?: string;
  onSymbolChange?: (symbol: string) => void;
  selectedTimeframe?: "1h" | "4h" | "1d" | "1w";
  onTimeframeChange?: (tf: "1h" | "4h" | "1d" | "1w") => void;
}

/**
 * Modular Institutional Header Component
 * Orchestrates:
 * 1. BrandBadge (Logo, System Title, Version)
 * 2. MarketTickerCard (Live Asset Ticker, Flash Anim, Price & % Change)
 * 3. CircuitBreakerPill (Safety Telemetry & Status Indicator)
 * 4. TradingControls (Paper/Live Switcher, Key Vault, Refresh, Feed)
 * 5. UserProfileHud (Sign In trigger / User Account Dropdown)
 * 6. HeaderBanners (Emergency Halted / Live Order Warning Strips)
 */
export const Header: React.FC<HeaderProps> = ({
  ticker,
  isAutoSync,
  onRefresh,
  isFetching,
  onOpenFeedModal,
  onOpenAuthModal,
  onOpenVaultModal,
  onOpenCircuitBreakerModal,
  onOpenLedgerModal,
  wsStatus = "disconnected",
  tradingMode = "paper",
  onTradingModeChange,
  circuitBreaker,
  selectedSymbol = "BTC",
}) => {
  const { user, isAuthenticated, account, logout } = useAuth();
  const [prevPrice, setPrevPrice] = useState<number>(ticker.price);
  const [priceFlash, setPriceFlash] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    if (ticker.price > prevPrice) {
      setPriceFlash("up");
    } else if (ticker.price < prevPrice) {
      setPriceFlash("down");
    }
    setPrevPrice(ticker.price);

    const t = setTimeout(() => setPriceFlash(null), 800);
    return () => clearTimeout(t);
  }, [ticker.price]);

  return (
    <header className="border-b border-slate-800/80 bg-slate-900/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between min-h-16 py-2 sm:py-0 gap-3">
          {/* Left Cluster: Brand Badge & Live Market Ticker */}
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <BrandBadge selectedSymbol={selectedSymbol} />
            <MarketTickerCard
              ticker={ticker}
              priceFlash={priceFlash}
              wsStatus={wsStatus}
              isAutoSync={isAutoSync}
              onOpenFeedModal={onOpenFeedModal}
            />
          </div>

          {/* Right Cluster: Safety Telemetry, Trading Mode, and User Profile HUD */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <CircuitBreakerPill
              circuitBreaker={circuitBreaker}
              onOpenCircuitBreakerModal={onOpenCircuitBreakerModal}
            />

            <TradingControls
              tradingMode={tradingMode}
              onTradingModeChange={onTradingModeChange}
              onOpenVaultModal={onOpenVaultModal}
              onOpenFeedModal={onOpenFeedModal}
              onRefresh={onRefresh}
              isFetching={isFetching}
            />

            <UserProfileHud
              isAuthenticated={isAuthenticated}
              user={user}
              account={account}
              onOpenAuthModal={onOpenAuthModal}
              onOpenLedgerModal={onOpenLedgerModal}
              logout={logout}
            />
          </div>
        </div>
      </div>

      {/* Safety & Mode Banners */}
      <HeaderBanners
        tradingMode={tradingMode}
        circuitBreaker={circuitBreaker}
        onOpenCircuitBreakerModal={onOpenCircuitBreakerModal}
        onOpenVaultModal={onOpenVaultModal}
      />
    </header>
  );
};

export default Header;
