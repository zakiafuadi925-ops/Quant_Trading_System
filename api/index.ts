// Vercel Serverless entry point
import express from 'express';
import paperRouter from '../src/routes/paper.js';
import alertsRouter from '../src/routes/alerts.js';

const app = express();
app.use(express.json({ limit: '10mb' }));

// Health Check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    environment: 'Vercel Serverless',
    database: process.env.MONGODB_URI ? 'Configured' : 'Missing MONGODB_URI',
    timestamp: new Date().toISOString(),
  });
});

// Mount feature routers
app.use('/api/paper', paperRouter);
app.use('/api/alerts', alertsRouter);

export default app;
