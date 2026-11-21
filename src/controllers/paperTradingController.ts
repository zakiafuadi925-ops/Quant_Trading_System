import { connectToDatabase } from '../db/mongodb.js';
import { PaperAccountModel } from '../db/models/PaperAccount.js';
import { PaperPositionModel } from '../db/models/PaperPosition.js';
import { PaperOrderModel } from '../db/models/PaperOrder.js';
import { PaperTradeModel } from '../db/models/PaperTrade.js';
import { 
  calculateDynamicSlippage, 
  calculateLiquidationPrice, 
  DEFAULT_TAKER_FEE_RATE, 
  DEFAULT_MAKER_FEE_RATE,
  MAINTENANCE_MARGIN_RATE 
} from '../utils/paperTrading.js';
import { broadcastTradeAlert } from '../services/webhookService.js';

const DEFAULT_ACCOUNT_ID = 'default_account';

/**
 * Get or initialize paper trading account from MongoDB.
 */
export async function getOrCreateAccount(accountId = DEFAULT_ACCOUNT_ID) {
  await connectToDatabase();
  let account = await PaperAccountModel.findOne({ accountId });
  if (!account) {
    account = await PaperAccountModel.create({
      accountId,
      initialBalance: 10000,
      balance: 10000,
      equity: 10000,
      totalFeesPaid: 0,
      totalRealizedPnl: 0,
      lastFundingTimestamp: Date.now()
    });
  }
  return account;
}

/**
 * Fetch complete account summary with active positions and orders.
 */
export async function getPaperTradingSummary(accountId = DEFAULT_ACCOUNT_ID) {
  await connectToDatabase();
  const account = await getOrCreateAccount(accountId);
  const positions = await PaperPositionModel.find({ accountId }).sort({ createdAt: -1 });
  const openOrders = await PaperOrderModel.find({ accountId, status: 'PENDING' }).sort({ createdAt: -1 });
  const tradeLedger = await PaperTradeModel.find({ accountId }).sort({ createdAt: -1 }).limit(50);

  const totalUnrealizedPnl = positions.reduce((acc, p) => acc + (p.unrealizedPnl || 0), 0);
  const totalMarginUsed = positions.reduce((acc, p) => acc + (p.initialMargin || 0), 0);
  const equity = account.balance + totalUnrealizedPnl;
  const freeMargin = Math.max(0, account.balance - totalMarginUsed);

  return {
    account: {
      initialBalance: account.initialBalance,
      balance: account.balance,
      equity,
      freeMargin,
      totalMarginUsed,
      totalFeesPaid: account.totalFeesPaid,
      totalRealizedPnl: account.totalRealizedPnl
    },
    positions,
    openOrders,
    tradeLedger
  };
}

/**
 * Place a new Paper Order in MongoDB.
 */
