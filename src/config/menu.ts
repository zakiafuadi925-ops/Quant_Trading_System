import React from 'react';
import { 
  TrendingUp, 
  Wallet, 
  Grid3X3, 
  BrainCircuit, 
  Activity, 
  Orbit, 
  ShieldAlert, 
  PieChart, 
  BookOpen,
  Zap,
  Sparkles,
  ShieldCheck
} from 'lucide-react';

export interface NavTabItem {
  id: string;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export interface NavCategory {
  id: string;
  category: string;
  shortName: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavTabItem[];
}

export const NAV_CATEGORIES: NavCategory[] = [
  {
    id: 'trading',
    category: 'Trading & Execution',
    shortName: 'Trading',
    icon: Zap,
    items: [
      { id: 'overview', label: 'Market & Backtest', shortLabel: 'Backtest', icon: TrendingUp },
      { id: 'paper-trading', label: 'Paper Trading', shortLabel: 'Paper Perp', icon: Wallet, badge: 'Cloud DB' },
      { id: 'grid', label: 'Spot Grid Bot', shortLabel: 'Grid Bot', icon: Grid3X3 },
    ],
  },
  {
    id: 'quant',
    category: 'Quant & AI Models',
    shortName: 'Quant AI',
    icon: Sparkles,
    items: [
      { id: 'lstm', label: 'LSTM Deep Learning', shortLabel: 'LSTM AI', icon: BrainCircuit },
      { id: 'monte-carlo', label: 'Monte Carlo Engine', shortLabel: 'Monte Carlo', icon: Activity },
      { id: 'astronacci', label: 'Astronacci & Apogee', shortLabel: 'Astronacci', icon: Orbit },
    ],
  },
  {
    id: 'portfolio',
    category: 'Risk & Portfolio',
    shortName: 'Risk & Portfolio',
    icon: ShieldCheck,
    items: [
      { id: 'risk', label: 'Risk & VaR', shortLabel: 'Risk & VaR', icon: ShieldAlert },
      { id: 'portfolio', label: 'Portfolio Rebalance', shortLabel: 'Portfolio', icon: PieChart },
      { id: 'modules', label: 'Research Modules (1-5)', shortLabel: 'Modules', icon: BookOpen },
    ],
  },
];

export const ALL_NAV_TABS: NavTabItem[] = NAV_CATEGORIES.flatMap((cat) => cat.items);
