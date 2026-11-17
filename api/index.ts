import express from 'express';
import { 
  getPaperTradingSummary, 
  placeOrderInDb, 
  closePositionInDb, 
  cancelOrderInDb, 
  resetAccountInDb 
} from '../src/controllers/paperTradingController';
import { 
  getAlertRulesFromDb, 
  saveAlertRuleInDb, 
  toggleAlertRuleInDb 
} from '../src/controllers/alertRuleController';

const app = express();
app.use(express.json({ limit: '10mb' }));

// Health Check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    environment: 'Vercel Serverless',
    database: process.env.MONGODB_URI ? 'Configured' : 'Missing MONGODB_URI',
    timestamp: new Date().toISOString()
  });
});

// Paper Trading REST Endpoints
app.get('/api/paper/summary', async (_req, res) => {
  try {
    const summary = await getPaperTradingSummary();
    res.json({ success: true, data: summary });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to fetch paper trading summary' });
  }
});

app.post('/api/paper/orders', async (req, res) => {
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

app.post('/api/paper/positions/:id/close', async (req, res) => {
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

app.post('/api/paper/orders/:id/cancel', async (req, res) => {
  try {
    const orderId = req.params.id;
    const result = await cancelOrderInDb(orderId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message || 'Failed to cancel order.' });
  }
});

app.post('/api/paper/reset', async (_req, res) => {
  try {
    const account = await resetAccountInDb();
    res.json({ success: true, message: 'Paper Trading Account reset to $10,000 in MongoDB', account });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to reset account.' });
  }
});

// Alert Rules REST Endpoints
app.get('/api/alerts/rules', async (_req, res) => {
  try {
    const rules = await getAlertRulesFromDb();
    res.json({ success: true, rules });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to fetch alert rules.' });
  }
});

app.post('/api/alerts/rules', async (req, res) => {
  try {
    const ruleData = req.body;
    const saved = await saveAlertRuleInDb(ruleData);
    res.json({ success: true, rule: saved });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message || 'Failed to save alert rule.' });
  }
});

app.post('/api/alerts/rules/:id/toggle', async (req, res) => {
  try {
    const ruleId = req.params.id;
    const { enabled } = req.body;
    const updated = await toggleAlertRuleInDb(ruleId, Boolean(enabled));
    res.json({ success: true, rule: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message || 'Failed to toggle alert rule.' });
  }
});

export default app;
