// Vercel Serverless entry point
import express, { Request, Response, NextFunction } from 'express';
import authRouter from '../src/routes/auth.js';
import paperRouter from '../src/routes/paper.js';
import alertsRouter from '../src/routes/alerts.js';
import cryptoRouter from '../src/routes/crypto.js';
import mlRouter from '../src/routes/ml.js';
import jobsRouter from '../src/routes/jobs.js';
import { publicApiRateLimiter } from '../src/middlewares/rateLimiter.js';
import { sanitizeInputs } from '../src/middlewares/sanitizer.js';

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(sanitizeInputs);

// Global Health Check (support both /api/health and /health)
app.get(['/health', '/api/health'], (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    environment: 'Vercel Serverless',
    database: process.env.MONGODB_URI ? 'Configured' : 'Missing MONGODB_URI',
    timestamp: new Date().toISOString(),
  });
});

// Mount all feature routers with full parity between dev and production
// Supporting both with and without /api prefix for robust Vercel rewrite handling
app.use(['/auth', '/api/auth'], authRouter);
app.use(['/crypto', '/api/crypto'], publicApiRateLimiter, cryptoRouter);
app.use(['/ml', '/api/ml'], publicApiRateLimiter, mlRouter);
app.use(['/paper', '/api/paper'], paperRouter);
app.use(['/alerts', '/api/alerts'], alertsRouter);
app.use(['/jobs', '/api/jobs'], jobsRouter);

// Global Error Handler to catch any controller exceptions
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Vercel Serverless Error]:', err);
  res.status(500).json({
    success: false,
    error: err?.message || 'Internal Serverless Function Error',
    environment: 'Vercel Serverless'
  });
});

export default function handler(req: Request, res: Response) {
  return app(req, res);
}