export async function placeOrderInDb(
  params: {
    symbol: string;
    side: 'BUY' | 'SELL';
    type: 'MARKET' | 'LIMIT';
    positionSide: 'LONG' | 'SHORT';
    quantity: number;
    price: number;
    leverage?: number;
    stopLoss?: number;
    takeProfit?: number;
    trailingStopDistance?: number;
  },
  currentMarketPrice: number,
  accountId = DEFAULT_ACCOUNT_ID
) {
  await connectToDatabase();
  const account = await getOrCreateAccount(accountId);
  const leverage = Math.max(1, Math.min(10, params.leverage || 1));
  const rawPrice = params.type === 'MARKET' ? currentMarketPrice : params.price;

  if (params.quantity <= 0 || rawPrice <= 0) {
    throw new Error('Invalid order quantity or price.');
  }

  const notional = params.quantity * rawPrice;
  const requiredMargin = notional / leverage;

  // Margin check
  const existingPositions = await PaperPositionModel.find({ accountId });
  const totalAllocatedMargin = existingPositions.reduce((acc, p) => acc + p.initialMargin, 0);
  const freeMargin = account.balance - totalAllocatedMargin;

  if (requiredMargin > freeMargin) {
    throw new Error(`Insufficient margin! Required: $${requiredMargin.toFixed(2)}, Available: $${Math.max(0, freeMargin).toFixed(2)}.`);
  }

  const orderId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const slippage = params.type === 'MARKET' ? calculateDynamicSlippage(notional) : 0;
  
  let executedPrice = rawPrice;
  if (params.type === 'MARKET') {
    executedPrice = params.side === 'BUY' ? rawPrice * (1 + slippage) : rawPrice * (1 - slippage);
  }

  const feeRate = params.type === 'MARKET' ? DEFAULT_TAKER_FEE_RATE : DEFAULT_MAKER_FEE_RATE;
  const fee = notional * feeRate;

  // Create Order Record
  const order = await PaperOrderModel.create({
    orderId,
    accountId,
    symbol: params.symbol.toUpperCase(),
    side: params.side,
    type: params.type,
    positionSide: params.positionSide,
    price: rawPrice,
    quantity: params.quantity,
    leverage,
    status: params.type === 'MARKET' ? 'FILLED' : 'PENDING',
    stopLoss: params.stopLoss,
    takeProfit: params.takeProfit,
    trailingStopDistance: params.trailingStopDistance,
    fee,
    slippage,
    timestamp: Date.now()
  });

  // If LIMIT, keep pending
  if (params.type === 'LIMIT') {
    return { order, position: null };
  }

  // If MARKET, open position immediately
  const positionId = `pos_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const liqPrice = calculateLiquidationPrice(executedPrice, leverage, params.positionSide);

  const position = await PaperPositionModel.create({
    positionId,
    accountId,
    symbol: params.symbol.toUpperCase(),
    side: params.positionSide,
    entryPrice: executedPrice,
    markPrice: currentMarketPrice,
    quantity: params.quantity,
    notionalValue: notional,
    leverage,
    initialMargin: requiredMargin,
    maintenanceMargin: requiredMargin * MAINTENANCE_MARGIN_RATE * leverage,
    unrealizedPnl: 0,
    unrealizedPnlPct: 0,
    liquidationPrice: liqPrice,
    stopLoss: params.stopLoss,
    takeProfit: params.takeProfit,
    trailingStopDistance: params.trailingStopDistance,
    highestPriceSinceEntry: executedPrice,
    lowestPriceSinceEntry: executedPrice,
    openTimestamp: Date.now(),
    totalFundingPaid: 0
  });

  // Record trade
  await PaperTradeModel.create({
    tradeId: `trd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    orderId: order.orderId,
    accountId,
    symbol: order.symbol,
    side: order.side,
    positionSide: order.positionSide,
    executedPrice,
    quantity: order.quantity,
    notional,
    leverage,
    realizedPnl: -fee,
    fee,
    reason: 'MARKET_FILL',
    timestamp: Date.now()
  });

  // Deduct taker fee from balance
  account.balance -= fee;
  account.totalFeesPaid += fee;
  await account.save();

  // Async dispatch notification
  broadcastTradeAlert({
    title: 'New Position Opened (Market Order)',
    symbol: order.symbol,
    side: order.positionSide,
    price: executedPrice,
    quantity: order.quantity,
    reason: 'MARKET_FILL'
  }).catch(() => {});

  return { order, position };
}

/**
 * Close an active position in MongoDB.
 */
