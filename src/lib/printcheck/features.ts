import { TRI_FLAG } from './flags';
import { MARK, scratchOf, type LayerStats, type VoxelGrid } from './voxel';

/*
 * Feature measurements on the voxel model.
 *
 * Wall thickness (FDM-INSPECT `wallStats`): the local thickness is the
 * diameter of the largest sphere inscribed in the solid, whose centre sits on
 * the medial axis, i.e. on a local maximum of the distance field. The naive
 * "2 × distance to the surface at every voxel" reports a solid cube as 10 %
 * thin wall, because that distance is small near every surface.
 *
 * Gaps and holes use the same idea on the empty space: local maxima of the
 * distance from empty cells to the solid are the centre lines of slots and
 * holes (plateaus along their length); in open exterior space the distance
 * keeps growing away from the part, so it has no maxima there. Ridge points
 * are grouped into connected components and classified by principal
 * component analysis: a line = hole/channel (with axis direction), a sheet =
 * slot/gap. Heuristic, and labelled as such in the report.
 */

/** A maximum must clear the surface by one voxel, else skin noise reads as a thin wall. */
const MIN_D = 1.0;
/** Histogram of wall thickness: 0.2 mm bins up to 16 mm (FDM-INSPECT). */
const WALL_BIN_MM = 0.2;
const WALL_BINS = 80;
/** Largest void width considered for gaps and holes. */
const GAP_MAX_MM = 40;
/** Upper bound of void ridge points processed (memory/time). */
const MAX_VOID_RIDGE_POINTS = 4_000_000;

/**
 * Diameter of the inscribed sphere at a ridge cell, corrected for raster
 * parity. `2 · d · h` (FDM-INSPECT) is exact when an even number of cells
 * spans the wall (the ridge has a twin of equal distance across it) but
 * overstates an odd span by one voxel. If both neighbours along some axis
 * are clearly lower, the cell is the single centre of an odd span and the
 * diameter is (2d - 1) · h. Keeps the error within ±h/2 for axis-aligned
 * walls instead of 0..+h.
 */
function ridgeDiameter(dist: Float32Array, i: number, d: number, h: number, NX: number, plane: number): number {
  const lower = d - 0.25;
  if (
    (dist[i - 1] < lower && dist[i + 1] < lower) ||
    (dist[i - NX] < lower && dist[i + NX] < lower) ||
    (dist[i - plane] < lower && dist[i + plane] < lower)
  ) {
    return (2 * d - 1) * h;
  }
  return 2 * d * h;
}

export interface WallStats {
  /** Volume-weighted mean thickness, mm. */
  mean: number;
  /** Thinnest / thickest inscribed sphere found, mm. */
  min: number;
  max: number;
  /** % of the solid volume per 0.2 mm thickness class. */
  bins: number[];
  binWidth: number;
  /** % of the solid volume thinner than the critical limit (one extrusion width). */
  shareBelowCritical: number;
  /** % of the solid volume thinner than the recommended limit (two extrusion widths). */
  shareBelowRecommended: number;
  criticalLimit: number;
  recommendedLimit: number;
  ridgePoints: number;
  /** Medial-axis points below the critical / recommended limit (unweighted). */
  pointsBelowCritical: number;
  pointsBelowRecommended: number;
  /** Walls thinner than this cannot be told apart from raster noise, mm. */
  resolvable: number;
}

/**
 * Wall thickness: medial-axis ridge points (FDM-INSPECT) give the local
 * thickness; every solid voxel then takes the thickness of its nearest ridge
 * point (multi-source breadth-first search through the solid), so the
 * distribution is a true volume distribution.
 *
 * FDM-INSPECT weighted each ridge point by d³. That is right for isolated
 * spheres but under-weights thin walls next to thick regions by orders of
 * magnitude (a wall's medial sheet stands for sheet area × thickness, not
 * d³): the course part "Wandstärkenrampe" (0.4 and 0.6 mm walls on a 2 mm
 * plate, 4 % of the volume) read as 0.1 % thin. The cube case FDM-INSPECT
 * guards against is unchanged: its single centre labels the whole cube.
 *
 * Overwrites `dist` with the per-cell thickness (mm, -1 = not solid).
 * Marks solid cells thinner than the limits (MARK.THIN_WALL/THIN_CRITICAL).
 */
