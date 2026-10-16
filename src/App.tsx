/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * RepairOS Application Entry Point
 * Manages full navigation across 10 pages, state coordination, and diagnostics.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { TopBar } from './components/common/TopBar';
import { Sidebar, PageId } from './components/common/Sidebar';
import { OverviewPage } from './pages/OverviewPage';
import { HardwarePerformancePage } from './pages/HardwarePerformancePage';
import { StorageAnalyzerPage } from './pages/StorageAnalyzerPage';
import { StartupManagerPage } from './pages/StartupManagerPage';
import { WindowsErrorAnalyzerPage } from './pages/WindowsErrorAnalyzerPage';
import { DiagnosticCenterPage } from './pages/DiagnosticCenterPage';
import { RepairCenterPage } from './pages/RepairCenterPage';
import { ScanHistoryPage } from './pages/ScanHistoryPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { AiExplanationModal } from './components/common/AiExplanationModal';

import {
  SystemOverview,
  DiagnosticFinding,
  DiagnosticCheckResult,
  ProcessItem,
  StorageVolume,
  StartupEntry,
  WindowsEventItem,
  RepairAction,
  ScanRecord,
  AppSettings,
  AppMode,
} from './types';
import { api } from './services/api';

export default function App() {
  const [activePage, setActivePage] = useState<PageId>('overview');
  const [currentMode, setCurrentMode] = useState<AppMode>(api.getMode());
  const [system, setSystem] = useState<SystemOverview | null>(null);
  const [findings, setFindings] = useState<DiagnosticFinding[]>([]);
  const [checks, setChecks] = useState<DiagnosticCheckResult[]>([]);
  const [processes, setProcesses] = useState<ProcessItem[]>([]);
  const [volumes, setVolumes] = useState<StorageVolume[]>([]);
  const [startupEntries, setStartupEntries] = useState<StartupEntry[]>([]);
  const [events, setEvents] = useState<WindowsEventItem[]>([]);
  const [repairs, setRepairs] = useState<RepairAction[]>([]);
  const [history, setHistory] = useState<ScanRecord[]>([]);
  const [settings, setSettings] = useState<AppSettings>(api.getSettings());
  const [isScanning, setIsScanning] = useState(false);
  const [selectedFindingForAi, setSelectedFindingForAi] = useState<DiagnosticFinding | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [sys, procs, vols, start, evts, reps] = await Promise.all([
        api.getSystemOverview(),
        api.getProcesses(),
        api.getVolumes(),
        api.getStartupEntries(),
        api.getEventLogs(),
        api.getRepairs(),
      ]);

      setSystem(sys);
      setProcesses(procs);
      setVolumes(vols);
      setStartupEntries(start);
      setEvents(evts);
      setRepairs(reps);
      setHistory(api.getScanHistory());

      // Initial diagnostics run if empty
      if (checks.length === 0) {
        const diag = await api.runDiagnostics();
        setChecks(diag.results);
        setFindings(diag.findings);
      }
    } catch (err) {
      console.error('Error loading initial data:', err);
    }
  }, [checks.length]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRunFullScan = async () => {
    setIsScanning(true);
    try {
      const diag = await api.runDiagnostics();
      setChecks(diag.results);
      setFindings(diag.findings);
      setHistory(api.getScanHistory());

      const sys = await api.getSystemOverview();
      setSystem({
        ...sys,
        unresolvedFindingCount: diag.findings.length,
      });
    } catch (err) {
      console.error('Scan failed:', err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleToggleMode = (mode: AppMode) => {
    api.setMode(mode);
    setCurrentMode(mode);
    setSettings((prev) => ({ ...prev, mode }));
    loadData();
  };

  const pageTitles: Record<PageId, string> = {
    overview: 'System Overview',
    hardware: 'Hardware & Performance',
    storage: 'Storage Analyzer',
    startup: 'Startup Manager',
    events: 'Windows Error Analyzer',
    diagnostics: 'Diagnostic Center',
    repairs: 'Repair Center',
    history: 'Scan History',
    reports: 'Diagnostic Reports',
    settings: 'Workstation Settings',
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100 font-sans">
      {/* Top Bar with 3-Zone Contract */}
      <TopBar
        currentMode={currentMode}
        onToggleMode={handleToggleMode}
        onRunQuickScan={handleRunFullScan}
        isScanning={isScanning}
        activePageTitle={pageTitles[activePage]}
      />

      {/* Main Workspace Frame */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Persistent Navigation Sidebar */}
        <Sidebar
          activePage={activePage}
          onSelectPage={setActivePage}
          unresolvedFindingCount={findings.length}
        />

        {/* Content Viewport */}
        <main className="flex-1 overflow-y-auto bg-zinc-950/40">
          {activePage === 'overview' && (
            <OverviewPage
              system={system}
              findings={findings}
              onNavigate={setActivePage}
              onRunScan={handleRunFullScan}
              onExplainFinding={setSelectedFindingForAi}
            />
          )}

          {activePage === 'hardware' && (
            <HardwarePerformancePage
              system={system}
              processes={processes}
              onRefresh={loadData}
            />
          )}

          {activePage === 'storage' && (
            <StorageAnalyzerPage volumes={volumes} />
          )}

          {activePage === 'startup' && (
            <StartupManagerPage
              entries={startupEntries}
              onRefresh={async () => {
                const updated = await api.getStartupEntries();
                setStartupEntries(updated);
              }}
            />
          )}

          {activePage === 'events' && (
            <WindowsErrorAnalyzerPage events={events} />
          )}

          {activePage === 'diagnostics' && (
            <DiagnosticCenterPage
              checks={checks}
              isScanning={isScanning}
              onRunScan={handleRunFullScan}
              onExplainFinding={setSelectedFindingForAi}
              onNavigate={setActivePage}
            />
          )}

          {activePage === 'repairs' && (
            <RepairCenterPage
              repairs={repairs}
              onRepairCompleted={loadData}
            />
          )}

          {activePage === 'history' && (
            <ScanHistoryPage
              history={history}
              onSelectFindingForAi={setSelectedFindingForAi}
            />
          )}

          {activePage === 'reports' && (
            <ReportsPage
              system={system}
              findings={findings}
              checks={checks}
            />
          )}

          {activePage === 'settings' && (
            <SettingsPage
              settings={settings}
              onUpdateSettings={setSettings}
            />
          )}
        </main>
      </div>

      {/* AI Explanation Modal */}
      <AiExplanationModal
        finding={selectedFindingForAi}
        isOpen={!!selectedFindingForAi}
        onClose={() => setSelectedFindingForAi(null)}
      />
    </div>
  );
}
