import { Router } from 'express';
import {
  saveExchangeApiKey,
  listExchangeApiKeys,
  testVaultKeyConnection,
  executeLiveExchangeOrder,
  getCircuitBreakerInfo,
  triggerKillSwitchManual,
  resetCircuitBreakerManual
} from '../controllers/exchangeController.js';
import { optionalAuth } from '../middlewares/authMiddleware.js';
import { sanitizeInputs } from '../middlewares/sanitizer.js';

const router = Router();
router.use(optionalAuth);
router.use(sanitizeInputs);

// API Key Vault management
router.post('/keys', saveExchangeApiKey);
router.get('/keys', listExchangeApiKeys);
router.post(['/keys/:keyId/test', '/keys/test'], testVaultKeyConnection);

// Live Execution
router.post('/order', executeLiveExchangeOrder);

// Institutional Circuit Breaker (Safety Kill-Switch)
router.get('/circuit-breaker', getCircuitBreakerInfo);
router.post('/circuit-breaker/kill', triggerKillSwitchManual);
router.post('/circuit-breaker/reset', resetCircuitBreakerManual);

export default router;