export function wallStats(
  dist: Float32Array,
  vox: VoxelGrid,
  criticalLimit: number,
  recommendedLimit: number,
): WallStats | null {
  const { NX, NY, NZ, grid, marks, h } = vox;
  const plane = NX * NY;
  const n = NX * NY * NZ;
  const ridgeIndex: number[] = [];
  const ridgeThickness: number[] = [];
  let min = Infinity;
  let max = 0;
  let pointsBelowCritical = 0;
  let pointsBelowRecommended = 0;
  for (let z = 1; z < NZ - 1; z += 1) {
    for (let y = 1; y < NY - 1; y += 1) {
      for (let x = 1; x < NX - 1; x += 1) {
        const i = z * plane + y * NX + x;
        if (!grid[i]) continue;
        const d = dist[i];
        if (d < MIN_D) continue;
        let isMax = true;
        for (let dz = -1; dz <= 1 && isMax; dz += 1) {
          for (let dy = -1; dy <= 1 && isMax; dy += 1) {
            for (let dx = -1; dx <= 1; dx += 1) {
              if (!dx && !dy && !dz) continue;
              if (dist[i + dz * plane + dy * NX + dx] > d) {
                isMax = false;
                break;
              }
            }
          }
        }
        if (!isMax) continue;
        const t = ridgeDiameter(dist, i, d, h, NX, plane); // diameter of the inscribed sphere
        ridgeIndex.push(i);
        ridgeThickness.push(t);
        if (t < min) min = t;
        if (t > max) max = t;
        if (t < recommendedLimit) pointsBelowRecommended += 1;
        if (t < criticalLimit) pointsBelowCritical += 1;
      }
    }
  }
  if (ridgeIndex.length === 0) return null;

  // multi-source BFS: each solid cell inherits the thickness of its nearest ridge point
  for (let i = 0; i < n; i += 1) dist[i] = grid[i] ? -1 : -2;
  const queue = scratchOf(vox);
  let head = 0;
  let tail = 0;
  for (let r = 0; r < ridgeIndex.length; r += 1) {
    dist[ridgeIndex[r]] = ridgeThickness[r];
    queue[tail++] = ridgeIndex[r];
  }
  while (head < tail) {
    const p = queue[head++];
    const t = dist[p];
    const px = p % NX;
    const py = ((p / NX) | 0) % NY;
    const pz = (p / plane) | 0;
    if (px > 0 && dist[p - 1] === -1) {
      dist[p - 1] = t;
      queue[tail++] = p - 1;
    }
    if (px < NX - 1 && dist[p + 1] === -1) {
      dist[p + 1] = t;
      queue[tail++] = p + 1;
    }
    if (py > 0 && dist[p - NX] === -1) {
      dist[p - NX] = t;
      queue[tail++] = p - NX;
    }
    if (py < NY - 1 && dist[p + NX] === -1) {
      dist[p + NX] = t;
      queue[tail++] = p + NX;
    }
    if (pz > 0 && dist[p - plane] === -1) {
      dist[p - plane] = t;
      queue[tail++] = p - plane;
    }
    if (pz < NZ - 1 && dist[p + plane] === -1) {
      dist[p + plane] = t;
      queue[tail++] = p + plane;
    }
  }

  const bins = new Float64Array(WALL_BINS);
  let cells = 0;
  let sum = 0;
  let belowCritical = 0;
  let belowRecommended = 0;
  for (let i = 0; i < n; i += 1) {
    const t = dist[i];
    if (t < 0) continue;
    cells += 1;
    sum += t;
    bins[Math.min(WALL_BINS - 1, Math.floor(t / WALL_BIN_MM))] += 1;
    if (t < recommendedLimit) {
      belowRecommended += 1;
      marks[i] |= MARK.THIN_WALL;
    }
    if (t < criticalLimit) {
      belowCritical += 1;
      marks[i] |= MARK.THIN_CRITICAL;
    }
  }
  if (cells === 0) return null;
  return {
    mean: sum / cells,
    min: min === Infinity ? 0 : min,
    max,
    bins: Array.from(bins, (value) => (value / cells) * 100),
    binWidth: WALL_BIN_MM,
    shareBelowCritical: (belowCritical / cells) * 100,
    shareBelowRecommended: (belowRecommended / cells) * 100,
    criticalLimit,
    recommendedLimit,
    ridgePoints: ridgeIndex.length,
    pointsBelowCritical,
    pointsBelowRecommended,
    resolvable: 2 * MIN_D * h,
  };
}

