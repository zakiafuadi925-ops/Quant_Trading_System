/**
 * Institutional Analytics & Fact Sheet Generator Engine (v6.2.0)
 * 
 * Features:
 * - Monthly Return Heatmap matrix calculator (Year x Months + YTD).
 * - Comprehensive hedge-fund tier ratios: Sharpe, Sortino, Calmar, VaR 95/99%, CVaR, Recovery Factor.
 * - One-click Institutional CSV Audit Export.
 * - One-click High-Resolution Printable HTML Tear-Sheet (PDF Print Ready).
 */

export interface EquityPoint {
  date: string;
  equity: number;
}

export interface FactSheetTrade {
  id: string;
  date: string;
  type: string;
  price: number;
  units: number;
  pnl: number;
  pnlPct: number;
  balanceAfter: number;
}

export interface MonthlyReturnRow {
  year: number;
  months: (number | null)[]; // 12 entries (Jan-Dec), null if no data
  ytd: number;
}

export interface InstitutionalMetrics {
  initialEquity: number;
  finalEquity: number;
  totalReturnPct: number;
  cagrPct: number;
  annualizedVolPct: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  maxDrawdownPct: number;
  maxDrawdownDurationDays: number;
  var95Pct: number;
  var99Pct: number;
  cvar95Pct: number;
  cvar99Pct: number;
  winRatePct: number;
  profitFactor: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  payoffRatio: number;
  recoveryFactor: number;
}

export interface FactSheetData {
  symbol: string;
  strategyName: string;
  timeframe: string;
  startDate: string;
  endDate: string;
  totalBars: number;
  metrics: InstitutionalMetrics;
  monthlyReturns: MonthlyReturnRow[];
  trades: FactSheetTrade[];
}

/**
 * Calculates Monthly Return Matrix from daily equity curve.
 */
export function calculateMonthlyReturns(curve: EquityPoint[]): MonthlyReturnRow[] {
  if (curve.length < 2) return [];

  // Group by year and month
  const monthMap: Record<number, Record<number, { start: number; end: number }>> = {};

  for (const pt of curve) {
    const d = new Date(pt.date);
    if (isNaN(d.getTime())) continue;
    const year = d.getUTCFullYear();
    const month = d.getUTCMonth(); // 0 to 11

    if (!monthMap[year]) monthMap[year] = {};
    if (!monthMap[year][month]) {
      monthMap[year][month] = { start: pt.equity, end: pt.equity };
    } else {
      monthMap[year][month].end = pt.equity;
    }
  }

  const rows: MonthlyReturnRow[] = [];
  const years = Object.keys(monthMap).map(Number).sort((a, b) => a - b);

  for (const year of years) {
    const months: (number | null)[] = [];
    let compoundedYtd = 1.0;
    let hasYearData = false;

    for (let m = 0; m < 12; m++) {
      const data = monthMap[year]?.[m];
      if (data && data.start > 0) {
        const ret = ((data.end - data.start) / data.start) * 100;
        months.push(Number(ret.toFixed(2)));
        compoundedYtd *= 1 + ret / 100;
        hasYearData = true;
      } else {
        months.push(null);
      }
    }

    if (hasYearData) {
      const ytd = (compoundedYtd - 1) * 100;
      rows.push({
        year,
        months,
        ytd: Number(ytd.toFixed(2))
      });
    }
  }

  return rows;
}

/**
 * Calculates Institutional Ratios (Sharpe, Sortino, Calmar, VaR 95/99, CVaR).
 */
