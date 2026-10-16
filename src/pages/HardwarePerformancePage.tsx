/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * RepairOS Hardware and Performance Page
 * High-density metrics, distinct committed vs physical RAM, process inspection.
 */

import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Database,
  Layers,
  Search,
  ArrowUpDown,
  RefreshCw,
  Clock,
  Info,
} from 'lucide-react';
import { SystemOverview, ProcessItem } from '../types';
import { api } from '../services/api';

interface HardwarePerformancePageProps {
  system: SystemOverview | null;
  processes: ProcessItem[];
  onRefresh: () => void;
}

export const HardwarePerformancePage: React.FC<HardwarePerformancePageProps> = ({
  system,
  processes,
  onRefresh,
}) => {
  const [filterText, setFilterText] = useState('');
  const [sortField, setSortField] = useState<'cpu' | 'memory' | 'name'>('memory');
  const [sortAsc, setSortAsc] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      onRefresh();
    }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, onRefresh]);

  const formatBytes = (bytes: number) => {
    if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(2)} GB`;
    return `${(bytes / 1e6).toFixed(1)} MB`;
  };

  const filteredProcesses = processes
    .filter(
      (p) =>
        p.name.toLowerCase().includes(filterText.toLowerCase()) ||
        p.companyName?.toLowerCase().includes(filterText.toLowerCase()) ||
        p.pid.toString().includes(filterText)
    )
    .sort((a, b) => {
      let valA: number | string = 0;
      let valB: number | string = 0;
      if (sortField === 'cpu') {
        valA = a.cpuPercent;
        valB = b.cpuPercent;
      } else if (sortField === 'memory') {
        valA = a.memoryWorkingSetBytes;
        valB = b.memoryWorkingSetBytes;
      } else {
        valA = a.name.toLowerCase();
        valB = b.name.toLowerCase();
      }

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });

  if (!system) return null;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-zinc-100 tracking-tight">
            Hardware & Real-Time Performance
          </h1>
          <p className="text-xs text-zinc-400">
            Telemetry sampled at {new Date().toLocaleTimeString()} · Configurable 5s cadence
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded bg-zinc-900 border-zinc-700 text-cyan-400 focus:ring-0"
            />
            <span>Auto-Refresh (5s)</span>
          </label>

          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-300 hover:text-white bg-zinc-900 border border-zinc-800 rounded-md transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sample Now</span>
          </button>
        </div>
      </div>

      {/* Deep Metric Cards (Committed vs Physical Memory & Processor) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* CPU Details */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="font-mono uppercase text-[11px]">Processor Architecture</span>
            <Cpu className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="space-y-1">
            <div className="text-xl font-bold font-mono text-zinc-100">
              {system.processor.currentLoadPercent}% Load
            </div>
            <div className="text-xs text-zinc-300 truncate" title={system.processor.name}>
              {system.processor.name}
            </div>
          </div>
          <div className="text-[11px] text-zinc-400 font-mono grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800">
            <div>Cores: {system.processor.cores}</div>
            <div>Logical: {system.processor.logicalProcessors}</div>
            <div>Base Clock: {system.processor.baseClockGhz} GHz</div>
            <div>Socket: 1</div>
          </div>
        </div>

        {/* Physical RAM */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="font-mono uppercase text-[11px]">Physical Memory (RAM)</span>
            <Database className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="space-y-1">
            <div className="text-xl font-bold font-mono text-zinc-100">
              {formatBytes(system.memory.usedPhysicalBytes)}{' '}
              <span className="text-xs font-normal text-zinc-400">
                / {formatBytes(system.memory.totalPhysicalBytes)}
              </span>
            </div>
            <div className="text-xs text-zinc-400">
              {system.memory.usagePercent.toFixed(1)}% physical occupancy
            </div>
          </div>
          <div className="text-[11px] text-zinc-400 font-mono grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800">
            <div>Available: {formatBytes(system.memory.availablePhysicalBytes)}</div>
            <div>Cached: 4.8 GB</div>
          </div>
        </div>

        {/* Committed Virtual Memory */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="font-mono uppercase text-[11px]">Committed Memory (Swap / Pagefile)</span>
            <Layers className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="space-y-1">
            <div className="text-xl font-bold font-mono text-zinc-100">
              {formatBytes(system.memory.committedBytes)}{' '}
              <span className="text-xs font-normal text-zinc-400">
                / {formatBytes(system.memory.commitLimitBytes)}
              </span>
            </div>
            <div className="text-xs text-zinc-400">
              Virtual commit limit backed by paging file
            </div>
          </div>
          <div className="text-[11px] text-zinc-400 font-mono grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800">
            <div>Paged Pool: 640 MB</div>
            <div>Non-Paged: 412 MB</div>
          </div>
        </div>
      </div>

      {/* Process Table with Search and Sort */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">
              Top Running Processes ({processes.length})
            </h2>
            <p className="text-xs text-zinc-400">
              Enumerated via Windows Toolhelp32 / WMI snapshot
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Search process or PID..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-zinc-950 border border-zinc-800 rounded-md text-zinc-200 placeholder-zinc-500 focus:outline-hidden focus:border-cyan-500 w-56"
              />
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="border border-zinc-800 rounded-md overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-800 text-[11px]">
              <tr>
                <th className="py-2.5 px-3">
                  <button
                    onClick={() => {
                      setSortField('name');
                      setSortAsc(!sortAsc);
                    }}
                    className="flex items-center gap-1 hover:text-zinc-200"
                  >
                    <span>PROCESS NAME</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-2.5 px-3">PID</th>
                <th className="py-2.5 px-3">PUBLISHER</th>
                <th className="py-2.5 px-3 text-right">
                  <button
                    onClick={() => {
                      setSortField('cpu');
                      setSortAsc(!sortAsc);
                    }}
                    className="flex items-center gap-1 hover:text-zinc-200 ml-auto"
                  >
                    <span>CPU %</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-2.5 px-3 text-right">
                  <button
                    onClick={() => {
                      setSortField('memory');
                      setSortAsc(!sortAsc);
                    }}
                    className="flex items-center gap-1 hover:text-zinc-200 ml-auto"
                  >
                    <span>WORKING SET</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-2.5 px-3 text-right">THREADS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
              {filteredProcesses.map((p) => (
                <tr key={p.pid} className="hover:bg-zinc-800/40 transition-colors">
                  <td className="py-2.5 px-3 font-medium text-zinc-200 flex items-center gap-2">
                    <span>{p.name}</span>
                    {p.isSystemProcess && (
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wide">
                        [SYS]
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-zinc-400 tabular-nums">{p.pid}</td>
                  <td className="py-2.5 px-3 text-zinc-400 truncate max-w-xs">
                    {p.companyName || '—'}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-zinc-100">
                    {p.cpuPercent.toFixed(1)}%
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-cyan-300">
                    {formatBytes(p.memoryWorkingSetBytes)}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-zinc-400">
                    {p.threadCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
