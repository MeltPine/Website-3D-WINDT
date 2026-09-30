/*
 * Camera framing and view presets as pure math (Z up, millimetres).
 *
 * Direction convention: the vector from the target to the camera. The front
 * view looks along +Y (camera on −Y), X points right, Z up - as in the usual
 * CAD front view. Azimuth turns around Z, positive towards the right side
 * (+X), elevation lifts towards +Z.
 */

export type Vec3 = [number, number, number];

export type ViewPresetId = 'iso' | 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom';

export interface ViewPreset {
  id: ViewPresetId;
  label: string;
  azimuthDeg: number;
  elevationDeg: number;
}

/** Default isometric-style view (spec 3.2: azimuth 35° to the right, elevation 28°). */
export const DEFAULT_AZIMUTH_DEG = 35;
export const DEFAULT_ELEVATION_DEG = 28;
/** Share of the stage height the bounding sphere fills after "Einpassen". */
export const FRAME_FILL = 0.7;

export const VIEW_PRESETS: readonly ViewPreset[] = [
  { id: 'iso', label: 'Isometrie', azimuthDeg: DEFAULT_AZIMUTH_DEG, elevationDeg: DEFAULT_ELEVATION_DEG },
  { id: 'front', label: 'Vorne', azimuthDeg: 0, elevationDeg: 0 },
  { id: 'back', label: 'Hinten', azimuthDeg: 180, elevationDeg: 0 },
  { id: 'left', label: 'Links', azimuthDeg: -90, elevationDeg: 0 },
  { id: 'right', label: 'Rechts', azimuthDeg: 90, elevationDeg: 0 },
  { id: 'top', label: 'Oben', azimuthDeg: 0, elevationDeg: 90 },
  { id: 'bottom', label: 'Unten', azimuthDeg: 0, elevationDeg: -90 },
];

const RAD = Math.PI / 180;

export function directionFromAngles(azimuthDeg: number, elevationDeg: number): Vec3 {
  const az = azimuthDeg * RAD;
  const el = elevationDeg * RAD;
  return [Math.sin(az) * Math.cos(el), -Math.cos(az) * Math.cos(el), Math.sin(el)];
}

/**
 * Camera up vector for a view direction. Straight top/bottom views would make
 * Z-up degenerate; they use +Y (top: back edge at the top of the screen).
 */
export function upForDirection(direction: Vec3): Vec3 {
  const horizontal = Math.hypot(direction[0], direction[1]);
  if (horizontal < 1e-6) {
    return direction[2] > 0 ? [0, 1, 0] : [0, -1, 0];
  }
  return [0, 0, 1];
}

/**
 * Distance at which a perspective camera shows a sphere of `radius` so that
 * it fills `fill` of the viewport height (or width, if the viewport is
 * narrower than tall).
 */
export function perspectiveFrameDistance(radius: number, verticalFovDeg: number, aspect: number, fill = FRAME_FILL): number {
  if (!(radius > 0) || !(verticalFovDeg > 0 && verticalFovDeg < 180) || !(aspect > 0) || !(fill > 0 && fill <= 1)) {
    throw new RangeError('Invalid framing input.');
  }
  const halfV = (verticalFovDeg * RAD) / 2;
  const halfH = Math.atan(Math.tan(halfV) * aspect);
  // angular radius the sphere may occupy in the tighter direction
  const half = Math.min(halfV, halfH);
  const target = Math.atan(Math.tan(half) * fill);
  return radius / Math.sin(target);
}

/** Half height of an orthographic frustum that shows the sphere at `fill`. */
export function orthographicHalfHeight(radius: number, aspect: number, fill = FRAME_FILL): number {
  if (!(radius > 0) || !(aspect > 0) || !(fill > 0 && fill <= 1)) {
    throw new RangeError('Invalid framing input.');
  }
  const halfHeight = radius / fill;
  // narrow viewport: the width limits
  return aspect < 1 ? halfHeight / aspect : halfHeight;
}

/** Bounding-sphere radius of an axis-aligned box. */
export function boxRadius(size: readonly [number, number, number]): number {
  return Math.max(0.5, Math.hypot(size[0], size[1], size[2]) / 2);
}

/**
 * Build plate size shown under the part: footprint + 40 %, rounded up to the
 * 10 mm grid (spec 3.1), at least 50 mm.
 */
export function plateSizeFor(footprint: readonly [number, number]): number {
  const side = Math.max(footprint[0], footprint[1]) * 1.4;
  return Math.max(50, Math.ceil(side / 10) * 10);
}
