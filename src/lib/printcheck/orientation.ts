import { TRI_FLAG } from './flags';
import type { Bounds } from './mesh';
import { POSES, poseBounds, type Pose } from './pose';
import { classifyOverhang, OVERHANG_CLASSES, type OverhangClassKey } from './standards';

/*
 * Overhangs and the orientation study (FDM-INSPECT `overhangAnalysis` and
 * `orientationStudy`), computed for all six poses in a single pass over the
 * triangles: the pose only permutes and negates axes, so each triangle's
 * normal and height are read, never a rotated copy of the mesh.
 *
 * Conventions kept from FDM-INSPECT:
 * - overhang angle from the vertical, asin(-n.z): 0° wall, 90° ceiling;
 * - downward faces resting on the plate (all vertices within one layer
 *   height) are not overhangs - otherwise every cube has 16.7 % "critical";
 * - shares are taken against the surface that can overhang at all (total
 *   minus plate contact), so a big footprint does not dilute the share.
 */

export interface PoseStudy {
  poseId: number;
  label: string;
  downSide: string;
  /** Pose size X × Y × Z (Z = build height), mm. */
  size: [number, number, number];
  height: number;
  /** Down-facing area within one layer of the plate, mm². */
  bedContact: number;
  /** Area shares (%) per overhang class, of the judged surface. */
  classShares: Record<OverhangClassKey, number>;
  /** % of judged surface steeper than the support threshold. */
  supportShare: number;
  /** % of judged surface steeper than the critical angle. */
  criticalShare: number;
  worstAngle: number;
  /** Horizontal projection of faces beyond the support threshold, mm². */
  supportArea: number;
  /** Upper estimate: projected area × height above the plate, mm³ (gross). */
  supportVolumeUpper: number;
  /** Centre-of-mass height as fraction of the build height (0..1). */
  centroidHeightRatio: number;
  score: number;
  scoreParts: { overhang: number; height: number; contact: number; stability: number; anisotropy: number };
}

export interface OrientationStudy {
  poses: PoseStudy[];
  recommendedId: number;
  /** Poses ranked best first. */
  ranking: number[];
}

export interface OrientationOptions {
  plateTolMm: number;
  supportDeg: number;
  criticalDeg: number;
  /** Centroid of the solid in model coordinates. */
  centroid: [number, number, number];
  /** The loaded pose wins if it is at most this many score points behind (CAD orientation is often intentional). */
  loadedPoseBonus: number;
  /** Poses that fit the build volume; the recommendation is restricted to them (all poses if empty). */
  eligiblePoses: readonly number[];
}

const DEG = 180 / Math.PI;

/** Score weights (sum 1). Overhang, height and contact are FDM-INSPECT's; stability and anisotropy extend it. */
export const ORIENTATION_WEIGHTS = { overhang: 0.45, height: 0.2, contact: 0.15, stability: 0.1, anisotropy: 0.1 } as const;

