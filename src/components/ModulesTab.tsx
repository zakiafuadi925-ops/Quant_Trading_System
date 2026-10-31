import React, { useState } from 'react';
import { CURRICULUM_MODULES } from '../data/modulesData';
import { 
  BookOpen, 
  Code2, 
  Play, 
  Terminal, 
  CheckCircle2, 
  Sparkles, 
  ChevronRight,
  FolderTree,
  FileText
} from 'lucide-react';

export const ModulesTab: React.FC = () => {
  const [selectedModIdx, setSelectedModIdx] = useState<number>(0);
  const [interactiveInput, setInteractiveInput] = useState<string>('85263.08');
  const [interactiveOutput, setInteractiveOutput] = useState<string | null>(null);

  const mod = CURRICULUM_MODULES[selectedModIdx];

  const handleRunSample = () => {
    const val = Number(interactiveInput) || 85000;
    if (mod.moduleNum === 1) {
      if (val >= 85000) {
        setInteractiveOutput(`🚨 ALERT: BTC hit $${val.toLocaleString()} (Target: >= $85,000) [PriceAlert Triggered]`);
      } else {
        setInteractiveOutput(`Status: BTC is at $${val.toLocaleString()} (Below trigger threshold)`);
      }
    } else if (mod.moduleNum === 2) {
      setInteractiveOutput(`Signal Evaluated: BUY [Confluence Score: 4/5 | RSI: 34.2 (Oversold), EMA-21 Breakout]`);
    } else if (mod.moduleNum === 3) {
      setInteractiveOutput(`CCXT Binance Ingestion OK: 100 OHLCV rows loaded. Daily log-return: +0.0046, StDev: 0.0218`);
    } else if (mod.moduleNum === 4) {
      setInteractiveOutput(`Astronacci Merged Test: ±2d Apogee Window Return: +0.395% vs Outside: +0.118% (p-val: 0.045*)`);
    } else {
      setInteractiveOutput(`Report Generated: reports/report_2026-05-09.html. Net Worth: $33,260.00 (Risk: MaxDD < 20%)`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold mb-2">
              <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
              Quant Research Curriculum &amp; Architecture
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Modules 1 to 5: From Foundations to Autonomous Trading
            </h2>
            <p className="text-xs text-slate-400">
              Structured progressive modules implementing the complete roadmap from data ingestion to ML execution
            </p>
          </div>
        </div>

        {/* Modules Navigation Pills */}
        <div className="flex gap-2 pt-4 overflow-x-auto no-scrollbar">
          {CURRICULUM_MODULES.map((m, idx) => (
            <button
              key={m.id}
              onClick={() => {
                setSelectedModIdx(idx);
                setInteractiveOutput(null);
              }}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all text-left whitespace-nowrap flex items-center gap-2 ${
                selectedModIdx === idx
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <span className="font-mono">Modul {m.moduleNum}</span>
              <span className="font-sans opacity-90 hidden md:inline">• {m.title.split(':')[1]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Selected Module Detail Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Details and Code */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
              Level {mod.moduleNum} Core Architecture
            </span>
            <h3 className="text-lg font-bold text-white mt-1">{mod.title}</h3>
            <p className="text-xs text-slate-300 mt-1">{mod.description}</p>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-300 mb-2">Core Concepts Covered</h4>
            <div className="flex flex-wrap gap-2">
              {mod.topics.map((t) => (
                <span
                  key={t}
                  className="px-2.5 py-1 rounded-lg bg-slate-950 text-slate-300 border border-slate-800 text-xs font-mono flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Code2 className="w-4 h-4 text-cyan-400" />
                Original Python Implementation Blueprint
              </h4>
              <span className="text-[11px] text-slate-500 font-mono">Python 3.10+</span>
            </div>

            <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 font-mono overflow-x-auto">
              <code>{mod.codeSample}</code>
            </pre>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-400 mb-1 font-mono">Standard Execution Output</h4>
            <pre className="p-3 bg-slate-950/70 rounded-xl border border-slate-800/60 text-xs text-emerald-400 font-mono">
              <code>{mod.outputExample}</code>
            </pre>
          </div>
        </div>

        {/* Right Col: Interactive Function Runner */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-800">
            <Terminal className="w-4 h-4 text-emerald-400" />
            Interactive Logic Test Runner
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-slate-400 block mb-1 font-mono">Test Parameter (e.g. BTC Price):</label>
              <input
                type="text"
                value={interactiveInput}
                onChange={(e) => setInteractiveInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <button
              onClick={handleRunSample}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-all shadow-md shadow-amber-500/20"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              Execute Module Function
            </button>

            {interactiveOutput && (
              <div className="p-3 bg-slate-950 border border-emerald-500/30 rounded-xl space-y-1 font-mono">
                <div className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  STDOUT:
                </div>
                <div className="text-xs text-slate-200 leading-relaxed">
                  {interactiveOutput}
                </div>
              </div>
            )}

            <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-2">
              <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                Repository Structure Context
              </div>
              <p>
                Each module reflects original scripts from <code className="text-slate-200 font-mono">/Modul_1</code> to <code className="text-slate-200 font-mono">/Modul_5_</code>, integrating seamlessly with production pipelines.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