/* ------------------------------------------------------ gaps and holes */

export type VoidShape = 'hole' | 'slot' | 'pocket';

export interface VoidFeature {
  shape: VoidShape;
  /** Median width / diameter, mm. */
  width: number;
  minWidth: number;
  /** Extent along the main axis, mm. */
  length: number;
  /** Unit axis in the pose frame (holes only). */
  axis: [number, number, number] | null;
  /** Hole axis within 20° of the build plate. */
  horizontal: boolean;
  /** Hole axis within 20° of the vertical. */
  vertical: boolean;
  points: number;
  /** Centre of the ridge points in the pose frame, mm. */
  center: [number, number, number];
}

export interface GapStats {
  features: VoidFeature[];
  /** Narrowest void ridge found, mm (null = none below GAP_MAX_MM). */
  narrowest: number | null;
  /** Gaps narrower than this are not resolved by the raster, mm. */
  resolvable: number;
  truncated: boolean;
}

/** Symmetric 3×3 eigen decomposition (cyclic Jacobi). Returns eigenvalues descending with vectors. */
function eigenSymmetric3(m: number[]): { values: number[]; vectors: number[][] } {
  const a = [
    [m[0], m[1], m[2]],
    [m[1], m[3], m[4]],
    [m[2], m[4], m[5]],
  ];
  const v = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  for (let sweep = 0; sweep < 32; sweep += 1) {
    const off = Math.abs(a[0][1]) + Math.abs(a[0][2]) + Math.abs(a[1][2]);
    if (off < 1e-12) break;
    for (let p = 0; p < 2; p += 1) {
      for (let q = p + 1; q < 3; q += 1) {
        if (Math.abs(a[p][q]) < 1e-15) continue;
        const theta = (a[q][q] - a[p][p]) / (2 * a[p][q]);
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;
        for (let k = 0; k < 3; k += 1) {
          const akp = a[k][p];
          const akq = a[k][q];
          a[k][p] = c * akp - s * akq;
          a[k][q] = s * akp + c * akq;
        }
        for (let k = 0; k < 3; k += 1) {
          const apk = a[p][k];
          const aqk = a[q][k];
          a[p][k] = c * apk - s * aqk;
          a[q][k] = s * apk + c * aqk;
        }
        for (let k = 0; k < 3; k += 1) {
          const vkp = v[k][p];
          const vkq = v[k][q];
          v[k][p] = c * vkp - s * vkq;
          v[k][q] = s * vkp + c * vkq;
        }
      }
    }
  }
  const order = [0, 1, 2].sort((i, j) => a[j][j] - a[i][i]);
  return {
    values: order.map((i) => Math.max(0, a[i][i])),
    vectors: order.map((i) => [v[0][i], v[1][i], v[2][i]]),
  };
}

/**
 * Void analysis. `dist` must hold the distance of empty cells to the solid
 * (distanceTransform(vox, false)); it is overwritten with component labels.
 */
export interface GapOptions {
  /** Ridge widths below this are marked as narrow gaps, mm. */
  narrowHintMm: number;
  /** Holes below this diameter are marked as small holes, mm. */
  smallHoleMm: number;
  /** Horizontal holes from this diameter are marked for a teardrop shape, mm. */
  horizontalHoleMm: number;
}

