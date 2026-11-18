import { Router } from 'express';
import {
  getAlertRulesFromDb,
  saveAlertRuleInDb,
  toggleAlertRuleInDb,
} from '../controllers/alertRuleController.js';

const router = Router();

// GET /api/alerts/rules
router.get('/rules', async (_req, res) => {
  try {
    const rules = await getAlertRulesFromDb();
    res.json({ success: true, rules });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to fetch alert rules.' });
  }
});

// POST /api/alerts/rules
router.post('/rules', async (req, res) => {
  try {
    const saved = await saveAlertRuleInDb(req.body);
    res.json({ success: true, rule: saved });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message || 'Failed to save alert rule.' });
  }
});

// POST /api/alerts/rules/:id/toggle
router.post('/rules/:id/toggle', async (req, res) => {
  try {
    const ruleId = req.params.id;
    const { enabled } = req.body;
    const updated = await toggleAlertRuleInDb(ruleId, Boolean(enabled));
    res.json({ success: true, rule: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message || 'Failed to toggle alert rule.' });
  }
});

export default router;
