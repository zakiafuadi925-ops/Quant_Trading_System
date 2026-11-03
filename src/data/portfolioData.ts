import { AssetAllocation, TradeRecord } from '../types';

export const INITIAL_PORTFOLIO_ASSETS: AssetAllocation[] = [
  { symbol: 'BTC', name: 'Bitcoin', targetPct: 40, currentHolding: 0.125, price: 85263.08, color: '#f59e0b' },
  { symbol: 'ETH', name: 'Ethereum', targetPct: 35, currentHolding: 2.85, price: 2940.50, color: '#6366f1' },
  { symbol: 'SOL', name: 'Solana', targetPct: 15, currentHolding: 24.5, price: 172.30, color: '#14b8a6' },
  { symbol: 'USDT', name: 'Tether USD', targetPct: 10, currentHolding: 2600.0, price: 1.00, color: '#10b981' }
];

export const WATCHED_COINS = [
  { symbol: 'BTC', name: 'Bitcoin', price: 85263.08, change24h: 2.6, change7d: 8.4, volume24h: '$59.4B', category: 'Store of Value', signal: 'BUY' },
  { symbol: 'ETH', name: 'Ethereum', price: 2940.50, change24h: 1.8, change7d: 4.2, volume24h: '$24.1B', category: 'Smart Contracts', signal: 'BUY' },
  { symbol: 'SOL', name: 'Solana', price: 172.30, change24h: 3.4, change7d: 11.2, volume24h: '$6.8B', category: 'Layer 1', signal: 'BUY' },
  { symbol: 'TAO', name: 'Bittensor', price: 259.06, change24h: -1.2, change7d: -13.44, volume24h: '$221M', category: 'AI x Crypto', signal: 'HOLD' },
  { symbol: 'LINK', name: 'Chainlink', price: 12.50, change24h: 0.8, change7d: -3.5, volume24h: '$247M', category: 'Oracle / DeFi', signal: 'HOLD' },
  { symbol: 'ARB', name: 'Arbitrum', price: 0.16, change24h: -0.5, change7d: -6.2, volume24h: '$618M', category: 'Layer 2 Rollup', signal: 'WATCH' },
  { symbol: 'ZEC', name: 'Zcash', price: 1180.00, change24h: -2.1, change7d: -13.44, volume24h: '$999M', category: 'Privacy / Shielded', signal: 'WATCH' }
];

export const INITIAL_TRADES: TradeRecord[] = [
  { id: 't-1', timestamp: '2026-05-04 10:42:14', symbol: 'SOL-USD', type: 'BUY', amount: 10, price: 150.0, total: 1500.0, fee: 1.5, pnl: 223.0, pnlPct: 14.87 },
  { id: 't-2', timestamp: '2026-05-04 10:42:14', symbol: 'BTC-USD', type: 'SELL', amount: 0.2, price: 78000.0, total: 15600.0, fee: 15.6, pnl: 3600.0, pnlPct: 30.0 },
  { id: 't-3', timestamp: '2026-05-04 10:42:14', symbol: 'ETH-USD', type: 'BUY', amount: 2, price: 2000.0, total: 4000.0, fee: 4.0, pnl: 1881.0, pnlPct: 47.0 },
  { id: 't-4', timestamp: '2026-05-04 10:42:14', symbol: 'BTC-USD', type: 'BUY', amount: 0.5, price: 60000.0, total: 30000.0, fee: 30.0, pnl: 12631.54, pnlPct: 42.1 },
  { id: 't-5', timestamp: '2026-04-18 02:10:50', symbol: 'ETH-USD', type: 'BUY', amount: 1.5, price: 3000.0, total: 4500.0, fee: 4.5, pnl: -89.25, pnlPct: -1.98 },
  { id: 't-6', timestamp: '2026-04-18 02:10:50', symbol: 'BTC-USD', type: 'BUY', amount: 0.1, price: 50000.0, total: 5000.0, fee: 5.0, pnl: 3526.31, pnlPct: 70.53 },
  { id: 't-7', timestamp: '2026-04-15 10:58:14', symbol: 'BTC-USD', type: 'SELL', amount: 0.05, price: 51000.0, total: 2550.0, fee: 2.55, pnl: 50.0, pnlPct: 2.0 },
  { id: 't-8', timestamp: '2026-04-15 10:58:14', symbol: 'ETH-USD', type: 'BUY', amount: 1.5, price: 3000.0, total: 4500.0, fee: 4.5, pnl: -89.25, pnlPct: -1.98 },
  { id: 't-9', timestamp: '2026-04-15 10:58:14', symbol: 'BTC-USD', type: 'BUY', amount: 0.1, price: 50000.0, total: 5000.0, fee: 5.0, pnl: 3526.31, pnlPct: 70.53 }
];

export const PORTFOLIO_CONFIG = {
  owner: 'MyTradingBot (Astronacci Lab)',
  exchange: 'Binance / CCXT',
  created: '2026-04-19 01:09:13',
  riskSettings: {
    maxDrawdown: 0.20,
    stopLoss: 0.10,
    takeProfit: 0.25
  },
  alerts: [
    { type: 'price', coin: 'BTC', condition: 'below', value: 45000, active: true },
    { type: 'price', coin: 'BTC', condition: 'below', value: 55000, active: true },
    { type: 'portfolio', condition: 'total_below', value: 9000, active: true }
  ]
};
