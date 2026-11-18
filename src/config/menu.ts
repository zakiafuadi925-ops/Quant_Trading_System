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
  description: string;
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
      { 
        id: 'overview', 
        label: 'Market & Backtest', 
        shortLabel: 'Backtest', 
        description: 'Multi-strategy backtest engine & L2 orderbook',
        icon: TrendingUp 
      },
      { 
        id: 'paper-trading', 
        label: 'Paper Trading', 
        shortLabel: 'Paper Perp', 
        description: 'Virtual futures wallet with MongoDB Atlas sync',
        icon: Wallet, 
        badge: 'Cloud DB' 
      },
      { 
        id: 'grid', 
        label: 'Spot Grid Bot', 
        shortLabel: 'Grid Bot', 
        description: 'Automated geometric volatility grid engine',
        icon: Grid3X3 
      },
    ],
  },
  {
    id: 'quant',
    category: 'Quant & AI Models',
    shortName: 'Quant AI',
    icon: Sparkles,
    items: [
      { 
        id: 'lstm', 
        label: 'LSTM Deep Learning', 
        shortLabel: 'LSTM AI', 
        description: '17-feature directional neural network inference',
        icon: BrainCircuit,
        badge: 'Live AI'
      },
      { 
        id: 'monte-carlo', 
        label: 'Monte Carlo Engine', 
        shortLabel: 'Monte Carlo', 
        description: '10,000 parallel path simulation Web Worker',
        icon: Activity,
        badge: '10k Paths'
      },
      { 
        id: 'astronacci', 
        label: 'Astronacci & Apogee', 
        shortLabel: 'Astronacci', 
        description: 'Planetary cycle resonance & celestial confluence',
        icon: Orbit 
      },
    ],
  },
  {
    id: 'portfolio',
    category: 'Risk & Portfolio',
    shortName: 'Risk & Portfolio',
    icon: ShieldCheck,
    items: [
      { 
        id: 'risk', 
        label: 'Risk & VaR', 
        shortLabel: 'Risk & VaR', 
        description: 'Historical & parametric Value at Risk metrics',
        icon: ShieldAlert,
        badge: '99% CL'
      },
      { 
        id: 'portfolio', 
        label: 'Portfolio Rebalance', 
        shortLabel: 'Portfolio', 
        description: 'Multi-asset correlation matrix & mean-variance',
        icon: PieChart 
      },
      { 
        id: 'modules', 
        label: 'Research Modules', 
        shortLabel: 'Modules (1-5)', 
        description: 'Institutional audit tear-sheet & documentation',
        icon: BookOpen 
      },
    ],
  },
];

export const ALL_NAV_TABS: NavTabItem[] = NAV_CATEGORIES.flatMap((cat) => cat.items);

export function getCategoryForTab(tabId: string): NavCategory {
  return (
    NAV_CATEGORIES.find((cat) => cat.items.some((item) => item.id === tabId)) ||
    NAV_CATEGORIES[0]
  );
}
