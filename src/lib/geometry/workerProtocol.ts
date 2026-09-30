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
      /** Hex SHA-256 of the file bytes (null where WebCrypto is unavailable, e.g. insecure context). */
      sha256: string | null;
    }
  | {
      ok: false;
      /** User-facing German message. */
      error: string;
    };
