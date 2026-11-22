import { Request, Response } from 'express';
import crypto from 'crypto';
import { ApiKeyVaultModel, SupportedExchange } from '../db/models/ApiKeyVault.js';
import { connectToDatabase } from '../db/mongodb.js';
import { encryptSecret, decryptSecret, maskApiKey } from '../utils/vault.js';
import { UnifiedExchangeAdapter, ExchangeOrderParams, ExchangeCredentials } from '../services/exchangeAdaptor.js';
import {
  getCircuitBreakerStatus,
  triggerEmergencyKillSwitch,
  resetCircuitBreaker
} from '../services/circuitBreakerService.js';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';

function getUserId(req: AuthenticatedRequest): string {
  return req.user?.userId || (req.query.userId as string) || req.body?.userId || 'default_user';
}

/**
 * Stores encrypted exchange API keys in the Vault.
 */
export async function saveExchangeApiKey(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = getUserId(req);
    const { exchange, label, apiKey, apiSecret, passphrase, isTestnet } = req.body;

    if (!exchange || !apiKey || !apiSecret) {
      return res.status(400).json({
        success: false,
        message: 'Exchange, apiKey, and apiSecret are required fields.'
      });
    }

    const keyId = `key_${exchange}_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const encryptedApiKey = encryptSecret(apiKey);
    const encryptedApiSecret = encryptSecret(apiSecret);
    const encryptedPassphrase = passphrase ? encryptSecret(passphrase) : undefined;
    const maskedKey = maskApiKey(apiKey);

    await connectToDatabase();

    const vaultEntry = await ApiKeyVaultModel.create({
      keyId,
      userId,
      exchange: exchange.toLowerCase() as SupportedExchange,
      label: label || `${exchange.toUpperCase()} Key`,
      encryptedApiKey,
      encryptedApiSecret,
      encryptedPassphrase,
      maskedKey,
      isTestnet: isTestnet !== undefined ? Boolean(isTestnet) : true,
      isActive: true,
      lastTestedAt: new Date()
    });

    return res.status(201).json({
      success: true,
      message: 'API Key securely encrypted and stored in Vault.',
      key: {
        keyId: vaultEntry.keyId,
        exchange: vaultEntry.exchange,
        label: vaultEntry.label,
        maskedKey: vaultEntry.maskedKey,
        isTestnet: vaultEntry.isTestnet,
        isActive: vaultEntry.isActive
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message || 'Failed to save API key' });
  }
}

/**
 * Lists stored API keys with masked representation.
 */
export async function listExchangeApiKeys(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = getUserId(req);
    await connectToDatabase();

    const keys = await ApiKeyVaultModel.find({ userId }).sort({ createdAt: -1 });
    const sanitized = keys.map((k) => ({
      keyId: k.keyId,
      exchange: k.exchange,
      label: k.label,
      maskedKey: k.maskedKey,
      isTestnet: k.isTestnet,
      isActive: k.isActive,
      lastTestedAt: k.lastTestedAt
    }));

    return res.json({ success: true, count: sanitized.length, keys: sanitized });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message || 'Failed to list API keys' });
  }
}

/**
 * Tests connection to exchange using a stored encrypted key.
 */
export async function testVaultKeyConnection(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = getUserId(req);
    const keyId = req.params.keyId || req.body.keyId;

    await connectToDatabase();
    const keyRecord = await ApiKeyVaultModel.findOne({ keyId, userId });

    if (!keyRecord) {
      return res.status(404).json({ success: false, message: 'Key not found in Vault.' });
    }

    const decryptedKey = decryptSecret(keyRecord.encryptedApiKey);
    const decryptedSecret = decryptSecret(keyRecord.encryptedApiSecret);
    const decryptedPassphrase = keyRecord.encryptedPassphrase
      ? decryptSecret(keyRecord.encryptedPassphrase)
      : undefined;

    const adapter = new UnifiedExchangeAdapter(keyRecord.exchange, {
      apiKey: decryptedKey,
      apiSecret: decryptedSecret,
      passphrase: decryptedPassphrase,
      isTestnet: keyRecord.isTestnet
    });

    const testResult = await adapter.testConnection();
    keyRecord.lastTestedAt = new Date();
    await keyRecord.save();

    return res.json({
      success: testResult.success,
      keyId: keyRecord.keyId,
      exchange: keyRecord.exchange,
      isTestnet: keyRecord.isTestnet,
      ...testResult
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message || 'Connection test error' });
  }
}

/**
 * Executes live signed order through the unified exchange adapter.
 */
export async function executeLiveExchangeOrder(req: AuthenticatedRequest, res: Response) {
  try {
    const accountId = getUserId(req);

    // 1. Verify Circuit Breaker safety status
    const cbStatus = getCircuitBreakerStatus(accountId);
    if (!cbStatus.tradingAllowed) {
      return res.status(403).json({
        success: false,
        error: 'CIRCUIT_BREAKER_HALTED',
        message: `Trading is halted due to safety kill-switch: ${cbStatus.triggerReason}`,
        circuitBreaker: cbStatus
      });
    }

    const { keyId, orderParams } = req.body;
    if (!orderParams || !orderParams.symbol || !orderParams.quantity || !orderParams.side) {
      return res.status(400).json({ success: false, message: 'Missing order parameters.' });
    }

    await connectToDatabase();
    let credentials: ExchangeCredentials = { apiKey: 'mock_key', apiSecret: 'mock_secret', isTestnet: true };
    let exchange: SupportedExchange = 'binance';

    if (keyId) {
      const keyRecord = await ApiKeyVaultModel.findOne({ keyId });
      if (keyRecord) {
        exchange = keyRecord.exchange;
        credentials = {
          apiKey: decryptSecret(keyRecord.encryptedApiKey),
          apiSecret: decryptSecret(keyRecord.encryptedApiSecret),
          passphrase: keyRecord.encryptedPassphrase ? decryptSecret(keyRecord.encryptedPassphrase) : undefined,
          isTestnet: keyRecord.isTestnet
        };
      }
    }

    const adapter = new UnifiedExchangeAdapter(exchange, credentials);
    const orderResult = await adapter.createOrder(orderParams as ExchangeOrderParams);

    return res.json({
      success: true,
      message: 'Live exchange order executed successfully.',
      order: orderResult
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message || 'Order execution error' });
  }
}

/**
 * Gets circuit breaker risk parameters and state.
 */
export function getCircuitBreakerInfo(req: AuthenticatedRequest, res: Response) {
  const accountId = getUserId(req);
  const status = getCircuitBreakerStatus(accountId);
  return res.json({ success: true, accountId, status });
}

/**
 * Triggers emergency institutional panic kill-switch.
 */
export async function triggerKillSwitchManual(req: AuthenticatedRequest, res: Response) {
  const accountId = getUserId(req);
  const reason = req.body.reason || 'MANUAL_EMERGENCY_OVERRIDE';
  const result = await triggerEmergencyKillSwitch(accountId, reason);
  return res.json({
    success: true,
    message: 'EMERGENCY KILL-SWITCH TRIGGERED: All orders cancelled, all positions closed.',
    result
  });
}

/**
 * Resets circuit breaker to normal operational state.
 */
export function resetCircuitBreakerManual(req: AuthenticatedRequest, res: Response) {
  const accountId = getUserId(req);
  const status = resetCircuitBreaker(accountId);
  return res.json({
    success: true,
    message: 'Circuit breaker has been reset to NORMAL. Trading re-enabled.',
    status
  });
}
