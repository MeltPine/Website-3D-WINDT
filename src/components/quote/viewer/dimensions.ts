/*
 * Bounding-box dimension callouts (pure part). The oversize check pairs the
 * part's axes with the machine's axes by size (same orientation-independent
 * rule as pricing.fitsBuildVolume) and marks the axes that do not fit.
 */

export type Size3 = readonly [number, number, number];

export function oversizeAxes(size: Size3, buildVolume: Size3): [boolean, boolean, boolean] {
  const partOrder = [0, 1, 2].sort((a, b) => size[b] - size[a]);
  const machine = [...buildVolume].sort((a, b) => b - a);
  const result: [boolean, boolean, boolean] = [false, false, false];
  partOrder.forEach((axis, rank) => {
    result[axis] = size[axis] > machine[rank];
  });
  return result;
}

const oneDecimal = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function formatDimension(valueMm: number): string {
  return oneDecimal.format(valueMm);
}

export const AXIS_LABEL = ['Breite (X)', 'Tiefe (Y)', 'Höhe (Z)'] as const;