export function gapStats(dist: Float32Array, vox: VoxelGrid, options: GapOptions): GapStats {
  const { narrowHintMm } = options;
  const { NX, NY, NZ, grid, marks, h } = vox;
  const plane = NX * NY;
  const maxD = GAP_MAX_MM / (2 * h);
  const ridgeIndex: number[] = [];
  const ridgeD: number[] = [];
  const ridgeWidth: number[] = [];
  let truncated = false;
  for (let z = 1; z < NZ - 1 && !truncated; z += 1) {
    for (let y = 1; y < NY - 1; y += 1) {
      for (let x = 1; x < NX - 1; x += 1) {
        const i = z * plane + y * NX + x;
        if (grid[i]) continue;
        const d = dist[i];
        if (d < MIN_D || d > maxD) continue;
        let isMax = true;
        for (let dz = -1; dz <= 1 && isMax; dz += 1) {
          for (let dy = -1; dy <= 1 && isMax; dy += 1) {
            for (let dx = -1; dx <= 1; dx += 1) {
              if (!dx && !dy && !dz) continue;
              if (dist[i + dz * plane + dy * NX + dx] > d) {
                isMax = false;
                break;
              }
            }
          }
        }
        if (!isMax) continue;
        ridgeIndex.push(i);
        ridgeD.push(d);
        ridgeWidth.push(ridgeDiameter(dist, i, d, h, NX, plane));
        if (ridgeIndex.length >= MAX_VOID_RIDGE_POINTS) {
          truncated = true;
          break;
        }
      }
    }
  }

  // label grid: reuse the distance buffer (-1 = no ridge, else ridge id)
  dist.fill(-1);
  for (let r = 0; r < ridgeIndex.length; r += 1) dist[ridgeIndex[r]] = r;
  const parent = new Int32Array(ridgeIndex.length);
  for (let r = 0; r < parent.length; r += 1) parent[r] = r;
  const find = (x: number): number => {
    let root = x;
    while (parent[root] !== root) {
      parent[root] = parent[parent[root]];
      root = parent[root];
    }
    return root;
  };
  for (let r = 0; r < ridgeIndex.length; r += 1) {
    const i = ridgeIndex[r];
    for (let dz = -1; dz <= 1; dz += 1) {
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (!dx && !dy && !dz) continue;
          const other = dist[i + dz * plane + dy * NX + dx];
          if (other < 0) continue;
          // same feature only when the widths are comparable
          const ratio = ridgeD[r] / ridgeD[other];
          if (ratio < 0.66 || ratio > 1.5) continue;
          const a = find(r);
          const b = find(other);
          if (a !== b) parent[a] = b;
        }
      }
    }
  }

  const groups = new Map<number, number[]>();
  for (let r = 0; r < ridgeIndex.length; r += 1) {
    const root = find(r);
    const list = groups.get(root);
    if (list) list.push(r);
    else groups.set(root, [r]);
  }

  const features: VoidFeature[] = [];
  let narrowest: number | null = null;
  for (const members of groups.values()) {
    let mx = 0;
    let my = 0;
    let mz = 0;
    const widths: number[] = [];
    for (const r of members) {
      const i = ridgeIndex[r];
      mx += i % NX;
      my += ((i / NX) | 0) % NY;
      mz += (i / plane) | 0;
      widths.push(ridgeWidth[r]);
      if (ridgeWidth[r] < narrowHintMm) marks[i] |= MARK.NARROW_GAP;
    }
    const count = members.length;
    mx /= count;
    my /= count;
    mz /= count;
    let cxx = 0;
    let cxy = 0;
    let cxz = 0;
    let cyy = 0;
    let cyz = 0;
    let czz = 0;
    for (const r of members) {
      const i = ridgeIndex[r];
      const x = (i % NX) - mx;
      const y = (((i / NX) | 0) % NY) - my;
      const z = ((i / plane) | 0) - mz;
      cxx += x * x;
      cxy += x * y;
      cxz += x * z;
      cyy += y * y;
      cyz += y * z;
      czz += z * z;
    }
    const eig = eigenSymmetric3([cxx / count, cxy / count, cxz / count, cyy / count, cyz / count, czz / count]);
    // extent of a uniform distribution: sqrt(12 * variance), plus one cell
    const extent = eig.values.map((value) => Math.sqrt(12 * value) + 1);
    widths.sort((p, q) => p - q);
    const width = widths[Math.floor(widths.length / 2)];
    const widthCells = width / h;
    let shape: VoidShape = 'pocket';
    if (count >= 3 && extent[1] <= Math.max(3, 0.25 * widthCells) && extent[0] >= 3) {
      // A line-shaped ridge is only a hole if material surrounds it on all
      // sides; the gap between two bosses on a plate is open at the top.
      let nearest = members[0];
      let best = Infinity;
      for (const r of members) {
        const i = ridgeIndex[r];
        const dx = (i % NX) - mx;
        const dy = (((i / NX) | 0) % NY) - my;
        const dz = ((i / plane) | 0) - mz;
        const dd = dx * dx + dy * dy + dz * dz;
        if (dd < best) {
          best = dd;
          nearest = r;
        }
      }
      shape = enclosedAround(vox, ridgeIndex[nearest], eig.vectors[0], widthCells / 2) ? 'hole' : 'slot';
    } else if (count >= 6 && extent[2] <= 3 && extent[1] >= Math.max(4, 0.5 * widthCells)) {
      shape = 'slot';
    }
    const axis: [number, number, number] | null =
      shape === 'hole' ? [eig.vectors[0][0], eig.vectors[0][1], eig.vectors[0][2]] : null;
    const axisZ = axis ? Math.abs(axis[2]) : 0;
    const horizontal = axis !== null && axisZ < Math.sin((20 * Math.PI) / 180);
    features.push({
      shape,
      width,
      minWidth: widths[0],
      length: extent[0] * h,
      axis,
      horizontal,
      vertical: axis !== null && axisZ > Math.cos((20 * Math.PI) / 180),
      points: count,
      center: [vox.origin[0] + (mx + 0.5) * h, vox.origin[1] + (my + 0.5) * h, vox.origin[2] + (mz + 0.5) * h],
    });
    if (shape === 'hole') {
      let bit = 0;
      if (width < options.smallHoleMm) bit |= MARK.SMALL_HOLE;
      if (horizontal && width >= options.horizontalHoleMm) bit |= MARK.HORIZONTAL_HOLE;
      if (bit) {
        stampBalls(
          vox,
          members.map((r) => ridgeIndex[r]),
          members.map((r) => ridgeD[r]),
          bit,
        );
      }
    }
    if (narrowest === null || widths[0] < narrowest) narrowest = widths[0];
  }
  features.sort((a, b) => a.minWidth - b.minWidth);

  return { features, narrowest, resolvable: 2 * MIN_D * h, truncated };
}

