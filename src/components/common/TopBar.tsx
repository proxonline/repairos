/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * RepairOS Top Bar Navigation
 * Adheres to 3-zone contract, dark graphite palette, and zero-pill discipline.
 */

import React from 'react';
import { Shield, Play, RefreshCw, Laptop, Activity } from 'lucide-react';
import { AppMode } from '../../types';

interface TopBarProps {
  currentMode: AppMode;
  onToggleMode: (mode: AppMode) => void;
  onRunQuickScan: () => void;
  isScanning: boolean;
  activePageTitle: string;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentMode,
  onToggleMode,
  onRunQuickScan,
  isScanning,
  activePageTitle,
}) => {
  return (
    <header className="h-14 border-b border-zinc-800 bg-zinc-950 px-5 flex items-center justify-between gap-8 select-none shrink-0 sticky top-0 z-30">
      {/* Zone 1: Single text element Brand Wordmark + Breadcrumb */}
      <div className="flex items-center gap-4 shrink-0">
        <div className="flex items-center gap-2 text-zinc-100 font-semibold tracking-tight text-base whitespace-nowrap">
          <Shield className="w-5 h-5 text-cyan-400 stroke-[2.2]" />
          <span>RepairOS</span>
        </div>
        <span className="text-zinc-600 text-sm" aria-hidden="true">/</span>
        <span className="text-zinc-400 text-sm font-medium whitespace-nowrap">{activePageTitle}</span>
      </div>

      {/* Zone 2: Mode Toggle & Environment State */}
      <div className="flex items-center gap-4 text-xs font-mono shrink-0">
        <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-md p-0.5">
          <button
            onClick={() => onToggleMode('demo')}
            className={`px-2.5 py-1 rounded text-xs transition-colors whitespace-nowrap ${
              currentMode === 'demo'
                ? 'bg-zinc-800 text-amber-300 font-medium'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="Deterministic sample fixtures simulating a Windows 10/11 environment"
          >
            DEMO MODE
          </button>
          <button
            onClick={() => onToggleMode('native')}
            className={`px-2.5 py-1 rounded text-xs transition-colors whitespace-nowrap ${
              currentMode === 'native'
                ? 'bg-zinc-800 text-cyan-300 font-medium'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="Real local backend or Electron IPC bridge"
          >
            NATIVE IPC
          </button>
        </div>

        <div className="hidden lg:flex items-center gap-2 text-zinc-500">
          <Laptop className="w-3.5 h-3.5 text-zinc-400" />
          <span>WIN-64</span>
          <span aria-hidden="true">·</span>
          <span>BUILD 22631</span>
        </div>
      </div>

      {/* Zone 3: Primary Quick Scan Action */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onRunQuickScan}
          disabled={isScanning}
          className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium text-zinc-950 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 rounded-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer shadow-sm shadow-cyan-950/40"
        >
          {isScanning ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Scanning System...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run Diagnostics</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
