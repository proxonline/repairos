/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * RepairOS Windows Error Analyzer Page
 * Event Log inspector (Application & System), Event ID filtering, diagnostic interpretation.
 */

import React, { useState } from 'react';
import {
  AlertTriangle,
  Search,
  Filter,
  Download,
  Info,
  CheckCircle2,
  ChevronDown,
  Clock,
  Layers,
} from 'lucide-react';
import { WindowsEventItem } from '../types';

interface WindowsErrorAnalyzerPageProps {
  events: WindowsEventItem[];
}

export const WindowsErrorAnalyzerPage: React.FC<WindowsErrorAnalyzerPageProps> = ({ events }) => {
  const [selectedLog, setSelectedLog] = useState<'All' | 'Application' | 'System'>('All');
  const [selectedLevel, setSelectedLevel] = useState<'All' | 'Error' | 'Warning' | 'Information'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRecord, setExpandedRecord] = useState<number | null>(49210);

  const filteredEvents = events.filter((e) => {
    if (selectedLog !== 'All' && e.logName !== selectedLog) return false;
    if (selectedLevel !== 'All' && e.level !== selectedLevel) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        e.message.toLowerCase().includes(q) ||
        e.source.toLowerCase().includes(q) ||
        e.eventId.toString().includes(q)
      );
    }
    return true;
  });

  const handleExportEvents = () => {
    const csv = [
      'RecordNumber,Timestamp,Log,Level,EventID,Source,Message,DiagnosticInterpretation',
      ...filteredEvents.map(
        (e) =>
          `${e.recordNumber},"${e.timestamp}","${e.logName}","${e.level}",${e.eventId},"${e.source}","${e.message.replace(/"/g, '""')}","${(e.diagnosticInterpretation || '').replace(/"/g, '""')}"`
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RepairOS_WindowsEvents_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-zinc-100 tracking-tight">Windows Error Analyzer</h1>
          <p className="text-xs text-zinc-400">
            Read and interpret Windows Application and System event logs with evidence-based diagnostics
          </p>
        </div>

        <button
          onClick={handleExportEvents}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-200 hover:text-white bg-zinc-900 border border-zinc-800 rounded-md transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Events CSV</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Log Channel */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-zinc-500 font-mono text-[11px]">CHANNEL:</span>
            <select
              value={selectedLog}
              onChange={(e) => setSelectedLog(e.target.value as any)}
              className="bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded px-2.5 py-1 focus:outline-hidden"
            >
              <option value="All">All Channels</option>
              <option value="Application">Application Log</option>
              <option value="System">System Log</option>
            </select>
          </div>

          {/* Severity */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-zinc-500 font-mono text-[11px]">SEVERITY:</span>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value as any)}
              className="bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded px-2.5 py-1 focus:outline-hidden"
            >
              <option value="All">All Levels</option>
              <option value="Error">Errors Only</option>
              <option value="Warning">Warnings Only</option>
              <option value="Information">Information</option>
            </select>
          </div>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-500" />
          <input
            type="text"
            placeholder="Search Event ID, source, module..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-zinc-950 border border-zinc-800 rounded-md text-zinc-200 placeholder-zinc-500 focus:outline-hidden focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Event List with Accordion Details */}
      <div className="space-y-3">
        {filteredEvents.length === 0 ? (
          <div className="py-12 text-center text-zinc-500 text-xs bg-zinc-900 border border-zinc-800 rounded-lg">
            No event log records match current filters.
          </div>
        ) : (
          filteredEvents.map((event) => {
            const isExpanded = expandedRecord === event.recordNumber;
            const isError = event.level === 'Error' || event.level === 'Critical';

            return (
              <div
                key={event.recordNumber}
                className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden transition-colors"
              >
                {/* Event Summary Row */}
                <div
                  onClick={() => setExpandedRecord(isExpanded ? null : event.recordNumber)}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-zinc-850"
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <span
                      className={`text-xs font-mono font-bold uppercase px-2 py-0.5 rounded ${
                        isError
                          ? 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
                          : event.level === 'Warning'
                          ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                          : 'bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      {event.level}
                    </span>

                    <div>
                      <div className="flex items-center gap-2 text-xs font-mono">
                        <span className="font-semibold text-zinc-100">{event.source}</span>
                        <span className="text-zinc-600" aria-hidden="true">·</span>
                        <span className="text-cyan-400">Event ID {event.eventId}</span>
                        <span className="text-zinc-600" aria-hidden="true">·</span>
                        <span className="text-zinc-500">{event.logName} Log</span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">{event.message}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-mono text-zinc-500 shrink-0">
                    <span>{new Date(event.timestamp).toLocaleTimeString()}</span>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180 text-cyan-400' : ''}`}
                    />
                  </div>
                </div>

                {/* Expanded Details and Diagnostic Interpretation */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-2 border-t border-zinc-800/80 bg-zinc-950/60 space-y-4 text-xs">
                    <div>
                      <div className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider mb-1">
                        Full Event Message
                      </div>
                      <div className="p-3 bg-zinc-950 border border-zinc-800 rounded font-mono text-zinc-300 leading-relaxed select-text">
                        {event.message}
                      </div>
                    </div>

                    {event.diagnosticInterpretation && (
                      <div className="bg-zinc-900 border border-cyan-900/60 p-3.5 rounded-md space-y-2">
                        <div className="flex items-center gap-2 text-cyan-300 font-semibold font-mono text-[11px]">
                          <Info className="w-3.5 h-3.5 text-cyan-400" />
                          <span>DIAGNOSTIC INTERPRETATION (CONFIDENCE: {event.confidence.toUpperCase()})</span>
                        </div>
                        <p className="text-zinc-300 leading-relaxed">{event.diagnosticInterpretation}</p>

                        {event.suggestedSteps && event.suggestedSteps.length > 0 && (
                          <div className="pt-2 border-t border-zinc-800/80 space-y-1">
                            <span className="text-zinc-400 font-mono text-[11px] block">
                              Suggested Investigation Steps:
                            </span>
                            <ul className="list-disc pl-4 text-zinc-400 space-y-0.5">
                              {event.suggestedSteps.map((step, idx) => (
                                <li key={idx}>{step}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
