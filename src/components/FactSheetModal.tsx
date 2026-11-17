import React, { useMemo } from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  X, 
  TrendingUp, 
  ShieldAlert, 
  Percent, 
  BarChart3, 
  Calendar, 
  Award,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { 
  FactSheetData, 
  downloadCSV, 
  openPrintableFactSheet, 
  generateFactSheetCSV,
  MonthlyReturnRow
} from '../utils/factSheet';

interface FactSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  factSheetData: FactSheetData;
}

export const FactSheetModal: React.FC<FactSheetModalProps> = ({
  isOpen,
  onClose,
  factSheetData
}) => {
  if (!isOpen) return null;

  const { metrics, monthlyReturns, symbol, strategyName, timeframe, startDate, endDate } = factSheetData;
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const handleDownloadCSV = () => {
    const csvContent = generateFactSheetCSV(factSheetData);
    const filename = `${symbol}_FactSheet_${strategyName.replace(/\s+/g, '_')}_v6.2.0.csv`;
    downloadCSV(filename, csvContent);
  };

  const handlePrintPDF = () => {
    openPrintableFactSheet(factSheetData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[92vh] overflow-y-auto p-6 space-y-6 shadow-2xl text-slate-100">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold tracking-tight text-white">Institutional Fact Sheet &amp; Audit Report</h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  v6.2.0 Tearsheet
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {symbol}/USDT • {strategyName} • {timeframe.toUpperCase()} • Range: {startDate} to {endDate}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadCSV}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
              title="Download structured CSV transaction & monthly return audit ledger"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              Download CSV Audit
            </button>
            <button
              onClick={handlePrintPDF}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20"
              title="Open print dialog to save as Institutional PDF Fact Sheet"
            >
              <Printer className="w-4 h-4" />
              Export / Print PDF
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-all ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Executive Summary Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800">
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Total Net Return</div>
            <div className={`text-2xl font-bold font-mono mt-1 ${metrics.totalReturnPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {metrics.totalReturnPct >= 0 ? '+' : ''}{metrics.totalReturnPct}%
            </div>
            <div className="text-[11px] font-mono text-slate-400 mt-0.5">
              ${metrics.initialEquity} → ${metrics.finalEquity}
            </div>
          </div>

          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800">
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Sharpe Ratio</div>
            <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
              {metrics.sharpeRatio}
            </div>
            <div className="text-[11px] font-mono text-slate-400 mt-0.5">
              Annualized (0% Rf)
            </div>
          </div>

          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800">
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Max Drawdown</div>
            <div className="text-2xl font-bold font-mono text-rose-400 mt-1">
              -{metrics.maxDrawdownPct}%
            </div>
            <div className="text-[11px] font-mono text-slate-400 mt-0.5">
              Duration: {metrics.maxDrawdownDurationDays} days
            </div>
          </div>

          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800">
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">CAGR</div>
            <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">
              {metrics.cagrPct}%
            </div>
            <div className="text-[11px] font-mono text-slate-400 mt-0.5">
              Compound Annual Growth
            </div>
          </div>
        </div>

        {/* Comprehensive Institutional Ratios Grid */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-amber-400" />
            Institutional Risk-Adjusted Ratios &amp; VaR Profile
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono text-xs">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
              <div className="text-[10px] text-slate-400 uppercase">Sortino Ratio</div>
              <div className="text-base font-bold text-white mt-1">{metrics.sortinoRatio}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Downside dev only</div>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
              <div className="text-[10px] text-slate-400 uppercase">Calmar Ratio</div>
              <div className="text-base font-bold text-white mt-1">{metrics.calmarRatio}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">CAGR / Max DD</div>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
              <div className="text-[10px] text-slate-400 uppercase">Recovery Factor</div>
              <div className="text-base font-bold text-emerald-400 mt-1">{metrics.recoveryFactor}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Profit / DD ($)</div>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
              <div className="text-[10px] text-slate-400 uppercase">VaR 95% (CVaR)</div>
              <div className="text-base font-bold text-rose-400 mt-1">{metrics.var95Pct}%</div>
              <div className="text-[10px] text-rose-500/80 mt-0.5">CVaR: {metrics.cvar95Pct}%</div>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
              <div className="text-[10px] text-slate-400 uppercase">VaR 99% (CVaR)</div>
              <div className="text-base font-bold text-rose-400 mt-1">{metrics.var99Pct}%</div>
              <div className="text-[10px] text-rose-500/80 mt-0.5">CVaR: {metrics.cvar99Pct}%</div>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
              <div className="text-[10px] text-slate-400 uppercase">Profit Factor</div>
              <div className="text-base font-bold text-cyan-400 mt-1">{metrics.profitFactor}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Win: {metrics.winRatePct}%</div>
            </div>
          </div>
        </div>

        {/* Monthly Returns Heatmap Table */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-emerald-400" />
            Monthly Return Heatmap Matrix (%)
          </h4>
          
          {monthlyReturns.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-xs">
              Insufficient timestamp history for monthly aggregation.
            </div>
          ) : (
            <div className="overflow-x-auto bg-slate-950 rounded-xl border border-slate-800 p-2">
              <table className="w-full text-right text-xs font-mono">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-800">
                    <th className="py-2 px-2 text-left font-semibold">Year</th>
                    {monthNames.map((m) => (
                      <th key={m} className="py-2 px-1.5 font-semibold text-center">{m}</th>
                    ))}
                    <th className="py-2 px-2 font-bold text-white text-right">YTD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {monthlyReturns.map((row) => (
                    <tr key={row.year} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 px-2 text-left font-bold text-white">{row.year}</td>
                      {row.months.map((m, idx) => {
                        if (m === null) {
                          return <td key={idx} className="py-2.5 px-1.5 text-center text-slate-600">-</td>;
                        }
                        const isPos = m > 0;
                        const isZero = m === 0;
                        return (
                          <td 
                            key={idx} 
                            className={`py-2.5 px-1.5 text-center font-medium rounded ${
                              isZero 
                                ? 'text-slate-400' 
                                : isPos 
                                ? 'text-emerald-300 bg-emerald-500/10' 
                                : 'text-rose-300 bg-rose-500/10'
                            }`}
                          >
                            {isPos ? '+' : ''}{m.toFixed(1)}%
                          </td>
                        );
                      })}
                      <td className={`py-2.5 px-2 text-right font-bold ${
                        row.ytd >= 0 ? 'text-emerald-400 bg-emerald-500/20' : 'text-rose-400 bg-rose-500/20'
                      }`}>
                        {row.ytd >= 0 ? '+' : ''}{row.ytd.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Transaction Audit Sample */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-cyan-400" />
              Audited Transaction Log ({factSheetData.trades.length} Records)
            </h4>
            <span className="text-[11px] text-slate-500 font-mono">
              Full ledger included in CSV export
            </span>
          </div>

          <div className="overflow-x-auto max-h-48 bg-slate-950 rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs font-mono">
              <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-2">Type</th>
                  <th className="py-2 px-2">Price</th>
                  <th className="py-2 px-2">Units</th>
                  <th className="py-2 px-2">Realized PnL</th>
                  <th className="py-2 px-2">PnL %</th>
                  <th className="py-2 px-3 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-slate-300">
                {factSheetData.trades.slice(-20).reverse().map((t) => (
                  <tr key={t.id} className="hover:bg-slate-800/20">
                    <td className="py-1.5 px-3 text-slate-400">{t.date}</td>
                    <td className="py-1.5 px-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        t.type === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                      }`}>
                        {t.type}
                      </span>
                    </td>
                    <td className="py-1.5 px-2">${t.price.toFixed(2)}</td>
                    <td className="py-1.5 px-2">{t.units.toFixed(4)}</td>
                    <td className={`py-1.5 px-2 font-bold ${t.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {t.pnl !== 0 ? `${t.pnl >= 0 ? '+' : ''}$${t.pnl.toFixed(2)}` : '-'}
                    </td>
                    <td className={`py-1.5 px-2 ${t.pnlPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {t.pnlPct !== 0 ? `${t.pnlPct >= 0 ? '+' : ''}${t.pnlPct.toFixed(2)}%` : '-'}
                    </td>
                    <td className="py-1.5 px-3 text-right font-bold text-white">${t.balanceAfter.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition-all"
          >
            Close
          </button>
          <button
            onClick={handlePrintPDF}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            Print / Save PDF Fact Sheet
          </button>
        </div>
      </div>
    </div>
  );
};
