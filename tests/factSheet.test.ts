import {
  calculateMonthlyReturns,
  calculateInstitutionalMetrics,
  generateFactSheetCSV,
  EquityPoint,
  FactSheetTrade,
  FactSheetData
} from '../src/utils/factSheet';

describe('Institutional Fact Sheet Engine', () => {
  const sampleEquityCurve: EquityPoint[] = [
    { date: '2025-01-01', equity: 1000 },
    { date: '2025-01-15', equity: 1050 },
    { date: '2025-01-31', equity: 1100 }, // +10% in Jan
    { date: '2025-02-15', equity: 1080 },
    { date: '2025-02-28', equity: 1150 }, // +4.5% in Feb
    { date: '2025-03-15', equity: 1120 },
    { date: '2025-03-31', equity: 1210 }  // +5.2% in Mar
  ];

  const sampleTrades: FactSheetTrade[] = [
    { id: 't1', date: '2025-01-10', type: 'SELL', price: 50000, units: 0.02, pnl: 50, pnlPct: 5.0, balanceAfter: 1050 },
    { id: 't2', date: '2025-01-25', type: 'SELL', price: 52000, units: 0.02, pnl: 50, pnlPct: 4.8, balanceAfter: 1100 },
    { id: 't3', date: '2025-02-10', type: 'SELL', price: 51000, units: 0.02, pnl: -20, pnlPct: -1.9, balanceAfter: 1080 },
    { id: 't4', date: '2025-02-25', type: 'SELL', price: 54000, units: 0.02, pnl: 70, pnlPct: 6.5, balanceAfter: 1150 }
  ];

  it('aggregates daily equity curves into structured monthly returns with compounded YTD', () => {
    const monthlyRows = calculateMonthlyReturns(sampleEquityCurve);
    expect(monthlyRows).toHaveLength(1);
    expect(monthlyRows[0].year).toBe(2025);
    expect(monthlyRows[0].months[0]).toBeCloseTo(10.0, 0); // Jan
    expect(monthlyRows[0].ytd).toBeGreaterThan(0);
  });

  it('calculates hedge-fund tier ratios (Sharpe, Sortino, Calmar, VaR 95/99)', () => {
    const metrics = calculateInstitutionalMetrics(sampleEquityCurve, sampleTrades, 1000);

    expect(metrics.initialEquity).toBe(1000);
    expect(metrics.finalEquity).toBe(1210);
    expect(metrics.totalReturnPct).toBe(21.0);
    expect(metrics.sharpeRatio).toBeGreaterThan(0);
    expect(metrics.sortinoRatio).toBeGreaterThan(0);
    expect(metrics.calmarRatio).toBeGreaterThan(0);
    expect(metrics.winRatePct).toBe(75.0); // 3 wins out of 4
    expect(metrics.profitFactor).toBeGreaterThan(1);
    expect(metrics.var95Pct).toBeDefined();
    expect(metrics.cvar95Pct).toBeDefined();
    expect(metrics.payoffRatio).toBeGreaterThan(0);
  });

  it('generates fully formatted CSV audit reports compliant with institutional audits', () => {
    const metrics = calculateInstitutionalMetrics(sampleEquityCurve, sampleTrades, 1000);
    const monthlyReturns = calculateMonthlyReturns(sampleEquityCurve);

    const data: FactSheetData = {
      symbol: 'BTC',
      strategyName: 'LSTM Deep Learning',
      timeframe: '1d',
      startDate: '2025-01-01',
      endDate: '2025-03-31',
      totalBars: 90,
      metrics,
      monthlyReturns,
      trades: sampleTrades
    };

    const csv = generateFactSheetCSV(data);
    expect(csv).toContain('QUANT TRADING SYSTEM - INSTITUTIONAL FACT SHEET AUDIT REPORT');
    expect(csv).toContain('Sharpe Ratio');
    expect(csv).toContain('MONTHLY RETURN HEATMAP MATRIX');
    expect(csv).toContain('2025');
    expect(csv).toContain('COMPLETE TRANSACTION AUDIT LEDGER');
    expect(csv).toContain('t1,2025-01-10');
  });
});
