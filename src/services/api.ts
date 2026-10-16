/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * RepairOS Unified Client Service
 * Bridges to Electron native IPC, local backend server, or Deterministic Demo Mode.
 */

import {
  SystemOverview,
  ProcessItem,
  StorageVolume,
  FileTreeNode,
  StorageScanProgress,
  StartupEntry,
  WindowsEventItem,
  DiagnosticCheckResult,
  DiagnosticFinding,
  RepairAction,
  RepairExecutionResult,
  ScanRecord,
  AppSettings,
  BackendStatusMessage,
  AppMode,
} from '../types';
import {
  SAMPLE_SYSTEM,
  SAMPLE_PROCESSES,
  SAMPLE_STARTUP_ENTRIES,
  SAMPLE_EVENTS,
  SAMPLE_FINDINGS,
  INITIAL_REPAIRS,
  SAMPLE_SCAN_HISTORY,
  INITIAL_SETTINGS,
} from '../fixtures/sampleData';

declare global {
  interface Window {
    repairOSBridge?: {
      invoke: (channel: string, payload?: any) => Promise<any>;
      onProgress: (callback: (progress: any) => void) => () => void;
      isDesktop: boolean;
    };
  }
}

class RepairOSService {
  private mode: AppMode = 'demo';
  private currentSettings: AppSettings;
  private scanHistory: ScanRecord[] = [];
  private startupEntries: StartupEntry[] = [];
  private scanAborted = false;

  constructor() {
    // Load persisted settings or use default
    const stored = localStorage.getItem('repair_os_settings');
    if (stored) {
      try {
        this.currentSettings = { ...INITIAL_SETTINGS, ...JSON.parse(stored) };
      } catch {
        this.currentSettings = { ...INITIAL_SETTINGS };
      }
    } else {
      this.currentSettings = { ...INITIAL_SETTINGS };
    }

    // Set initial mode
    this.mode = this.currentSettings.mode;

    // Load persisted history
    const storedHistory = localStorage.getItem('repair_os_scan_history');
    if (storedHistory) {
      try {
        this.scanHistory = JSON.parse(storedHistory);
      } catch {
        this.scanHistory = [...SAMPLE_SCAN_HISTORY];
      }
    } else {
      this.scanHistory = [...SAMPLE_SCAN_HISTORY];
    }

    this.startupEntries = [...SAMPLE_STARTUP_ENTRIES];
  }

  public getMode(): AppMode {
    return this.mode;
  }

  public setMode(mode: AppMode): void {
    this.mode = mode;
    this.currentSettings.mode = mode;
    this.saveSettings(this.currentSettings);
  }

  public isDesktopElectron(): boolean {
    return typeof window !== 'undefined' && !!window.repairOSBridge?.isDesktop;
  }

  public async getBackendHealth(): Promise<BackendStatusMessage> {
    if (this.isDesktopElectron()) {
      return window.repairOSBridge!.invoke('backend:health');
    }

    try {
      const res = await fetch('/api/backend/health');
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fall through to demo status
    }

    return {
      status: 'ok',
      version: '1.2.0-web-sandbox',
      platform: 'win32 (Simulated)',
      isElevated: false,
      timestamp: new Date().toISOString(),
    };
  }

  public async getSystemOverview(): Promise<SystemOverview> {
    if (this.isDesktopElectron()) {
      return window.repairOSBridge!.invoke('system:overview');
    }

    try {
      const res = await fetch('/api/backend/overview');
      if (res.ok) {
        const data = await res.json();
        return data;
      }
    } catch {
      // Fall through to demo
    }

    // Return deterministic sample data with live uptime
    return {
      ...SAMPLE_SYSTEM,
      backendStatus: this.mode === 'native' ? 'connected' : 'demo',
      lastScanTimestamp: this.scanHistory[0]?.timestamp || SAMPLE_SYSTEM.lastScanTimestamp,
      unresolvedFindingCount: SAMPLE_FINDINGS.length,
    };
  }

  public async getProcesses(): Promise<ProcessItem[]> {
    if (this.isDesktopElectron()) {
      return window.repairOSBridge!.invoke('system:processes');
    }

    try {
      const res = await fetch('/api/backend/processes');
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Demo mode
    }

    return SAMPLE_PROCESSES;
  }

  public async getVolumes(): Promise<StorageVolume[]> {
    if (this.isDesktopElectron()) {
      return window.repairOSBridge!.invoke('storage:volumes');
    }

    try {
      const res = await fetch('/api/backend/volumes');
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Demo mode
    }

    return SAMPLE_SYSTEM.volumes;
  }

  public cancelScan(): void {
    this.scanAborted = true;
    if (this.isDesktopElectron()) {
      window.repairOSBridge!.invoke('storage:cancel-scan');
    }
  }

