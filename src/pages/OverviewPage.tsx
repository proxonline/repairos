/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * RepairOS Overview Page
 * Real system measurements, storage volumes, recent findings, and actionable shortcuts.
 */

import React from 'react';
import {
  Laptop,
  Cpu,
  Database,
  HardDrive,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ShieldAlert,
  ArrowUpRight,
  Activity,
} from 'lucide-react';
import { SystemOverview, DiagnosticFinding } from '../types';
import { PageId } from '../components/common/Sidebar';

interface OverviewPageProps {
  system: SystemOverview | null;
  findings: DiagnosticFinding[];
  onNavigate: (page: PageId) => void;
  onRunScan: () => void;
  onExplainFinding: (finding: DiagnosticFinding) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  system,
  findings,
  onNavigate,
  onRunScan,
  onExplainFinding,
}) => {
  if (!system) {
    return (
      <div className="p-8 text-zinc-500 font-mono text-xs flex items-center gap-2">
        <Activity className="w-4 h-4 animate-spin text-cyan-400" />
        <span>Loading Windows system inventory...</span>
      </div>
    );
  }

  const formatUptime = (sec: number) => {
    const days = Math.floor(sec / 86400);
    const hours = Math.floor((sec % 86400) / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const formatBytes = (bytes: number) => {
    return `${(bytes / 1e9).toFixed(1)} GB`;
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Hero System Status Bar */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-md text-cyan-400 shrink-0">
              <Laptop className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                <span>{system.computerName}</span>
                <span aria-hidden="true">·</span>
                <span>{system.architecture}</span>
                <span aria-hidden="true">·</span>
                <span className={system.isElevated ? 'text-amber-400 font-semibold' : 'text-zinc-500'}>
                  {system.isElevated ? 'ELEVATED ADMIN' : 'USER CONTEXT'}
                </span>
              </div>
              <h1 className="text-xl font-bold text-zinc-100 tracking-tight mt-0.5">
                {system.osEdition}
              </h1>
              <p className="text-xs text-zinc-400 mt-1">
                Version {system.osVersion} (Build {system.osBuild}) · Uptime: {formatUptime(system.uptimeSeconds)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('diagnostics')}
              className="px-3.5 py-2 text-xs font-medium text-zinc-200 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-md transition-colors whitespace-nowrap cursor-pointer"
            >
              Diagnostic Rules
            </button>
            <button
              onClick={onRunScan}
              className="px-4 py-2 text-xs font-semibold text-zinc-950 bg-cyan-400 hover:bg-cyan-300 rounded-md transition-colors whitespace-nowrap cursor-pointer shadow-sm"
            >
              Run Full Scan
            </button>
          </div>
        </div>
      </div>

      {/* Primary Hardware Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CPU Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="font-mono uppercase text-[11px]">Processor Utilization</span>
            <Cpu className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="my-3">
            <div className="text-2xl font-bold font-mono text-zinc-100 tabular-nums">
              {system.processor.currentLoadPercent}%
            </div>
            <div className="w-full bg-zinc-950 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  system.processor.currentLoadPercent > 85 ? 'bg-rose-500' : 'bg-cyan-400'
                }`}
                style={{ width: `${Math.min(100, system.processor.currentLoadPercent)}%` }}
              />
            </div>
          </div>
          <div className="text-[11px] text-zinc-400 truncate" title={system.processor.name}>
            {system.processor.name} ({system.processor.cores}C/{system.processor.logicalProcessors}T)
          </div>
        </div>

        {/* Memory Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="font-mono uppercase text-[11px]">Physical Memory</span>
            <Database className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="my-3">
            <div className="text-2xl font-bold font-mono text-zinc-100 tabular-nums">
              {system.memory.usagePercent.toFixed(1)}%
            </div>
            <div className="w-full bg-zinc-950 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  system.memory.usagePercent > 80 ? 'bg-amber-400' : 'bg-cyan-400'
                }`}
                style={{ width: `${Math.min(100, system.memory.usagePercent)}%` }}
              />
            </div>
          </div>
          <div className="text-[11px] text-zinc-400 font-mono">
            {formatBytes(system.memory.usedPhysicalBytes)} of {formatBytes(system.memory.totalPhysicalBytes)} used
          </div>
        </div>

        {/* System Disk Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="font-mono uppercase text-[11px]">System Drive (C:)</span>
            <HardDrive className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="my-3">
            <div className="text-2xl font-bold font-mono text-zinc-100 tabular-nums">
              {system.volumes[0]?.usagePercent.toFixed(1) || 0}%
            </div>
            <div className="w-full bg-zinc-950 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  system.volumes[0]?.usagePercent > 85 ? 'bg-rose-500' : 'bg-cyan-400'
                }`}
                style={{ width: `${Math.min(100, system.volumes[0]?.usagePercent || 0)}%` }}
              />
            </div>
          </div>
          <div className="text-[11px] text-zinc-400 font-mono">
            {formatBytes(system.volumes[0]?.freeBytes || 0)} free of {formatBytes(system.volumes[0]?.totalBytes || 0)}
          </div>
        </div>

        {/* Unresolved Diagnostics Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="font-mono uppercase text-[11px]">Unresolved Findings</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="my-3">
            <div className="text-2xl font-bold font-mono text-zinc-100 tabular-nums">
              {findings.length}
            </div>
            <div className="text-xs text-zinc-400 mt-2">
              {findings.filter((f) => f.severity === 'problem').length} Problems ·{' '}
              {findings.filter((f) => f.severity === 'warning').length} Warnings
            </div>
          </div>
          <button
            onClick={() => onNavigate('diagnostics')}
            className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium transition-colors"
          >
            <span>Review findings</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main 2-Column Split: Storage Volumes & Unresolved Diagnostic Findings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Storage Volumes List */}
        <div className="lg:col-span-1 bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-4 flex flex-col">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-100">Storage Volumes</h2>
            <button
              onClick={() => onNavigate('storage')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 transition-colors"
            >
              <span>Analyze</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3 flex-1">
            {system.volumes.map((vol) => (
              <div
                key={vol.driveLetter}
                className="p-3 bg-zinc-950 border border-zinc-800 rounded-md space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-zinc-100">{vol.driveLetter}</span>
                    <span className="text-zinc-400">({vol.label || 'Volume'})</span>
                  </div>
                  <span className="font-mono text-zinc-400 text-[11px]">{vol.fileSystem}</span>
                </div>

                <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${vol.isLowSpace ? 'bg-rose-500' : 'bg-cyan-500'}`}
                    style={{ width: `${Math.min(100, vol.usagePercent)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                  <span>{formatBytes(vol.freeBytes)} Free</span>
                  <span>{vol.usagePercent.toFixed(1)}% Used</span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-zinc-950/60 rounded border border-zinc-800 text-[11px] text-zinc-400 space-y-1">
            <div className="font-semibold text-zinc-300">Storage Safety Threshold</div>
            <p>Windows NTFS performs best with &gt;15% free headroom to prevent paging file fragmentation.</p>
          </div>
        </div>

        {/* Right Column: Active Diagnostic Findings */}
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">
                Active Diagnostic Findings ({findings.length})
              </h2>
              <p className="text-xs text-zinc-400">
                Evidence-backed indicators collected during latest scan
              </p>
            </div>
            <button
              onClick={() => onNavigate('repairs')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 transition-colors"
            >
              <span>Repair Center</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3">
            {findings.length === 0 ? (
              <div className="py-10 text-center text-zinc-500 text-xs">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
                No active diagnostic findings. System parameters within normal thresholds.
              </div>
            ) : (
              findings.map((f) => (
                <div
                  key={f.id}
                  className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-md flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div className="space-y-1 max-w-xl">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[11px] font-mono font-semibold uppercase ${
                          f.severity === 'problem'
                            ? 'text-rose-400'
                            : f.severity === 'warning'
                            ? 'text-amber-400'
                            : 'text-cyan-400'
                        }`}
                      >
                        {f.checkCode}
                      </span>
                      <span className="text-zinc-600 text-xs" aria-hidden="true">·</span>
                      <span className="text-zinc-400 text-xs">{f.affectedResource || 'System'}</span>
                    </div>
                    <div className="text-xs font-semibold text-zinc-100">{f.title}</div>
                    <p className="text-xs text-zinc-400 leading-normal">{f.description}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onExplainFinding(f)}
                      className="px-2.5 py-1 text-xs text-cyan-300 hover:text-cyan-200 border border-cyan-800/60 bg-cyan-950/40 rounded transition-colors"
                    >
                      AI Explain
                    </button>
                    <button
                      onClick={() => onNavigate('repairs')}
                      className="px-2.5 py-1 text-xs text-zinc-300 hover:text-zinc-100 bg-zinc-800 hover:bg-zinc-700 rounded transition-colors"
                    >
                      Resolve
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
