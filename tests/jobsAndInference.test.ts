import { enqueueJob, getJob, listJobs, cancelJob } from '../src/services/jobQueueService';

describe('Phase 4: Asynchronous Job Queue & ML Microservice Engine', () => {
  it('enqueues and executes an asynchronous Monte Carlo simulation job without blocking', async () => {
    const job = await enqueueJob('MONTE_CARLO', {
      currentBtcPrice: 90000,
      horizonDays: 14,
      nPaths: 300,
      dailyDriftPct: 0.1,
      dailyVolPct: 2.8
    });

    expect(job).toBeDefined();
    expect(job.jobId).toMatch(/^job_monte_carlo_/);
    expect(['PENDING', 'RUNNING', 'COMPLETED']).toContain(job.status);

    // Wait briefly for asynchronous background execution to complete
    let attempts = 0;
    let completedJob = await getJob(job.jobId);
    while (completedJob && completedJob.status !== 'COMPLETED' && attempts < 20) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      completedJob = await getJob(job.jobId);
      attempts++;
    }

    expect(completedJob).not.toBeNull();
    expect(completedJob?.status).toBe('COMPLETED');
    expect(completedJob?.progress).toBe(100);
    expect(completedJob?.durationMs).toBeGreaterThanOrEqual(0);
    expect(completedJob?.result).toBeDefined();
    expect(completedJob?.result.terminalMean).toBeGreaterThan(0);
    expect(completedJob?.result.percentileCurve).toHaveLength(15); // day 0 to 14
    expect(completedJob?.result.var95Pct).toBeDefined();
  });

  it('enqueues and executes an asynchronous Walk-Forward sweep job', async () => {
    const job = await enqueueJob('WALK_FORWARD', {
      candidates: [{ id: 'cand_1', model: 'EMA_CROSS' }, { id: 'cand_2', model: 'RSI' }]
    });

    expect(job.jobId).toMatch(/^job_walk_forward_/);

    let attempts = 0;
    let completedJob = await getJob(job.jobId);
    while (completedJob && completedJob.status !== 'COMPLETED' && attempts < 20) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      completedJob = await getJob(job.jobId);
      attempts++;
    }

    expect(completedJob?.status).toBe('COMPLETED');
    expect(completedJob?.progress).toBe(100);
    expect(completedJob?.result.candidatesProcessed).toBe(2);
  });

  it('supports job cancellation for pending or active tasks', async () => {
    const job = await enqueueJob('BACKTEST', { model: 'EMA_CROSS' });
    const cancelled = await cancelJob(job.jobId);
    expect(cancelled).toBe(true);

    const checkJob = await getJob(job.jobId);
    expect(checkJob?.status).toBe('CANCELLED');
  });

  it('lists active and recently executed background jobs', async () => {
    const jobs = await listJobs(10);
    expect(Array.isArray(jobs)).toBe(true);
    expect(jobs.length).toBeGreaterThan(0);
  });
});