  public async scanDirectory(
    dirPath: string,
    onProgress?: (p: StorageScanProgress) => void
  ): Promise<FileTreeNode> {
    this.scanAborted = false;

    if (this.isDesktopElectron()) {
      const unsubscribe = window.repairOSBridge!.onProgress((p) => {
        if (onProgress) onProgress(p);
      });
      try {
        const result = await window.repairOSBridge!.invoke('storage:scan-dir', { path: dirPath });
        unsubscribe();
        return result;
      } catch (e) {
        unsubscribe();
        throw e;
      }
    }

    // Realistic progressive scan simulation for browser demo mode
    const simulatedFiles = [
      { name: 'Windows.edb (Search Index)', path: `${dirPath}\\Search\\Data\\Windows.edb`, size: 14200000000, ext: 'edb' },
      { name: 'hiberfil.sys', path: `${dirPath}\\hiberfil.sys`, size: 13421772800, ext: 'sys' },
      { name: 'pagefile.sys', path: `${dirPath}\\pagefile.sys`, size: 8589934592, ext: 'sys' },
      { name: 'SoftwareDistribution.old', path: `${dirPath}\\SoftwareDistribution.old`, size: 7600000000, ext: 'old' },
      { name: 'installer_cache.msi', path: `${dirPath}\\Installer\\cache_01.msi`, size: 3200000000, ext: 'msi' },
      { name: 'docker_desktop_vm.vhdx', path: `${dirPath}\\Docker\\wsl\\data\\ext4.vhdx`, size: 28400000000, ext: 'vhdx' },
      { name: 'node_modules_archive.zip', path: `${dirPath}\\Projects\\archive.zip`, size: 2100000000, ext: 'zip' },
      { name: 'Teams_video_recordings.mp4', path: `${dirPath}\\Videos\\Recordings\\all_hands.mp4`, size: 4800000000, ext: 'mp4' },
      { name: 'temp_crash_dump.dmp', path: `${dirPath}\\CrashDumps\\dump_20261014.dmp`, size: 1450000000, ext: 'dmp' },
      { name: 'npm_cache', path: `${dirPath}\\AppData\\Local\\npm-cache`, size: 1980000000, ext: 'cache' },
    ];

    let totalBytes = 0;
    for (let i = 0; i < simulatedFiles.length; i++) {
      if (this.scanAborted) {
        throw new Error('Scan cancelled by user.');
      }
      totalBytes += simulatedFiles[i].size;
      if (onProgress) {
        onProgress({
          scannedFiles: (i + 1) * 342,
          scannedDirectories: (i + 1) * 28,
          scannedBytes: totalBytes,
          currentDirectory: simulatedFiles[i].path,
          percent: Math.round(((i + 1) / simulatedFiles.length) * 100),
          isScanning: i < simulatedFiles.length - 1,
        });
      }
      // Small pause to allow user to experience the real cancellation and progress
      await new Promise((resolve) => setTimeout(resolve, 180));
    }

    return {
      name: dirPath,
      path: dirPath,
      sizeBytes: totalBytes,
      isDirectory: true,
      children: simulatedFiles.map((f) => ({
        name: f.name,
        path: f.path,
        sizeBytes: f.size,
        isDirectory: false,
        extension: f.ext,
        lastModified: '2026-10-15T10:00:00.000Z',
      })),
    };
  }

  public async getStartupEntries(): Promise<StartupEntry[]> {
    if (this.isDesktopElectron()) {
      return window.repairOSBridge!.invoke('startup:list');
    }

    try {
      const res = await fetch('/api/backend/startup');
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Demo mode
    }

    return this.startupEntries;
  }

  public async toggleStartupEntry(id: string, isEnabled: boolean): Promise<{ success: boolean; message: string }> {
    if (this.isDesktopElectron()) {
      return window.repairOSBridge!.invoke('startup:toggle', { id, isEnabled });
    }

    const idx = this.startupEntries.findIndex((e) => e.id === id);
    if (idx !== -1) {
      this.startupEntries[idx] = {
        ...this.startupEntries[idx],
        isEnabled,
      };
      return {
        success: true,
        message: `Startup entry "${this.startupEntries[idx].name}" has been ${isEnabled ? 'enabled' : 'disabled'}. Original registry state recorded.`,
      };
    }
    return { success: false, message: 'Startup entry not found.' };
  }