export function orientationStudy(pos: Float32Array, box: Bounds, options: OrientationOptions): OrientationStudy {
  const nt = pos.length / 9;
  const P = POSES.length;
  const zmin = new Float64Array(P);
  const heights = new Float64Array(P);
  const pbs = POSES.map((pose) => poseBounds(box, pose));
  POSES.forEach((_pose, p) => {
    zmin[p] = pbs[p].min[2];
    heights[p] = pbs[p].size[2];
  });
  const total = new Float64Array(P);
  const plate = new Float64Array(P);
  const contact = new Float64Array(P);
  const supportArea = new Float64Array(P);
  const supportVolume = new Float64Array(P);
  const supportSurf = new Float64Array(P);
  const criticalSurf = new Float64Array(P);
  const worst = new Float64Array(P);
  const classArea = POSES.map(() => ({ upright: 0, safe: 0, marginal: 0, critical: 0, ceiling: 0 }) as Record<OverhangClassKey, number>);
  const supportSin = Math.sin(options.supportDeg / DEG);
  const contactEps = POSES.map((_, p) => Math.max(heights[p] * 0.002, 0.15));

  const n = [0, 0, 0];
  const cz = [0, 0, 0];
  for (let t = 0; t < nt; t += 1) {
    const i = t * 9;
    const e1x = pos[i + 3] - pos[i];
    const e1y = pos[i + 4] - pos[i + 1];
    const e1z = pos[i + 5] - pos[i + 2];
    const e2x = pos[i + 6] - pos[i];
    const e2y = pos[i + 7] - pos[i + 1];
    const e2z = pos[i + 8] - pos[i + 2];
    const nx = e1y * e2z - e1z * e2y;
    const ny = e1z * e2x - e1x * e2z;
    const nz = e1x * e2y - e1y * e2x;
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (len < 1e-14) continue;
    const area = len / 2;
    n[0] = nx / len;
    n[1] = ny / len;
    n[2] = nz / len;
    for (let p = 0; p < P; p += 1) {
      const pose = POSES[p];
      const a = pose.perm[2];
      const s = pose.sign[2];
      const unz = s * n[a];
      total[p] += area;
      cz[0] = s * pos[i + a] - zmin[p];
      cz[1] = s * pos[i + 3 + a] - zmin[p];
      cz[2] = s * pos[i + 6 + a] - zmin[p];
      if (unz > -1e-6) {
        classArea[p].upright += area;
        continue;
      }
      if (cz[0] <= contactEps[p] && cz[1] <= contactEps[p] && cz[2] <= contactEps[p] && unz < -0.99) {
        contact[p] += area;
      }
      if (cz[0] <= options.plateTolMm && cz[1] <= options.plateTolMm && cz[2] <= options.plateTolMm) {
        plate[p] += area;
        continue;
      }
      const angle = Math.asin(Math.min(1, -unz)) * DEG;
      classArea[p][classifyOverhang(angle).key] += area;
      if (angle > worst[p]) worst[p] = angle;
      if (angle >= options.criticalDeg) criticalSurf[p] += area;
      if (-unz > supportSin) {
        supportSurf[p] += area;
        const projected = area * -unz;
        supportArea[p] += projected;
        supportVolume[p] += projected * ((cz[0] + cz[1] + cz[2]) / 3);
      }
    }
  }

  const maxH = Math.max(...heights);
  const maxContact = Math.max(...contact) || 1;
  const dims = [...box.size].sort((x, y) => x - y);
  const minDim = dims[0];
  const maxDim = dims[2];

  const poses: PoseStudy[] = POSES.map((pose, p) => {
    const judged = Math.max(total[p] - plate[p], 1e-9);
    const classShares = {} as Record<OverhangClassKey, number>;
    for (const cls of OVERHANG_CLASSES) classShares[cls.key] = (classArea[p][cls.key] / judged) * 100;
    const criticalShare = (criticalSurf[p] / judged) * 100;
    const size = pbs[p].size;
    const height = heights[p];
    const centroidZ = pose.sign[2] * options.centroid[pose.perm[2]] - zmin[p];
    const overhang = 1 - Math.min(1, criticalShare / 25);
    const heightScore = maxH > 0 ? 1 - height / maxH : 0;
    const contactScore = contact[p] / maxContact;
    const stability = height > 0 ? Math.min(1, Math.min(size[0], size[1]) / height) : 1;
    const anisotropy = maxDim - minDim > 1e-9 ? 1 - Math.min(1, Math.max(0, (height - minDim) / (maxDim - minDim))) : 1;
    const score =
      (overhang * ORIENTATION_WEIGHTS.overhang +
        heightScore * ORIENTATION_WEIGHTS.height +
        contactScore * ORIENTATION_WEIGHTS.contact +
        stability * ORIENTATION_WEIGHTS.stability +
        anisotropy * ORIENTATION_WEIGHTS.anisotropy) *
      100;
    return {
      poseId: pose.id,
      label: pose.label,
      downSide: pose.downSide,
      size: [size[0], size[1], size[2]],
      height,
      bedContact: contact[p],
      classShares,
      supportShare: (supportSurf[p] / judged) * 100,
      criticalShare,
      worstAngle: worst[p],
      supportArea: supportArea[p],
      supportVolumeUpper: supportVolume[p],
      centroidHeightRatio: height > 0 ? centroidZ / height : 0,
      score,
      scoreParts: { overhang, height: heightScore, contact: contactScore, stability, anisotropy },
    };
  });

  const ranking = poses
    .map((study) => study.poseId)
    .sort((a, b) => {
      const diff = poses[b].score - poses[a].score;
      return Math.abs(diff) > 1e-9 ? diff : a - b;
    });
  const eligible = options.eligiblePoses.length > 0 ? options.eligiblePoses : ranking;
  let recommendedId = ranking.find((id) => eligible.includes(id)) ?? ranking[0];
  if (
    recommendedId !== 0 &&
    eligible.includes(0) &&
    poses[recommendedId].score - poses[0].score <= options.loadedPoseBonus
  ) {
    recommendedId = 0;
  }
  return { poses, recommendedId, ranking };
}

