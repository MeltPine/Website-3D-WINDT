import type { PrintCheckReport } from '../printcheck/evaluate';
import type { QuoteFileEntry } from './quoteSession';
import type { SessionEstimate } from './sessionEstimate';

/*
 * Which state the calculator workspace shows (spec 2.5), as pure functions so
 * every state is testable without a browser.
 */

export type SummaryState =
  | { kind: 'pending' }
  | { kind: 'ok' }
  | { kind: 'oversize'; fileNames: string[] }
  | { kind: 'manual'; reason: 'no-model' | 'parse-error' };

export function summaryState(entries: readonly QuoteFileEntry[], session: SessionEstimate): SummaryState {
  const { estimate, pendingCount, parts } = session;
  if (estimate?.status === 'ok') return { kind: 'ok' };
  if (estimate?.status === 'oversize') {
    const ready = entries.filter((entry) => entry.status === 'ready' && entry.analysis && entry.analysis.volumeMm3 > 0 && entry.analysis.surfaceAreaMm2 > 0);
    return {
      kind: 'oversize',
      fileNames: estimate.oversizePartIndices.map((index) => ready[index]?.file.name).filter((name): name is string => Boolean(name)),
    };
  }
  if (pendingCount > 0 || (parts.length === 0 && entries.some((entry) => entry.status === 'queued' || entry.status === 'analyzing'))) {
    return { kind: 'pending' };
  }
  return { kind: 'manual', reason: entries.some((entry) => entry.status === 'failed') ? 'parse-error' : 'no-model' };
}

export type BadgeTone = 'ok' | 'warn' | 'crit' | 'neutral';

export interface TabBadge {
  text: string;
  tone: BadgeTone;
}

export const PRINTCHECK_UNAVAILABLE_BADGE: TabBadge = { text: 'manuell', tone: 'neutral' };

export function modelBadge(entry: QuoteFileEntry | null, oversize: boolean): TabBadge {
  if (!entry) return { text: 'offen', tone: 'neutral' };
  switch (entry.status) {
    case 'queued':
    case 'analyzing':
      return { text: 'wird gelesen', tone: 'neutral' };
    case 'failed':
      return { text: 'Lesefehler', tone: 'warn' };
    case 'upload-only':
      return { text: 'ohne Vorschau', tone: 'neutral' };
    case 'ready':
      if (oversize) return { text: 'Übergröße', tone: 'warn' };
      if (entry.analysis?.openMeshSuspected) return { text: 'Netz offen', tone: 'warn' };
      return { text: 'bereit', tone: 'ok' };
    default: {
      const exhaustive: never = entry.status;
      throw new Error(`Unknown status ${String(exhaustive)}`);
    }
  }
}

export function printCheckBadge(entry: QuoteFileEntry | null, report: PrintCheckReport | null): TabBadge {
  if (!entry) return { text: 'offen', tone: 'neutral' };
  const status = entry.printCheck.status;
  if (status === 'queued' || status === 'running') return { text: 'Prüfung läuft', tone: 'neutral' };
  if (status === 'none' || status === 'unavailable' || !report) return PRINTCHECK_UNAVAILABLE_BADGE;
  const { critical, hint } = report.counts;
  if (critical > 0) return { text: `${critical} kritisch`, tone: 'crit' };
  if (hint > 0) return { text: `${hint} ${hint === 1 ? 'Hinweis' : 'Hinweise'}`, tone: 'warn' };
  return { text: status === 'partial' ? 'teilweise geprüft' : 'OK', tone: status === 'partial' ? 'neutral' : 'ok' };
}

/** "Druckbar · 2 Hinweise · 0 kritisch" */
export function printCheckHeadline(report: PrintCheckReport): string {
  const { critical, hint } = report.counts;
  return `${report.verdict.title} · ${hint} ${hint === 1 ? 'Hinweis' : 'Hinweise'} · ${critical} kritisch`;
}