export async function closePositionInDb(
  positionId: string,
  closePrice: number,
  reason = 'MANUAL_CLOSE',
  accountId = DEFAULT_ACCOUNT_ID
) {
  await connectToDatabase();
  const position = await PaperPositionModel.findOne({ positionId, accountId });
  if (!position) {
    throw new Error('Position not found.');
  }

  const account = await getOrCreateAccount(accountId);
  let grossPnl = 0;
  if (position.side === 'LONG') {
    grossPnl = (closePrice - position.entryPrice) * position.quantity;
  } else {
    grossPnl = (position.entryPrice - closePrice) * position.quantity;
  }

  const notional = position.quantity * closePrice;
  const exitFee = notional * DEFAULT_TAKER_FEE_RATE;
  const netPnl = grossPnl - exitFee;

  // Record closing trade in ledger
  const trade = await PaperTradeModel.create({
    tradeId: `trd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    orderId: `close_${position.positionId}`,
    accountId,
    symbol: position.symbol,
    side: position.side === 'LONG' ? 'SELL' : 'BUY',
    positionSide: position.side,
    executedPrice: closePrice,
    quantity: position.quantity,
    notional,
    leverage: position.leverage,
    realizedPnl: netPnl,
    fee: exitFee,
    reason,
    timestamp: Date.now()
  });

  // Remove position
  await PaperPositionModel.deleteOne({ positionId });

  // Update account
  account.balance += netPnl;
  account.totalRealizedPnl += netPnl;
  account.totalFeesPaid += exitFee;
  await account.save();

  // Async dispatch notification
  broadcastTradeAlert({
    title: `Position Closed [${reason}]`,
    symbol: position.symbol,
    side: position.side,
    price: closePrice,
    quantity: position.quantity,
    reason,
    pnl: netPnl
  }).catch(() => {});

  return { trade, closedPositionId: positionId, netPnl };
}

/**
 * Cancel a pending limit order.
 */
export async function cancelOrderInDb(orderId: string, accountId = DEFAULT_ACCOUNT_ID) {
  await connectToDatabase();
  const res = await PaperOrderModel.findOneAndUpdate(
    { orderId, accountId, status: 'PENDING' },
    { status: 'CANCELLED' },
    { new: true }
  );
  return res;
}

/**
 * Reset account back to clean initial $10,000 state in MongoDB.
 */
export async function resetAccountInDb(accountId = DEFAULT_ACCOUNT_ID) {
  await connectToDatabase();
  await PaperPositionModel.deleteMany({ accountId });
  await PaperOrderModel.deleteMany({ accountId });
  await PaperTradeModel.deleteMany({ accountId });

  const account = await PaperAccountModel.findOneAndUpdate(
    { accountId },
    {
      initialBalance: 10000,
      balance: 10000,
      equity: 10000,
      totalFeesPaid: 0,
      totalRealizedPnl: 0,
      lastFundingTimestamp: Date.now()
    },
    { upsert: true, new: true }
  );

  return account;
}

/**
 * Real-Time Matching Engine:
 * Evaluates pending orders and active positions against live mark prices.
 * Triggers:
 * 1. Limit Order Fills
 * 2. Stop Loss (SL) triggers
 * 3. Take Profit (TP) triggers
 * 4. Trailing Stop updates and triggers
 * 5. Liquidation enforcement if mark price breaches liquidation threshold
 */
export async function processRealTimeMatchingEngine(
  priceMap: Record<string, number>,
  accountId = DEFAULT_ACCOUNT_ID
) {
  await connectToDatabase();
  const account = await getOrCreateAccount(accountId);
  const eventsTriggered: Array<{ type: string; id: string; symbol: string; detail: string }> = [];

  // 1. Process PENDING LIMIT ORDERS
  const pendingOrders = await PaperOrderModel.find({ accountId, status: 'PENDING' });
  for (const ord of pendingOrders) {
    const currentPrice = priceMap[ord.symbol.toUpperCase()];
    if (!currentPrice || currentPrice <= 0) continue;

    let shouldFill = false;
    // BUY LIMIT fills when market price <= limit order price
    if (ord.side === 'BUY' && currentPrice <= ord.price) {
      shouldFill = true;
    }
    // SELL LIMIT fills when market price >= limit order price
    else if (ord.side === 'SELL' && currentPrice >= ord.price) {
      shouldFill = true;
    }

    if (shouldFill) {
      ord.status = 'FILLED';
      await ord.save();

      const notional = ord.quantity * ord.price;
      const requiredMargin = notional / ord.leverage;
      const liqPrice = calculateLiquidationPrice(ord.price, ord.leverage, ord.positionSide);

      const positionId = `pos_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await PaperPositionModel.create({
        positionId,
        accountId,
        symbol: ord.symbol,
        side: ord.positionSide,
        entryPrice: ord.price,
        markPrice: currentPrice,
        quantity: ord.quantity,
        notionalValue: notional,
        leverage: ord.leverage,
        initialMargin: requiredMargin,
        maintenanceMargin: requiredMargin * MAINTENANCE_MARGIN_RATE * ord.leverage,
        unrealizedPnl: 0,
        unrealizedPnlPct: 0,
        liquidationPrice: liqPrice,
        stopLoss: ord.stopLoss,
        takeProfit: ord.takeProfit,
        trailingStopDistance: ord.trailingStopDistance,
        highestPriceSinceEntry: ord.price,
        lowestPriceSinceEntry: ord.price,
        openTimestamp: Date.now(),
        totalFundingPaid: 0
      });

      // Trade record
      await PaperTradeModel.create({
        tradeId: `trd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        orderId: ord.orderId,
        accountId,
        symbol: ord.symbol,
        side: ord.side,
        positionSide: ord.positionSide,
        executedPrice: ord.price,
        quantity: ord.quantity,
        notional,
        leverage: ord.leverage,
        realizedPnl: -ord.fee,
        fee: ord.fee,
        reason: 'LIMIT_FILL',
        timestamp: Date.now()
      });

      account.balance -= ord.fee;
      account.totalFeesPaid += ord.fee;
      await account.save();

      eventsTriggered.push({
        type: 'LIMIT_FILL',
        id: ord.orderId,
        symbol: ord.symbol,
        detail: `Filled at limit $${ord.price}`
      });

      broadcastTradeAlert({
        title: 'Limit Order Triggered & Filled',
        symbol: ord.symbol,
        side: ord.positionSide,
        price: ord.price,
        quantity: ord.quantity,
        reason: 'LIMIT_FILL'
      }).catch(() => {});
    }
  }

  // 2. Process ACTIVE POSITIONS (SL, TP, Trailing Stop, Liquidation)
  const positions = await PaperPositionModel.find({ accountId });
  for (const pos of positions) {
    const currentPrice = priceMap[pos.symbol.toUpperCase()];
    if (!currentPrice || currentPrice <= 0) continue;

    let shouldClose = false;
    let closeReason = 'MANUAL_CLOSE';
    let executedPrice = currentPrice;

    // A. Check LIQUIDATION
    if (pos.side === 'LONG' && currentPrice <= pos.liquidationPrice) {
      shouldClose = true;
      closeReason = 'LIQUIDATION';
      executedPrice = pos.liquidationPrice;
    } else if (pos.side === 'SHORT' && currentPrice >= pos.liquidationPrice) {
      shouldClose = true;
      closeReason = 'LIQUIDATION';
      executedPrice = pos.liquidationPrice;
    }

    // B. Check STOP LOSS (SL)
    if (!shouldClose && pos.stopLoss) {
      if (pos.side === 'LONG' && currentPrice <= pos.stopLoss) {
        shouldClose = true;
        closeReason = 'STOP_LOSS_TRIGGER';
        executedPrice = pos.stopLoss;
      } else if (pos.side === 'SHORT' && currentPrice >= pos.stopLoss) {
        shouldClose = true;
        closeReason = 'STOP_LOSS_TRIGGER';
        executedPrice = pos.stopLoss;
      }
    }

    // C. Check TAKE PROFIT (TP)
    if (!shouldClose && pos.takeProfit) {
      if (pos.side === 'LONG' && currentPrice >= pos.takeProfit) {
        shouldClose = true;
        closeReason = 'TAKE_PROFIT_TRIGGER';
        executedPrice = pos.takeProfit;
      } else if (pos.side === 'SHORT' && currentPrice <= pos.takeProfit) {
        shouldClose = true;
        closeReason = 'TAKE_PROFIT_TRIGGER';
        executedPrice = pos.takeProfit;
      }
    }

    // D. Check & Update TRAILING STOP
    if (!shouldClose && pos.trailingStopDistance && pos.trailingStopDistance > 0) {
      if (pos.side === 'LONG') {
        const highest = Math.max(pos.highestPriceSinceEntry || pos.entryPrice, currentPrice);
        pos.highestPriceSinceEntry = highest;
        const trailingSl = highest * (1 - pos.trailingStopDistance / 100);
        if (currentPrice <= trailingSl) {
          shouldClose = true;
          closeReason = 'TRAILING_STOP_TRIGGER';
          executedPrice = trailingSl;
        }
      } else {
        const lowest = Math.min(pos.lowestPriceSinceEntry || pos.entryPrice, currentPrice);
        pos.lowestPriceSinceEntry = lowest;
        const trailingSl = lowest * (1 + pos.trailingStopDistance / 100);
        if (currentPrice >= trailingSl) {
          shouldClose = true;
          closeReason = 'TRAILING_STOP_TRIGGER';
          executedPrice = trailingSl;
        }
      }
    }

    if (shouldClose) {
      await closePositionInDb(pos.positionId, executedPrice, closeReason, accountId);
      eventsTriggered.push({
        type: closeReason,
        id: pos.positionId,
        symbol: pos.symbol,
        detail: `Position closed at $${executedPrice} (${closeReason})`
      });
    } else {
      // Update Mark Price & Unrealized PnL
      pos.markPrice = currentPrice;
      let pnl = 0;
      if (pos.side === 'LONG') {
        pnl = (currentPrice - pos.entryPrice) * pos.quantity;
      } else {
        pnl = (pos.entryPrice - currentPrice) * pos.quantity;
      }
      pos.unrealizedPnl = pnl;
      pos.unrealizedPnlPct = pos.initialMargin > 0 ? (pnl / pos.initialMargin) * 100 : 0;
      await pos.save();
    }
  }

  return { eventsTriggered, count: eventsTriggered.length };
}

/**
 * Perpetual Funding Rate Scheduler:
 * Deducts / adds 8-hour funding fees based on active notional and funding rate.
 * Funding occurs at 00:00, 08:00, 16:00 UTC (or every 8 hours elapsed).
 */
export async function processFundingRateSettlement(
  currentFundingRate = 0.0001, // 0.01% standard 8-hour rate
  accountId = DEFAULT_ACCOUNT_ID
) {
  await connectToDatabase();
  const account = await getOrCreateAccount(accountId);
  const positions = await PaperPositionModel.find({ accountId });

  if (positions.length === 0) {
    return { settledPositions: 0, totalFundingFee: 0 };
  }

  let totalFundingFee = 0;
  for (const pos of positions) {
    // In perpetual futures:
    // When funding rate > 0, LONGs pay SHORTs.
    // When funding rate < 0, SHORTs pay LONGs.
    const notional = pos.quantity * pos.markPrice;
    let fee = 0;

    if (pos.side === 'LONG') {
      fee = notional * currentFundingRate;
    } else {
      fee = -notional * currentFundingRate;
    }

    totalFundingFee += fee;
    pos.totalFundingPaid = (pos.totalFundingPaid || 0) + fee;
    await pos.save();
  }

  // Deduct/credit net funding from account balance
  account.balance -= totalFundingFee;
  account.lastFundingTimestamp = Date.now();
  await account.save();

  return {
    settledPositions: positions.length,
    fundingRate: currentFundingRate,
    totalFundingFee,
    remainingBalance: account.balance
  };
}
