/*
 * Layer preview (pure). The part is cut at the height of layer n; the time
 * share comes from the cross-section area profile of the printability check
 * (voxel slabs from the plate up, in the pose the check rasterised). This is
 * a volume share, not a slicer result, and is labelled as such.
 */

export interface AreaProfile {
  /** Slab height, mm. */
  stepMm: number;
  /** Cross-section area per slab from the plate upwards, mm². */
  areas: readonly number[];
}

export interface LayerState {
  layer: number;
  layerCount: number;
  /** Top of the layer above the plate, mm. */
  heightMm: number;
  /** Share of the printed volume up to this height (0..1), null without profile. */
  volumeShare: number | null;
  /** Estimated machine time up to this layer, h (null without profile or time). */
  hoursSoFar: number | null;
}

export function layerCountFor(partHeightMm: number, layerHeightMm: number): number {
  if (!(partHeightMm > 0) || !(layerHeightMm > 0)) {
    throw new RangeError('Height and layer height must be positive.');
  }
  return Math.max(1, Math.ceil(partHeightMm / layerHeightMm - 1e-9));
}

/** Share of Σ area × step below `heightMm` (linear inside the slab). */
export function volumeShareBelow(profile: AreaProfile, heightMm: number): number {
  const total = profile.areas.reduce((sum, area) => sum + area, 0);
  if (total <= 0) return 0;
  let below = 0;
  for (let i = 0; i < profile.areas.length; i += 1) {
    const bottom = i * profile.stepMm;
    if (heightMm <= bottom) break;
    const fraction = Math.min(1, (heightMm - bottom) / profile.stepMm);
    below += profile.areas[i] * fraction;
  }
  return Math.min(1, below / total);
}

export function layerState(
  layer: number,
  partHeightMm: number,
  layerHeightMm: number,
  profile: AreaProfile | null,
  time: { totalHours: number; fixedHours: number } | null,
): LayerState {
  const layerCount = layerCountFor(partHeightMm, layerHeightMm);
  const clamped = Math.min(layerCount, Math.max(1, Math.round(layer)));
  const heightMm = Math.min(partHeightMm, clamped * layerHeightMm);
  const volumeShare = profile ? (clamped === layerCount ? 1 : volumeShareBelow(profile, heightMm)) : null;
  const hoursSoFar =
    volumeShare !== null && time ? time.fixedHours + volumeShare * Math.max(0, time.totalHours - time.fixedHours) : null;
  return { layer: clamped, layerCount, heightMm, volumeShare, hoursSoFar };
}

/** "1:14 h" */
export function formatHours(hours: number): string {
  const totalMinutes = Math.max(0, Math.round(hours * 60));
  return `${Math.floor(totalMinutes / 60)}:${String(totalMinutes % 60).padStart(2, '0')} h`;
}