export function calculateInstitutionalMetrics(
  curve: EquityPoint[],
  trades: FactSheetTrade[],
  initialCapital = 1000
): InstitutionalMetrics {
  const initialEquity = initialCapital;
  const finalEquity = curve.length > 0 ? curve[curve.length - 1].equity : initialCapital;
  const totalReturnPct = ((finalEquity - initialEquity) / (initialEquity || 1)) * 100;

  // Calculate daily returns
  const dailyReturns: number[] = [];
  for (let i = 1; i < curve.length; i++) {
    const prev = curve[i - 1].equity;
    const curr = curve[i].equity;
    if (prev > 0) {
      dailyReturns.push((curr - prev) / prev);
    }
  }

  const daysCount = Math.max(1, curve.length);
  const years = daysCount / 365.25;
  const cagrPct = years > 0 && finalEquity > 0
    ? (Math.pow(finalEquity / initialEquity, 1 / Math.max(0.1, years)) - 1) * 100
    : 0;

  // Volatility
  const avgReturn = dailyReturns.length > 0
    ? dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length
    : 0;
  
  const variance = dailyReturns.length > 0
    ? dailyReturns.reduce((acc, r) => acc + Math.pow(r - avgReturn, 2), 0) / dailyReturns.length
    : 0;
  const dailyVol = Math.sqrt(variance);
  const annualizedVolPct = dailyVol * Math.sqrt(365) * 100;

  // Sharpe Ratio (Annualized, 0% risk free)
  const sharpeRatio = dailyVol > 0 ? (avgReturn / dailyVol) * Math.sqrt(365) : 0;

  // Sortino Ratio (Downside deviation only)
  const downsideReturns = dailyReturns.filter((r) => r < 0);
  const downsideVariance = downsideReturns.length > 0
    ? downsideReturns.reduce((acc, r) => acc + Math.pow(r, 2), 0) / downsideReturns.length
    : 0;
  const downsideDeviation = Math.sqrt(downsideVariance);
  const sortinoRatio = downsideDeviation > 0 ? (avgReturn / downsideDeviation) * Math.sqrt(365) : 0;

  // Max Drawdown & Duration
  let peak = initialEquity;
  let maxDrawdownPct = 0;
  let currentDdDuration = 0;
  let maxDrawdownDurationDays = 0;

  for (const pt of curve) {
    if (pt.equity > peak) {
      peak = pt.equity;
      currentDdDuration = 0;
    } else {
      currentDdDuration++;
      if (currentDdDuration > maxDrawdownDurationDays) {
        maxDrawdownDurationDays = currentDdDuration;
      }
    }
    const dd = peak > 0 ? ((peak - pt.equity) / peak) * 100 : 0;
    if (dd > maxDrawdownPct) {
      maxDrawdownPct = dd;
    }
  }

  // Calmar Ratio: CAGR / Max DD
  const calmarRatio = maxDrawdownPct > 0 ? Math.max(0, cagrPct / maxDrawdownPct) : 0;

  // Historical VaR & CVaR (95% and 99%)
  const sortedReturns = [...dailyReturns].sort((a, b) => a - b);
  const var95Idx = Math.floor(sortedReturns.length * 0.05);
  const var99Idx = Math.floor(sortedReturns.length * 0.01);

  const var95Pct = sortedReturns.length > 0 ? Math.max(0, -sortedReturns[var95Idx] * 100) : 0;
  const var99Pct = sortedReturns.length > 0 ? Math.max(0, -sortedReturns[var99Idx] * 100) : 0;

  // CVaR (Expected Shortfall)
  const cvar95Slice = sortedReturns.slice(0, Math.max(1, var95Idx));
  const cvar99Slice = sortedReturns.slice(0, Math.max(1, var99Idx));
  
  const cvar95Avg = cvar95Slice.length > 0 ? cvar95Slice.reduce((a, b) => a + b, 0) / cvar95Slice.length : 0;
  const cvar99Avg = cvar99Slice.length > 0 ? cvar99Slice.reduce((a, b) => a + b, 0) / cvar99Slice.length : 0;

  const cvar95Pct = Math.max(0, -cvar95Avg * 100);
  const cvar99Pct = Math.max(0, -cvar99Avg * 100);

  // Trade Statistics
  const closedTrades = trades.filter((t) => t.type === 'SELL');
  const totalTrades = closedTrades.length;
  const winningTrades = closedTrades.filter((t) => t.pnl > 0).length;
  const losingTrades = closedTrades.filter((t) => t.pnl <= 0).length;
  const winRatePct = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

  const totalWins = closedTrades.filter((t) => t.pnl > 0).reduce((acc, t) => acc + t.pnl, 0);
  const totalLosses = Math.abs(closedTrades.filter((t) => t.pnl < 0).reduce((acc, t) => acc + t.pnl, 0));
  const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? 999 : 0;

  const avgWin = winningTrades > 0 ? totalWins / winningTrades : 0;
  const avgLoss = losingTrades > 0 ? totalLosses / losingTrades : 0;
  const payoffRatio = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? 999 : 0;

  // Recovery Factor = Net Profit ($) / Max Drawdown ($)
  const netProfitDollars = finalEquity - initialEquity;
  const maxDdDollars = peak * (maxDrawdownPct / 100);
  const recoveryFactor = maxDdDollars > 0 ? Math.max(0, netProfitDollars / maxDdDollars) : 0;

  return {
    initialEquity,
    finalEquity: Number(finalEquity.toFixed(2)),
    totalReturnPct: Number(totalReturnPct.toFixed(2)),
    cagrPct: Number(cagrPct.toFixed(2)),
    annualizedVolPct: Number(annualizedVolPct.toFixed(2)),
    sharpeRatio: Number(sharpeRatio.toFixed(2)),
    sortinoRatio: Number(sortinoRatio.toFixed(2)),
    calmarRatio: Number(calmarRatio.toFixed(2)),
    maxDrawdownPct: Number(maxDrawdownPct.toFixed(2)),
    maxDrawdownDurationDays,
    var95Pct: Number(var95Pct.toFixed(2)),
    var99Pct: Number(var99Pct.toFixed(2)),
    cvar95Pct: Number(cvar95Pct.toFixed(2)),
    cvar99Pct: Number(cvar99Pct.toFixed(2)),
    winRatePct: Number(winRatePct.toFixed(2)),
    profitFactor: Number(profitFactor.toFixed(2)),
    totalTrades,
    winningTrades,
    losingTrades,
    payoffRatio: Number(payoffRatio.toFixed(2)),
    recoveryFactor: Number(recoveryFactor.toFixed(2))
  };
}

