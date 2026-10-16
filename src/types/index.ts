/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * RepairOS Core TypeScript Type Definitions
 */

export type AppMode = 'native' | 'demo';

export type SeverityLevel = 'info' | 'warning' | 'problem' | 'critical';

export type DiagnosticState =
  | 'passed'
  | 'warning'
  | 'problem_detected'
  | 'inconclusive'
  | 'skipped'
  | 'failed_to_collect';

export interface SystemOverview {
  computerName: string;
  osEdition: string;
  osVersion: string;
  osBuild: string;
  architecture: string;
  processor: {
    name: string;
    cores: number;
    logicalProcessors: number;
    baseClockGhz: number;
    currentLoadPercent: number;
  };
  memory: {
    totalPhysicalBytes: number;
    availablePhysicalBytes: number;
    usedPhysicalBytes: number;
    usagePercent: number;
    committedBytes: number;
    commitLimitBytes: number;
  };
  uptimeSeconds: number;
  volumes: StorageVolume[];
  lastScanTimestamp: string | null;
  unresolvedFindingCount: number;
  recentRepairsCount: number;
  backendVersion: string;
  backendStatus: 'connected' | 'connecting' | 'disconnected' | 'demo';
  isElevated: boolean;
}

export interface StorageVolume {
  driveLetter: string;
  label: string;
  fileSystem: string;
  totalBytes: number;
  freeBytes: number;
  usedBytes: number;
  usagePercent: number;
  isSystemDrive: boolean;
  isLowSpace: boolean;
}

export interface ProcessItem {
  pid: number;
  name: string;
  executablePath: string;
  cpuPercent: number;
  memoryWorkingSetBytes: number;
  memoryPrivateBytes: number;
  threadCount: number;
  status: 'running' | 'suspended' | 'terminating';
  companyName?: string;
  isSystemProcess: boolean;
}

export interface FileTreeNode {
  name: string;
  path: string;
  sizeBytes: number;
  isDirectory: boolean;
  children?: FileTreeNode[];
  extension?: string;
  lastModified?: string;
}

export interface StorageScanProgress {
  scannedFiles: number;
  scannedDirectories: number;
  scannedBytes: number;
  currentDirectory: string;
  percent: number;
  isScanning: boolean;
}

export interface StartupEntry {
  id: string;
  name: string;
  publisher: string;
  command: string;
  targetPath: string;
  locationType: 'Registry-CurrentUser' | 'Registry-LocalMachine' | 'StartupFolder-User' | 'StartupFolder-Common' | 'TaskScheduler';
  isEnabled: boolean;
  fileExists: boolean;
  isSigned: boolean;
  signatureSigner?: string;
  impactScore: 'low' | 'medium' | 'high' | 'unknown';
  warningMessage?: string;
  originalRegistryKey?: string;
}

export interface WindowsEventItem {
  recordNumber: number;
  timestamp: string;
  logName: 'Application' | 'System';
  source: string;
  eventId: number;
  level: 'Information' | 'Warning' | 'Error' | 'Critical';
  message: string;
  processId?: number;
  faultingModule?: string;
  diagnosticInterpretation?: string;
  confidence: 'high' | 'medium' | 'low';
  suggestedSteps: string[];
}

export interface DiagnosticCheckDefinition {
  id: string;
  code: string;
  name: string;
  category: 'storage' | 'memory' | 'processor' | 'processes' | 'startup' | 'events' | 'system' | 'update';
  description: string;
  thresholdRule: string;
  requiredPermissions: 'user' | 'administrator';
}

export interface DiagnosticFinding {
  id: string;
  checkId: string;
  checkCode: string;
  title: string;
  description: string;
  severity: SeverityLevel;
  state: DiagnosticState;
  timestamp: string;
  evidence: Record<string, any>;
  affectedResource?: string;
  recommendedAction: string;
  confidence: 'high' | 'medium' | 'low';
  collectionLimitations?: string;
  relatedRepairId?: string;
}

export interface DiagnosticCheckResult {
  checkId: string;
  checkName: string;
  state: DiagnosticState;
  severity: SeverityLevel;
  summary: string;
  findings: DiagnosticFinding[];
  evidenceSummary: string;
  durationMs: number;
}

export interface RepairAction {
  id: string;
  title: string;
  category: 'system' | 'storage' | 'startup' | 'report' | 'troubleshoot';
  purpose: string;
  applicableWindowsVersions: string[];
  preconditions: string[];
  requiredPrivileges: 'user' | 'administrator';
  potentialSideEffects: string[];
  dataModified: string[];
  requiresRestart: boolean;
  isRollbackAvailable: boolean;
  executionSteps: string[];
  verificationMethod: string;
  targetAction: {
    type: 'launch_settings' | 'open_folder' | 'rerun_check' | 'clean_cache' | 'disable_startup';
    parameter?: string;
  };
}

export interface RepairExecutionResult {
  repairId: string;
  timestamp: string;
  success: boolean;
  message: string;
  verificationPassed: boolean;
  logs: string[];
  rollbackPossible: boolean;
}

export interface ScanRecord {
  id: string;
  timestamp: string;
  durationSeconds: number;
  scanType: 'full' | 'quick' | 'storage' | 'startup' | 'events';
  totalChecks: number;
  passedCount: number;
  warningCount: number;
  problemCount: number;
  inconclusiveCount: number;
  findings: DiagnosticFinding[];
  appVersion: string;
}

export interface DiagnosticReport {
  id: string;
  createdAt: string;
  system: SystemOverview;
  findings: DiagnosticFinding[];
  checksRun: DiagnosticCheckResult[];
  repairsApplied: RepairExecutionResult[];
  notes: string;
}

export interface AppSettings {
  mode: AppMode;
  theme: 'graphite-dark' | 'graphite-midnight';
  refreshIntervalSeconds: number;
  storageThresholdPercent: number;
  memoryThresholdPercent: number;
  cpuThresholdPercent: number;
  eventLogDaysToAnalyze: number;
  historyRetentionDays: number;
  enableAiExplanations: boolean;
  anonymizePathsInAi: boolean;
  exportFormat: 'html' | 'csv' | 'json';
}

export interface BackendStatusMessage {
  status: 'ok' | 'error';
  version: string;
  platform: string;
  isElevated: boolean;
  timestamp: string;
}
