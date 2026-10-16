/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * RepairOS Scan History Page
 * Persisted SQLite / local database history, detailed scan inspection, and comparison.
 */

import React, { useState } from 'react';
import {
  History,
  Calendar,
  Clock,
  ArrowRight,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  FileText,
  GitCompare,
} from 'lucide-react';
import { ScanRecord, DiagnosticFinding } from '../types';

interface ScanHistoryPageProps {
  history: ScanRecord[];
  onSelectFindingForAi: (finding: DiagnosticFinding) => void;
}

export const ScanHistoryPage: React.FC<ScanHistoryPageProps> = ({
  history,
  onSelectFindingForAi,
}) => {
  const [selectedScanId, setSelectedScanId] = useState<string | null>(history[0]?.id || null);
  const [compareScanId, setCompareScanId] = useState<string | null>(null);

  const selectedScan = history.find((s) => s.id === selectedScanId);
  const compareScan = history.find((s) => s.id === compareScanId);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-zinc-100 tracking-tight">Scan History & Auditing</h1>
          <p className="text-xs text-zinc-400">
            Local SQLite telemetry ledger recording timestamps, rule execution durations, and findings
          </p>
        </div>

        <div className="text-xs text-zinc-400 font-mono">
          {history.length} Scans Archived
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scans List */}
        <div className="lg:col-span-1 bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
          <div className="text-xs font-semibold text-zinc-300 font-mono uppercase tracking-wider">
            Archived Scans
          </div>

          <div className="space-y-2 max-h-[65vh] overflow-y-auto">
            {history.map((scan) => {
              const isSelected = selectedScanId === scan.id;
              const isComparing = compareScanId === scan.id;

              return (
                <div
                  key={scan.id}
                  onClick={() => setSelectedScanId(scan.id)}
                  className={`p-3 rounded-md border transition-colors cursor-pointer text-xs ${
                    isSelected
                      ? 'bg-zinc-850 border-cyan-500/80 text-zinc-100'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center justify-between font-mono">
                    <span className="font-semibold text-zinc-200 uppercase">{scan.scanType} Scan</span>
                    <span className="text-zinc-500 text-[11px]">{scan.durationSeconds}s</span>
                  </div>

                  <div className="text-[11px] text-zinc-500 mt-1">
                    {new Date(scan.timestamp).toLocaleString()}
                  </div>

                  <div className="flex items-center gap-3 mt-2 text-[11px] font-mono">
                    <span className="text-emerald-400">{scan.passedCount} Passed</span>
                    <span className="text-amber-400">{scan.warningCount} Warn</span>
                    <span className="text-rose-400">{scan.problemCount} Prob</span>
                  </div>

                  <div className="mt-2 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px]">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCompareScanId(isComparing ? null : scan.id);
                      }}
                      className={`hover:text-cyan-300 ${
                        isComparing ? 'text-cyan-400 font-bold' : 'text-zinc-500'
                      }`}
                    >
                      {isComparing ? 'Comparing...' : 'Compare Against'}
                    </button>
                    <span className="text-zinc-600 font-mono">v{scan.appVersion}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Scan Details or Comparison View */}
        <div className="lg:col-span-2 space-y-4">
          {compareScan && selectedScan && (
            <div className="bg-zinc-900 border border-cyan-800/80 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2 text-cyan-400 font-semibold">
                  <GitCompare className="w-4 h-4" />
                  <span>Scan Delta Comparison</span>
                </div>
                <button
                  onClick={() => setCompareScanId(null)}
                  className="text-zinc-400 hover:text-zinc-200"
                >
                  Close Comparison
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs font-mono pt-2 border-t border-zinc-800">
                <div className="bg-zinc-950 p-3 rounded border border-zinc-800">
                  <div className="text-zinc-500 text-[11px]">BASELINE (Selected)</div>
                  <div className="text-zinc-200 font-semibold">{new Date(selectedScan.timestamp).toLocaleTimeString()}</div>
                  <div className="text-zinc-400 mt-1">
                    {selectedScan.findings.length} findings ({selectedScan.problemCount} problems)
                  </div>
                </div>

                <div className="bg-zinc-950 p-3 rounded border border-zinc-800">
                  <div className="text-zinc-500 text-[11px]">COMPARISON TARGET</div>
                  <div className="text-zinc-200 font-semibold">{new Date(compareScan.timestamp).toLocaleTimeString()}</div>
                  <div className="text-zinc-400 mt-1">
                    {compareScan.findings.length} findings ({compareScan.problemCount} problems)
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedScan ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-100 font-mono">
                    Scan ID: {selectedScan.id}
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Recorded on {new Date(selectedScan.timestamp).toLocaleString()} · Duration: {selectedScan.durationSeconds}s
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="text-zinc-500">ENGINE:</span>
                  <span className="text-zinc-300 font-semibold">v{selectedScan.appVersion}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-xs font-mono text-zinc-500 uppercase tracking-wider">
                  Findings Recorded ({selectedScan.findings.length})
                </div>

                {selectedScan.findings.length === 0 ? (
                  <div className="p-4 bg-zinc-950 rounded text-center text-xs text-zinc-500">
                    No findings recorded during this scan session.
                  </div>
                ) : (
                  selectedScan.findings.map((f) => (
                    <div
                      key={f.id}
                      className="p-3 bg-zinc-950 border border-zinc-800 rounded-md space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono font-bold uppercase text-[11px] ${
                              f.severity === 'problem' ? 'text-rose-400' : 'text-amber-400'
                            }`}
                          >
                            [{f.checkCode}]
                          </span>
                          <span className="font-semibold text-zinc-200">{f.title}</span>
                        </div>
                        <button
                          onClick={() => onSelectFindingForAi(f)}
                          className="text-[11px] text-cyan-400 hover:text-cyan-300 font-mono"
                        >
                          AI Explain
                        </button>
                      </div>

                      <p className="text-zinc-400 text-xs">{f.description}</p>

                      <div className="p-2 bg-zinc-900/80 rounded border border-zinc-800 font-mono text-[11px] text-zinc-400">
                        Evidence: {JSON.stringify(f.evidence)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-zinc-500 bg-zinc-900 border border-zinc-800 rounded-lg">
              Select a scan to inspect findings.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
