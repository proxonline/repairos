/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * RepairOS Export Modal
 * Allows reviewing diagnostic reports in HTML, CSV, or JSON before saving.
 */

import React, { useState } from 'react';
import { Download, Copy, Check, X, FileText, Code, FileSpreadsheet } from 'lucide-react';
import { DiagnosticReport } from '../../types';

interface ExportModalProps {
  report: DiagnosticReport | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ report, isOpen, onClose }) => {
  const [format, setFormat] = useState<'html' | 'csv' | 'json'>('html');
  const [copied, setCopied] = useState(false);

  if (!isOpen || !report) return null;

  const generateJson = () => {
    return JSON.stringify(report, null, 2);
  };

  const generateCsv = () => {
    const headers = ['Category', 'FindingID', 'RuleCode', 'Title', 'Severity', 'State', 'AffectedResource', 'Action'];
    const rows = report.findings.map((f) => [
      f.checkCode.split('_')[1] || 'GENERAL',
      f.id,
      f.checkCode,
      `"${f.title.replace(/"/g, '""')}"`,
      f.severity,
      f.state,
      `"${(f.affectedResource || '').replace(/"/g, '""')}"`,
      `"${f.recommendedAction.replace(/"/g, '""')}"`,
    ]);
    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  };

  const generateHtml = () => {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>RepairOS Diagnostic Report - ${report.system.computerName}</title>
  <style>
    body { font-family: 'Segoe UI', system-ui, sans-serif; background: #0c0d0e; color: #f0f0f0; margin: 30px; }
    h1 { color: #38bdf8; font-size: 20px; border-bottom: 1px solid #27272a; padding-bottom: 10px; }
    .meta { font-family: monospace; font-size: 13px; color: #a1a1aa; margin-bottom: 24px; line-height: 1.6; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; }
    th, td { border: 1px solid #27272a; padding: 10px; text-align: left; }
    th { background: #18181b; color: #38bdf8; font-family: monospace; font-size: 11px; }
    .badge-problem { color: #f87171; font-weight: bold; }
    .badge-warning { color: #fbbf24; font-weight: bold; }
    .badge-info { color: #38bdf8; }
  </style>
</head>
<body>
  <h1>RepairOS Diagnostic Summary</h1>
  <div class="meta">
    Computer: ${report.system.computerName} | OS: ${report.system.osEdition} (Build ${report.system.osBuild})<br>
    CPU: ${report.system.processor.name} | Total RAM: ${(report.system.memory.totalPhysicalBytes / 1e9).toFixed(1)} GB<br>
    Report Generated: ${new Date(report.createdAt).toLocaleString()} | RepairOS Engine: v1.2.0
  </div>
  <h2>Diagnostic Findings (${report.findings.length})</h2>
  <table>
    <thead>
      <tr>
        <th>RULE</th>
        <th>SEVERITY</th>
        <th>FINDING</th>
        <th>EVIDENCE SUMMARY</th>
        <th>RECOMMENDED ACTION</th>
      </tr>
    </thead>
    <tbody>
      ${report.findings
        .map(
          (f) => `
        <tr>
          <td><code>${f.checkCode}</code></td>
          <td class="badge-${f.severity}">${f.severity.toUpperCase()}</td>
          <td><strong>${f.title}</strong><br><small style="color:#a1a1aa">${f.description}</small></td>
          <td><code>${JSON.stringify(f.evidence)}</code></td>
          <td>${f.recommendedAction}</td>
        </tr>`
        )
        .join('')}
    </tbody>
  </table>
  <footer style="margin-top: 40px; font-size: 11px; color: #71717a; border-top: 1px solid #27272a; padding-top: 10px;">
    Exported securely by RepairOS. No passwords or tokens included.
  </footer>
</body>
</html>`;
  };

  const getExportContent = () => {
    if (format === 'csv') return generateCsv();
    if (format === 'json') return generateJson();
    return generateHtml();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getExportContent());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const content = getExportContent();
    const mimeType =
      format === 'html'
        ? 'text/html'
        : format === 'csv'
        ? 'text/csv'
        : 'application/json';
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RepairOS_Report_${report.system.computerName}_${Date.now()}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="w-full max-w-3xl bg-zinc-900 border border-zinc-700/80 rounded-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
          <div className="flex items-center gap-2.5">
            <Download className="w-4 h-4 text-cyan-400" />
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">Review & Export Diagnostic Report</h3>
              <p className="text-xs text-zinc-400">Preview generated report before saving</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 p-1 rounded-md">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Format Selector Tabs */}
        <div className="px-5 py-2.5 bg-zinc-950/70 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-1.5 p-1 bg-zinc-900 rounded-md">
            <button
              onClick={() => setFormat('html')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded transition-colors ${
                format === 'html' ? 'bg-zinc-800 text-cyan-300 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>HTML Document</span>
            </button>
            <button
              onClick={() => setFormat('csv')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded transition-colors ${
                format === 'csv' ? 'bg-zinc-800 text-cyan-300 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>CSV Spreadsheet</span>
            </button>
            <button
              onClick={() => setFormat('json')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded transition-colors ${
                format === 'json' ? 'bg-zinc-800 text-cyan-300 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>Structured JSON</span>
            </button>
          </div>

          <div className="text-[11px] font-mono text-zinc-500">
            {report.findings.length} findings recorded
          </div>
        </div>

        {/* Preview content */}
        <div className="p-4 bg-zinc-950 flex-1 overflow-y-auto max-h-[55vh]">
          <pre className="text-xs font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed select-text">
            {getExportContent()}
          </pre>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between">
          <div className="text-[11px] text-zinc-500 font-mono">
            Contains no credentials, tokens, or private user files
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-300 hover:text-white border border-zinc-700 rounded-md transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-zinc-950 bg-cyan-400 hover:bg-cyan-300 rounded-md transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Save {format.toUpperCase()} File</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
