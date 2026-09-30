import { STATUS_LABEL, type PrintCheckReport } from './evaluate';

/*
 * Compact plain-text summary of a printability report for the lead record
 * and the sales e-mail (server/lead.ts escapes it). No personal data: file
 * name, hash prefix, verdict and the non-OK findings only.
 */

/** Per-file budget; the lead field caps the whole summary (server/leadSchema.ts). */
const MAX_FILE_SUMMARY_CHARS = 900;
export const MAX_PRINTCHECK_SUMMARY_CHARS = 4000;

export interface PrintCheckSummaryInput {
  fileName: string;
  sha256: string | null;
  report: PrintCheckReport | null;
  /** Why no report exists (e.g. still running, cancelled). */
  missingReason: string | null;
}

function clip(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

export function summarizeFile(input: PrintCheckSummaryInput): string {
  const head = `${input.fileName}${input.sha256 ? ` [SHA-256 ${input.sha256.slice(0, 12)}]` : ''}`;
  if (!input.report) {
    return clip(`${head}: Druckbarkeits-Check nicht verfügbar (${input.missingReason ?? 'unbekannt'})`, MAX_FILE_SUMMARY_CHARS);
  }
  const r = input.report;
  const lines = [`${head}: ${r.verdict.title} (${r.material.name})`];
  const byStatus = (status: 'critical' | 'hint') =>
    r.findings
      .filter((finding) => finding.status === status)
      .map((finding) => `${finding.title}: ${finding.measured}`);
  const critical = byStatus('critical');
  const hints = byStatus('hint');
  if (critical.length > 0) lines.push(`${STATUS_LABEL.critical}: ${critical.join('; ')}`);
  if (hints.length > 0) lines.push(`${STATUS_LABEL.hint}: ${hints.join('; ')}`);
  const notChecked = r.findings.filter((finding) => finding.status === 'not-checked').map((finding) => finding.title);
  if (notChecked.length > 0) lines.push(`Nicht geprüft: ${notChecked.join(', ')}`);
  if (r.recommendedPose) lines.push(`Empfohlene Lage: ${r.recommendedPose.label}`);
  return clip(lines.join('\n'), MAX_FILE_SUMMARY_CHARS);
}

export function buildPrintCheckSummary(files: readonly PrintCheckSummaryInput[]): string {
  if (files.length === 0) return '';
  return clip(files.map(summarizeFile).join('\n\n'), MAX_PRINTCHECK_SUMMARY_CHARS);
}
