import { Router, Request, Response } from 'express';
import { enqueueJob, getJob, listJobs, cancelJob } from '../services/jobQueueService.js';
import { sanitizeInputs } from '../middlewares/sanitizer.js';

const router = Router();
router.use(sanitizeInputs);

// POST /api/jobs/monte-carlo - Asynchronously enqueues a heavy Monte Carlo simulation
router.post('/monte-carlo', async (req: Request, res: Response) => {
  try {
    const params = req.body || {};
    const job = await enqueueJob('MONTE_CARLO', params);
    return res.status(202).json({
      success: true,
      message: 'Monte Carlo simulation job enqueued successfully.',
      jobId: job.jobId,
      status: job.status,
      pollingUrl: `/api/jobs/${job.jobId}/status`
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Failed to enqueue Monte Carlo job.' });
  }
});

// POST /api/jobs/walk-forward - Asynchronously enqueues a heavy Walk-Forward sweep
router.post('/walk-forward', async (req: Request, res: Response) => {
  try {
    const params = req.body || {};
    const job = await enqueueJob('WALK_FORWARD', params);
    return res.status(202).json({
      success: true,
      message: 'Walk-Forward optimization job enqueued successfully.',
      jobId: job.jobId,
      status: job.status,
      pollingUrl: `/api/jobs/${job.jobId}/status`
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Failed to enqueue Walk-Forward job.' });
  }
});

// POST /api/jobs/backtest - Asynchronously enqueues a multi-year backtest
router.post('/backtest', async (req: Request, res: Response) => {
  try {
    const params = req.body || {};
    const job = await enqueueJob('BACKTEST', params);
    return res.status(202).json({
      success: true,
      message: 'Backtest simulation job enqueued successfully.',
      jobId: job.jobId,
      status: job.status,
      pollingUrl: `/api/jobs/${job.jobId}/status`
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Failed to enqueue Backtest job.' });
  }
});

// GET /api/jobs - List recent jobs
router.get('/', async (req: Request, res: Response) => {
  try {
    const limit = Number(req.query.limit) || 20;
    const jobs = await listJobs(limit);
    return res.json({ success: true, count: jobs.length, jobs });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Failed to list jobs.' });
  }
});

// GET /api/jobs/:id/status and /api/jobs/:id - Fast polling endpoint
router.get(['/:id/status', '/:id'], async (req: Request, res: Response) => {
  try {
    const rawId = req.params.id;
    const jobId = Array.isArray(rawId) ? rawId[0] : rawId;
    const job = await getJob(jobId);

    if (!job) {
      return res.status(404).json({ success: false, message: `Job ${jobId} not found.` });
    }

    return res.json({
      success: true,
      jobId: job.jobId,
      type: job.type,
      status: job.status,
      progress: job.progress,
      result: job.result,
      error: job.error,
      durationMs: job.durationMs,
      completedAt: job.completedAt
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Failed to get job status.' });
  }
});

// POST /api/jobs/:id/cancel - Cancels a job
router.post('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const rawId = req.params.id;
    const jobId = Array.isArray(rawId) ? rawId[0] : rawId;
    const cancelled = await cancelJob(jobId);
    return res.json({ success: cancelled, message: cancelled ? 'Job cancelled' : 'Could not cancel job' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Failed to cancel job.' });
  }
});

export default router;
