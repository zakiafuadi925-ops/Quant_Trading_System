import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { runInferenceV5 } from '../utils/featurePipeline.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../');

const router = Router();

// ALL /api/ml/predict (GET / POST)
router.all('/predict', (req, res) => {
  const rawSymbol = String(req.query.symbol || req.body?.symbol || 'BTC').toUpperCase();
  const symbol = rawSymbol.replace('USDT', '').replace('/USDT', '').replace('-USD', '');
  const threshold = Number(req.query.threshold || req.body?.threshold) || 0.015;
  const lookback = Math.min(120, Math.max(20, Number(req.query.lookback || req.body?.lookback) || 60));

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
    ...inference,
  });
});

export default router;