/** Sets the overhang flags of the recommended pose. */
export function flagOverhangs(
  pos: Float32Array,
  box: Bounds,
  pose: Pose,
  flags: Uint16Array,
  options: { plateTolMm: number; supportDeg: number; criticalDeg: number },
): void {
  const nt = pos.length / 9;
  const a = pose.perm[2];
  const s = pose.sign[2];
  const zmin = poseBounds(box, pose).min[2];
  const supportSin = Math.sin(options.supportDeg / DEG);
  const criticalSin = Math.sin(options.criticalDeg / DEG);
  for (let t = 0; t < nt; t += 1) {
    const i = t * 9;
    const e1x = pos[i + 3] - pos[i];
    const e1y = pos[i + 4] - pos[i + 1];
    const e1z = pos[i + 5] - pos[i + 2];
    const e2x = pos[i + 6] - pos[i];
    const e2y = pos[i + 7] - pos[i + 1];
    const e2z = pos[i + 8] - pos[i + 2];
    const nv = [e1y * e2z - e1z * e2y, e1z * e2x - e1x * e2z, e1x * e2y - e1y * e2x];
    const len = Math.sqrt(nv[0] * nv[0] + nv[1] * nv[1] + nv[2] * nv[2]);
    if (len < 1e-14) continue;
    const unz = (s * nv[a]) / len;
    if (unz >= 0) continue;
    const z0 = s * pos[i + a] - zmin;
    const z1 = s * pos[i + 3 + a] - zmin;
    const z2 = s * pos[i + 6 + a] - zmin;
    if (z0 <= options.plateTolMm && z1 <= options.plateTolMm && z2 <= options.plateTolMm) continue;
    if (-unz > supportSin) flags[t] |= TRI_FLAG.OVERHANG_SUPPORT;
    if (-unz >= criticalSin) flags[t] |= TRI_FLAG.OVERHANG_CRITICAL;
  }
}

/* ---------------------------------------------------- build volume fit */

export interface BuildVolumeFit {
  /** Fits as loaded, axis-aligned. */
  fitsAsLoaded: boolean;
  /** Poses in which the part fits axis-aligned (Z rotation allowed). */
  fittingPoses: number[];
  /** Poses in which it only fits turned about Z (diagonal placement). */
  diagonalPoses: number[];
  /** Turn angle about Z for the first diagonal pose, degrees. */
  diagonalAngle: number | null;
  /** Estimated number of pieces if it fits nowhere. */
  splitPieces: number | null;
}

function fitsRect(w: number, d: number, bx: number, by: number): boolean {
  return (w <= bx && d <= by) || (w <= by && d <= bx);
}

function diagonalAngle(w: number, d: number, bx: number, by: number): number | null {
  for (let deg = 1; deg < 90; deg += 1) {
    const c = Math.cos(deg / DEG);
    const s = Math.sin(deg / DEG);
    if (w * c + d * s <= bx && w * s + d * c <= by) return deg;
  }
  return null;
}

/** Bounding-box based (conservative: the real part may fit where its box does not). */
export function buildVolumeFit(box: Bounds, volume: readonly [number, number, number]): BuildVolumeFit {
  const [bx, by, bz] = volume;
  const fittingPoses: number[] = [];
  const diagonalPoses: number[] = [];
  let firstDiagonal: number | null = null;
  for (const pose of POSES) {
    const size = poseBounds(box, pose).size;
    if (size[2] > bz) continue;
    if (fitsRect(size[0], size[1], bx, by)) {
      fittingPoses.push(pose.id);
      continue;
    }
    const angle = diagonalAngle(size[0], size[1], bx, by);
    if (angle !== null) {
      diagonalPoses.push(pose.id);
      if (firstDiagonal === null) firstDiagonal = angle;
    }
  }
  let splitPieces: number | null = null;
  if (fittingPoses.length === 0 && diagonalPoses.length === 0) {
    const dims = [...box.size].sort((x, y) => y - x);
    for (let pieces = 2; pieces <= 50 && splitPieces === null; pieces += 1) {
      const piece = [dims[0] / pieces, dims[1], dims[2]];
      const orders = [
        [0, 1, 2],
        [0, 2, 1],
        [1, 0, 2],
        [1, 2, 0],
        [2, 0, 1],
        [2, 1, 0],
      ];
      for (const [i, j, k] of orders) {
        if (piece[k] <= bz && (fitsRect(piece[i], piece[j], bx, by) || diagonalAngle(piece[i], piece[j], bx, by) !== null)) {
          splitPieces = pieces;
          break;
        }
      }
    }
  }
  return {
    fitsAsLoaded: fittingPoses.includes(0),
    fittingPoses,
    diagonalPoses,
    diagonalAngle: firstDiagonal,
    splitPieces,
  };
}
