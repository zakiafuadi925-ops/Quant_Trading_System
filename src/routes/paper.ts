import { Router } from 'express';
import {
  getPaperTradingSummary,
  placeOrderInDb,
  closePositionInDb,
  cancelOrderInDb,
  resetAccountInDb,
  processRealTimeMatchingEngine,
  processFundingRateSettlement,
  getAccountLedger,
  verifyAccountLedger
} from '../controllers/paperTradingController.js';
import { broadcastTradeAlert } from '../services/webhookService.js';
import { optionalAuth, AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { sanitizeInputs } from '../middlewares/sanitizer.js';

const router = Router();
router.use(optionalAuth);
router.use(sanitizeInputs);

function resolveAccountId(req: AuthenticatedRequest): string {
  return req.user?.userId || (req.query.accountId as string) || req.body?.accountId || 'default_account';
}

// GET /api/paper/summary
router.get('/summary', async (req: AuthenticatedRequest, res) => {
  try {
    const accountId = resolveAccountId(req);
    const summary = await getPaperTradingSummary(accountId);
    res.json({ success: true, data: summary });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to fetch paper trading summary' });
  }
});

// POST /api/paper/orders
router.post('/orders', async (req: AuthenticatedRequest, res) => {
  try {
    const accountId = resolveAccountId(req);
    const { params, currentMarketPrice } = req.body;
    if (!params || !currentMarketPrice) {
      return res.status(400).json({ success: false, message: 'Missing order params or currentMarketPrice.' });
    }
    const orderParams = { ...params, accountId };
    const result = await placeOrderInDb(orderParams, Number(currentMarketPrice));
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message || 'Order placement failed.' });
  }
});

// POST /api/paper/positions/:id/close
router.post('/positions/:id/close', async (req: AuthenticatedRequest, res) => {
  try {
    const accountId = resolveAccountId(req);
    const positionId = String(req.params.id);
    const { closePrice, reason } = req.body;
    if (!closePrice) {
      return res.status(400).json({ success: false, message: 'Missing closePrice in request body.' });
    }
    const result = await closePositionInDb(positionId, Number(closePrice), reason || 'MANUAL_CLOSE', accountId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message || 'Failed to close position.' });
  }
});

// POST /api/paper/orders/:id/cancel
router.post('/orders/:id/cancel', async (req: AuthenticatedRequest, res) => {
  try {
    const accountId = resolveAccountId(req);
    const orderId = String(req.params.id);
    const result = await cancelOrderInDb(orderId, accountId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message || 'Failed to cancel order.' });
  }
});

// POST /api/paper/reset
router.post('/reset', async (req: AuthenticatedRequest, res) => {
  try {
    const accountId = resolveAccountId(req);
    const account = await resetAccountInDb(accountId);
    res.json({ success: true, message: `Paper Trading Account reset to $10,000 for ${accountId}`, account });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to reset account.' });
  }
});

// POST /api/paper/matching/process - Trigger order matching engine (SL, TP, Limit fill, Liquidation)
router.post('/matching/process', async (req: AuthenticatedRequest, res) => {
  try {
    const accountId = resolveAccountId(req);
    const { priceMap } = req.body;
    if (!priceMap || typeof priceMap !== 'object') {
      return res.status(400).json({ success: false, message: 'Missing or invalid priceMap object (e.g. { BTC: 85000 }).' });
    }
    const result = await processRealTimeMatchingEngine(priceMap, accountId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Matching engine error.' });
  }
});

// POST /api/paper/funding/settle - 8-Hour Perpetual funding fee settlement
router.post('/funding/settle', async (req: AuthenticatedRequest, res) => {
  try {
    const accountId = resolveAccountId(req);
    const { fundingRate } = req.body;
    const rate = fundingRate !== undefined ? Number(fundingRate) : 0.0001;
    const result = await processFundingRateSettlement(rate, accountId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Funding settlement error.' });
  }
});

// GET /api/paper/ledger/:accountId? - Immutable transaction ledger
router.get(['/ledger', '/ledger/:accountId'], async (req: AuthenticatedRequest, res) => {
  try {
    const rawAccountId = req.params.accountId ? (Array.isArray(req.params.accountId) ? req.params.accountId[0] : req.params.accountId) : resolveAccountId(req);
    const accountId = String(rawAccountId);
    const limit = Number(req.query.limit) || 50;
    const entries = await getAccountLedger(accountId, limit);
    res.json({ success: true, accountId, count: entries.length, entries });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to fetch ledger.' });
  }
});

// GET /api/paper/ledger/verify/:accountId? - Audit cryptographic hash chain
router.get(['/ledger-verify', '/ledger/verify', '/ledger/verify/:accountId'], async (req: AuthenticatedRequest, res) => {
  try {
    const rawAccountId = req.params.accountId ? (Array.isArray(req.params.accountId) ? req.params.accountId[0] : req.params.accountId) : resolveAccountId(req);
    const accountId = String(rawAccountId);
    const auditResult = await verifyAccountLedger(accountId);
    res.json({ success: true, accountId, audit: auditResult });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Ledger verification failed.' });
  }
});

// POST /api/paper/webhook/test - Test webhook dispatch to Telegram & Discord
router.post('/webhook/test', async (req, res) => {
  try {
    const payload = req.body.payload || {
      title: 'Manual Test Broadcast Alert',
      symbol: 'BTC/USDT',
      side: 'LONG',
      price: 85263.08,
      quantity: 0.1,
      reason: 'TEST_DISPATCH'
    };
    const result = await broadcastTradeAlert(payload);
    res.json({ success: true, dispatched: result });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Webhook dispatch failed.' });
  }
});

export default router;
