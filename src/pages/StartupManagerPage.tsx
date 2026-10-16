/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * RepairOS Startup Manager Page
 * Registry & Startup folder inventory, target validation, signature verification, safe toggle.
 */

import React, { useState } from 'react';
import {
  Power,
  CheckCircle2,
  AlertTriangle,
  FileQuestion,
  ShieldCheck,
  ShieldAlert,
  FolderOpen,
  Info,
} from 'lucide-react';
import { StartupEntry } from '../types';
import { api } from '../services/api';

interface StartupManagerPageProps {
  entries: StartupEntry[];
  onRefresh: () => void;
}

export const StartupManagerPage: React.FC<StartupManagerPageProps> = ({
  entries,
  onRefresh,
}) => {
  const [filter, setFilter] = useState<'all' | 'enabled' | 'warnings'>('all');
  const [selectedEntry, setSelectedEntry] = useState<StartupEntry | null>(null);
  const [togglePending, setTogglePending] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const handleToggle = async (entry: StartupEntry) => {
    setTogglePending(entry.id);
    try {
      const res = await api.toggleStartupEntry(entry.id, !entry.isEnabled);
      setNotification(res.message);
      onRefresh();
    } catch (err: any) {
      setNotification(`Failed to modify startup entry: ${err.message}`);
    } finally {
      setTogglePending(null);
    }
  };

  const filteredEntries = entries.filter((e) => {
    if (filter === 'enabled') return e.isEnabled;
    if (filter === 'warnings') return !e.fileExists || !!e.warningMessage;
    return true;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-zinc-100 tracking-tight">Startup Manager</h1>
          <p className="text-xs text-zinc-400">
            Inventory of items registered to launch at user logon via Registry (HKCU/HKLM) and Startup folders
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-md">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              filter === 'all' ? 'bg-zinc-800 text-cyan-300 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            All Items ({entries.length})
          </button>
          <button
            onClick={() => setFilter('enabled')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              filter === 'enabled' ? 'bg-zinc-800 text-cyan-300 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Enabled ({entries.filter((e) => e.isEnabled).length})
          </button>
          <button
            onClick={() => setFilter('warnings')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              filter === 'warnings' ? 'bg-zinc-800 text-amber-300 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Warnings ({entries.filter((e) => !e.fileExists || !!e.warningMessage).length})
          </button>
        </div>
      </div>

      {notification && (
        <div className="p-3 bg-zinc-900 border border-cyan-800/80 rounded-md text-xs text-cyan-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0" />
            <span>{notification}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-zinc-500 hover:text-zinc-300 text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-4">
        <div className="border border-zinc-800 rounded-md overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-800 text-[11px]">
              <tr>
                <th className="py-2.5 px-3">STATUS</th>
                <th className="py-2.5 px-3">NAME & PUBLISHER</th>
                <th className="py-2.5 px-3">REGISTRATION SOURCE</th>
                <th className="py-2.5 px-3">SIGNATURE</th>
                <th className="py-2.5 px-3">IMPACT</th>
                <th className="py-2.5 px-3 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
              {filteredEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-zinc-800/40 transition-colors">
                  <td className="py-2.5 px-3">
                    <button
                      onClick={() => handleToggle(entry)}
                      disabled={togglePending === entry.id}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                        entry.isEnabled
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                          : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                      }`}
                    >
                      {togglePending === entry.id
                        ? 'Updating...'
                        : entry.isEnabled
                        ? 'ENABLED'
                        : 'DISABLED'}
                    </button>
                  </td>

                  <td className="py-2.5 px-3">
                    <div className="font-medium text-zinc-100 flex items-center gap-2">
                      <span>{entry.name}</span>
                      {!entry.fileExists && (
                        <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider">
                          [MISSING TARGET]
                        </span>
                      )}
                    </div>
                    <div className="text-zinc-400 text-[11px] truncate max-w-sm">
                      {entry.publisher}
                    </div>
                    {entry.warningMessage && (
                      <div className="text-amber-400 text-[11px] mt-0.5">
                        {entry.warningMessage}
                      </div>
                    )}
                  </td>

                  <td className="py-2.5 px-3 text-zinc-400 text-[11px]">
                    <div className="text-zinc-300">{entry.locationType}</div>
                    <div className="truncate max-w-xs text-zinc-500 text-[10px]">{entry.targetPath}</div>
                  </td>

                  <td className="py-2.5 px-3">
                    {entry.isSigned ? (
                      <div className="flex items-center gap-1.5 text-zinc-300 text-[11px]">
                        <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span className="truncate max-w-[140px]">{entry.signatureSigner || 'Signed'}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-zinc-500 text-[11px]">
                        <FileQuestion className="w-3.5 h-3.5 shrink-0" />
                        <span>Unsigned / Not Verified</span>
                      </div>
                    )}
                  </td>

                  <td className="py-2.5 px-3">
                    <span
                      className={`text-[11px] uppercase font-semibold ${
                        entry.impactScore === 'high'
                          ? 'text-amber-400'
                          : entry.impactScore === 'medium'
                          ? 'text-zinc-300'
                          : 'text-zinc-500'
                      }`}
                    >
                      {entry.impactScore}
                    </span>
                  </td>

                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={() => setSelectedEntry(entry)}
                      className="px-2.5 py-1 text-xs text-cyan-300 hover:text-cyan-200 border border-zinc-800 rounded transition-colors"
                    >
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Entry Detail Modal / Panel */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="w-full max-w-xl bg-zinc-900 border border-zinc-700 rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">{selectedEntry.name}</h3>
                <p className="text-xs text-zinc-400">Startup registration inspect</p>
              </div>
              <button
                onClick={() => setSelectedEntry(null)}
                className="text-zinc-500 hover:text-zinc-300 text-xs px-2 py-1"
              >
                Close
              </button>
            </div>

            <div className="space-y-2 text-xs font-mono text-zinc-300">
              <div>
                <span className="text-zinc-500 block text-[11px]">COMMAND LINE:</span>
                <span className="text-zinc-200 select-all break-all">{selectedEntry.command}</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[11px]">TARGET EXECUTABLE:</span>
                <span className="text-zinc-200 select-all break-all">{selectedEntry.targetPath}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <span className="text-zinc-500 block text-[11px]">TARGET EXISTS ON DISK:</span>
                  <span className={selectedEntry.fileExists ? 'text-emerald-400' : 'text-rose-400 font-bold'}>
                    {selectedEntry.fileExists ? 'Yes' : 'No (Orphaned)'}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[11px]">REGISTRATION SOURCE:</span>
                  <span>{selectedEntry.locationType}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-zinc-800">
              <button
                onClick={() => setSelectedEntry(null)}
                className="px-3.5 py-1.5 text-xs text-zinc-300 hover:text-white bg-zinc-800 rounded transition-colors"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