/**
 * Generate comprehensive Institutional Fact Sheet CSV file content.
 */
export function generateFactSheetCSV(data: FactSheetData): string {
  const lines: string[] = [];

  // Header & Metadata
  lines.push(`QUANT TRADING SYSTEM - INSTITUTIONAL FACT SHEET AUDIT REPORT`);
  lines.push(`Generated,${new Date().toISOString()}`);
  lines.push(`Asset Universe,${data.symbol}/USDT`);
  lines.push(`Strategy Model,${data.strategyName}`);
  lines.push(`Timeframe,${data.timeframe.toUpperCase()}`);
  lines.push(`Evaluation Range,${data.startDate} to ${data.endDate} (${data.totalBars} bars)`);
  lines.push(``);

  // Key Ratios
  lines.push(`--- EXECUTIVE QUANTITATIVE METRICS ---`);
  lines.push(`Initial Capital,$${data.metrics.initialEquity}`);
  lines.push(`Final Equity,$${data.metrics.finalEquity}`);
  lines.push(`Total Net Return,${data.metrics.totalReturnPct}%`);
  lines.push(`CAGR (Compound Annual Growth),${data.metrics.cagrPct}%`);
  lines.push(`Annualized Volatility,${data.metrics.annualizedVolPct}%`);
  lines.push(`Sharpe Ratio,${data.metrics.sharpeRatio}`);
  lines.push(`Sortino Ratio,${data.metrics.sortinoRatio}`);
  lines.push(`Calmar Ratio,${data.metrics.calmarRatio}`);
  lines.push(`Maximum Drawdown,${data.metrics.maxDrawdownPct}%`);
  lines.push(`Max Drawdown Duration,${data.metrics.maxDrawdownDurationDays} days`);
  lines.push(`Value at Risk (VaR 95%),${data.metrics.var95Pct}%`);
  lines.push(`Value at Risk (VaR 99%),${data.metrics.var99Pct}%`);
  lines.push(`Conditional VaR (CVaR 95%),${data.metrics.cvar95Pct}%`);
  lines.push(`Conditional VaR (CVaR 99%),${data.metrics.cvar99Pct}%`);
  lines.push(`Win Rate,${data.metrics.winRatePct}%`);
  lines.push(`Profit Factor,${data.metrics.profitFactor}`);
  lines.push(`Payoff Ratio,${data.metrics.payoffRatio}`);
  lines.push(`Recovery Factor,${data.metrics.recoveryFactor}`);
  lines.push(``);

  // Monthly Return Heatmap Table
  lines.push(`--- MONTHLY RETURN HEATMAP MATRIX (%) ---`);
  lines.push(`Year,Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec,YTD`);
  for (const r of data.monthlyReturns) {
    const mVals = r.months.map((m) => (m !== null ? `${m}%` : '-'));
    lines.push(`${r.year},${mVals.join(',')},${r.ytd}%`);
  }
  lines.push(``);

  // Full Transaction Audit Ledger
  lines.push(`--- COMPLETE TRANSACTION AUDIT LEDGER ---`);
  lines.push(`Trade ID,Timestamp,Side,Execution Price,Units,Realized PnL,PnL %,Balance After`);
  for (const t of data.trades) {
    lines.push(
      `${t.id},${t.date},${t.type},${t.price.toFixed(2)},${t.units.toFixed(6)},${t.pnl.toFixed(2)},${t.pnlPct.toFixed(2)}%,${t.balanceAfter.toFixed(2)}`
    );
  }

  return lines.join('\n');
}

