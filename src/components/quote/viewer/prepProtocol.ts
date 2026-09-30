/*
 * Messages of the viewer prep worker (creased normals, feature edges and the
 * picking BVH, computed off the main thread from a copy of the positions).
 */

export interface PrepRequest {
  positions: Float32Array;
  creaseDeg: number;
  /** Skip the BVH (e.g. no picking needed); normals and edges still run. */
  buildBvh: boolean;
}

export interface SerializedBvh {
  version: number;
  roots: ArrayBuffer[];
  indirectBuffer: Uint32Array | Uint16Array | null;
}

export type PrepMessage =
  | { type: 'normals'; normals: Float32Array; ms: number }
  | { type: 'edges'; segments: Float32Array; edgeSegment: Int32Array; ms: number }
  | { type: 'bvh'; bvh: SerializedBvh; ms: number }
  | { type: 'error'; stage: 'normals' | 'edges' | 'bvh'; message: string };
