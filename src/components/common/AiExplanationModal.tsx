/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * RepairOS AI Explanation Modal
 * Presents evidence-based explanations without fabricating measurements or command execution.
 */

import React, { useState, useEffect } from 'react';
import { Sparkles, X, AlertCircle, CheckCircle2, ShieldCheck, RefreshCw } from 'lucide-react';
import { DiagnosticFinding } from '../../types';
import { explainFindingWithAi, AiExplanationResult } from '../../services/geminiService';

interface AiExplanationModalProps {
  finding: DiagnosticFinding | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AiExplanationModal: React.FC<AiExplanationModalProps> = ({
  finding,
  isOpen,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState<AiExplanationResult | null>(null);

  useEffect(() => {
    if (isOpen && finding) {
      setLoading(true);
      explainFindingWithAi(finding)
        .then((res) => {
          setExplanation(res);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    } else {
      setExplanation(null);
    }
  }, [isOpen, finding]);

  if (!isOpen || !finding) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-700/80 rounded-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">
                Diagnostic Analysis & Plain-Language Explanation
              </h3>
              <p className="text-xs text-zinc-400">
                Evidence interpretation for rule: {finding.checkCode}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 p-1 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs text-zinc-300 overflow-y-auto max-h-[70vh]">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-zinc-400">
              <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
              <span>Analyzing diagnostic telemetry with Gemini 3.8 Flash...</span>
            </div>
          ) : explanation ? (
            <>
              {/* Finding Title & Overview */}
              <div className="bg-zinc-950 p-3.5 rounded-md border border-zinc-800">
                <div className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider mb-1">
                  Observed Finding
                </div>
                <div className="text-sm font-medium text-zinc-100">{finding.title}</div>
                <p className="text-zinc-400 mt-1 leading-relaxed">
                  {explanation.plainLanguageSummary}
                </p>
              </div>

              {/* Confirmed Evidence vs Hypotheses */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-zinc-950/60 p-3 rounded-md border border-zinc-800/80 space-y-2">
                  <div className="flex items-center gap-1.5 text-cyan-300 font-semibold text-[11px] font-mono uppercase">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Confirmed Evidence</span>
                  </div>
                  <ul className="space-y-1 text-zinc-400 pl-4 list-disc">
                    {explanation.confirmedEvidence.map((e, i) => (
                      <li key={i} className="leading-normal">
                        {e}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-zinc-950/60 p-3 rounded-md border border-zinc-800/80 space-y-2">
                  <div className="flex items-center gap-1.5 text-amber-300 font-semibold text-[11px] font-mono uppercase">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Possible Hypotheses</span>
                  </div>
                  <ul className="space-y-1 text-zinc-400 pl-4 list-disc">
                    {explanation.possibleHypotheses.map((h, i) => (
                      <li key={i} className="leading-normal">
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Impact */}
              <div>
                <span className="text-zinc-500 font-mono block text-[11px] mb-1">
                  SYSTEM IMPACT
                </span>
                <p className="text-zinc-300 bg-zinc-950 p-2.5 rounded border border-zinc-800 leading-relaxed">
                  {explanation.systemImpact}
                </p>
              </div>

              {/* Recommended Steps */}
              <div>
                <span className="text-zinc-500 font-mono block text-[11px] mb-1">
                  EVIDENCE-BASED NEXT STEPS
                </span>
                <div className="space-y-1.5">
                  {explanation.recommendedSteps.map((step, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded bg-zinc-950 border border-zinc-800 flex items-start justify-between gap-3"
                    >
                      <div className="space-y-0.5">
                        <span className="text-zinc-200">{step.step}</span>
                        <div className="text-[11px] text-zinc-500 font-mono">
                          Risk: {step.riskLevel} · Administrator Privilege:{' '}
                          {step.requiresElevation ? 'Required' : 'Standard User'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Disclaimer */}
              <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-mono pt-2 border-t border-zinc-800">
                <ShieldCheck className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span>{explanation.disclaimer}</span>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-md transition-colors"
          >
            Close Explanation
          </button>
        </div>
      </div>
    </div>
  );
};
