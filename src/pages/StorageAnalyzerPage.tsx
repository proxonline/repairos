/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * RepairOS Storage Analyzer Page
 * Volume enumeration, recursive directory traversal with cancellation, large file identification, and CSV export.
 */

import React, { useState } from 'react';
import {
  HardDrive,
  FolderSearch,
  StopCircle,
  FileText,
  Filter,
  Download,
  CheckCircle2,
  AlertTriangle,
  Folder,
  FileCode,
} from 'lucide-react';
import { StorageVolume, FileTreeNode, StorageScanProgress } from '../types';
import { api } from '../services/api';

interface StorageAnalyzerPageProps {
  volumes: StorageVolume[];
}

export const StorageAnalyzerPage: React.FC<StorageAnalyzerPageProps> = ({ volumes }) => {
  const [selectedPath, setSelectedPath] = useState('C:\\Users');
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState<StorageScanProgress | null>(null);
  const [scanResult, setScanResult] = useState<FileTreeNode | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [filterExt, setFilterExt] = useState('all');

  const formatBytes = (bytes: number) => {
    if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(2)} GB`;
    if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
    return `${(bytes / 1e3).toFixed(1)} KB`;
  };

  const handleStartScan = async () => {
    setIsScanning(true);
    setErrorMsg(null);
    setScanResult(null);

    try {
      const result = await api.scanDirectory(selectedPath, (p) => {
        setProgress(p);
      });
      setScanResult(result);
    } catch (err: any) {
      setErrorMsg(err.message || 'Scan stopped.');
    } finally {
      setIsScanning(false);
      setProgress(null);
    }
  };

  const handleCancel = () => {
    api.cancelScan();
  };

  const handleExportCsv = () => {
    if (!scanResult || !scanResult.children) return;
    const header = 'Name,Path,SizeBytes,SizeFormatted,Extension\n';
    const rows = scanResult.children
      .map(
        (c) =>
          `"${c.name}","${c.path}",${c.sizeBytes},"${formatBytes(c.sizeBytes)}","${c.extension || ''}"`
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `StorageScan_${selectedPath.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredItems = (scanResult?.children || [])
    .filter((item) => {
      if (filterExt === 'all') return true;
      return item.extension?.toLowerCase() === filterExt.toLowerCase();
    })
    .sort((a, b) => b.sizeBytes - a.sizeBytes);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-zinc-100 tracking-tight">Storage Analyzer</h1>
          <p className="text-xs text-zinc-400">
            Traverse accessible paths safely, pinpoint heavy directories, and identify reclaiming targets
          </p>
        </div>

        {scanResult && (
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-200 hover:text-white bg-zinc-900 border border-zinc-800 rounded-md transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        )}
      </div>

      {/* Storage Volumes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {volumes.map((vol) => (
          <div
            key={vol.driveLetter}
            className={`bg-zinc-900 border rounded-lg p-4 space-y-3 ${
              vol.isLowSpace ? 'border-amber-700/60' : 'border-zinc-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className={`w-4 h-4 ${vol.isLowSpace ? 'text-amber-400' : 'text-cyan-400'}`} />
                <span className="font-bold text-sm text-zinc-100 font-mono">{vol.driveLetter}</span>
                <span className="text-xs text-zinc-400">{vol.label}</span>
              </div>
              <span className="text-xs font-mono text-zinc-500">{vol.fileSystem}</span>
            </div>

            <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  vol.isLowSpace ? 'bg-amber-400' : 'bg-cyan-500'
                }`}
                style={{ width: `${Math.min(100, vol.usagePercent)}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
              <span>{formatBytes(vol.freeBytes)} Free</span>
              <span>
                {formatBytes(vol.usedBytes)} / {formatBytes(vol.totalBytes)} ({vol.usagePercent.toFixed(1)}%)
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Directory Scanner Control Panel */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-4">
        <h2 className="text-sm font-semibold text-zinc-100">Directory Traversal Engine</h2>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Folder className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
            <input
              type="text"
              value={selectedPath}
              onChange={(e) => setSelectedPath(e.target.value)}
              disabled={isScanning}
              placeholder="e.g. C:\Users or C:\Windows"
              className="w-full pl-9 pr-3 py-1.5 text-xs font-mono bg-zinc-950 border border-zinc-800 rounded-md text-zinc-200 focus:outline-hidden focus:border-cyan-500 disabled:opacity-50"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {isScanning ? (
              <button
                onClick={handleCancel}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-1.5 text-xs font-medium text-rose-300 bg-rose-950/60 border border-rose-800 rounded-md hover:bg-rose-900/80 transition-colors"
              >
                <StopCircle className="w-3.5 h-3.5" />
                <span>Cancel Traversal</span>
              </button>
            ) : (
              <button
                onClick={handleStartScan}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-1.5 text-xs font-medium text-zinc-950 bg-cyan-400 hover:bg-cyan-300 rounded-md transition-colors"
              >
                <FolderSearch className="w-3.5 h-3.5" />
                <span>Analyze Directory</span>
              </button>
            )}
          </div>
        </div>

        {/* Scan Progress Bar & Telemetry */}
        {isScanning && progress && (
          <div className="p-4 bg-zinc-950 rounded-md border border-zinc-800 space-y-2.5">
            <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
              <span className="truncate max-w-lg">{progress.currentDirectory}</span>
              <span className="font-semibold text-cyan-400">{progress.percent}%</span>
            </div>

            <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-400 rounded-full transition-all duration-150"
                style={{ width: `${progress.percent}%` }}
              />
            </div>

            <div className="flex items-center gap-4 text-[11px] font-mono text-zinc-500">
              <span>Files: {progress.scannedFiles}</span>
              <span aria-hidden="true">·</span>
              <span>Directories: {progress.scannedDirectories}</span>
              <span aria-hidden="true">·</span>
              <span>Size: {formatBytes(progress.scannedBytes)}</span>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-rose-950/40 border border-rose-800/80 rounded-md text-xs text-rose-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Scan Results Table */}
      {scanResult && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">
                Largest Items in {scanResult.path} ({filteredItems.length})
              </h2>
              <p className="text-xs text-zinc-400">
                Total traversed capacity: {formatBytes(scanResult.sizeBytes)}
              </p>
            </div>

            {/* Extension Filter */}
            <div className="flex items-center gap-2 text-xs">
              <Filter className="w-3.5 h-3.5 text-zinc-500" />
              <select
                value={filterExt}
                onChange={(e) => setFilterExt(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded px-2.5 py-1 focus:outline-hidden"
              >
                <option value="all">All File Types</option>
                <option value="sys">System (.sys)</option>
                <option value="vhdx">Virtual Hard Disks (.vhdx)</option>
                <option value="edb">Databases (.edb)</option>
                <option value="mp4">Media (.mp4)</option>
                <option value="zip">Archives (.zip)</option>
                <option value="dmp">Crash Dumps (.dmp)</option>
              </select>
            </div>
          </div>

          <div className="border border-zinc-800 rounded-md overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-800 text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">NAME</th>
                  <th className="py-2.5 px-3">PATH</th>
                  <th className="py-2.5 px-3">TYPE</th>
                  <th className="py-2.5 px-3 text-right">SIZE</th>
                  <th className="py-2.5 px-3 text-right">% OF TOTAL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                {filteredItems.map((item, idx) => {
                  const pct = ((item.sizeBytes / scanResult.sizeBytes) * 100).toFixed(1);
                  return (
                    <tr key={idx} className="hover:bg-zinc-800/40 transition-colors">
                      <td className="py-2.5 px-3 font-medium text-zinc-200 flex items-center gap-2">
                        <FileCode className="w-3.5 h-3.5 text-zinc-500" />
                        <span>{item.name}</span>
                      </td>
                      <td className="py-2.5 px-3 text-zinc-400 truncate max-w-md">{item.path}</td>
                      <td className="py-2.5 px-3 text-zinc-400 uppercase text-[11px]">
                        {item.extension || 'FILE'}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-cyan-300">
                        {formatBytes(item.sizeBytes)}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-zinc-400">{pct}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
