/// <reference lib="webworker" />
import { runPrintCheck } from './pipeline';
import type { PrintCheckWorkerMessage, PrintCheckWorkerRequest } from './protocol';
import type { PrintCheckGeometry, PrintCheckStage } from './types';

/*
 * Runs the printability check off the main thread. Single-use: the client
 * terminates the worker after the result, on cancel and on timeout, which
 * also releases the voxel buffers. Needs no WebAssembly or eval, so it runs
 * under the regular site CSP (worker-src 'self').
 */

const scope = self as unknown as DedicatedWorkerGlobalScope;

/** Progress messages are throttled to steps of this size per stage. */
const PROGRESS_STEP = 0.05;

scope.onmessage = (event: MessageEvent<PrintCheckWorkerRequest>) => {
  const { positions, options } = event.data;
  let lastStage: PrintCheckStage | null = null;
  let lastFraction = 0;
  let latest: PrintCheckGeometry | null = null;
  const post = (message: PrintCheckWorkerMessage, transfer: Transferable[] = []) => scope.postMessage(message, transfer);
  try {
    const result = runPrintCheck(positions, options, {
      onProgress: (stage, fraction) => {
        if (stage !== lastStage || fraction - lastFraction >= PROGRESS_STEP || fraction === 1) {
          lastStage = stage;
          lastFraction = fraction;
          post({ type: 'progress', stage, fraction });
        }
      },
      onPartial: (geometry) => {
        latest = geometry;
        post({ type: 'partial', geometry });
      },
    });
    post({ type: 'done', geometry: result.geometry, flags: result.flags }, [result.flags.buffer]);
  } catch (error) {
    console.error('Printability check failed', error);
    post({ type: 'error', geometry: latest });
  }
};
