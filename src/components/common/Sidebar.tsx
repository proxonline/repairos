/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * RepairOS Sidebar Navigation
 * 10 required application pages with clean icons, active state, and finding count.
 */

import React from 'react';
import {
  LayoutDashboard,
  Cpu,
  HardDrive,
  Power,
  AlertTriangle,
  Stethoscope,
  Wrench,
  History,
  FileText,
  Settings,
} from 'lucide-react';

export type PageId =
  | 'overview'
  | 'hardware'
  | 'storage'
  | 'startup'
  | 'events'
  | 'diagnostics'
  | 'repairs'
  | 'history'
  | 'reports'
  | 'settings';

interface SidebarProps {
  activePage: PageId;
  onSelectPage: (page: PageId) => void;
  unresolvedFindingCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  onSelectPage,
  unresolvedFindingCount,
}) => {
  const navItems = [
    { id: 'overview' as PageId, label: 'Overview', icon: LayoutDashboard },
    { id: 'hardware' as PageId, label: 'Hardware & Perf', icon: Cpu },
    { id: 'storage' as PageId, label: 'Storage Analyzer', icon: HardDrive },
    { id: 'startup' as PageId, label: 'Startup Manager', icon: Power },
    { id: 'events' as PageId, label: 'Windows Errors', icon: AlertTriangle },
    {
      id: 'diagnostics' as PageId,
      label: 'Diagnostic Center',
      icon: Stethoscope,
      badge: unresolvedFindingCount > 0 ? unresolvedFindingCount : undefined,
    },
    { id: 'repairs' as PageId, label: 'Repair Center', icon: Wrench },
    { id: 'history' as PageId, label: 'Scan History', icon: History },
    { id: 'reports' as PageId, label: 'Reports', icon: FileText },
    { id: 'settings' as PageId, label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-60 border-r border-zinc-800 bg-zinc-950/95 flex flex-col justify-between py-4 select-none shrink-0 h-full">
      <div className="space-y-1 px-3">
        <div className="px-3 pb-2 text-[11px] font-mono uppercase tracking-wider text-zinc-500">
          Workstation Navigation
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectPage(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors cursor-pointer text-left ${
                isActive
                  ? 'bg-zinc-800 text-cyan-300 font-semibold shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-zinc-500'}`} />
                <span className="whitespace-nowrap">{item.label}</span>
              </div>

              {item.badge !== undefined && (
                <span className="font-mono text-[11px] font-semibold text-amber-400 tabular-nums">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="px-5 pt-3 border-t border-zinc-900 text-[11px] text-zinc-500 font-mono space-y-1">
        <div>REPAIROS WORKSTATION</div>
        <div className="text-zinc-600">v1.2.0 · Local-First Architecture</div>
      </div>
    </aside>
  );
};
