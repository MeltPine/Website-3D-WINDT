import printCheckWorkerUrl from './printcheck.worker.ts?worker&url';
import type { PrintCheckWorkerMessage, PrintCheckWorkerRequest } from './protocol';
import {
  PRINTCHECK_STAGES,
  type PrintCheckGeometry,
  type PrintCheckOptions,
  type PrintCheckStage,
} from './types';

/*
 * Starts the printability check in a dedicated, single-use module worker.
 * The worker is loaded from the same origin (/assets/...), so the site CSP
 * (worker-src 'self') applies unchanged - no eval, no WebAssembly.
 */

/** Hard wall-clock limit per file; stages that did not finish become "nicht geprüft". */
export const PRINTCHECK_TIMEOUT_MS = 180_000;

export type PrintCheckRunStatus = 'done' | 'cancelled' | 'timeout' | 'failed';

export interface PrintCheckRunResult {
  status: PrintCheckRunStatus;
  geometry: PrintCheckGeometry | null;
  flags: Uint16Array | null;
}

export interface PrintCheckListeners {
  onProgress: (stage: PrintCheckStage, fraction: number) => void;
  onPartial: (geometry: PrintCheckGeometry) => void;
}

export interface PrintCheckHandle {
  result: Promise<PrintCheckRunResult>;
  cancel: () => void;
}

const END_REASON: Readonly<Record<Exclude<PrintCheckRunStatus, 'done'>, string>> = {
  cancelled: 'Prüfung abgebrochen',
  timeout: 'Zeitlimit im Browser überschritten',
  failed: 'Prüfung im Browser fehlgeschlagen (zu wenig Arbeitsspeicher?)',
};

/** Marks every stage that had not finished with the reason the run ended. */
export function closePendingStages(geometry: PrintCheckGeometry, status: Exclude<PrintCheckRunStatus, 'done'>): PrintCheckGeometry {
  const stages = { ...geometry.stages };
  for (const stage of PRINTCHECK_STAGES) {
    if (stages[stage].state === 'pending') stages[stage] = { state: 'skipped', reason: END_REASON[status] };
  }
  return { ...geometry, stages };
}

export function startPrintCheck(
  positions: Float32Array,
  options: PrintCheckOptions,
  listeners: PrintCheckListeners,
): PrintCheckHandle {
  const worker = new Worker(printCheckWorkerUrl, { type: 'module' });
  let settle: (result: PrintCheckRunResult) => void = () => undefined;
  let latest: PrintCheckGeometry | null = null;
  let finished = false;
  const result = new Promise<PrintCheckRunResult>((resolve) => {
    settle = resolve;
  });
  const end = (status: PrintCheckRunStatus, flags: Uint16Array | null) => {
    if (finished) return;
    finished = true;
    window.clearTimeout(timer);
    worker.terminate();
    const geometry = latest && status !== 'done' ? closePendingStages(latest, status) : latest;
    settle({ status, geometry, flags });
  };
  const timer = window.setTimeout(() => end('timeout', null), PRINTCHECK_TIMEOUT_MS);

  worker.onmessage = (event: MessageEvent<PrintCheckWorkerMessage>) => {
    const message = event.data;
    switch (message.type) {
      case 'progress':
        listeners.onProgress(message.stage, message.fraction);
        break;
      case 'partial':
        latest = message.geometry;
        listeners.onPartial(message.geometry);
        break;
      case 'done':
        latest = message.geometry;
        end('done', message.flags);
        break;
      case 'error':
        if (message.geometry) latest = message.geometry;
        end('failed', null);
        break;
      default: {
        const exhaustive: never = message;
        throw new Error(`Unknown worker message: ${JSON.stringify(exhaustive)}`);
      }
    }
  };
  worker.onerror = (event) => {
    event.preventDefault();
    end('failed', null);
  };

  const request: PrintCheckWorkerRequest = { positions, options };
  worker.postMessage(request, [positions.buffer]);
  return { result, cancel: () => end('cancelled', null) };
}