  public async getEventLogs(params?: {
    logName?: string;
    level?: string;
    days?: number;
    search?: string;
  }): Promise<WindowsEventItem[]> {
    if (this.isDesktopElectron()) {
      return window.repairOSBridge!.invoke('events:query', params);
    }

    try {
      const query = new URLSearchParams();
      if (params?.logName) query.set('logName', params.logName);
      if (params?.level) query.set('level', params.level);
      const res = await fetch(`/api/backend/events?${query.toString()}`);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Demo mode
    }

    let results = [...SAMPLE_EVENTS];
    if (params?.logName && params.logName !== 'All') {
      results = results.filter((e) => e.logName === params.logName);
    }
    if (params?.level && params.level !== 'All') {
      results = results.filter((e) => e.level.toLowerCase() === params.level?.toLowerCase());
    }
    if (params?.search) {
      const q = params.search.toLowerCase();
      results = results.filter(
        (e) =>
          e.message.toLowerCase().includes(q) ||
          e.source.toLowerCase().includes(q) ||
          e.eventId.toString().includes(q)
      );
    }
    return results;
  }

  public async runDiagnostics(): Promise<{
    results: DiagnosticCheckResult[];
    findings: DiagnosticFinding[];
    summary: { passed: number; warning: number; problem: number; inconclusive: number };
  }> {
    if (this.isDesktopElectron()) {
      const data = await window.repairOSBridge!.invoke('diagnostics:run-all');
      this.recordScanResult(data.findings);
      return data;
    }

    // Realistic diagnostic rules execution
    const results: DiagnosticCheckResult[] = [
      {
        checkId: 'check-disk-space',
        checkName: 'Storage Volume Capacity and Free Space',
        state: 'problem_detected',
        severity: 'problem',
        summary: 'Volume C: free space is below the 15% safety headroom threshold (12.0% free).',
        evidenceSummary: 'Capacity: 475 GB, Free: 57 GB, Used: 88.0%, Safety Threshold: 85.0%',
        durationMs: 42,
        findings: [SAMPLE_FINDINGS[0]],
      },
      {
        checkId: 'check-memory-usage',
        checkName: 'Physical RAM Saturation and Commit Pressure',
        state: 'warning',
        severity: 'warning',
        summary: 'Physical RAM usage (80.0%) exceeds 80% threshold.',
        evidenceSummary: 'Installed: 32 GB, Used: 25.6 GB, Available: 6.4 GB',
        durationMs: 38,
        findings: [SAMPLE_FINDINGS[1]],
      },
      {
        checkId: 'check-cpu-utilization',
        checkName: 'Sustained Processor Load Check',
        state: 'passed',
        severity: 'info',
        summary: 'Processor utilization (42%) is within acceptable operating bounds (<85%).',
        evidenceSummary: '14 Cores / 20 Threads, Load: 42%, Baseline Clock: 2.4 GHz',
        durationMs: 51,
        findings: [],
      },
      {
        checkId: 'check-process-footprint',
        checkName: 'Heavy Background Process Enumeration',
        state: 'passed',
        severity: 'info',
        summary: 'No runaway or rogue processes consuming >80% single-core CPU.',
        evidenceSummary: 'Top process chrome.exe (12.4% CPU, 4.18 GB RAM)',
        durationMs: 62,
        findings: [],
      },
      {
        checkId: 'check-startup-targets',
        checkName: 'Startup Item Integrity and Missing Target Verification',
        state: 'warning',
        severity: 'warning',
        summary: '1 startup registry entry references an unresolvable file path.',
        evidenceSummary: 'Orphaned entry: LegacyUpdaterStale -> C:\\Users\\User\\AppData\\Local\\OldApp\\updater.exe',
        durationMs: 29,
        findings: [SAMPLE_FINDINGS[2]],
      },
      {
        checkId: 'check-app-errors',
        checkName: 'Application Event Log Crash Detection (Event 1000)',
        state: 'problem_detected',
        severity: 'problem',
        summary: 'Faulting module crash (ntdll.dll, 0xc0000005) recorded in Teams.exe.',
        evidenceSummary: 'Event ID 1000 logged at 2026-10-16 14:12:08',
        durationMs: 74,
        findings: [SAMPLE_FINDINGS[3]],
      },
      {
        checkId: 'check-system-services',
        checkName: 'Service Control Manager Abrupt Terminations (Event 7031)',
        state: 'warning',
        severity: 'warning',
        summary: 'Docker Desktop Service terminated unexpectedly once in the last 24h.',
        evidenceSummary: 'Event ID 7031 logged at 2026-10-16 12:05:44',
        durationMs: 68,
        findings: [],
      },
      {
        checkId: 'check-diagnostic-services',
        checkName: 'Diagnostic Policy Service & WER Status',
        state: 'passed',
        severity: 'info',
        summary: 'Diagnostic Policy Service (DPS) and Windows Error Reporting (WerSvc) are running.',
        evidenceSummary: 'DPS: Running (Automatic), WerSvc: Running (Manual)',
        durationMs: 31,
        findings: [],
      },
      {
        checkId: 'check-windows-update',
        checkName: 'Windows Update Service & Pending Reboot State',
        state: 'passed',
        severity: 'info',
        summary: 'Windows Update service reachable. No reboot pending in Component Based Servicing (CBS).',
        evidenceSummary: 'RebootRequired flag: False',
        durationMs: 45,
        findings: [],
      },
      {
        checkId: 'check-filesystem-integrity',
        checkName: 'System Volume Paging & Filesystem Event Inspection',
        state: 'passed',
        severity: 'info',
        summary: 'NTFS metadata clean. Brief paging warning (Event 51) did not escalate to filesystem corruption.',
        evidenceSummary: 'Chkdsk dirty bit: False',
        durationMs: 35,
        findings: [],
      },
    ];

    const findings = results.flatMap((r) => r.findings);
    const summary = {
      passed: results.filter((r) => r.state === 'passed').length,
      warning: results.filter((r) => r.state === 'warning').length,
      problem: results.filter((r) => r.state === 'problem_detected').length,
      inconclusive: results.filter((r) => r.state === 'inconclusive').length,
    };

    this.recordScanResult(findings);

    return { results, findings, summary };
  }

