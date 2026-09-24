import type { MeshAnalysis, ModelFormat } from './types';

export interface GeometryWorkerRequest {
  format: ModelFormat;
  buffer: ArrayBuffer;
}

export type GeometryWorkerResponse =
  | {
      ok: true;
      analysis: MeshAnalysis;
      /** Triangle soup for the viewer, transferred (not copied). */
      positions: Float32Array;
    }
  | {
      ok: false;
      /** User-facing German message. */
      error: string;
    };