/** Rays perpendicular to a hole axis: all of them must reach material. */
const ENCLOSURE_RAYS = 8;

function enclosedAround(vox: VoxelGrid, index: number, axis: number[], radiusCells: number): boolean {
  const { NX, NY, NZ, grid } = vox;
  const plane = NX * NY;
  const cx = index % NX;
  const cy = ((index / NX) | 0) % NY;
  const cz = (index / plane) | 0;
  // orthonormal basis (u, v) perpendicular to the axis
  const ax = Math.abs(axis[0]);
  const ay = Math.abs(axis[1]);
  const az = Math.abs(axis[2]);
  const helper = ax <= ay && ax <= az ? [1, 0, 0] : ay <= az ? [0, 1, 0] : [0, 0, 1];
  let u = [
    axis[1] * helper[2] - axis[2] * helper[1],
    axis[2] * helper[0] - axis[0] * helper[2],
    axis[0] * helper[1] - axis[1] * helper[0],
  ];
  const ul = Math.hypot(u[0], u[1], u[2]) || 1;
  u = u.map((value) => value / ul);
  const v = [
    axis[1] * u[2] - axis[2] * u[1],
    axis[2] * u[0] - axis[0] * u[2],
    axis[0] * u[1] - axis[1] * u[0],
  ];
  const reach = radiusCells * 1.5 + 3;
  for (let k = 0; k < ENCLOSURE_RAYS; k += 1) {
    const angle = (2 * Math.PI * k) / ENCLOSURE_RAYS;
    const dx = Math.cos(angle) * u[0] + Math.sin(angle) * v[0];
    const dy = Math.cos(angle) * u[1] + Math.sin(angle) * v[1];
    const dz = Math.cos(angle) * u[2] + Math.sin(angle) * v[2];
    let hit = false;
    for (let step = 0.5; step <= reach && !hit; step += 0.5) {
      const x = Math.round(cx + dx * step);
      const y = Math.round(cy + dy * step);
      const z = Math.round(cz + dz * step);
      if (x < 0 || y < 0 || z < 0 || x >= NX || y >= NY || z >= NZ) break;
      if (grid[z * plane + y * NX + x]) hit = true;
    }
    if (!hit) return false;
  }
  return true;
}

