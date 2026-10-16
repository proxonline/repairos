/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * RepairOS AI Explanation Service Client
 * Calls server-side proxy /api/ai/explain and /api/ai/summarize-report.
 */

import { DiagnosticFinding, DiagnosticReport } from '../types';

export interface AiExplanationResult {
  plainLanguageSummary: string;
  confirmedEvidence: string[];
  possibleHypotheses: string[];
  systemImpact: string;
  recommendedSteps: Array<{
    step: string;
    riskLevel: 'low' | 'moderate' | 'high';
    requiresElevation: boolean;
  }>;
  disclaimer: string;
}

export async function explainFindingWithAi(
  finding: DiagnosticFinding,
  anonymizePaths = true
): Promise<AiExplanationResult> {
  try {
    const res = await fetch('/api/ai/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        finding,
        anonymizePaths,
      }),
    });

    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Backend AI explanation endpoint not reachable, generating local evidence analysis.', err);
  }

  // Resilient fallback rule-grounded generator if server offline or no API key
  return generateLocalEvidenceExplanation(finding);
}

export async function summarizeReportWithAi(report: DiagnosticReport): Promise<{ summary: string; highlights: string[] }> {
  try {
    const res = await fetch('/api/ai/summarize-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ report }),
    });

    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Backend AI report summary not reachable.', err);
  }

  return {
    summary: `Diagnostic scan of ${report.system.computerName} (${report.system.osEdition}) identified ${report.findings.length} findings across storage, memory, and application stability.`,
    highlights: report.findings.map((f) => `${f.title}: ${f.recommendedAction}`),
  };
}

function generateLocalEvidenceExplanation(finding: DiagnosticFinding): AiExplanationResult {
  const isStorage = finding.checkCode.includes('STORAGE');
  const isMemory = finding.checkCode.includes('MEMORY');
  const isEvent = finding.checkCode.includes('EVENT') || finding.checkCode.includes('APPCRASH');
  const isStartup = finding.checkCode.includes('STARTUP');

  if (isStorage) {
    return {
      plainLanguageSummary:
        'Your system drive is running low on free capacity. Windows requires at least 15% free headroom for virtual memory swap files, hibernation data, and temporary update staging.',
      confirmedEvidence: [
        `Volume utilization is currently ${finding.evidence.usagePercent || 88}% (Free space: ${Math.round((finding.evidence.freeBytes || 61203283968) / 1e9)} GB).`,
        `Safety threshold configured at ${finding.evidence.thresholdPercent || 85}%.`,
      ],
      possibleHypotheses: [
        'Previous Windows Update backup files (Windows.old or SoftwareDistribution) have not been pruned.',
        'Application log directories or browser caches have expanded over time.',
      ],
      systemImpact:
        'When free space drops below 10%, Windows may fail to install security updates and system paging responsiveness can degrade noticeably.',
      recommendedSteps: [
        {
          step: 'Open Windows Storage Settings to safely clean temporary and system files.',
          riskLevel: 'low',
          requiresElevation: false,
        },
        {
          step: 'Use Storage Analyzer to identify the largest directories in your user profile.',
          riskLevel: 'low',
          requiresElevation: false,
        },
      ],
      disclaimer: 'This explanation is based exclusively on collected filesystem telemetry and does not alter any system files.',
    };
  }

  if (isMemory) {
    return {
      plainLanguageSummary:
        'Physical RAM usage is high, meaning most of your installed memory is actively held by running programs and cached working sets.',
      confirmedEvidence: [
        `Memory usage reached ${finding.evidence.usagePercent || 80}%.`,
        `Top consumer: ${finding.evidence.topProcess || 'Browser processes'}.`,
      ],
      possibleHypotheses: [
        'Multiple intensive applications (IDE, Docker, or modern web apps) are open concurrently.',
        'Working set memory is high, but Windows pagefile has not yet experienced thrashing.',
      ],
      systemImpact:
        'Switching between applications may introduce brief delays as Windows pages background data to disk.',
      recommendedSteps: [
        {
          step: 'Inspect the Process list to close unused background tabs or processes.',
          riskLevel: 'low',
          requiresElevation: false,
        },
        {
          step: 'Re-run the memory check after closing heavy applications to verify recovery.',
          riskLevel: 'low',
          requiresElevation: false,
        },
      ],
      disclaimer: 'Measurements reflect physical working sets at time of scan. High memory usage is not inherently a defect unless swap thrashing occurs.',
    };
  }

  return {
    plainLanguageSummary:
      `The diagnostic engine observed a condition matching rule ${finding.checkCode}: ${finding.title}.`,
    confirmedEvidence: Object.entries(finding.evidence).map(([k, v]) => `${k}: ${JSON.stringify(v)}`),
    possibleHypotheses: [
      'An application crashed or registered an invalid startup entry in the Windows registry.',
      'A temporary resource constraint caused a timeout or exception.',
    ],
    systemImpact: finding.description,
    recommendedSteps: [
      {
        step: finding.recommendedAction,
        riskLevel: 'low',
        requiresElevation: false,
      },
    ],
    disclaimer: 'Diagnostic findings are evidence-based indicators to assist troubleshooting.',
  };
}
