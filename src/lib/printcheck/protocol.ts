import type { PrintCheckGeometry, PrintCheckOptions, PrintCheckStage } from './types';

export interface PrintCheckWorkerRequest {
  /** Triangle soup (transferred to the worker). */
  positions: Float32Array;
  options: PrintCheckOptions;
}

export type PrintCheckWorkerMessage =
  | { type: 'progress'; stage: PrintCheckStage; fraction: number }
  | { type: 'partial'; geometry: PrintCheckGeometry }
  | { type: 'done'; geometry: PrintCheckGeometry; flags: Uint16Array }
  | { type: 'error'; geometry: PrintCheckGeometry | null };