/**
 * Marks hole walls around the ridge points of a hole by stamping balls
 * (radius = hole radius + 1.5 cells) on a subsample of the axis points.
 */
function stampBalls(vox: VoxelGrid, indices: readonly number[], radii: readonly number[], bit: number): void {
  const { NX, NY, NZ, marks } = vox;
  const plane = NX * NY;
  const step = Math.max(1, Math.floor((radii[0] ?? 1) / 2));
  for (let k = 0; k < indices.length; k += step) {
    const index = indices[k];
    const r = radii[k] + 1.5;
    const ri = Math.ceil(r);
    const cx = index % NX;
    const cy = ((index / NX) | 0) % NY;
    const cz = (index / plane) | 0;
    for (let z = Math.max(0, cz - ri); z <= Math.min(NZ - 1, cz + ri); z += 1) {
      for (let y = Math.max(0, cy - ri); y <= Math.min(NY - 1, cy + ri); y += 1) {
        for (let x = Math.max(0, cx - ri); x <= Math.min(NX - 1, cx + ri); x += 1) {
          const dx = x - cx;
          const dy = y - cy;
          const dz = z - cz;
          if (dx * dx + dy * dy + dz * dz <= r * r) marks[z * plane + y * NX + x] |= bit;
        }
      }
    }
  }
}

/* ------------------------------------------------------ mark dilation */

/** Separable box OR-dilation of the given mark bits by `radius` cells. */
export function dilateMarks(vox: VoxelGrid, bits: number, radius: number): void {
  if (radius <= 0 || bits === 0) return;
  const { NX, NY, NZ, marks } = vox;
  const active: number[] = [];
  for (let b = 0; b < 8; b += 1) {
    if (bits & (1 << b)) active.push(1 << b);
  }
  const maxN = Math.max(NX, NY, NZ);
  const line = new Uint8Array(maxN);
  const counts = new Int32Array(8);
  const pass = (len: number, count: number, indexOf: (lineNo: number, k: number) => number) => {
    for (let l = 0; l < count; l += 1) {
      let any = 0;
      for (let k = 0; k < len; k += 1) {
        line[k] = marks[indexOf(l, k)];
        any |= line[k];
      }
      if (!(any & bits)) continue;
      counts.fill(0);
      for (let k = 0; k < Math.min(radius, len); k += 1) {
        for (let b = 0; b < active.length; b += 1) if (line[k] & active[b]) counts[b] += 1;
      }
      for (let k = 0; k < len; k += 1) {
        const enter = k + radius;
        if (enter < len) {
          for (let b = 0; b < active.length; b += 1) if (line[enter] & active[b]) counts[b] += 1;
        }
        const leave = k - radius - 1;
        if (leave >= 0) {
          for (let b = 0; b < active.length; b += 1) if (line[leave] & active[b]) counts[b] -= 1;
        }
        let value = marks[indexOf(l, k)];
        for (let b = 0; b < active.length; b += 1) if (counts[b] > 0) value |= active[b];
        marks[indexOf(l, k)] = value;
      }
    }
  };
  const plane = NX * NY;
  pass(NX, NY * NZ, (l, k) => l * NX + k);
  pass(NY, NX * NZ, (l, k) => ((l / NX) | 0) * plane + k * NX + (l % NX));
  pass(NZ, plane, (l, k) => k * plane + l);
}