  private recordScanResult(findings: DiagnosticFinding[]): void {
    const newRecord: ScanRecord = {
      id: `scan-${Date.now()}`,
      timestamp: new Date().toISOString(),
      durationSeconds: 3.2,
      scanType: 'full',
      totalChecks: 10,
      passedCount: 6,
      warningCount: 2,
      problemCount: 2,
      inconclusiveCount: 0,
      findings,
      appVersion: '1.2.0',
    };
    this.scanHistory.unshift(newRecord);
    localStorage.setItem('repair_os_scan_history', JSON.stringify(this.scanHistory.slice(0, 50)));
  }

  public async getRepairs(): Promise<RepairAction[]> {
    return INITIAL_REPAIRS;
  }

  public async executeRepair(repairId: string): Promise<RepairExecutionResult> {
    const repair = INITIAL_REPAIRS.find((r) => r.id === repairId);
    if (!repair) {
      return {
        repairId,
        timestamp: new Date().toISOString(),
        success: false,
        message: 'Specified repair definition does not exist.',
        verificationPassed: false,
        logs: ['Error: Unknown repair action identifier.'],
        rollbackPossible: false,
      };
    }

    if (this.isDesktopElectron()) {
      return window.repairOSBridge!.invoke('repairs:execute', { repairId });
    }

    try {
      const res = await fetch('/api/backend/repairs/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repairId }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Demo mode
    }

    // Demo execution with realistic verification
    await new Promise((resolve) => setTimeout(resolve, 800));

    if (repair.targetAction.type === 'launch_settings') {
      return {
        repairId,
        timestamp: new Date().toISOString(),
        success: true,
        message: `Launched native Windows settings URI "${repair.targetAction.parameter}".`,
        verificationPassed: true,
        logs: [
          `Preconditions checked: Windows Settings shell protocol available.`,
          `Invoked shell command: explorer.exe ${repair.targetAction.parameter}`,
          `Verification: Target process registered successfully.`,
        ],
        rollbackPossible: false,
      };
    }

    if (repair.targetAction.type === 'clean_cache') {
      return {
        repairId,
        timestamp: new Date().toISOString(),
        success: true,
        message: 'Successfully removed 4 stale temporary report files, freeing 18.4 MB.',
        verificationPassed: true,
        logs: [
          `Identified folder: %LOCALAPPDATA%\\RepairOS\\TempExports`,
          `Verified no user files or registry items modified.`,
          `Deleted: 4 temporary HTML/CSV snapshots older than retention threshold.`,
          `Re-verified directory: Clean state confirmed.`,
        ],
        rollbackPossible: false,
      };
    }

    return {
      repairId,
      timestamp: new Date().toISOString(),
      success: true,
      message: 'System resource verification completed. Fresh telemetry recorded.',
      verificationPassed: true,
      logs: [
        'Sampled fresh CPU metrics: 39% load.',
        'Sampled physical RAM: 78.4% used.',
        'Verification passed: resource levels are stable.',
      ],
      rollbackPossible: false,
    };
  }

  public getScanHistory(): ScanRecord[] {
    return this.scanHistory;
  }

  public getSettings(): AppSettings {
    return this.currentSettings;
  }

  public saveSettings(settings: AppSettings): void {
    this.currentSettings = settings;
    localStorage.setItem('repair_os_settings', JSON.stringify(settings));
  }

  public resetSettings(): AppSettings {
    this.currentSettings = { ...INITIAL_SETTINGS };
    localStorage.setItem('repair_os_settings', JSON.stringify(this.currentSettings));
    return this.currentSettings;
  }
}

export const api = new RepairOSService();
