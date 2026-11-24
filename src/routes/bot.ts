import { Router } from 'express';
import {
  getBotConfig,
  updateBotConfig,
  getBotTelemetry,
  evaluateAndExecuteStrategy
} from '../services/autoTradingBotService';
import { optionalAuth, AuthenticatedRequest } from '../middlewares/authMiddleware';
import { sanitizeInputs } from '../middlewares/sanitizer';

const router = Router();
router.use(optionalAuth);
router.use(sanitizeInputs);

function resolveAccountId(req: AuthenticatedRequest): string {
  return req.user?.userId || (req.query.accountId as string) || req.body?.accountId || 'default_account';
}

// GET /api/bot/config
router.get('/config', (req: AuthenticatedRequest, res) => {
  const accountId = resolveAccountId(req);
  const config = getBotConfig(accountId);
  res.json({ success: true, data: config });
});

// POST /api/bot/config
router.post('/config', (req: AuthenticatedRequest, res) => {
  const accountId = resolveAccountId(req);
  const updates = req.body || {};
  const updated = updateBotConfig(accountId, updates);
  res.json({ success: true, data: updated, message: 'Bot configuration updated successfully' });
});

// GET /api/bot/telemetry
router.get('/telemetry', (req: AuthenticatedRequest, res) => {
  const accountId = resolveAccountId(req);
  const telemetry = getBotTelemetry(accountId);
  res.json({ success: true, data: telemetry });
});

// POST /api/bot/evaluate
router.post('/evaluate', async (req: AuthenticatedRequest, res) => {
  try {
    const accountId = resolveAccountId(req);
    const { candles, currentPrice } = req.body;
    if (!candles || !currentPrice) {
      return res.status(400).json({ success: false, message: 'Missing candles or currentPrice in request body' });
    }
    const result = await evaluateAndExecuteStrategy(accountId, candles, Number(currentPrice));
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Error executing bot strategy cycle' });
  }
});

export default router;
