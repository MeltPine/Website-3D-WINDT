/**
 * Shared geometry types.
 *
 * All parsers normalise to a flat triangle soup (9 floats per triangle, in
 * millimetres) so that analysis, pricing and the viewer share one
 * representation regardless of the source format.
 */

export type ModelFormat = 'stl' | 'obj' | '3mf' | 'step';

export interface TriangleMesh {
  /** x,y,z of three vertices per triangle, millimetres. Length = triangleCount * 9. */
  positions: Float32Array;
  triangleCount: number;
}

export type Vec3 = [number, number, number];

export interface BoundingBox {
  min: Vec3;
  max: Vec3;
  size: Vec3;
}

export interface MeshAnalysis {
  triangleCount: number;
  /** Enclosed volume in mm³ (absolute value of the signed volume). */
  volumeMm3: number;
  surfaceAreaMm2: number;
  bbox: BoundingBox;
  /**
   * True when the signed volume depends on the reference point, which only
   * happens for meshes that are not closed. The volume is then unreliable.
   */
  openMeshSuspected: boolean;
}

export class GeometryParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeometryParseError';
  }
}