/* -------------------------------------------------- slender features */

export interface SlenderStats {
  /** Height / min base width of the whole part in the pose. */
  partAspect: number;
  /** Height of the longest run of thin free-standing cross-sections, mm. */
  featureHeight: number;
  /** Largest equivalent diameter within that run, mm. */
  featureDiameter: number;
  /** featureHeight / featureDiameter (0 = no thin feature). */
  featureRatio: number;
  /** Layer index range of the run in the voxel grid (inclusive), or null. */
  layerRange: [number, number] | null;
}

export function slenderStats(
  layers: readonly LayerStats[],
  vox: VoxelGrid,
  footprint: [number, number],
  height: number,
  maxDiameterMm: number,
): SlenderStats {
  const baseWidth = Math.min(footprint[0], footprint[1]);
  const partAspect = baseWidth > 0 ? height / baseWidth : 0;
  const maxArea = Math.PI * (maxDiameterMm / 2) ** 2;
  let best: SlenderStats = { partAspect, featureHeight: 0, featureDiameter: 0, featureRatio: 0, layerRange: null };
  let runStart = -1;
  let runMaxArea = 0;
  const close = (end: number) => {
    if (runStart < 0) return;
    const runHeight = (end - runStart + 1) * vox.h;
    const diameter = 2 * Math.sqrt(runMaxArea / Math.PI);
    const ratio = diameter > 0 ? runHeight / diameter : 0;
    if (ratio > best.featureRatio) {
      best = { partAspect, featureHeight: runHeight, featureDiameter: diameter, featureRatio: ratio, layerRange: [runStart, end] };
    }
    runStart = -1;
    runMaxArea = 0;
  };
  for (let z = 0; z < layers.length; z += 1) {
    const layer = layers[z];
    const thin = layer.islands > 0 && layer.smallestIsland > 0 && layer.smallestIsland <= maxArea;
    if (thin) {
      if (runStart < 0) runStart = z;
      if (layer.smallestIsland > runMaxArea) runMaxArea = layer.smallestIsland;
    } else {
      close(z - 1);
    }
  }
  close(layers.length - 1);
  return best;
}

/** Marks the small islands of the slender run (for the 3D highlight). */
export function markSlender(vox: VoxelGrid, range: [number, number], maxAreaMm2: number): void {
  const { NX, NY, grid, marks, h } = vox;
  const maxCells = Math.ceil(maxAreaMm2 / (h * h));
  const labels = new Int32Array(NX * NY);
  const stack = new Int32Array(NX * NY);
  const members = new Int32Array(NX * NY);
  for (let z = range[0]; z <= range[1]; z += 1) {
    const base = z * NX * NY;
    labels.fill(0);
    let label = 0;
    for (let i0 = 0; i0 < NX * NY; i0 += 1) {
      if (!grid[base + i0] || labels[i0]) continue;
      label += 1;
      let sp = 0;
      let count = 0;
      stack[sp++] = i0;
      labels[i0] = label;
      while (sp > 0) {
        const p = stack[--sp];
        members[count++] = p;
        const px = p % NX;
        const py = (p / NX) | 0;
        for (let k = 0; k < 4; k += 1) {
          const q =
            k === 0 ? (px > 0 ? p - 1 : -1) : k === 1 ? (px < NX - 1 ? p + 1 : -1) : k === 2 ? (py > 0 ? p - NX : -1) : py < NY - 1 ? p + NX : -1;
          if (q >= 0 && grid[base + q] && !labels[q]) {
            labels[q] = label;
            stack[sp++] = q;
          }
        }
      }
      if (count <= maxCells) {
        for (let k = 0; k < count; k += 1) marks[base + members[k]] |= MARK.SLENDER;
      }
    }
  }
}

/* -------------------------------------------- marks -> triangle flags */

