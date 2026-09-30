import { boxPositions } from './meshes';

/*
 * Watertight synthetic parts for the printability tests. All generators emit
 * outward-wound triangle soups (9 floats per triangle, millimetres).
 */

type P2 = [number, number];

function pushTri(out: number[], a: number[], b: number[], c: number[]): void {
  out.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
}

function area2(poly: readonly P2[]): number {
  let s = 0;
  for (let i = 0; i < poly.length; i += 1) {
    const [x0, y0] = poly[i];
    const [x1, y1] = poly[(i + 1) % poly.length];
    s += x0 * y1 - x1 * y0;
  }
  return s;
}

function pointInTri(p: P2, a: P2, b: P2, c: P2): boolean {
  const d1 = (p[0] - b[0]) * (a[1] - b[1]) - (a[0] - b[0]) * (p[1] - b[1]);
  const d2 = (p[0] - c[0]) * (b[1] - c[1]) - (b[0] - c[0]) * (p[1] - c[1]);
  const d3 = (p[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (p[1] - a[1]);
  const neg = d1 < 0 || d2 < 0 || d3 < 0;
  const pos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(neg && pos);
}

/** Ear clipping of a simple CCW polygon; returns index triplets (CCW). */
function earClip(poly: readonly P2[]): Array<[number, number, number]> {
  const idx = poly.map((_, i) => i);
  const tris: Array<[number, number, number]> = [];
  let guard = 0;
  while (idx.length > 3 && guard < 10_000) {
    guard += 1;
    let clipped = false;
    for (let k = 0; k < idx.length; k += 1) {
      const i0 = idx[(k + idx.length - 1) % idx.length];
      const i1 = idx[k];
      const i2 = idx[(k + 1) % idx.length];
      const a = poly[i0];
      const b = poly[i1];
      const c = poly[i2];
      const cross = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
      if (cross <= 0) continue;
      let inside = false;
      for (const j of idx) {
        if (j === i0 || j === i1 || j === i2) continue;
        if (pointInTri(poly[j], a, b, c)) {
          inside = true;
          break;
        }
      }
      if (inside) continue;
      tris.push([i0, i1, i2]);
      idx.splice(k, 1);
      clipped = true;
      break;
    }
    if (!clipped) throw new Error('ear clipping failed');
  }
  tris.push([idx[0], idx[1], idx[2]]);
  return tris;
}

/**
 * Prism from a simple polygon in the X/Z plane (x right, z up), extruded
 * along +Y by `depth`.
 */
export function extrudeXZ(polygon: readonly P2[], depth: number): Float32Array {
  const poly = area2(polygon) > 0 ? [...polygon] : [...polygon].reverse();
  const out: number[] = [];
  for (const [a, b, c] of earClip(poly)) {
    const p = (i: number, y: number) => [poly[i][0], y, poly[i][1]];
    pushTri(out, p(a, 0), p(b, 0), p(c, 0)); // front, normal -Y
    pushTri(out, p(a, depth), p(c, depth), p(b, depth)); // back, normal +Y
  }
  for (let i = 0; i < poly.length; i += 1) {
    const [px, pz] = poly[i];
    const [qx, qz] = poly[(i + 1) % poly.length];
    const p0 = [px, 0, pz];
    const q0 = [qx, 0, qz];
    const q1 = [qx, depth, qz];
    const p1 = [px, depth, pz];
    pushTri(out, p0, q1, q0);
    pushTri(out, p0, p1, q1);
  }
  return new Float32Array(out);
}

/**
 * Square bar (cross-section w × w) with a round through hole of radius r,
 * length `length` along the given axis; the part starts at the origin.
 */
export function barWithHole(w: number, r: number, length: number, axis: 0 | 1 | 2, segments = 48): Float32Array {
  const n = segments;
  const inner: P2[] = [];
  const outer: P2[] = [];
  for (let k = 0; k < n; k += 1) {
    const t = (2 * Math.PI * k) / n;
    const c = Math.cos(t);
    const s = Math.sin(t);
    inner.push([w / 2 + r * c, w / 2 + r * s]);
    const scale = w / 2 / Math.max(Math.abs(c), Math.abs(s));
    outer.push([w / 2 + scale * c, w / 2 + scale * s]);
  }
  // local frame: (u = along axis, v, w); map to xyz with a proper rotation
  const map = (u: number, v: number, q: number): number[] => {
    if (axis === 0) return [u, v, q];
    if (axis === 1) return [q, u, v];
    return [v, q, u];
  };
  const out: number[] = [];
  for (let k = 0; k < n; k += 1) {
    const k1 = (k + 1) % n;
    const [iv0, iq0] = inner[k];
    const [iv1, iq1] = inner[k1];
    const [ov0, oq0] = outer[k];
    const [ov1, oq1] = outer[k1];
    // end cap u = 0 (normal -u): annulus quad (outer k, outer k1, inner k1, inner k)
    pushTri(out, map(0, ov0, oq0), map(0, iv1, iq1), map(0, ov1, oq1));
    pushTri(out, map(0, ov0, oq0), map(0, iv0, iq0), map(0, iv1, iq1));
    // end cap u = length (normal +u)
    pushTri(out, map(length, ov0, oq0), map(length, ov1, oq1), map(length, iv1, iq1));
    pushTri(out, map(length, ov0, oq0), map(length, iv1, iq1), map(length, iv0, iq0));
    // outer wall (normal outward)
    pushTri(out, map(0, ov0, oq0), map(0, ov1, oq1), map(length, ov1, oq1));
    pushTri(out, map(0, ov0, oq0), map(length, ov1, oq1), map(length, ov0, oq0));
    // hole wall (normal towards the axis)
    pushTri(out, map(0, iv0, iq0), map(length, iv1, iq1), map(0, iv1, iq1));
    pushTri(out, map(0, iv0, iq0), map(length, iv0, iq0), map(length, iv1, iq1));
  }
  return new Float32Array(out);
}

/** UV sphere with `rings` × `segments` quads (triangle count = 2·rings·segments − 2·segments). */
export function sphere(radius: number, rings: number, segments: number, cx = 0, cy = 0, cz = 0): Float32Array {
  const out: number[] = [];
  const point = (i: number, j: number) => {
    const theta = (Math.PI * i) / rings;
    const phi = (2 * Math.PI * j) / segments;
    return [
      cx + radius * Math.sin(theta) * Math.cos(phi),
      cy + radius * Math.sin(theta) * Math.sin(phi),
      cz + radius * Math.cos(theta),
    ];
  };
  for (let i = 0; i < rings; i += 1) {
    for (let j = 0; j < segments; j += 1) {
      const a = point(i, j);
      const b = point(i + 1, j);
      const c = point(i + 1, j + 1);
      const d = point(i, j + 1);
      if (i !== 0) pushTri(out, a, b, d);
      if (i !== rings - 1) pushTri(out, b, c, d);
    }
  }
  return new Float32Array(out);
}

export function concat(...parts: Float32Array[]): Float32Array {
  const out = new Float32Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

/** Reverses the winding of the triangles in [from, to). */
export function flipTriangles(positions: Float32Array, from: number, to: number): Float32Array {
  const out = positions.slice();
  for (let t = from; t < to; t += 1) {
    for (let k = 0; k < 3; k += 1) {
      const tmp = out[t * 9 + 3 + k];
      out[t * 9 + 3 + k] = out[t * 9 + 6 + k];
      out[t * 9 + 6 + k] = tmp;
    }
  }
  return out;
}

export interface Box3 {
  min: [number, number, number];
  max: [number, number, number];
}

/**
 * Watertight union of axis-aligned boxes: the distinct box coordinates span an
 * irregular grid, a grid cell is solid when a box covers it, and every face
 * between a solid and an empty cell becomes two triangles. All faces share the
 * same grid, so there are no T-junctions (avoid boxes that touch only along an
 * edge, which would be non-manifold).
 */
export function boxUnion(boxes: readonly Box3[]): Float32Array {
  const axes = [0, 1, 2].map((k) =>
    [...new Set(boxes.flatMap((b) => [b.min[k], b.max[k]]))].sort((a, b) => a - b),
  );
  const [xs, ys, zs] = axes;
  const inside = (i: number, j: number, k: number): boolean => {
    if (i < 0 || j < 0 || k < 0 || i >= xs.length - 1 || j >= ys.length - 1 || k >= zs.length - 1) return false;
    const cx = (xs[i] + xs[i + 1]) / 2;
    const cy = (ys[j] + ys[j + 1]) / 2;
    const cz = (zs[k] + zs[k + 1]) / 2;
    return boxes.some(
      (b) => cx > b.min[0] && cx < b.max[0] && cy > b.min[1] && cy < b.max[1] && cz > b.min[2] && cz < b.max[2],
    );
  };
  const out: number[] = [];
  const quad = (a: number[], b: number[], c: number[], d: number[]) => {
    pushTri(out, a, b, c);
    pushTri(out, a, c, d);
  };
  for (let i = 0; i < xs.length - 1; i += 1) {
    for (let j = 0; j < ys.length - 1; j += 1) {
      for (let k = 0; k < zs.length - 1; k += 1) {
        if (!inside(i, j, k)) continue;
        const x0 = xs[i];
        const x1 = xs[i + 1];
        const y0 = ys[j];
        const y1 = ys[j + 1];
        const z0 = zs[k];
        const z1 = zs[k + 1];
        if (!inside(i - 1, j, k)) quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]);
        if (!inside(i + 1, j, k)) quad([x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]);
        if (!inside(i, j - 1, k)) quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]);
        if (!inside(i, j + 1, k)) quad([x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0]);
        if (!inside(i, j, k - 1)) quad([x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [x1, y0, z0]);
        if (!inside(i, j, k + 1)) quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]);
      }
    }
  }
  return new Float32Array(out);
}

export function box(min: [number, number, number], max: [number, number, number]): Box3 {
  return { min, max };
}

export { boxPositions };
