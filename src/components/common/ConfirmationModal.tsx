/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * RepairOS Repair Confirmation Modal
 * Strictly adheres to safety specification: displays preconditions, privileges, side effects,
 * modified data, restart requirements, and verification criteria.
 */

import React from 'react';
import { AlertTriangle, ShieldAlert, CheckCircle2, X } from 'lucide-react';
import { RepairAction } from '../../types';

interface ConfirmationModalProps {
  repair: RepairAction | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isExecuting: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  repair,
  isOpen,
  onClose,
  onConfirm,
  isExecuting,
}) => {
  if (!isOpen || !repair) return null;

  const isElevatedRequired = repair.requiredPrivileges === 'administrator';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="w-full max-w-xl bg-zinc-900 border border-zinc-700/80 rounded-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
          <div className="flex items-center gap-3">
            {isElevatedRequired ? (
              <ShieldAlert className="w-5 h-5 text-amber-400" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-cyan-400" />
            )}
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">
                Confirm Maintenance Action
              </h3>
              <p className="text-xs text-zinc-400">Review preconditions and potential side effects</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isExecuting}
            className="text-zinc-500 hover:text-zinc-300 p-1 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body content */}
        <div className="p-5 space-y-4 text-xs text-zinc-300 overflow-y-auto max-h-[70vh]">
          <div>
            <div className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider mb-1">
              Action Title
            </div>
            <div className="text-sm font-medium text-zinc-100">{repair.title}</div>
            <p className="text-zinc-400 mt-0.5">{repair.purpose}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-800">
            <div>
              <span className="text-zinc-500 font-mono block text-[11px]">PRIVILEGE LEVEL</span>
              <span
                className={`font-semibold capitalize ${
                  isElevatedRequired ? 'text-amber-400' : 'text-zinc-300'
                }`}
              >
                {repair.requiredPrivileges}
              </span>
            </div>
            <div>
              <span className="text-zinc-500 font-mono block text-[11px]">RESTART REQUIRED</span>
              <span className="font-semibold text-zinc-300">
                {repair.requiresRestart ? 'Yes (System Restart Required)' : 'No'}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-zinc-800 space-y-2">
            <div>
              <span className="text-zinc-500 font-mono block text-[11px] mb-1">
                PRECONDITIONS & VERIFICATION
              </span>
              <ul className="space-y-1 text-zinc-400 pl-4 list-disc">
                {repair.preconditions.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
                <li>Verification: {repair.verificationMethod}</li>
              </ul>
            </div>

            <div>
              <span className="text-zinc-500 font-mono block text-[11px] mb-1">
                DATA MODIFIED & POTENTIAL SIDE EFFECTS
              </span>
              <div className="bg-zinc-950 p-2.5 rounded border border-zinc-800 space-y-1">
                <div className="text-zinc-300">
                  <strong className="text-zinc-400 font-normal">Data:</strong>{' '}
                  {repair.dataModified.join(', ')}
                </div>
                <div className="text-zinc-400">
                  <strong className="text-zinc-500 font-normal">Side Effects:</strong>{' '}
                  {repair.potentialSideEffects.join(', ')}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between">
          <div className="text-[11px] text-zinc-500 font-mono">
            {isElevatedRequired ? 'Requires UAC prompt if not elevated' : 'Safe user-level action'}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isExecuting}
              className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 border border-zinc-700 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isExecuting}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-zinc-950 bg-cyan-400 hover:bg-cyan-300 rounded-md transition-colors disabled:opacity-60"
            >
              {isExecuting ? 'Executing...' : 'Proceed with Maintenance'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
