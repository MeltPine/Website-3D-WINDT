import { useSyncExternalStore } from 'react';
import { detectModelFormat } from '../geometry/format';
import type { MeshAnalysis, ModelFormat } from '../geometry/types';
import type { PrintCheckHandle } from '../printcheck/client';
import type { PrintCheckGeometry, PrintCheckStage } from '../printcheck/types';
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

/**
 * Printability check per file ("Druckbarkeits-Check", src/lib/printcheck).
 * `partial` = the run ended early (cancelled, timeout, worker crash); the
 * stages that did not finish are marked in the geometry and reported as
 * "nicht geprüft".
 */
export type PrintCheckStatus = 'none' | 'queued' | 'running' | 'done' | 'partial' | 'unavailable';

export interface PrintCheckState {
  status: PrintCheckStatus;
  stage: PrintCheckStage | null;
  fraction: number;
  geometry: PrintCheckGeometry | null;
  /** TRI_FLAG bits per triangle (same order as `positions`). */
  flags: Uint16Array | null;
  /** German reason when the check did not run or ended early. */
  note: string | null;
  durationMs: number | null;
}

const PRINTCHECK_NONE: PrintCheckState = {
  status: 'none',
  stage: null,
  fraction: 0,
  geometry: null,
  flags: null,
  note: null,
  durationMs: null,
};

export interface QuoteFileEntry {
  id: string;
  file: File;
  format: ModelFormat | null;
  status: QuoteFileStatus;
  analysis: MeshAnalysis | null;
  /** Triangle soup for the viewer; dropped when the memory budget is exceeded. */
  positions: Float32Array | null;
  /** Hex SHA-256 of the file (from the geometry worker). */
  sha256: string | null;
  error: string | null;
  printCheck: PrintCheckState;
  /** Print pose chosen in the viewer (printcheck POSES id); null = as loaded. */
  chosenPoseId: number | null;
}

/** What the customer asked for from the printability report (prefills the request form). */
export type QuoteRequestIntent = 'technische-pruefung' | 'nachkonstruktion';

/** Optional purpose of the part(s), asked in the "Anfrage" tab. */
export const USE_PURPOSES = [
  { id: 'ersatzteil', label: 'Ersatzteil' },
  { id: 'vorrichtung', label: 'Vorrichtung / Lehre' },
  { id: 'prototyp', label: 'Prototyp / Funktionsmuster' },
  { id: 'serie', label: 'Kleinserie' },
] as const;
export type UsePurpose = (typeof USE_PURPOSES)[number]['id'];

export interface QuoteSessionState {
  entries: readonly QuoteFileEntry[];
  selectedId: string | null;
  selection: QuoteSelection;
  requestIntent: QuoteRequestIntent | null;
  usePurpose: UsePurpose | null;
}

/** Upper bound for retained viewer geometry across all files. */
const VIEWER_MEMORY_BUDGET_BYTES = 256 * 1024 * 1024;

const INITIAL_STATE: QuoteSessionState = {
  entries: [],
  selectedId: null,
  selection: { ...INITIAL_QUOTE_SELECTION },
  requestIntent: null,
  usePurpose: null,
};

let state: QuoteSessionState = INITIAL_STATE;
const listeners = new Set<() => void>();
let queueRunning = false;
let checkQueueRunning = false;
let entryCounter = 0;

/**
 * Geometry waiting for its printability check. `owned` = the viewer did not
 * keep this buffer, so it can be transferred to the worker without a copy.
 */
const pendingCheckGeometry = new Map<string, { positions: Float32Array; owned: boolean }>();
const runningChecks = new Map<string, PrintCheckHandle>();
/** Minimum interval between progress re-renders. */
const PROGRESS_RENDER_INTERVAL_MS = 120;

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

function updatePrintCheck(id: string, patch: Partial<PrintCheckState>): void {
  setState({
    ...state,
    entries: state.entries.map((entry) =>
      entry.id === id ? { ...entry, printCheck: { ...entry.printCheck, ...patch } } : entry,
    ),
  });
}

function durationBucket(ms: number): string {
  if (ms < 2000) return '<2s';
  if (ms < 10_000) return '2-10s';
  if (ms < 60_000) return '10-60s';
  return '>60s';
}

