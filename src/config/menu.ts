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
  path: string;
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
        path: '/overview',
        label: 'Market & Backtest', 
        shortLabel: 'Backtest', 
        description: 'Multi-strategy backtest engine & L2 orderbook',
        icon: TrendingUp 
      },
      { 
        id: 'paper-trading', 
        path: '/paper-trading',
        label: 'Paper Trading', 
        shortLabel: 'Paper Perp', 
        description: 'Virtual futures wallet with MongoDB Atlas sync',
        icon: Wallet, 
        badge: 'Cloud DB' 
      },
      { 
        id: 'grid', 
        path: '/grid',
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
        path: '/lstm',
        label: 'LSTM Deep Learning', 
        shortLabel: 'LSTM AI', 
        description: '17-feature directional neural network inference',
        icon: BrainCircuit,
        badge: 'Live AI'
      },
      { 
        id: 'monte-carlo', 
        path: '/monte-carlo',
        label: 'Monte Carlo Engine', 
        shortLabel: 'Monte Carlo', 
        description: '10,000 parallel path simulation Web Worker',
        icon: Activity,
        badge: '10k Paths'
      },
      { 
        id: 'astronacci', 
        path: '/astronacci',
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
        path: '/risk',
        label: 'Risk & VaR', 
        shortLabel: 'Risk & VaR', 
        description: 'Historical & parametric Value at Risk metrics',
        icon: ShieldAlert,
        badge: '99% CL'
      },
      { 
        id: 'portfolio', 
        path: '/portfolio',
        label: 'Portfolio Rebalance', 
        shortLabel: 'Portfolio', 
        description: 'Multi-asset correlation matrix & mean-variance',
        icon: PieChart 
      },
      { 
        id: 'modules', 
        path: '/modules',
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

/**
 * Resolves the tab ID corresponding to a given URL pathname
 */
export function getTabFromPath(pathname: string): string {
  const normalized = (pathname || '/').toLowerCase().trim();
  if (normalized === '/' || normalized === '') return 'overview';

  // Match direct tab path e.g. /risk or /paper-trading
  const matched = ALL_NAV_TABS.find(
    (tab) => tab.path === normalized || `/${tab.id}` === normalized
  );
  if (matched) return matched.id;

  // Match category shortcuts e.g. /trading -> overview, /quant -> lstm, /portfolio -> risk
  const catMatched = NAV_CATEGORIES.find(
    (cat) => `/${cat.id}` === normalized
  );
  if (catMatched && catMatched.items.length > 0) {
    return catMatched.items[0].id;
  }

  return 'overview';
}

/**
 * Gets the route URL path for a given tab ID
 */
export function getPathForTab(tabId: string): string {
  const matched = ALL_NAV_TABS.find((tab) => tab.id === tabId);
  return matched ? matched.path : '/overview';
}
