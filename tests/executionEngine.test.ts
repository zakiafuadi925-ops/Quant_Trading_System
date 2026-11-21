import {
  calculateLiquidationPrice,
  calculateDynamicSlippage,
  DEFAULT_TAKER_FEE_RATE,
  DEFAULT_MAKER_FEE_RATE
} from '../src/utils/paperTrading';
import { broadcastTradeAlert } from '../src/services/webhookService';

describe('Phase 2: Execution Engine, SL/TP Matching & Funding Scheduler', () => {
  it('correctly calculates liquidation price for Long and Short futures', () => {
    // 5x Long entered at $80,000 with 5% MMR -> Liquidation price ~ $68,000
    const longLiq = calculateLiquidationPrice(80000, 5, 'LONG');
    expect(longLiq).toBeLessThan(80000);
    expect(longLiq).toBeCloseTo(68000, -2);

    // 5x Short entered at $80,000 with 5% MMR -> Liquidation price ~ $92,000
    const shortLiq = calculateLiquidationPrice(80000, 5, 'SHORT');
    expect(shortLiq).toBeGreaterThan(80000);
    expect(shortLiq).toBeCloseTo(92000, -2);
  });

  it('calculates dynamic market order slippage as liquidity depth scales', () => {
    const smallOrderSlippage = calculateDynamicSlippage(1000);
    const largeOrderSlippage = calculateDynamicSlippage(500000);

    expect(smallOrderSlippage).toBeGreaterThanOrEqual(0.0001);
    expect(largeOrderSlippage).toBeGreaterThan(smallOrderSlippage);
    expect(largeOrderSlippage).toBeLessThanOrEqual(0.005);
  });

  it('verifies fee schedule defaults for Maker and Taker execution', () => {
    expect(DEFAULT_TAKER_FEE_RATE).toBe(0.0005); // 0.05%
    expect(DEFAULT_MAKER_FEE_RATE).toBe(0.0002); // 0.02%
  });

  it('gracefully handles webhook broadcast when tokens are not defined in env', async () => {
    const result = await broadcastTradeAlert({
      title: 'Unit Test Alert',
      symbol: 'BTC/USDT',
      side: 'LONG',
      price: 85000,
      reason: 'TEST_DISPATCH'
    });

    expect(result).toBeDefined();
    expect(result.telegram).toBe(false);
    expect(result.discord).toBe(false);
  });
});
