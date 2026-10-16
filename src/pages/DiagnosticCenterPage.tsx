/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * RepairOS Diagnostic Center Page
 * 10 modular diagnostic checks with thresholds, evidence, states, and recommendations.
 */

import React, { useState } from 'react';
import {
  Stethoscope,
  Play,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Wrench,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { DiagnosticCheckResult, DiagnosticFinding, DiagnosticState } from '../types';
import { PageId } from '../components/common/Sidebar';

interface DiagnosticCenterPageProps {
  checks: DiagnosticCheckResult[];
  isScanning: boolean;
  onRunScan: () => void;
  onExplainFinding: (finding: DiagnosticFinding) => void;
  onNavigate: (page: PageId) => void;
}

export const DiagnosticCenterPage: React.FC<DiagnosticCenterPageProps> = ({
  checks,
  isScanning,
  onRunScan,
  onExplainFinding,
  onNavigate,
}) => {
  const [filterState, setFilterState] = useState<'all' | 'issues_only'>('all');

  const filteredChecks = checks.filter((c) => {
    if (filterState === 'issues_only') {
      return c.state === 'problem_detected' || c.state === 'warning';
    }
    return true;
  });

  const getStatusIcon = (state: DiagnosticState) => {
    switch (state) {
      case 'passed':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'problem_detected':
        return <AlertCircle className="w-4 h-4 text-rose-400" />;
      case 'inconclusive':
      default:
        return <HelpCircle className="w-4 h-4 text-zinc-500" />;
    }
  };

  const getStatusLabel = (state: DiagnosticState) => {
    switch (state) {
      case 'passed':
        return 'PASSED';
      case 'warning':
        return 'WARNING';
      case 'problem_detected':
        return 'PROBLEM DETECTED';
      case 'inconclusive':
        return 'INCONCLUSIVE';
      default:
        return state.toUpperCase();
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-zinc-100 tracking-tight">Diagnostic Center</h1>
          <p className="text-xs text-zinc-400">
            Automated, evidence-based diagnostic rules covering storage, memory, CPU, crash events, and services
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center p-1 bg-zinc-900 border border-zinc-800 rounded-md">
            <button
              onClick={() => setFilterState('all')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                filterState === 'all'
                  ? 'bg-zinc-800 text-cyan-300 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              All Rules ({checks.length})
            </button>
            <button
              onClick={() => setFilterState('issues_only')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                filterState === 'issues_only'
                  ? 'bg-zinc-800 text-amber-300 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Actionable Issues
            </button>
          </div>

          <button
            onClick={onRunScan}
            disabled={isScanning}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-zinc-950 bg-cyan-400 hover:bg-cyan-300 rounded-md transition-colors disabled:opacity-60 cursor-pointer shadow-sm"
          >
            {isScanning ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Evaluating Rules...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Re-Evaluate All Checks</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Rules Evaluation List */}
      <div className="space-y-4">
        {filteredChecks.map((check) => {
          const hasFindings = check.findings && check.findings.length > 0;

          return (
            <div
              key={check.checkId}
              className={`bg-zinc-900 border rounded-lg p-5 space-y-3 transition-colors ${
                check.state === 'problem_detected'
                  ? 'border-rose-800/80'
                  : check.state === 'warning'
                  ? 'border-amber-800/80'
                  : 'border-zinc-800'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {getStatusIcon(check.state)}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-zinc-100 text-sm">
                        {check.checkName}
                      </span>
                      <span
                        className={`text-[11px] font-mono font-bold ${
                          check.state === 'problem_detected'
                            ? 'text-rose-400'
                            : check.state === 'warning'
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {getStatusLabel(check.state)}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">{check.summary}</p>
                  </div>
                </div>

                <div className="text-[11px] font-mono text-zinc-500 shrink-0">
                  Evaluated in {check.durationMs}ms
                </div>
              </div>

              {/* Evidence Bar */}
              <div className="p-3 bg-zinc-950 rounded-md border border-zinc-800/80 text-xs font-mono text-zinc-400 flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div>
                  <span className="text-zinc-500 uppercase text-[10px] block">
                    Underlying Evidence
                  </span>
                  <span className="text-zinc-300">{check.evidenceSummary}</span>
                </div>
              </div>

              {/* Nested Findings If Present */}
              {hasFindings && (
                <div className="space-y-2 pt-2 border-t border-zinc-800">
                  {check.findings.map((f) => (
                    <div
                      key={f.id}
                      className="p-3 bg-zinc-950/70 border border-zinc-800 rounded flex flex-col md:flex-row md:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-zinc-200">{f.title}</span>
                          <span className="text-[11px] font-mono text-cyan-400">
                            [{f.checkCode}]
                          </span>
                        </div>
                        <div className="text-xs text-zinc-400">
                          Recommended Action: {f.recommendedAction}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => onExplainFinding(f)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-cyan-300 hover:text-cyan-200 bg-cyan-950/40 border border-cyan-800/70 rounded transition-colors"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>AI Explanation</span>
                        </button>
                        <button
                          onClick={() => onNavigate('repairs')}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded transition-colors"
                        >
                          <Wrench className="w-3.5 h-3.5" />
                          <span>Resolve in Repair Center</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
