/*
 * Measuring on the triangle mesh (pure functions; the viewer supplies the
 * hit triangle and screen projections).
 *
 * - Point to point: the picked point snaps to the nearest triangle corner
 *   within SNAP_RADIUS_PX on screen, otherwise the exact hit point is used.
 * - Edge: a click near a feature edge measures the full straight edge. Edges
 *   come as line segments (EdgesGeometry); collinear segments that share an
 *   end point are chained, because CAD exports split straight edges.
 */

export type Vec3 = [number, number, number];
export type Vec2 = [number, number];

export const SNAP_RADIUS_PX = 8;
/** Segments count as collinear below this angle between them. */
export const COLLINEAR_TOLERANCE_DEG = 1;

export interface SnapCandidate {
  world: Vec3;
  screen: Vec2;
}

/** Nearest candidate within `radiusPx` of the pointer, or null. */
export function snapToVertex(pointer: Vec2, candidates: readonly SnapCandidate[], radiusPx = SNAP_RADIUS_PX): SnapCandidate | null {
  let best: SnapCandidate | null = null;
  let bestDistance = radiusPx;
  for (const candidate of candidates) {
    const distance = Math.hypot(candidate.screen[0] - pointer[0], candidate.screen[1] - pointer[1]);
    if (distance <= bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return best;
}

export interface Measurement {
  a: Vec3;
  b: Vec3;
  distance: number;
  dx: number;
  dy: number;
  dz: number;
  kind: 'points' | 'edge';
}

export function measureBetween(a: Vec3, b: Vec3, kind: Measurement['kind'] = 'points'): Measurement {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const dz = b[2] - a[2];
  return { a, b, distance: Math.hypot(dx, dy, dz), dx, dy, dz, kind };
}

const mm = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatMm(value: number): string {
  return mm.format(Object.is(Math.round(value * 100) / 100, -0) ? 0 : value);
}

/** Text for the live region and the measurement list (0.01 mm). */
export function describeMeasurement(measurement: Measurement): string {
  const head = measurement.kind === 'edge' ? 'Kante' : 'Abstand';
  return (
    `${head} ${formatMm(measurement.distance)} mm · ΔX ${formatMm(Math.abs(measurement.dx))} · ` +
    `ΔY ${formatMm(Math.abs(measurement.dy))} · ΔZ ${formatMm(Math.abs(measurement.dz))} mm`
  );
}

/** Squared distance from point p to segment ab in screen space. */
export function pointSegmentDistance(p: Vec2, a: Vec2, b: Vec2): number {
  const abx = b[0] - a[0];
  const aby = b[1] - a[1];
  const lengthSq = abx * abx + aby * aby;
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * abx + (p[1] - a[1]) * aby) / lengthSq));
  return Math.hypot(p[0] - (a[0] + t * abx), p[1] - (a[1] + t * aby));
}

/**
 * Chains collinear segments that share end points into one straight edge.
 * `segments` is a flat array of line-segment end points (6 floats per
 * segment, as in EdgesGeometry). Returns the end points of the chain that
 * contains `startIndex`. Points closer than `epsilon` count as shared.
 */
export function chainCollinear(
  segments: ArrayLike<number>,
  startIndex: number,
  epsilon = 1e-3,
  toleranceDeg = COLLINEAR_TOLERANCE_DEG,
): { a: Vec3; b: Vec3; segmentCount: number } {
  const count = Math.floor(segments.length / 6);
  if (!Number.isInteger(startIndex) || startIndex < 0 || startIndex >= count) {
    throw new RangeError('Segment index out of range.');
  }
  const point = (segment: number, end: 0 | 1): Vec3 => {
    const o = segment * 6 + end * 3;
    return [segments[o], segments[o + 1], segments[o + 2]];
  };
  const key = (p: Vec3) => `${Math.round(p[0] / epsilon)},${Math.round(p[1] / epsilon)},${Math.round(p[2] / epsilon)}`;
  const byPoint = new Map<string, number[]>();
  for (let s = 0; s < count; s += 1) {
    for (const end of [0, 1] as const) {
      const k = key(point(s, end));
      const list = byPoint.get(k);
      if (list) list.push(s);
      else byPoint.set(k, [s]);
    }
  }
  const a0 = point(startIndex, 0);
  const b0 = point(startIndex, 1);
  const length = Math.hypot(b0[0] - a0[0], b0[1] - a0[1], b0[2] - a0[2]);
  if (length === 0) return { a: a0, b: b0, segmentCount: 1 };
  const dir: Vec3 = [(b0[0] - a0[0]) / length, (b0[1] - a0[1]) / length, (b0[2] - a0[2]) / length];
  const cosTolerance = Math.cos((toleranceDeg * Math.PI) / 180);
  const used = new Set<number>([startIndex]);

  const extend = (from: Vec3, sign: 1 | -1): Vec3 => {
    let tip = from;
    for (;;) {
      const neighbours = byPoint.get(key(tip)) ?? [];
      let advanced = false;
      for (const s of neighbours) {
        if (used.has(s)) continue;
        const p0 = point(s, 0);
        const p1 = point(s, 1);
        const other = key(p0) === key(tip) ? p1 : p0;
        const vx = other[0] - tip[0];
        const vy = other[1] - tip[1];
        const vz = other[2] - tip[2];
        const len = Math.hypot(vx, vy, vz);
        if (len === 0) continue;
        const cos = (sign * (vx * dir[0] + vy * dir[1] + vz * dir[2])) / len;
        if (cos >= cosTolerance) {
          used.add(s);
          tip = other;
          advanced = true;
          break;
        }
      }
      if (!advanced) return tip;
    }
  };

  const b = extend(b0, 1);
  const a = extend(a0, -1);
  return { a, b, segmentCount: used.size };
}