/**
 * Triggers in-browser file download for CSV.
 */
export function downloadCSV(filename: string, content: string): void {
  if (typeof window === 'undefined') return;
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Opens a dedicated printable Fact Sheet report window for printing / saving as PDF.
 */
export function openPrintableFactSheet(data: FactSheetData): void {
  if (typeof window === 'undefined') return;

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const monthlyRowsHtml = data.monthlyReturns.map((row) => {
    const monthTds = row.months.map((m) => {
      if (m === null) return `<td class="empty">-</td>`;
      const colorCls = m > 0 ? 'pos' : m < 0 ? 'neg' : 'zero';
      return `<td class="${colorCls}">${m > 0 ? '+' : ''}${m.toFixed(1)}%</td>`;
    }).join('');

    const ytdCls = row.ytd >= 0 ? 'pos-bold' : 'neg-bold';
    return `<tr>
      <td class="year">${row.year}</td>
      ${monthTds}
      <td class="${ytdCls}">${row.ytd >= 0 ? '+' : ''}${row.ytd.toFixed(1)}%</td>
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${data.symbol} Institutional Fact Sheet - Quant Trading System</title>
  <style>
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #0f172a;
      color: #f8fafc;
      margin: 0;
      padding: 32px;
      font-size: 12px;
    }
    .container { max-width: 960px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #334155; padding-bottom: 16px; margin-bottom: 24px; }
    .title h1 { margin: 0; font-size: 24px; font-weight: 800; color: #f8fafc; letter-spacing: -0.5px; }
    .title p { margin: 4px 0 0; color: #94a3b8; font-size: 13px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3); font-weight: 700; font-size: 11px; text-transform: uppercase; }
    .meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; background: #1e293b; padding: 16px; border-radius: 12px; border: 1px solid #334155; margin-bottom: 24px; }
    .meta-item .label { color: #94a3b8; font-size: 11px; text-transform: uppercase; font-weight: 600; }
    .meta-item .val { font-size: 16px; font-weight: 700; color: #f8fafc; font-family: monospace; margin-top: 4px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
    .kpi-card { background: #1e293b; padding: 14px; border-radius: 10px; border: 1px solid #334155; }
    .kpi-card .kpi-label { font-size: 11px; color: #94a3b8; text-transform: uppercase; font-weight: 600; }
    .kpi-card .kpi-val { font-size: 20px; font-weight: 800; font-family: monospace; margin-top: 4px; color: #38bdf8; }
    .kpi-card .kpi-sub { font-size: 10px; color: #64748b; margin-top: 2px; }
    .section-title { font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #e2e8f0; margin: 24px 0 12px; border-left: 3px solid #f59e0b; padding-left: 8px; }
    table { width: 100%; border-collapse: collapse; font-family: monospace; font-size: 11px; margin-bottom: 24px; }
    th { background: #1e293b; color: #94a3b8; padding: 8px 6px; text-align: right; border-bottom: 1px solid #334155; font-weight: 600; }
    th.year-th { text-align: left; }
    td { padding: 8px 6px; text-align: right; border-bottom: 1px solid #1e293b; }
    td.year { text-align: left; font-weight: 700; color: #f8fafc; }
    td.pos { color: #34d399; background: rgba(52, 211, 153, 0.08); }
    td.neg { color: #f87171; background: rgba(248, 113, 113, 0.08); }
    td.pos-bold { color: #34d399; font-weight: 700; background: rgba(52, 211, 153, 0.16); }
    td.neg-bold { color: #f87171; font-weight: 700; background: rgba(248, 113, 113, 0.16); }
    td.empty { color: #475569; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #334155; color: #64748b; font-size: 10px; display: flex; justify-content: space-between; }
    .btn-bar { margin-bottom: 20px; display: flex; gap: 8px; }
    button { background: #f59e0b; color: #0f172a; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 700; cursor: pointer; font-size: 12px; }
    button:hover { background: #d97706; }
  </style>
</head>
<body>
  <div class="container">
    <div class="btn-bar no-print">
      <button onclick="window.print()">🖨️ Print / Save as PDF Fact Sheet</button>
      <button onclick="window.close()" style="background:#334155;color:#f8fafc;">Close Preview</button>
    </div>

    <div class="header">
      <div class="title">
        <h1>Institutional Fact Sheet &amp; Audit Report</h1>
        <p>Quantitative Trading System v6.2.0 • Hedge-Fund Performance Benchmark</p>
      </div>
      <div>
        <span class="badge">${data.symbol}/USDT • ${data.strategyName.toUpperCase()}</span>
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-item">
        <div class="label">Total Net Return</div>
        <div class="val" style="color:${data.metrics.totalReturnPct >= 0 ? '#34d399' : '#f87171'}">
          ${data.metrics.totalReturnPct >= 0 ? '+' : ''}${data.metrics.totalReturnPct}%
        </div>
      </div>
      <div class="meta-item">
        <div class="label">CAGR</div>
        <div class="val" style="color:#38bdf8">${data.metrics.cagrPct}%</div>
      </div>
      <div class="meta-item">
        <div class="label">Sharpe Ratio</div>
        <div class="val" style="color:#f59e0b">${data.metrics.sharpeRatio}</div>
      </div>
      <div class="meta-item">
        <div class="label">Max Drawdown</div>
        <div class="val" style="color:#f87171">-${data.metrics.maxDrawdownPct}%</div>
      </div>
    </div>

    <div class="section-title">Institutional Risk &amp; Performance Ratios</div>
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Sortino Ratio</div>
        <div class="kpi-val">${data.metrics.sortinoRatio}</div>
        <div class="kpi-sub">Downside risk deviation only</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Calmar Ratio</div>
        <div class="kpi-val">${data.metrics.calmarRatio}</div>
        <div class="kpi-sub">CAGR / Maximum Drawdown</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Recovery Factor</div>
        <div class="kpi-val">${data.metrics.recoveryFactor}</div>
        <div class="kpi-sub">Net Profit / Max Drawdown ($)</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Value at Risk (VaR 95%)</div>
        <div class="kpi-val" style="color:#f87171">${data.metrics.var95Pct}%</div>
        <div class="kpi-sub">CVaR 95%: ${data.metrics.cvar95Pct}%</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Value at Risk (VaR 99%)</div>
        <div class="kpi-val" style="color:#f87171">${data.metrics.var99Pct}%</div>
        <div class="kpi-sub">CVaR 99%: ${data.metrics.cvar99Pct}%</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Annualized Volatility</div>
        <div class="kpi-val">${data.metrics.annualizedVolPct}%</div>
        <div class="kpi-sub">Daily std dev * sqrt(365)</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Profit Factor</div>
        <div class="kpi-val">${data.metrics.profitFactor}</div>
        <div class="kpi-sub">Gross Profit / Gross Loss</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Win Rate</div>
        <div class="kpi-val">${data.metrics.winRatePct}%</div>
        <div class="kpi-sub">${data.metrics.winningTrades}W / ${data.metrics.losingTrades}L (${data.metrics.totalTrades} trades)</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Payoff Ratio</div>
        <div class="kpi-val">${data.metrics.payoffRatio}</div>
        <div class="kpi-sub">Avg Win / Avg Loss</div>
      </div>
    </div>

    <div class="section-title">Monthly Return Heatmap Matrix (%)</div>
    <table>
      <thead>
        <tr>
          <th class="year-th">Year</th>
          ${monthNames.map((m) => `<th>${m}</th>`).join('')}
          <th>YTD</th>
        </tr>
      </thead>
      <tbody>
        ${monthlyRowsHtml}
      </tbody>
    </table>

    <div class="footer">
      <div>Quant Trading System • Institutional Execution &amp; Auditing Engine</div>
      <div>Confidential Tear-Sheet • Formatted for A4 / PDF Export</div>
    </div>
  </div>
</body>
</html>`;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}