async function processCheckQueue(): Promise<void> {
  if (checkQueueRunning) return;
  checkQueueRunning = true;
  try {
    const [{ startPrintCheck }, { DEFAULT_PRINTCHECK_LIMITS }] = await Promise.all([
      import('../printcheck/client'),
      import('../printcheck/types'),
    ]);
    for (;;) {
      const next = state.entries.find((entry) => entry.printCheck.status === 'queued');
      if (!next || !next.format) break;
      const pending = pendingCheckGeometry.get(next.id);
      pendingCheckGeometry.delete(next.id);
      if (!pending) {
        updatePrintCheck(next.id, { status: 'unavailable', note: 'Modelldaten nicht mehr verfügbar' });
        continue;
      }
      const started = Date.now();
      let lastRender = 0;
      updatePrintCheck(next.id, { status: 'running', stage: 'mesh', fraction: 0 });
      // The viewer keeps its buffer; the worker gets its own copy unless the viewer dropped it.
      const positions = pending.owned ? pending.positions : pending.positions.slice();
      const handle = startPrintCheck(
        positions,
        { format: next.format, ...DEFAULT_PRINTCHECK_LIMITS },
        {
          onProgress: (stage, fraction) => {
            const now = Date.now();
            if (now - lastRender < PROGRESS_RENDER_INTERVAL_MS && fraction < 1) return;
            lastRender = now;
            if (state.entries.some((entry) => entry.id === next.id)) updatePrintCheck(next.id, { stage, fraction });
          },
          onPartial: (geometry) => {
            if (state.entries.some((entry) => entry.id === next.id)) updatePrintCheck(next.id, { geometry });
          },
        },
      );
      runningChecks.set(next.id, handle);
      const result = await handle.result;
      runningChecks.delete(next.id);
      if (!state.entries.some((entry) => entry.id === next.id)) continue; // removed meanwhile
      const durationMs = Date.now() - started;
      const note =
        result.status === 'done'
          ? null
          : result.status === 'cancelled'
            ? 'Prüfung abgebrochen'
            : result.status === 'timeout'
              ? 'Zeitlimit überschritten'
              : 'Prüfung im Browser fehlgeschlagen';
      updatePrintCheck(next.id, {
        status: result.status === 'done' ? 'done' : result.geometry ? 'partial' : 'unavailable',
        stage: null,
        fraction: 1,
        geometry: result.geometry,
        flags: result.flags,
        note,
        durationMs,
      });
      trackEvent('quote_printcheck_finished', {
        form: 'quote',
        format: next.format,
        result: result.status,
        duration_bucket: durationBucket(durationMs),
      });
    }
  } finally {
    checkQueueRunning = false;
  }
}

/** Cancels a running check; its finished stages stay in the report. */
export function cancelPrintCheck(id: string): void {
  runningChecks.get(id)?.cancel();
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
        pendingCheckGeometry.set(next.id, { positions: result.positions, owned: !keepPositions });
        updateEntry(next.id, {
          status: 'ready',
          analysis: result.analysis,
          positions: keepPositions ? result.positions : null,
          sha256: result.sha256,
          error: null,
          printCheck: { ...PRINTCHECK_NONE, status: 'queued' },
        });
        void processCheckQueue();
        trackEvent('quote_model_analyzed', {
          form: 'quote',
          format: next.format,
          open_mesh: result.analysis.openMeshSuspected,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Die Datei konnte nicht analysiert werden.';
        if (!state.entries.some((entry) => entry.id === next.id)) continue;
        updateEntry(next.id, {
          status: 'failed',
          error: message,
          printCheck: { ...PRINTCHECK_NONE, status: 'unavailable', note: 'Modell konnte nicht gelesen werden' },
        });
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
      sha256: null,
      error: null,
      chosenPoseId: null,
      printCheck: format
        ? PRINTCHECK_NONE
        : { ...PRINTCHECK_NONE, status: 'unavailable', note: 'Dateiformat ohne 3D-Analyse' },
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
  cancelPrintCheck(id);
  pendingCheckGeometry.delete(id);
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

export function setQuoteRequestIntent(intent: QuoteRequestIntent | null): void {
  setState({ ...state, requestIntent: intent });
}

export function setQuoteUsePurpose(purpose: UsePurpose | null): void {
  setState({ ...state, usePurpose: purpose });
}

/** Pose the customer chose in the viewer for this file (null = as loaded). */
export function setQuoteFilePose(id: string, poseId: number | null): void {
  if (poseId !== null && !(Number.isInteger(poseId) && poseId >= 0 && poseId < 6)) {
    throw new RangeError(`Invalid pose id ${poseId}.`);
  }
  updateEntry(id, { chosenPoseId: poseId });
}

export function resetQuoteSession(): void {
  runningChecks.forEach((handle) => handle.cancel());
  pendingCheckGeometry.clear();
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
