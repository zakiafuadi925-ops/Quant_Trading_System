import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { runInferenceV5 } from '../utils/featurePipeline.js';

const projectRoot = process.cwd();
const FASTAPI_URL = process.env.FASTAPI_INFERENCE_URL || 'http://localhost:8000';

const router = Router();

// GET /api/ml/status - Health & operational status of ML inference services
router.get('/status', async (_req: Request, res: Response) => {
  let microserviceOnline = false;
  let microserviceLatencyMs = 0;
  let microserviceDetails: any = null;

  try {
    const start = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1200);

    const resp = await fetch(`${FASTAPI_URL}/health`, { signal: controller.signal });
    clearTimeout(timeout);

    if (resp.ok) {
      microserviceOnline = true;
      microserviceLatencyMs = Date.now() - start;
      microserviceDetails = await resp.json();
    }
  } catch {
    microserviceOnline = false;
  }

  return res.json({
    success: true,
    activeEngine: microserviceOnline ? 'FASTAPI_MICROSERVICE' : 'TYPESCRIPT_LOCAL_EMBEDDED',
    microservice: {
      url: FASTAPI_URL,
      online: microserviceOnline,
      latencyMs: microserviceLatencyMs,
      details: microserviceDetails
    },
    localEmbeddedEngine: {
      status: 'healthy',
      version: 'LSTM_v5.2.1',
      featuresSupported: 17,
      inferenceTarget: 'Directional 24h hurdle return'
    }
  });
});

// GET /api/ml/models - Catalog of available quantitative ML models
router.get('/models', (_req: Request, res: Response) => {
  return res.json({
    success: true,
    models: [
      {
        id: 'btc_lstm_v5_2_1',
        name: 'Bidirectional LSTM Sequential Predictor v5.2.1',
        architecture: 'Bidirectional LSTM + Dense Dropout',
        lookbackBars: 60,
        features: 17,
        target: '24h Directional Return',
        status: 'PRODUCTION_DEFAULT',
        mae: 0.0165,
        winRate: 0.684
      },
      {
        id: 'btc_astronacci_v1',
        name: 'Astronacci Cycle & Fibonacci Directional Net',
        architecture: 'Multi-head Dense + Planetary/Cycle Features',
        lookbackBars: 90,
        features: 24,
        target: 'Pivot Reversal Confirmation',
        status: 'BENCHMARK',
        mae: 0.0192,
        winRate: 0.631
      }
    ]
  });
});

// ALL /api/ml/predict (GET / POST) - Hybrid execution bridge
router.all('/predict', async (req: Request, res: Response) => {
  const rawSymbol = String(req.query.symbol || req.body?.symbol || 'BTC').toUpperCase();
  const symbol = rawSymbol.replace('USDT', '').replace('/USDT', '').replace('-USD', '');
  const threshold = Number(req.query.threshold || req.body?.threshold) || 0.015;
  const lookback = Math.min(120, Math.max(20, Number(req.query.lookback || req.body?.lookback) || 60));

  // 1. Try FastAPI Microservice if configured and accessible
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);

    const fastApiResp = await fetch(`${FASTAPI_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'v5.2.1',
        symbol,
        threshold,
        lookback
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (fastApiResp.ok) {
      const fastApiResult = await fastApiResp.json();
      return res.json({
        ...fastApiResult,
        engine: 'FASTAPI_MICROSERVICE'
      });
    }
  } catch {
    // Microservice offline or unreachable: gracefully fall through to TypeScript local engine
  }

  // 2. TypeScript Local Embedded Inference Engine (Zero-latency fallback)
  const csvPath = path.resolve(projectRoot, `trading_data/${symbol}_trading_data.csv`);
  const rawCandles: any[] = [];
  if (fs.existsSync(csvPath)) {
    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = fileContent.trim().split('\n');
    const header = lines[0].split(',');
    const dateIdx = header.indexOf('Date');
    const openIdx = header.indexOf('Open');
    const highIdx = header.indexOf('High');
    const lowIdx = header.indexOf('Low');
    const closeIdx = header.indexOf('Close');
    const volIdx = header.indexOf('Volume');

    for (let i = Math.max(1, lines.length - 150); i < lines.length; i++) {
      const parts = lines[i].split(',');
      rawCandles.push({
        timestamp: parts[dateIdx],
        open: parseFloat(parts[openIdx]),
        high: parseFloat(parts[highIdx]),
        low: parseFloat(parts[lowIdx]),
        close: parseFloat(parts[closeIdx]),
        volume: parseFloat(parts[volIdx]),
      });
    }
  }

  if (rawCandles.length < 20) {
    return res.status(400).json({
      success: false,
      message: `Insufficient historical bars available for ${symbol} ML inference`,
    });
  }

  const inference = runInferenceV5(rawCandles, threshold, lookback);

  return res.json({
    success: true,
    symbol,
    engine: 'TYPESCRIPT_LOCAL_EMBEDDED',
    ...inference,
  });
});

export default router;
