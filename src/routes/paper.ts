import { Router } from 'express';
import {
  getPaperTradingSummary,
  placeOrderInDb,
  closePositionInDb,
  cancelOrderInDb,
  resetAccountInDb,
} from '../controllers/paperTradingController.js';

const router = Router();

// GET /api/paper/summary
router.get('/summary', async (_req, res) => {
  try {
    const summary = await getPaperTradingSummary();
    res.json({ success: true, data: summary });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to fetch paper trading summary' });
  }
});

// POST /api/paper/orders
router.post('/orders', async (req, res) => {
  try {
    const { params, currentMarketPrice } = req.body;
    if (!params || !currentMarketPrice) {
      return res.status(400).json({ success: false, message: 'Missing order params or currentMarketPrice.' });
    }
    const result = await placeOrderInDb(params, Number(currentMarketPrice));
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message || 'Order placement failed.' });
  }
});

// POST /api/paper/positions/:id/close
router.post('/positions/:id/close', async (req, res) => {
  try {
    const positionId = req.params.id;
    const { closePrice, reason } = req.body;
    if (!closePrice) {
      return res.status(400).json({ success: false, message: 'Missing closePrice in request body.' });
    }
    const result = await closePositionInDb(positionId, Number(closePrice), reason || 'MANUAL_CLOSE');
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message || 'Failed to close position.' });
  }
});

// POST /api/paper/orders/:id/cancel
router.post('/orders/:id/cancel', async (req, res) => {
  try {
    const orderId = req.params.id;
    const result = await cancelOrderInDb(orderId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message || 'Failed to cancel order.' });
  }
});

// POST /api/paper/reset
router.post('/reset', async (_req, res) => {
  try {
    const account = await resetAccountInDb();
    res.json({ success: true, message: 'Paper Trading Account reset to $10,000 in MongoDB', account });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to reset account.' });
  }
});

export default router;
