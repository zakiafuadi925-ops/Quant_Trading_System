import {
  submitMonteCarloJob,
  submitWalkForwardJob,
  submitBacktestJob,
  fetchJobStatus,
  cancelJobApi,
  listJobsApi,
  JobItem
} from '../src/services/jobApi';

describe('Frontend Phase 4: Async Computing Drawer & Job Queue Client', () => {
  beforeEach(() => {
    (global as any).fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('submits Monte Carlo job with custom simulation parameters', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        message: 'Monte Carlo simulation job enqueued successfully.',
        jobId: 'job_monte_carlo_10k',
        status: 'PENDING'
      })
    });

    const res = await submitMonteCarloJob({
      numSimulations: 10000,
      days: 30,
      currentPrice: 85200,
      drift: 0.0005,
      volatility: 0.02
    });

    expect(res.success).toBe(true);
    expect(res.jobId).toBe('job_monte_carlo_10k');
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/jobs/monte-carlo',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numSimulations: 10000,
          days: 30,
          currentPrice: 85200,
          drift: 0.0005,
          volatility: 0.02
        })
      })
    );
  });

  it('submits Walk-Forward Optimization job asynchronously', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        message: 'Walk-Forward optimization job enqueued successfully.',
        jobId: 'job_wfa_sweep_99',
        status: 'PENDING'
      })
    });

    const res = await submitWalkForwardJob({
      trainRatio: 0.7,
      stepRatio: 0.1,
      iterations: 5
    });

    expect(res.success).toBe(true);
    expect(res.jobId).toBe('job_wfa_sweep_99');
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/jobs/walk-forward',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('fetches real-time status and progress for an active job', async () => {
    const mockJob: JobItem = {
      jobId: 'job_mc_123',
      type: 'MONTE_CARLO',
      status: 'RUNNING',
      progress: 65,
      durationMs: 450
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockJob
    });

    const job = await fetchJobStatus('job_mc_123');

    expect(job).not.toBeNull();
    expect(job?.status).toBe('RUNNING');
    expect(job?.progress).toBe(65);
    expect(global.fetch).toHaveBeenCalledWith('/api/jobs/job_mc_123/status');
  });

  it('dispatches cancellation request to running task', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, message: 'Job cancelled' })
    });

    const cancelled = await cancelJobApi('job_mc_123');

    expect(cancelled).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith('/api/jobs/job_mc_123/cancel', {
      method: 'POST'
    });
  });

  it('lists recent background jobs with limit', async () => {
    const mockJobs: JobItem[] = [
      {
        jobId: 'job_1',
        type: 'MONTE_CARLO',
        status: 'COMPLETED',
        progress: 100,
        durationMs: 320
      },
      {
        jobId: 'job_2',
        type: 'WALK_FORWARD',
        status: 'RUNNING',
        progress: 40
      }
    ];

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, count: 2, jobs: mockJobs })
    });

    const jobs = await listJobsApi(10);

    expect(jobs).toHaveLength(2);
    expect(jobs[0].status).toBe('COMPLETED');
    expect(jobs[1].status).toBe('RUNNING');
    expect(global.fetch).toHaveBeenCalledWith('/api/jobs?limit=10');
  });
});
