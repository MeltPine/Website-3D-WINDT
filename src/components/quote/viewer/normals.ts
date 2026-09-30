import { bounds, weld } from '../../../lib/printcheck/mesh';

/*
 * Mesh preparation for the viewer (pure, DOM-free; runs in the viewer prep
 * worker). One weld of coincident vertices (printcheck `weld`) and a
 * vertex -> faces table feed two results:
 *
 * - creased normals: each corner gets the area-weighted average of the face
 *   normals around its vertex that lie within `creaseDeg` of its own face, so
 *   rounded surfaces look round and sharp CAD edges stay sharp;
 * - feature edges: edges whose faces meet at more than `creaseDeg`, plus open
 *   (boundary) edges, as line segments for the "Kanten"/"Röntgen" views and
 *   the edge-length measurement.
 */

export const CREASE_ANGLE_DEG = 30;

export interface Adjacency {
  /** Welded vertex id per soup corner. */
  index: Int32Array;
  vertexCount: number;
  /** CSR: faces of vertex v are faces[offsets[v] .. offsets[v + 1]). */
  offsets: Int32Array;
  faces: Int32Array;
  /** Unnormalised face normals (2 × area × unit normal). */
  faceNormals: Float32Array;
}

export function buildAdjacency(positions: Float32Array): Adjacency {
  const triangles = Math.floor(positions.length / 9);
  const box = bounds(positions);
  const diagonal = Math.hypot(box.size[0], box.size[1], box.size[2]);
  const { index, count } = weld(positions, box, Math.max(1e-6, diagonal * 1e-6));
  const faceNormals = new Float32Array(triangles * 3);
  for (let t = 0; t < triangles; t += 1) {
    const o = t * 9;
    const e1x = positions[o + 3] - positions[o];
    const e1y = positions[o + 4] - positions[o + 1];
    const e1z = positions[o + 5] - positions[o + 2];
    const e2x = positions[o + 6] - positions[o];
    const e2y = positions[o + 7] - positions[o + 1];
    const e2z = positions[o + 8] - positions[o + 2];
    faceNormals[t * 3] = e1y * e2z - e1z * e2y;
    faceNormals[t * 3 + 1] = e1z * e2x - e1x * e2z;
    faceNormals[t * 3 + 2] = e1x * e2y - e1y * e2x;
  }
  const offsets = new Int32Array(count + 1);
  for (let c = 0; c < index.length; c += 1) offsets[index[c] + 1] += 1;
  for (let v = 0; v < count; v += 1) offsets[v + 1] += offsets[v];
  const cursor = offsets.slice(0, count);
  const faces = new Int32Array(index.length);
  for (let c = 0; c < index.length; c += 1) {
    faces[cursor[index[c]]] = (c / 3) | 0;
    cursor[index[c]] += 1;
  }
  return { index, vertexCount: count, offsets, faces, faceNormals };
}

function cosBetween(n: Float32Array, f: number, g: number): number {
  const fx = n[f * 3];
  const fy = n[f * 3 + 1];
  const fz = n[f * 3 + 2];
  const gx = n[g * 3];
  const gy = n[g * 3 + 1];
  const gz = n[g * 3 + 2];
  const l = Math.hypot(fx, fy, fz) * Math.hypot(gx, gy, gz);
  return l === 0 ? 1 : (fx * gx + fy * gy + fz * gz) / l;
}

