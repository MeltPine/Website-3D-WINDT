/*
 * Axis-parallel section plane (pure). three.js clipping keeps the half space
 * where normal·p + constant >= 0. Default direction: the part on the
 * positive side of the axis is cut away, the viewer looks into the cut from
 * there; "Richtung umkehren" keeps the other half.
 */

export type SectionAxis = 'x' | 'y' | 'z';

export const SECTION_AXES: readonly SectionAxis[] = ['x', 'y', 'z'];

export interface SectionPlane {
  normal: [number, number, number];
  constant: number;
}

const AXIS_INDEX: Readonly<Record<SectionAxis, 0 | 1 | 2>> = { x: 0, y: 1, z: 2 };

export function axisIndex(axis: SectionAxis): 0 | 1 | 2 {
  return AXIS_INDEX[axis];
}

export function sectionPlane(axis: SectionAxis, offsetMm: number, flipped: boolean): SectionPlane {
  if (!Number.isFinite(offsetMm)) {
    throw new RangeError('Section offset must be finite.');
  }
  const normal: [number, number, number] = [0, 0, 0];
  const sign = flipped ? 1 : -1;
  normal[AXIS_INDEX[axis]] = sign;
  // keeps sign * p[axis] + constant >= 0 → p[axis] <= offset (default) or >= offset (flipped)
  return { normal, constant: -sign * offsetMm };
}

/** Slider range for the axis: the part's extent, step 0.1 mm. */
export function sectionRange(min: readonly number[], max: readonly number[], axis: SectionAxis): { min: number; max: number; step: number } {
  const i = AXIS_INDEX[axis];
  return { min: Math.floor(min[i] * 10) / 10, max: Math.ceil(max[i] * 10) / 10, step: 0.1 };
}

/** Clamps and rounds a typed-in offset to the slider grid. */
export function clampOffset(value: number, range: { min: number; max: number; step: number }): number {
  if (!Number.isFinite(value)) return (range.min + range.max) / 2;
  const clamped = Math.min(range.max, Math.max(range.min, value));
  return Math.round(clamped / range.step) * range.step;
}

/** True if the point is kept by the plane (used by tests and the measure tool). */
export function keeps(plane: SectionPlane, point: readonly [number, number, number]): boolean {
  return plane.normal[0] * point[0] + plane.normal[1] * point[1] + plane.normal[2] * point[2] + plane.constant >= -1e-9;
}
