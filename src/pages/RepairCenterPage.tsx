/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * RepairOS Repair Center Page
 * Controlled maintenance workflows, explicit safety preconditions, verification logs.
 */

import React, { useState } from 'react';
import {
  Wrench,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Check,
  Clock,
  Layers,
} from 'lucide-react';
import { RepairAction, RepairExecutionResult } from '../types';
import { ConfirmationModal } from '../components/common/ConfirmationModal';
import { api } from '../services/api';

interface RepairCenterPageProps {
  repairs: RepairAction[];
  onRepairCompleted: () => void;
}

export const RepairCenterPage: React.FC<RepairCenterPageProps> = ({
  repairs,
  onRepairCompleted,
}) => {
  const [selectedRepair, setSelectedRepair] = useState<RepairAction | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionLog, setExecutionLog] = useState<RepairExecutionResult[]>([]);

  const handleOpenConfirm = (repair: RepairAction) => {
    setSelectedRepair(repair);
    setIsModalOpen(true);
  };

  const handleExecute = async () => {
    if (!selectedRepair) return;
    setIsExecuting(true);

    try {
      const res = await api.executeRepair(selectedRepair.id);
      setExecutionLog((prev) => [res, ...prev]);
      onRepairCompleted();
    } catch (err: any) {
      setExecutionLog((prev) => [
        {
          repairId: selectedRepair.id,
          timestamp: new Date().toISOString(),
          success: false,
          message: `Execution failed: ${err.message}`,
          verificationPassed: false,
          logs: [`Failed with error: ${err.message}`],
          rollbackPossible: false,
        },
        ...prev,
      ]);
    } finally {
      setIsExecuting(false);
      setIsModalOpen(false);
      setSelectedRepair(null);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-lg font-bold text-zinc-100 tracking-tight">Repair Center</h1>
        <p className="text-xs text-zinc-400">
          Controlled, policy-governed maintenance actions. Every action requires explicit precondition validation and post-repair verification.
        </p>
      </div>

      {/* Safety Notice Banner */}
      <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
        <div className="text-xs text-zinc-300 space-y-1">
          <div className="font-semibold text-zinc-100">Deterministic Safety Architecture</div>
          <p className="text-zinc-400 leading-relaxed">
            RepairOS rejects indiscriminate registry cleaners, automatic driver tampering, and unverified batch scripts. Maintenance is orchestrated via safe Windows protocol URIs, user-confirmed actions, and verification passes.
          </p>
        </div>
      </div>

      {/* Repairs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {repairs.map((repair) => {
          const isElevated = repair.requiredPrivileges === 'administrator';

          return (
            <div
              key={repair.id}
              className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 flex flex-col justify-between space-y-4 hover:border-zinc-700/80 transition-colors"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider">
                    {repair.category}
                  </span>
                  <span
                    className={`text-[11px] font-mono font-medium ${
                      isElevated ? 'text-amber-400' : 'text-zinc-400'
                    }`}
                  >
                    {isElevated ? 'Admin Elevation Required' : 'Standard User Access'}
                  </span>
                </div>

                <h3 className="text-sm font-semibold text-zinc-100">{repair.title}</h3>
                <p className="text-xs text-zinc-400 leading-normal">{repair.purpose}</p>

                <div className="pt-2 text-[11px] text-zinc-500 font-mono space-y-1">
                  <div>Verification: {repair.verificationMethod}</div>
                  <div>Side effects: {repair.potentialSideEffects.join(', ')}</div>
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between">
                <span className="text-[11px] text-zinc-500 font-mono">
                  {repair.requiresRestart ? 'Requires Restart' : 'No Restart Required'}
                </span>

                <button
                  onClick={() => handleOpenConfirm(repair)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-950 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 rounded-md transition-colors cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Execute Action</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Execution and Verification Activity Log */}
      {executionLog.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-100">
              Maintenance Verification Log ({executionLog.length})
            </h2>
            <button
              onClick={() => setExecutionLog([])}
              className="text-xs text-zinc-500 hover:text-zinc-300"
            >
              Clear Log
            </button>
          </div>

          <div className="space-y-3">
            {executionLog.map((log, idx) => (
              <div
                key={idx}
                className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-md space-y-2 text-xs font-mono"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {log.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                    )}
                    <span className="font-semibold text-zinc-200">{log.message}</span>
                  </div>
                  <span className="text-zinc-500 text-[11px]">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                <div className="pl-6 space-y-0.5 text-zinc-400 text-[11px]">
                  {log.logs.map((step, sIdx) => (
                    <div key={sIdx}>{step}</div>
                  ))}
                  <div className="text-cyan-400 pt-1">
                    Verification Outcome: {log.verificationPassed ? 'VERIFIED_PASSED' : 'UNVERIFIED'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        repair={selectedRepair}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleExecute}
        isExecuting={isExecuting}
      />
    </div>
  );
};
