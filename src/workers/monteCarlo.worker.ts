import { runMonteCarloSimulation, MonteCarloParams } from './monteCarloCore';

/**
 * Native Dedicated Web Worker for Monte Carlo Geometric Brownian Motion Simulations
 * Keeps the browser's Main UI Thread unblocked during 1,000–10,000 path projections.
 */
addEventListener('message', (e: MessageEvent<{ id: number; params: MonteCarloParams }>) => {
  const { id, params } = e.data;
  const result = runMonteCarloSimulation(params);
  postMessage({ id, result });
});
