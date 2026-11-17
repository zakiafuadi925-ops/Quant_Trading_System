import { connectToDatabase } from '../db/mongodb';
import { PaperAccountModel } from '../db/models/PaperAccount';
import { PaperPositionModel } from '../db/models/PaperPosition';
import { PaperOrderModel } from '../db/models/PaperOrder';
import { PaperTradeModel } from '../db/models/PaperTrade';
import { 
  calculateDynamicSlippage, 
  calculateLiquidationPrice, 
  DEFAULT_TAKER_FEE_RATE, 
  DEFAULT_MAKER_FEE_RATE,
  MAINTENANCE_MARGIN_RATE 
} from '../utils/paperTrading';

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
