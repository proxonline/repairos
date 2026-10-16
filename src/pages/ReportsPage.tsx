/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * RepairOS Reports Page
 * Comprehensive diagnostic report generation, AI executive summary, and export reviews.
 */

import React, { useState } from 'react';
import {
  FileText,
  Download,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Laptop,
  Cpu,
  Layers,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import {
  SystemOverview,
  DiagnosticFinding,
  DiagnosticCheckResult,
  RepairExecutionResult,
  DiagnosticReport,
} from '../types';
import { ExportModal } from '../components/common/ExportModal';
import { summarizeReportWithAi } from '../services/geminiService';

interface ReportsPageProps {
  system: SystemOverview | null;
  findings: DiagnosticFinding[];
  checks: DiagnosticCheckResult[];
}

export const ReportsPage: React.FC<ReportsPageProps> = ({ system, findings, checks }) => {
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [aiSummary, setAiSummary] = useState<{ summary: string; highlights: string[] } | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  if (!system) return null;

  const currentReport: DiagnosticReport = {
    id: `rep-${Date.now()}`,
    createdAt: new Date().toISOString(),
    system,
    findings,
    checksRun: checks,
    repairsApplied: [],
    notes: 'Generated locally by RepairOS Workstation Engine.',
  };

  const handleGenerateAiSummary = async () => {
    setIsGeneratingAi(true);
    try {
      const res = await summarizeReportWithAi(currentReport);
      setAiSummary(res);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-zinc-100 tracking-tight">Diagnostic Reports</h1>
          <p className="text-xs text-zinc-400">
            Generate, review, and export comprehensive system audit reports in HTML, CSV, or structured JSON
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleGenerateAiSummary}
            disabled={isGeneratingAi}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-cyan-300 hover:text-cyan-200 bg-cyan-950/60 border border-cyan-800 rounded-md transition-colors disabled:opacity-60"
          >
            {isGeneratingAi ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            <span>AI Executive Summary</span>
          </button>

          <button
            onClick={() => setIsExportOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-zinc-950 bg-cyan-400 hover:bg-cyan-300 rounded-md transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* AI Summary Banner if generated */}
      {aiSummary && (
        <div className="bg-zinc-900 border border-cyan-800/80 rounded-lg p-5 space-y-3">
          <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs font-mono">
            <Sparkles className="w-4 h-4" />
            <span>GEMINI 3.8 FLASH EXECUTIVE SUMMARY</span>
          </div>
          <p className="text-xs text-zinc-200 leading-relaxed">{aiSummary.summary}</p>
          <div className="space-y-1 pt-2 border-t border-zinc-800">
            <div className="text-[11px] font-mono text-zinc-400 uppercase">Key Actionable Insights:</div>
            <ul className="list-disc pl-4 text-xs text-zinc-400 space-y-0.5">
              {aiSummary.highlights.map((h, i) => (
                <li key={i}>{h}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Report Canvas Preview */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-6">
        {/* Report Document Title Header */}
        <div className="border-b border-zinc-800 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-[11px] font-mono text-cyan-400 uppercase tracking-wider">
              Diagnostic Audit Report
            </div>
            <h2 className="text-xl font-bold text-zinc-100 font-mono mt-0.5">
              {system.computerName}
            </h2>
            <div className="text-xs text-zinc-400 mt-1">
              {system.osEdition} · Build {system.osBuild} · Generated: {new Date().toLocaleString()}
            </div>
          </div>

          <div className="text-right text-xs font-mono text-zinc-500">
            <div>REPAIROS ENGINE v1.2.0</div>
            <div>STATUS: {findings.length > 0 ? 'ISSUES FLAGGED' : 'NOMINAL'}</div>
          </div>
        </div>

        {/* Hardware & Environment Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          <div className="bg-zinc-950 p-3 rounded border border-zinc-800 space-y-1">
            <div className="text-zinc-500 text-[11px]">PROCESSOR</div>
            <div className="text-zinc-200 font-medium truncate">{system.processor.name}</div>
            <div className="text-zinc-400">
              {system.processor.cores} Physical Cores · {system.processor.logicalProcessors} Threads
            </div>
          </div>

          <div className="bg-zinc-950 p-3 rounded border border-zinc-800 space-y-1">
            <div className="text-zinc-500 text-[11px]">PHYSICAL RAM</div>
            <div className="text-zinc-200 font-medium">
              {(system.memory.totalPhysicalBytes / 1e9).toFixed(1)} GB Total
            </div>
            <div className="text-zinc-400">
              {(system.memory.availablePhysicalBytes / 1e9).toFixed(1)} GB Available ({system.memory.usagePercent.toFixed(1)}% Used)
            </div>
          </div>

          <div className="bg-zinc-950 p-3 rounded border border-zinc-800 space-y-1">
            <div className="text-zinc-500 text-[11px]">STORAGE CAPACITY</div>
            <div className="text-zinc-200 font-medium">
              {(system.volumes[0]?.totalBytes / 1e9).toFixed(1)} GB on C:
            </div>
            <div className="text-zinc-400">
              {(system.volumes[0]?.freeBytes / 1e9).toFixed(1)} GB Free ({system.volumes[0]?.usagePercent.toFixed(1)}% Used)
            </div>
          </div>
        </div>

        {/* Findings Table */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-zinc-300 font-mono uppercase tracking-wider">
            Diagnostic Findings & Supporting Evidence ({findings.length})
          </h3>

          <div className="border border-zinc-800 rounded-md overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-800 text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">RULE</th>
                  <th className="py-2.5 px-3">SEVERITY</th>
                  <th className="py-2.5 px-3">OBSERVED FINDING</th>
                  <th className="py-2.5 px-3">EVIDENCE RECORD</th>
                  <th className="py-2.5 px-3">RECOMMENDATION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                {findings.map((f) => (
                  <tr key={f.id} className="hover:bg-zinc-800/40">
                    <td className="py-2.5 px-3 font-semibold text-cyan-400">{f.checkCode}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`font-semibold uppercase text-[11px] ${
                          f.severity === 'problem' ? 'text-rose-400' : 'text-amber-400'
                        }`}
                      >
                        {f.severity}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-zinc-100">{f.title}</div>
                      <div className="text-zinc-400 text-[11px]">{f.description}</div>
                    </td>
                    <td className="py-2.5 px-3 text-zinc-400 text-[11px] truncate max-w-xs">
                      {JSON.stringify(f.evidence)}
                    </td>
                    <td className="py-2.5 px-3 text-zinc-300">{f.recommendedAction}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Security & Verification Certification */}
        <div className="pt-4 border-t border-zinc-800 flex items-center justify-between text-[11px] font-mono text-zinc-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Evidence verified against Windows native telemetry. No personal data or credentials stored.</span>
          </div>
          <div>RepairOS Certified Report</div>
        </div>
      </div>

      {/* Export Preview Modal */}
      <ExportModal
        report={currentReport}
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />
    </div>
  );
};
