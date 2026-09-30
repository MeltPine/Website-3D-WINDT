import { bounds, weld } from '../../../lib/printcheck/mesh';

/*
 * Smooth shading with creases for a triangle soup (pure, DOM-free; runs in
 * the normals worker). Coincident vertices are welded (printcheck `weld`);
 * each corner gets the area-weighted average of the face normals around its
 * vertex that lie within `creaseDeg` of its own face - rounded surfaces look
 * round, sharp CAD edges stay sharp.
 */

export const CREASE_ANGLE_DEG = 30;

export function creasedNormals(positions: Float32Array, creaseDeg = CREASE_ANGLE_DEG): Float32Array {
  const triangles = Math.floor(positions.length / 9);
  const out = new Float32Array(triangles * 9);
  if (triangles === 0) return out;
  const box = bounds(positions);
  const diagonal = Math.hypot(box.size[0], box.size[1], box.size[2]);
  const { index, count } = weld(positions, box, Math.max(1e-6, diagonal * 1e-6));

  // face normals (unnormalised cross product = 2 × area × unit normal)
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

  // vertex -> faces (CSR)
  const offsets = new Int32Array(count + 1);
  for (let c = 0; c < index.length; c += 1) offsets[index[c] + 1] += 1;
  for (let v = 0; v < count; v += 1) offsets[v + 1] += offsets[v];
  const cursor = offsets.slice(0, count);
  const faces = new Int32Array(index.length);
  for (let c = 0; c < index.length; c += 1) {
    faces[cursor[index[c]]] = (c / 3) | 0;
    cursor[index[c]] += 1;
  }

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