export function creasedNormalsFrom(adjacency: Adjacency, creaseDeg = CREASE_ANGLE_DEG): Float32Array {
  const { index, offsets, faces, faceNormals } = adjacency;
  const triangles = index.length / 3;
  const out = new Float32Array(triangles * 9);
  const cosCrease = Math.cos((creaseDeg * Math.PI) / 180);
  for (let t = 0; t < triangles; t += 1) {
    const fx = faceNormals[t * 3];
    const fy = faceNormals[t * 3 + 1];
    const fz = faceNormals[t * 3 + 2];
    const fl = Math.hypot(fx, fy, fz);
    for (let k = 0; k < 3; k += 1) {
      const vertex = index[t * 3 + k];
      let sx = 0;
      let sy = 0;
      let sz = 0;
      if (fl > 0) {
        for (let j = offsets[vertex]; j < offsets[vertex + 1]; j += 1) {
          const g = faces[j];
          const gx = faceNormals[g * 3];
          const gy = faceNormals[g * 3 + 1];
          const gz = faceNormals[g * 3 + 2];
          const gl = Math.hypot(gx, gy, gz);
          if (gl === 0) continue;
          if ((fx * gx + fy * gy + fz * gz) / (fl * gl) >= cosCrease) {
            sx += gx;
            sy += gy;
            sz += gz;
          }
        }
      }
      let length = Math.hypot(sx, sy, sz);
      if (length === 0) {
        sx = fx;
        sy = fy;
        sz = fz;
        length = fl || 1;
      }
      const o = t * 9 + k * 3;
      out[o] = sx / length;
      out[o + 1] = sy / length;
      out[o + 2] = sz / length;
    }
  }
  return out;
}

export function creasedNormals(positions: Float32Array, creaseDeg = CREASE_ANGLE_DEG): Float32Array {
  if (positions.length < 9) return new Float32Array(0);
  return creasedNormalsFrom(buildAdjacency(positions), creaseDeg);
}

export interface FeatureEdges {
  /** Line segments, 6 floats each. */
  segments: Float32Array;
  /** Segment index per triangle edge (t * 3 + k, edge k from corner k to k + 1), or -1. */
  edgeSegment: Int32Array;
}

/**
 * Feature and boundary edges. An edge (a, b) is found from the faces around
 * vertex a that also contain b; each edge is emitted once (by the face with
 * the lower id). Edges shared by more than two faces are emitted as features.
 */
export function featureEdgesFrom(positions: Float32Array, adjacency: Adjacency, creaseDeg = CREASE_ANGLE_DEG): FeatureEdges {
  const { index, offsets, faces, faceNormals } = adjacency;
  const triangles = index.length / 3;
  const cosCrease = Math.cos((creaseDeg * Math.PI) / 180);
  const edgeSegment = new Int32Array(triangles * 3).fill(-1);
  let capacity = 1024;
  let segments = new Float32Array(capacity * 6);
  let count = 0;
  const neighbours: number[] = [];
  for (let t = 0; t < triangles; t += 1) {
    for (let k = 0; k < 3; k += 1) {
      if (edgeSegment[t * 3 + k] !== -1) continue;
      const a = index[t * 3 + k];
      const b = index[t * 3 + ((k + 1) % 3)];
      if (a === b) continue;
      neighbours.length = 0;
      for (let j = offsets[a]; j < offsets[a + 1]; j += 1) {
        const g = faces[j];
        if (g === t) continue;
        if (index[g * 3] === b || index[g * 3 + 1] === b || index[g * 3 + 2] === b) neighbours.push(g);
      }
      if (neighbours.some((g) => g < t)) continue; // emitted by the lower face
      const feature = neighbours.length !== 1 || cosBetween(faceNormals, t, neighbours[0]) < cosCrease;
      if (!feature) continue;
      if (count === capacity) {
        capacity *= 2;
        const bigger = new Float32Array(capacity * 6);
        bigger.set(segments);
        segments = bigger;
      }
      const pa = (t * 3 + k) * 3;
      const pb = (t * 3 + ((k + 1) % 3)) * 3;
      segments.set([positions[pa], positions[pa + 1], positions[pa + 2], positions[pb], positions[pb + 1], positions[pb + 2]], count * 6);
      edgeSegment[t * 3 + k] = count;
      for (const g of neighbours) {
        for (let m = 0; m < 3; m += 1) {
          const ga = index[g * 3 + m];
          const gb = index[g * 3 + ((m + 1) % 3)];
          if ((ga === a && gb === b) || (ga === b && gb === a)) edgeSegment[g * 3 + m] = count;
        }
      }
      count += 1;
    }
  }
  return { segments: segments.slice(0, count * 6), edgeSegment };
}
