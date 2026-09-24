import { useSyncExternalStore } from 'react';
import { detectModelFormat } from '../geometry/format';
import type { MeshAnalysis, ModelFormat } from '../geometry/types';
import { trackEvent } from '../tracking';
import { UPLOAD_POLICY, isAllowedFileName, validateUploadSelection } from '../upload/policy';
import { INITIAL_QUOTE_SELECTION } from './pricingConfig';
import type { QuoteSelection } from './pricing';

/*
 * In-memory session shared by the price calculator page and the project
 * request form. Navigating from /3d-druck-preisrechner/ to /projekt-starten/
 * is a client-side route change, so the selected files (File objects cannot
 * be serialised into a URL) and calculator parameters survive and prefill the
 * form. A full page reload intentionally starts empty: customer files are
 * never persisted in browser storage.
 */

export type QuoteFileStatus = 'queued' | 'analyzing' | 'ready' | 'failed' | 'upload-only';

export interface QuoteFileEntry {
  id: string;
  file: File;
  format: ModelFormat | null;
  status: QuoteFileStatus;
  analysis: MeshAnalysis | null;
  /** Triangle soup for the viewer; dropped when the memory budget is exceeded. */
  positions: Float32Array | null;
  error: string | null;
}

export interface QuoteSessionState {
  entries: readonly QuoteFileEntry[];
  selectedId: string | null;
  selection: QuoteSelection;
}

/** Upper bound for retained viewer geometry across all files. */
const VIEWER_MEMORY_BUDGET_BYTES = 256 * 1024 * 1024;

const INITIAL_STATE: QuoteSessionState = {
  entries: [],
  selectedId: null,
  selection: { ...INITIAL_QUOTE_SELECTION },
};

let state: QuoteSessionState = INITIAL_STATE;
const listeners = new Set<() => void>();
let queueRunning = false;
let entryCounter = 0;

function setState(next: QuoteSessionState): void {
  state = next;
  listeners.forEach((listener) => listener());
}

function updateEntry(id: string, patch: Partial<QuoteFileEntry>): void {
  setState({
    ...state,
    entries: state.entries.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)),
  });
}

function retainedViewerBytes(excludeId: string): number {
  return state.entries.reduce(
    (sum, entry) => (entry.id !== excludeId && entry.positions ? sum + entry.positions.byteLength : sum),
    0,
  );
}

function sizeBucket(bytes: number): string {
  const mb = bytes / 1024 / 1024;
  if (mb < 1) return '<1MB';
  if (mb < 10) return '1-10MB';
  if (mb < 50) return '10-50MB';
  return '>50MB';
}

async function processQueue(): Promise<void> {
  if (queueRunning) return;
  queueRunning = true;
  try {
    const { analyzeModelFile } = await import('../geometry/client');
    for (;;) {
      const next = state.entries.find((entry) => entry.status === 'queued');
      if (!next || !next.format) break;
      updateEntry(next.id, { status: 'analyzing' });
      try {
        const result = await analyzeModelFile(next.file, next.format);
        if (!state.entries.some((entry) => entry.id === next.id)) continue; // removed meanwhile
        const keepPositions =
          retainedViewerBytes(next.id) + result.positions.byteLength <= VIEWER_MEMORY_BUDGET_BYTES;
        updateEntry(next.id, {
          status: 'ready',
          analysis: result.analysis,
          positions: keepPositions ? result.positions : null,
          error: null,
        });
        trackEvent('quote_model_analyzed', {
          form: 'quote',
          format: next.format,
          open_mesh: result.analysis.openMeshSuspected,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Die Datei konnte nicht analysiert werden.';
        if (!state.entries.some((entry) => entry.id === next.id)) continue;
        updateEntry(next.id, { status: 'failed', error: message });
        trackEvent('quote_model_analysis_failed', { form: 'quote', format: next.format });
      }
    }
  } finally {
    queueRunning = false;
  }
}

/**
 * Adds files to the session. Returns German error messages for files that
 * were rejected; accepted files are analysed in the background.
 */
export function addQuoteFiles(files: readonly File[]): string[] {
  const errors: string[] = [];
  const accepted: QuoteFileEntry[] = [];
  const current = state.entries.map((entry) => ({ name: entry.file.name, size: entry.file.size }));

  for (const file of files) {
    if (!isAllowedFileName(file.name)) {
      errors.push(`${file.name}: Dateityp nicht unterstützt.`);
      continue;
    }
    const candidate = [...current, ...accepted.map((entry) => ({ name: entry.file.name, size: entry.file.size })), {
      name: file.name,
      size: file.size,
    }];
    const problem = validateUploadSelection(candidate);
    if (problem) {
      errors.push(problem.startsWith(file.name) ? problem : `${file.name}: ${problem}`);
      continue;
    }
    const format = detectModelFormat(file.name);
    entryCounter += 1;
    accepted.push({
      id: `qf-${Date.now().toString(36)}-${entryCounter}`,
      file,
      format,
      status: format ? 'queued' : 'upload-only',
      analysis: null,
      positions: null,
      error: null,
    });
  }

  if (accepted.length > 0) {
    setState({
      ...state,
      entries: [...state.entries, ...accepted],
      selectedId: state.selectedId ?? accepted.find((entry) => entry.format)?.id ?? accepted[0].id,
    });
    trackEvent('quote_file_selected', {
      form: 'quote',
      file_count: accepted.length,
      formats: accepted.map((entry) => entry.format ?? 'other').join(','),
      size_bucket: sizeBucket(accepted.reduce((sum, entry) => sum + entry.file.size, 0)),
    });
    void processQueue();
  }
  return errors;
}

export function removeQuoteFile(id: string): void {
  const entries = state.entries.filter((entry) => entry.id !== id);
  setState({
    ...state,
    entries,
    selectedId: state.selectedId === id ? (entries[0]?.id ?? null) : state.selectedId,
  });
}

export function selectQuoteFile(id: string): void {
  setState({ ...state, selectedId: id });
}

export function updateQuoteSelection(patch: Partial<QuoteSelection>): void {
  setState({ ...state, selection: { ...state.selection, ...patch } });
}

export function resetQuoteSession(): void {
  setState({ ...INITIAL_STATE, selection: { ...INITIAL_QUOTE_SELECTION } });
}

export function getQuoteSession(): QuoteSessionState {
  return state;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useQuoteSession(): QuoteSessionState {
  return useSyncExternalStore(subscribe, getQuoteSession, () => INITIAL_STATE);
}

export const QUOTE_UPLOAD_LIMITS = {
  maxFiles: UPLOAD_POLICY.maxFiles,
  maxFileMb: UPLOAD_POLICY.maxFileBytes / 1024 / 1024,
  maxTotalMb: UPLOAD_POLICY.maxTotalBytes / 1024 / 1024,
} as const;
