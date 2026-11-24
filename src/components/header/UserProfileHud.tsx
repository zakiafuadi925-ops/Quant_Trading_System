import React, { useState, useRef, useEffect } from "react";
import { User, ChevronDown, Wallet, Link2, LogOut } from "lucide-react";
import { UserProfile, UserAccountInfo } from "../../context/AuthContext";

interface UserProfileHudProps {
  isAuthenticated: boolean;
  user: UserProfile | null;
  account: UserAccountInfo | null;
  onOpenAuthModal: () => void;
  onOpenLedgerModal?: () => void;
  logout: () => void;
}

export const UserProfileHud: React.FC<UserProfileHudProps> = ({
  isAuthenticated,
  user,
  account,
  onOpenAuthModal,
  onOpenLedgerModal,
  logout,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isAuthenticated || !user) {
    return (
      <button
        onClick={onOpenAuthModal}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-amber-500/10 cursor-pointer shrink-0"
      >
        <User className="w-3.5 h-3.5" />
        <span>Sign In</span>
      </button>
    );
  }

  return (
    <div className="relative shrink-0" ref={dropdownRef}>
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="flex items-center gap-2 p-1 pl-2.5 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700/60 text-white text-xs transition-colors cursor-pointer"
      >
        <div className="flex flex-col text-left">
          <span className="font-bold text-slate-200 leading-none truncate max-w-[80px]">
            {user.name.split(" ")[0]}
          </span>
          <span className="text-[10px] text-emerald-400 font-mono leading-none mt-0.5">
            {user.role.toUpperCase()}
          </span>
        </div>
        <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center font-bold text-slate-950 text-xs shadow-sm">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <ChevronDown className="w-3 h-3 text-slate-400" />
      </button>

      {/* Profile Dropdown */}
      {isDropdownOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 p-3 space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-150 font-sans">
          <div className="pb-2 border-b border-slate-800">
            <div className="text-xs font-bold text-white truncate">{user.name}</div>
            <div className="text-[11px] text-slate-400 font-mono truncate">{user.email}</div>
            <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono">
              ID: {user.userId.slice(0, 12)}...
            </div>
          </div>

          {/* Virtual Wallet Preview */}
          <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800/80">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <Wallet className="w-3 h-3 text-amber-400" />
                Isolated Equity
              </span>
              <span className="text-emerald-400 font-mono font-bold">
                ${(account?.equity || 10000).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Financial Ledger Audit Shortcut */}
          {onOpenLedgerModal && (
            <button
              onClick={() => {
                onOpenLedgerModal();
                setIsDropdownOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/20 text-xs font-medium transition-colors cursor-pointer"
            >
              <Link2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Audit Financial Ledger</span>
            </button>
          )}

          <button
            onClick={() => {
              logout();
              setIsDropdownOpen(false);
            }}
            className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-medium transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
};
