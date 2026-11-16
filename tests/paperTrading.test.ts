import {
  createInitialPaperState,
  placePaperOrder,
  cancelPaperOrder,
  closePosition,
  processMarketTick,
  applyFundingFee,
  calculateDynamicSlippage,
  calculateLiquidationPrice,
  getPaperTradingStats
} from '../src/utils/paperTrading';

describe('Paper Trading & Perpetual Execution Engine', () => {
  it('initializes default state with $10,000 cash balance and empty ledger', () => {
    const state = createInitialPaperState(10000);
    expect(state.balance).toBe(10000);
    expect(state.equity).toBe(10000);
    expect(state.positions).toHaveLength(0);
    expect(state.openOrders).toHaveLength(0);
    expect(state.tradeLedger).toHaveLength(0);
  });

  it('calculates dynamic slippage scaling with order notional', () => {
    const slipSmall = calculateDynamicSlippage(1000); // $1k
    const slipLarge = calculateDynamicSlippage(50000); // $50k
    expect(slipSmall).toBeGreaterThan(0);
    expect(slipLarge).toBeGreaterThan(slipSmall);
  });

  it('calculates accurate perpetual futures liquidation prices for Long and Short', () => {
    const entryPrice = 50000;
    const leverage = 10;
    
    const longLiq = calculateLiquidationPrice(entryPrice, leverage, 'LONG');
    const shortLiq = calculateLiquidationPrice(entryPrice, leverage, 'SHORT');

    // For 10x Long: initial margin 10%, with 5% MM, liq price is roughly entry * (1 - 0.10 + 0.05) = 47500
    expect(longLiq).toBeLessThan(entryPrice);
    expect(longLiq).toBeCloseTo(47500, -1);

    // For 10x Short: liq price is entry * (1 + 0.10 - 0.05) = 52500
    expect(shortLiq).toBeGreaterThan(entryPrice);
    expect(shortLiq).toBeCloseTo(52500, -1);
  });

  it('executes market orders immediately and calculates margin correctly', () => {
    const state = createInitialPaperState(10000);
    const { newState, order, error } = placePaperOrder(
      state,
      {
        symbol: 'BTC',
        side: 'BUY',
        type: 'MARKET',
        positionSide: 'LONG',
        quantity: 0.2, // $10,000 notional at $50,000
        price: 50000,
        leverage: 5
      },
      50000
    );

    expect(error).toBeUndefined();
    expect(order.status).toBe('FILLED');
    expect(newState.positions).toHaveLength(1);
    expect(newState.positions[0].quantity).toBe(0.2);
    expect(newState.positions[0].leverage).toBe(5);
    // Initial margin should be approx (0.2 * ~50000) / 5 = ~2000
    expect(newState.positions[0].initialMargin).toBeCloseTo(2000, 0);
    // Taker fee deducted
    expect(newState.balance).toBeLessThan(10000);
  });

  it('rejects order if required margin exceeds free balance', () => {
    const state = createInitialPaperState(1000);
    const { newState, error } = placePaperOrder(
      state,
      {
        symbol: 'BTC',
        side: 'BUY',
        type: 'MARKET',
        positionSide: 'LONG',
        quantity: 1, // $50,000 notional with 1x leverage requires $50,000 margin
        price: 50000,
        leverage: 1
      },
      50000
    );

    expect(error).toBeDefined();
    expect(error).toContain('Insufficient margin');
    expect(newState.positions).toHaveLength(0);
  });

  it('handles Limit orders and fills them when price reaches limit', () => {
    const state = createInitialPaperState(10000);
    // Place Limit Buy at 48000 when market is at 50000
    const { newState, order } = placePaperOrder(
      state,
      {
        symbol: 'BTC',
        side: 'BUY',
        type: 'LIMIT',
        positionSide: 'LONG',
        quantity: 0.1,
        price: 48000,
        leverage: 2
      },
      50000
    );

    expect(order.status).toBe('PENDING');
    expect(newState.openOrders).toHaveLength(1);
    expect(newState.positions).toHaveLength(0);

    // Tick at 49000 -> Still pending
    const stateTick1 = processMarketTick(newState, { BTC: 49000 });
    expect(stateTick1.openOrders).toHaveLength(1);
    expect(stateTick1.positions).toHaveLength(0);

    // Tick drops to 47800 -> Fill triggered
    const stateTick2 = processMarketTick(stateTick1, { BTC: 47800 });
    expect(stateTick2.openOrders).toHaveLength(0);
    expect(stateTick2.positions).toHaveLength(1);
    expect(stateTick2.positions[0].entryPrice).toBe(48000);
  });

  it('cancels pending limit orders properly', () => {
    const state = createInitialPaperState(10000);
    const { newState, order } = placePaperOrder(
      state,
      {
        symbol: 'BTC',
        side: 'BUY',
        type: 'LIMIT',
        positionSide: 'LONG',
        quantity: 0.1,
        price: 48000
      },
      50000
    );

    expect(newState.openOrders).toHaveLength(1);
    const stateAfterCancel = cancelPaperOrder(newState, order.id);
    expect(stateAfterCancel.openOrders).toHaveLength(0);
  });

  it('updates mark-to-market unrealized PnL on price changes', () => {
    let state = createInitialPaperState(10000);
    const res = placePaperOrder(
      state,
      {
        symbol: 'BTC',
        side: 'BUY',
        type: 'MARKET',
        positionSide: 'LONG',
        quantity: 0.1,
        price: 50000,
        leverage: 2
      },
      50000
    );
    state = res.newState;

    // Price moves to 55000 (+10% gain on 0.1 BTC = +$500)
    const updatedState = processMarketTick(state, { BTC: 55000 });
    expect(updatedState.positions[0].unrealizedPnl).toBeGreaterThan(450);
    expect(updatedState.equity).toBeGreaterThan(10450);
  });

  it('triggers Stop-Loss and closes position automatically', () => {
    let state = createInitialPaperState(10000);
    const res = placePaperOrder(
      state,
      {
        symbol: 'BTC',
        side: 'BUY',
        type: 'MARKET',
        positionSide: 'LONG',
        quantity: 0.1,
        price: 50000,
        leverage: 2,
        stopLoss: 48000
      },
      50000
    );
    state = res.newState;
    expect(state.positions).toHaveLength(1);

    // Price falls below stop-loss
    const stateAfterDrop = processMarketTick(state, { BTC: 47900 });
    expect(stateAfterDrop.positions).toHaveLength(0);
    expect(stateAfterDrop.tradeLedger).toHaveLength(2); // Initial fill + SL close
    expect(stateAfterDrop.tradeLedger[0].reason).toBe('STOP_LOSS');
  });

  it('triggers Trailing Stop when price retraces from peak', () => {
    let state = createInitialPaperState(10000);
    const res = placePaperOrder(
      state,
      {
        symbol: 'BTC',
        side: 'BUY',
        type: 'MARKET',
        positionSide: 'LONG',
        quantity: 0.1,
        price: 50000,
        leverage: 2,
        trailingStopDistance: 1000 // Trailing stop 1000 USD
      },
      50000
    );
    state = res.newState;

    // Price rallies to 53000 (highestPrice becomes 53000)
    state = processMarketTick(state, { BTC: 53000 });
    expect(state.positions).toHaveLength(1);
    expect(state.positions[0].highestPriceSinceEntry).toBe(53000);

    // Price retraces to 52500 (distance = 500 < 1000, not triggered)
    state = processMarketTick(state, { BTC: 52500 });
    expect(state.positions).toHaveLength(1);

    // Price retraces further to 51900 (distance = 1100 > 1000, trigger trailing stop!)
    state = processMarketTick(state, { BTC: 51900 });
    expect(state.positions).toHaveLength(0);
    expect(state.tradeLedger[0].reason).toBe('TRAILING_STOP');
    expect(state.tradeLedger[0].realizedPnl).toBeGreaterThan(0); // Locked in profit
  });

  it('triggers Liquidation on catastrophic adverse move', () => {
    let state = createInitialPaperState(10000);
    const res = placePaperOrder(
      state,
      {
        symbol: 'BTC',
        side: 'BUY',
        type: 'MARKET',
        positionSide: 'LONG',
        quantity: 0.2,
        price: 50000,
        leverage: 10 // Liq price around ~47500
      },
      50000
    );
    state = res.newState;

    // Flash crash to 46000 (below liq price)
    const liqState = processMarketTick(state, { BTC: 46000 });
    expect(liqState.positions).toHaveLength(0);
    expect(liqState.tradeLedger[0].reason).toBe('LIQUIDATION');
  });

  it('applies perpetual futures funding fee deductions', () => {
    let state = createInitialPaperState(10000);
    const res = placePaperOrder(
      state,
      {
        symbol: 'BTC',
        side: 'BUY',
        type: 'MARKET',
        positionSide: 'LONG',
        quantity: 0.2,
        price: 50000,
        leverage: 2
      },
      50000
    );
    state = res.newState;
    const balBefore = state.balance;

    // Apply 1 bps funding fee on ~$10k notional = ~$1 fee
    const fundedState = applyFundingFee(state, 1.0);
    expect(fundedState.balance).toBeLessThan(balBefore);
    expect(fundedState.positions[0].totalFundingPaid).toBeGreaterThan(0);
  });

  it('computes accurate performance statistics and audit metrics', () => {
    let state = createInitialPaperState(10000);
    
    // Win trade
    let res = placePaperOrder(state, {
      symbol: 'BTC', side: 'BUY', type: 'MARKET', positionSide: 'LONG', quantity: 0.1, price: 50000, leverage: 1
    }, 50000);
    state = closePosition(res.newState, res.newState.positions[0].id, 55000, 'MANUAL_CLOSE');

    // Loss trade
    res = placePaperOrder(state, {
      symbol: 'BTC', side: 'BUY', type: 'MARKET', positionSide: 'LONG', quantity: 0.1, price: 50000, leverage: 1
    }, 50000);
    state = closePosition(res.newState, res.newState.positions[0].id, 48000, 'MANUAL_CLOSE');

    const stats = getPaperTradingStats(state);
    expect(stats.totalTrades).toBe(2);
    expect(stats.winningTrades).toBe(1);
    expect(stats.losingTrades).toBe(1);
    expect(stats.winRatePct).toBe(50);
    expect(stats.profitFactor).toBeGreaterThan(1);
    expect(stats.roiPct).toBeGreaterThan(0);
  });
});
