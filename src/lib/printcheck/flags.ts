/*
 * Per-triangle finding bits (Uint16Array, one entry per triangle of the
 * original triangle soup, same order as the viewer geometry). The viewer
 * colours triangles whose entry intersects the mask of the active finding.
 */

export const TRI_FLAG = {
  /** Triangle touches an open (boundary) edge. */
  OPEN_EDGE: 1 << 0,
  /** Triangle touches an edge shared by more than two triangles. */
  NON_MANIFOLD: 1 << 1,
  /** Winding contradicts its neighbours / the outward direction. */
  FLIPPED: 1 << 2,
  /** Belongs to a tiny separate shell (export splinter). */
  SPLINTER: 1 << 3,
  /** Overhang beyond the support threshold in the recommended pose. */
  OVERHANG_SUPPORT: 1 << 4,
  /** Overhang beyond the critical angle in the recommended pose. */
  OVERHANG_CRITICAL: 1 << 5,
  /** Wall thinner than the recommended wall. */
  THIN_WALL: 1 << 6,
  /** Wall thinner than one extrusion width. */
  THIN_CRITICAL: 1 << 7,
  /** Gap/slot narrower than the hint limit. */
  NARROW_GAP: 1 << 8,
  /** Wall of a small hole. */
  SMALL_HOLE: 1 << 9,
  /** Wall of a horizontal hole that needs a teardrop shape. */
  HORIZONTAL_HOLE: 1 << 10,
  /** Adjacent to a sharp concave (inner) edge. */
  SHARP_INNER: 1 << 11,
  /** Inside a region enclosed twice (overlapping bodies / self-intersection). */
  OVERLAP: 1 << 12,
  /** Slender free-standing feature. */
  SLENDER: 1 << 13,
} as const;

export type TriFlagName = keyof typeof TRI_FLAG;