const MARK_TO_FLAG: ReadonlyArray<[number, number]> = [
  [MARK.OVERLAP, TRI_FLAG.OVERLAP],
  [MARK.THIN_WALL, TRI_FLAG.THIN_WALL],
  [MARK.THIN_CRITICAL, TRI_FLAG.THIN_CRITICAL],
  [MARK.NARROW_GAP, TRI_FLAG.NARROW_GAP],
  [MARK.SMALL_HOLE, TRI_FLAG.SMALL_HOLE],
  [MARK.HORIZONTAL_HOLE, TRI_FLAG.HORIZONTAL_HOLE],
  [MARK.SLENDER, TRI_FLAG.SLENDER],
];

/** Upper bound of barycentric subdivisions per triangle edge when sampling marks. */
const MAX_SAMPLE_DIVISIONS = 24;

/**
 * Samples the mark grid on a barycentric lattice over each triangle (finer
 * for triangles larger than the voxels, so big flat CAD faces are covered)
 * and ORs the matching flag bits. A triangle is flagged when any sample hits:
 * the highlight is per triangle, so a large face is coloured as a whole when
 * a part of it is affected (stated in the viewer legend).
 */
export function marksToTriangleFlags(pos: Float32Array, vox: VoxelGrid, flags: Uint16Array): void {
  const { NX, NY, NZ, marks, h, origin, pose } = vox;
  const [px, py, pz] = pose.perm;
  const [sx, sy, sz] = pose.sign;
  const nt = pos.length / 9;
  const inv = 1 / h;
  const plane = NX * NY;
  const relevant = MARK_TO_FLAG.reduce((sum, [markBit]) => sum | markBit, 0);
  const cell = (x: number, y: number, z: number): number => {
    const ix = Math.floor((x - origin[0]) * inv);
    const iy = Math.floor((y - origin[1]) * inv);
    const iz = Math.floor((z - origin[2]) * inv);
    if (ix < 0 || iy < 0 || iz < 0 || ix >= NX || iy >= NY || iz >= NZ) return 0;
    return marks[iz * plane + iy * NX + ix];
  };
  for (let t = 0; t < nt; t += 1) {
    const b = t * 9;
    const ax = sx * pos[b + px];
    const ay = sy * pos[b + py];
    const az = sz * pos[b + pz];
    const bx = sx * pos[b + 3 + px];
    const by = sy * pos[b + 3 + py];
    const bz = sz * pos[b + 3 + pz];
    const cx = sx * pos[b + 6 + px];
    const cy = sy * pos[b + 6 + py];
    const cz = sz * pos[b + 6 + pz];
    const maxEdge = Math.max(
      Math.hypot(bx - ax, by - ay, bz - az),
      Math.hypot(cx - bx, cy - by, cz - bz),
      Math.hypot(ax - cx, ay - cy, az - cz),
    );
    const divisions = Math.min(MAX_SAMPLE_DIVISIONS, Math.max(1, Math.ceil(maxEdge / (2 * h))));
    let m = cell((ax + bx + cx) / 3, (ay + by + cy) / 3, (az + bz + cz) / 3);
    if (divisions > 1) {
      for (let i = 0; i <= divisions && (m & relevant) !== relevant; i += 1) {
        for (let j = 0; j <= divisions - i; j += 1) {
          const u = i / divisions;
          const v = j / divisions;
          const w = 1 - u - v;
          m |= cell(ax * w + bx * u + cx * v, ay * w + by * u + cy * v, az * w + bz * u + cz * v);
        }
      }
    } else {
      m |=
        cell(((ax + bx + cx) / 3 + ax) / 2, ((ay + by + cy) / 3 + ay) / 2, ((az + bz + cz) / 3 + az) / 2) |
        cell(((ax + bx + cx) / 3 + bx) / 2, ((ay + by + cy) / 3 + by) / 2, ((az + bz + cz) / 3 + bz) / 2) |
        cell(((ax + bx + cx) / 3 + cx) / 2, ((ay + by + cy) / 3 + cy) / 2, ((az + bz + cz) / 3 + cz) / 2);
    }
    if (m === 0) continue;
    for (const [markBit, flagBit] of MARK_TO_FLAG) {
      if (m & markBit) flags[t] |= flagBit;
    }
  }
}
