import type { Bounds, Vec3 } from './mesh';

/*
 * The six axis-aligned seatings of the orientation study (FDM-INSPECT
 * `orientationStudy`). A pose is a signed axis permutation:
 *   poseCoord[k] = sign[k] * modelCoord[perm[k]]
 * so rotating needs no copy of the (possibly huge) position buffer.
 */

export type Axis = 0 | 1 | 2;
export type Sign = 1 | -1;

export interface Pose {
  id: number;
  perm: readonly [Axis, Axis, Axis];
  sign: readonly [Sign, Sign, Sign];
  /** Model side that rests on the build plate, e.g. "−Z". */
  downSide: string;
  /** German label for tables. */
  label: string;
}

const AXIS_NAME = ['X', 'Y', 'Z'] as const;

function makePose(id: number, perm: [Axis, Axis, Axis], sign: [Sign, Sign, Sign]): Pose {
  // model direction that maps to pose -Z: model[perm[2]] = -sign[2]
  const downSide = `${-sign[2] > 0 ? '+' : '−'}${AXIS_NAME[perm[2]]}`;
  const label = id === 0 ? `Wie geladen (Modellseite ${downSide} unten)` : `Modellseite ${downSide} unten`;
  return { id, perm, sign, downSide, label };
}

/** Same candidates and order as FDM-INSPECT: loaded, flipped, ±90° about X, ±90° about Y. */
export const POSES: readonly Pose[] = [
  makePose(0, [0, 1, 2], [1, 1, 1]),
  makePose(1, [0, 1, 2], [1, -1, -1]),
  makePose(2, [0, 2, 1], [1, -1, 1]),
  makePose(3, [0, 2, 1], [1, 1, -1]),
  makePose(4, [2, 1, 0], [1, 1, -1]),
  makePose(5, [2, 1, 0], [-1, 1, 1]),
];

/** Bounds of the part in pose coordinates (not seated). */
export function poseBounds(box: Bounds, pose: Pose): Bounds {
  const min: Vec3 = [0, 0, 0];
  const max: Vec3 = [0, 0, 0];
  for (let k = 0; k < 3; k += 1) {
    const a = pose.perm[k];
    if (pose.sign[k] > 0) {
      min[k] = box.min[a];
      max[k] = box.max[a];
    } else {
      min[k] = -box.max[a];
      max[k] = -box.min[a];
    }
  }
  return { min, max, size: [max[0] - min[0], max[1] - min[1], max[2] - min[2]] };
}

/** Row-major 3×3 rotation matrix of the pose (for the viewer). */
export function poseMatrix(pose: Pose): number[] {
  const m = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (let k = 0; k < 3; k += 1) {
    m[k * 3 + pose.perm[k]] = pose.sign[k];
  }
  return m;
}

/** Maps a model-frame point into the pose frame. */
export function toPose(pose: Pose, x: number, y: number, z: number, out: Float64Array): void {
  const v = [x, y, z];
  out[0] = pose.sign[0] * v[pose.perm[0]];
  out[1] = pose.sign[1] * v[pose.perm[1]];
  out[2] = pose.sign[2] * v[pose.perm[2]];
}
