import type { Bounds, Vec3 } from './mesh';
import { poseBounds, type Pose } from './pose';

/*
 * One rasterisation, several analyses (FDM-INSPECT `voxel.js`).
 *
 * Differences to the original, each for a stated reason:
 * - Rasterises directly in a pose frame (signed axis permutation) instead of
 *   a rotated copy of the positions.
 * - Half-open crossing rules for the layer plane and the scan rows: a vertex
 *   lying exactly on a plane no longer drops the triangle's segment.
 * - Segments are bucketed per scan row, so a layer costs O(crossings) instead
 *   of O(rows × segments) - required for multi-million-triangle meshes.
 * - Nonzero winding fill when the mesh is consistently oriented: overlapping
 *   bodies are united (as slicers do) and cells enclosed twice are counted as
 *   an overlap/self-intersection diagnostic. Inconsistently wound meshes fall
 *   back to the even-odd rule of the original. Rows whose crossings do not
 *   close (open meshes) are counted as "leaky".
 */

const INF = 1e20;

/** Bits of the shared per-cell mark grid. */
export const MARK = {
  OVERLAP: 1,
  THIN_WALL: 2,
  THIN_CRITICAL: 4,
  NARROW_GAP: 8,
  SMALL_HOLE: 16,
  HORIZONTAL_HOLE: 32,
  SUPPORT: 64,
  SLENDER: 128,
} as const;

export interface VoxelGrid {
  grid: Uint8Array;
  /** Per-cell MARK bits, filled by the individual analyses. */
  marks: Uint8Array;
  NX: number;
  NY: number;
  NZ: number;
  /** Voxel edge length, mm. */
  h: number;
  /** Pose-frame coordinate of the grid corner (cell 0,0,0 lower corner). */
  origin: Vec3;
  pose: Pose;
  fillMode: 'nonzero' | 'even-odd';
  filledCells: number;
  /** Cells enclosed twice or more (nonzero mode only). */
  overlapCells: number;
  /** Cells with negative winding (inside-out regions, nonzero mode only). */
  negativeCells: number;
  leakyRows: number;
  scannedRows: number;
  /** One shared per-cell Int32 work buffer (queues/stacks), allocated on first use. */
  scratch: Int32Array | null;
}

/**
 * Per-cell Int32 work buffer shared by the analyses that need a queue or a
 * stack over the whole grid. One allocation instead of one per analysis
 * keeps the peak memory of the worker down (64 MB at 16 M cells).
 */
export function scratchOf(vox: VoxelGrid): Int32Array {
  if (!vox.scratch) vox.scratch = new Int32Array(vox.NX * vox.NY * vox.NZ);
  return vox.scratch;
}

export interface VoxelSizeOptions {
  /** Preferred voxel edge, mm. */
  targetMm: number;
  /** Hard cell budget (memory/time). */
  maxCells: number;
  /** Minimum cells along the longest axis. */
  minCellsLongest: number;
}

/** Adaptive voxel size: as fine as the target allows within the cell budget. */
export function chooseVoxelSize(size: Vec3, options: VoxelSizeOptions): number {
  const longest = Math.max(size[0], size[1], size[2]);
  if (!(longest > 0)) {
    throw new Error('Part has no spatial extent.');
  }
  let h = Math.min(options.targetMm, longest / options.minCellsLongest);
  const cells = (edge: number) =>
    (Math.ceil(size[0] / edge) + 2) * (Math.ceil(size[1] / edge) + 2) * (Math.ceil(size[2] / edge) + 2);
  if (cells(h) > options.maxCells) {
    h = Math.cbrt((size[0] * size[1] * size[2] + 1e-12) / options.maxCells);
    h = Math.max(h, longest / 4096);
    while (cells(h) > options.maxCells) h *= 1.02;
  }
  return h;
}

export interface RasteriseOptions {
  h: number;
  nonzero: boolean;
  onProgress?: (fraction: number) => void;
}

export function rasterise(pos: Float32Array, box: Bounds, pose: Pose, options: RasteriseOptions): VoxelGrid {
  const pb = poseBounds(box, pose);
  const h = options.h;
  const NX = Math.max(3, Math.ceil(pb.size[0] / h) + 2);
  const NY = Math.max(3, Math.ceil(pb.size[1] / h) + 2);
  const NZ = Math.max(3, Math.ceil(pb.size[2] / h) + 2);
  // one voxel of margin so the part never touches the grid border
  const ox = pb.min[0] - h;
  const oy = pb.min[1] - h;
  const oz = pb.min[2] - h;
  const n = NX * NY * NZ;
  const grid = new Uint8Array(n);
  const marks = new Uint8Array(n);
  const nt = pos.length / 9;
  const [px, py, pz] = pose.perm;
  const [sx, sy, sz] = pose.sign;
  const progress = options.onProgress ?? (() => undefined);

  // bucket triangles by the layer planes they can cross
  const counts = new Int32Array(NZ + 1);
  const zlo = new Int32Array(nt);
  const zhi = new Int32Array(nt);
  for (let t = 0; t < nt; t += 1) {
    const b = t * 9;
    const a = sz * pos[b + pz];
    const c = sz * pos[b + 3 + pz];
    const d = sz * pos[b + 6 + pz];
    const lo = Math.min(a, c, d);
    const hi = Math.max(a, c, d);
    const l0 = Math.max(0, Math.floor((lo - oz) / h - 0.5));
    const l1 = Math.min(NZ - 1, Math.ceil((hi - oz) / h - 0.5));
    zlo[t] = l0;
    zhi[t] = l1;
    for (let l = l0; l <= l1; l += 1) counts[l + 1] += 1;
  }
  for (let s = 1; s <= NZ; s += 1) counts[s] += counts[s - 1];
  const bucket = new Int32Array(counts[NZ]);
  const cursor = counts.slice(0, NZ);
  for (let t = 0; t < nt; t += 1) {
    for (let l = zlo[t]; l <= zhi[t]; l += 1) bucket[cursor[l]++] = t;
  }

  let segs = new Float64Array(4096);
  const rowCounts = new Int32Array(NY + 1);
  let rowItems = new Int32Array(4096);
  let xs = new Float64Array(64);
  let ds = new Int8Array(64);
  const vx = new Float64Array(3);
  const vy = new Float64Array(3);
  const vz = new Float64Array(3);

  let filledCells = 0;
  let overlapCells = 0;
  let negativeCells = 0;
  let leakyRows = 0;
  let scannedRows = 0;

  for (let z = 0; z < NZ; z += 1) {
    const planeZ = oz + (z + 0.5) * h;
    let nseg = 0;
    for (let bi = counts[z]; bi < counts[z + 1]; bi += 1) {
      const ti = bucket[bi] * 9;
      for (let k = 0; k < 3; k += 1) {
        vx[k] = sx * pos[ti + k * 3 + px];
        vy[k] = sy * pos[ti + k * 3 + py];
        vz[k] = sz * pos[ti + k * 3 + pz];
      }
      let hitN = 0;
      let ax = 0;
      let ay = 0;
      let bx = 0;
      let by = 0;
      for (let e = 0; e < 3; e += 1) {
        let i0 = e;
        let i1 = (e + 1) % 3;
        const below0 = vz[i0] <= planeZ;
        const below1 = vz[i1] <= planeZ;
        if (below0 === below1) continue;
        // Interpolate from the lower endpoint: the two triangles sharing this
        // edge then compute bit-identical points, so contours close exactly.
        if (vz[i0] > vz[i1]) {
          i0 = i1;
          i1 = e;
        }
        const f = (planeZ - vz[i0]) / (vz[i1] - vz[i0]);
        const cx = vx[i0] + f * (vx[i1] - vx[i0]);
        const cy = vy[i0] + f * (vy[i1] - vy[i0]);
        if (hitN === 0) {
          ax = cx;
          ay = cy;
        } else {
          bx = cx;
          by = cy;
        }
        hitN += 1;
      }
      if (hitN !== 2) continue;
      // orient the segment so the solid lies on its left (outward normal on the right)
      const e1x = vx[1] - vx[0];
      const e1y = vy[1] - vy[0];
      const e1z = vz[1] - vz[0];
      const e2x = vx[2] - vx[0];
      const e2y = vy[2] - vy[0];
      const e2z = vz[2] - vz[0];
      const nx = e1y * e2z - e1z * e2y;
      const ny = e1z * e2x - e1x * e2z;
      if ((bx - ax) * -ny + (by - ay) * nx < 0) {
        const tx = ax;
        const ty = ay;
        ax = bx;
        ay = by;
        bx = tx;
        by = ty;
      }
      if ((nseg + 1) * 4 > segs.length) {
        const bigger = new Float64Array(segs.length * 2);
        bigger.set(segs);
        segs = bigger;
      }
      segs[nseg * 4] = (ax - ox) / h;
      segs[nseg * 4 + 1] = (ay - oy) / h;
      segs[nseg * 4 + 2] = (bx - ox) / h;
      segs[nseg * 4 + 3] = (by - oy) / h;
      nseg += 1;
    }

    if (nseg >= 2) {
      // bucket segments by scan row (row y samples at y + 0.5)
      rowCounts.fill(0);
      let total = 0;
      for (let q = 0; q < nseg; q += 1) {
        const ya = segs[q * 4 + 1];
        const yb = segs[q * 4 + 3];
        const lo = Math.min(ya, yb);
        const hi = Math.max(ya, yb);
        const r0 = Math.max(0, Math.ceil(lo - 0.5));
        const r1 = Math.min(NY - 1, Math.ceil(hi - 0.5) - 1);
        for (let r = r0; r <= r1; r += 1) rowCounts[r + 1] += 1;
        if (r1 >= r0) total += r1 - r0 + 1;
      }
      for (let r = 1; r <= NY; r += 1) rowCounts[r] += rowCounts[r - 1];
      if (total > rowItems.length) rowItems = new Int32Array(Math.max(total, rowItems.length * 2));
      const rowCursor = rowCounts.slice(0, NY);
      for (let q = 0; q < nseg; q += 1) {
        const ya = segs[q * 4 + 1];
        const yb = segs[q * 4 + 3];
        const lo = Math.min(ya, yb);
        const hi = Math.max(ya, yb);
        const r0 = Math.max(0, Math.ceil(lo - 0.5));
        const r1 = Math.min(NY - 1, Math.ceil(hi - 0.5) - 1);
        for (let r = r0; r <= r1; r += 1) rowItems[rowCursor[r]++] = q;
      }

      const zBase = z * NX * NY;
      for (let y = 0; y < NY; y += 1) {
        const from = rowCounts[y];
        const to = rowCounts[y + 1];
        const nx = to - from;
        if (nx === 0) continue;
        scannedRows += 1;
        if (nx > xs.length) {
          xs = new Float64Array(nx * 2);
          ds = new Int8Array(nx * 2);
        }
        const cy = y + 0.5;
        for (let k = 0; k < nx; k += 1) {
          const q = rowItems[from + k];
          const xa = segs[q * 4];
          const ya = segs[q * 4 + 1];
          const xb = segs[q * 4 + 2];
          const yb = segs[q * 4 + 3];
          xs[k] = xa + ((cy - ya) / (yb - ya)) * (xb - xa);
          ds[k] = yb < ya ? 1 : -1;
        }
        // insertion sort (rows have few crossings)
        for (let i = 1; i < nx; i += 1) {
          const xv = xs[i];
          const dv = ds[i];
          let j = i - 1;
          while (j >= 0 && xs[j] > xv) {
            xs[j + 1] = xs[j];
            ds[j + 1] = ds[j];
            j -= 1;
          }
          xs[j + 1] = xv;
          ds[j + 1] = dv;
        }
        const rowBase = zBase + y * NX;
        let useEvenOdd = !options.nonzero;
        if (options.nonzero) {
          let w = 0;
          for (let k = 0; k < nx; k += 1) w += ds[k];
          if (w !== 0) {
            leakyRows += 1;
            useEvenOdd = true;
          } else {
            w = 0;
            for (let k = 0; k + 1 < nx; k += 1) {
              w += ds[k];
              if (w === 0) continue;
              const xA = Math.max(0, Math.ceil(xs[k] - 0.5));
              const xB = Math.min(NX - 1, Math.floor(xs[k + 1] - 0.5));
              for (let xx = xA; xx <= xB; xx += 1) {
                const cell = rowBase + xx;
                if (!grid[cell]) {
                  grid[cell] = 1;
                  filledCells += 1;
                }
                if (w >= 2 || w <= -2) {
                  if (!(marks[cell] & MARK.OVERLAP)) {
                    marks[cell] |= MARK.OVERLAP;
                    overlapCells += 1;
                  }
                } else if (w < 0) {
                  negativeCells += 1;
                }
              }
            }
          }
        }
        if (useEvenOdd) {
          if (!options.nonzero && nx % 2 === 1) leakyRows += 1;
          for (let k = 0; k + 1 < nx; k += 2) {
            const xA = Math.max(0, Math.ceil(xs[k] - 0.5));
            const xB = Math.min(NX - 1, Math.floor(xs[k + 1] - 0.5));
            for (let xx = xA; xx <= xB; xx += 1) {
              const cell = rowBase + xx;
              if (!grid[cell]) {
                grid[cell] = 1;
                filledCells += 1;
              }
            }
          }
        }
      }
    }
    if ((z & 15) === 0) progress(z / NZ);
  }

  return {
    grid,
    marks,
    NX,
    NY,
    NZ,
    h,
    origin: [ox, oy, oz],
    pose,
    fillMode: options.nonzero ? 'nonzero' : 'even-odd',
    filledCells,
    overlapCells,
    negativeCells,
    leakyRows,
    scannedRows,
    scratch: null,
  };
}

/* ------------------------------------------------- distance transform */

/** Squared euclidean distance transform on one axis (Felzenszwalb/Huttenlocher). */
function dt1d(f: Float64Array, n: number, d: Float64Array, v: Int32Array, zz: Float64Array): void {
  let k = 0;
  v[0] = 0;
  zz[0] = -INF;
  zz[1] = INF;
  for (let q = 1; q < n; q += 1) {
    let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= zz[k]) {
      k -= 1;
      s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k += 1;
    v[k] = q;
    zz[k] = s;
    zz[k + 1] = INF;
  }
  k = 0;
  for (let q = 0; q < n; q += 1) {
    while (zz[k + 1] < q) k += 1;
    const dd = q - v[k];
    d[q] = dd * dd + f[v[k]];
  }
}

/**
 * Euclidean distance (in voxels) from every cell of the chosen kind to the
 * nearest cell of the other kind: `ofSolid` = distance of solid cells to the
 * nearest empty cell (wall thickness), otherwise of empty cells to the
 * nearest solid cell (gaps and holes). Cells of the other kind get 0.
 */
export function distanceTransform(
  vox: VoxelGrid,
  ofSolid: boolean,
  out: Float32Array | null,
  onProgress?: (fraction: number) => void,
): Float32Array {
  const { NX, NY, NZ, grid } = vox;
  const n = NX * NY * NZ;
  const d = out && out.length === n ? out : new Float32Array(n);
  for (let i = 0; i < n; i += 1) d[i] = (grid[i] === 1) === ofSolid ? INF : 0;
  const maxN = Math.max(NX, NY, NZ);
  const f = new Float64Array(maxN);
  const dd = new Float64Array(maxN);
  const v = new Int32Array(maxN);
  const zz = new Float64Array(maxN + 1);
  const progress = onProgress ?? (() => undefined);

  for (let z = 0; z < NZ; z += 1) {
    for (let y = 0; y < NY; y += 1) {
      const base = z * NX * NY + y * NX;
      for (let x = 0; x < NX; x += 1) f[x] = d[base + x];
      dt1d(f, NX, dd, v, zz);
      for (let x = 0; x < NX; x += 1) d[base + x] = dd[x];
    }
    if ((z & 15) === 0) progress(z / NZ / 3);
  }
  for (let z = 0; z < NZ; z += 1) {
    for (let x = 0; x < NX; x += 1) {
      for (let y = 0; y < NY; y += 1) f[y] = d[z * NX * NY + y * NX + x];
      dt1d(f, NY, dd, v, zz);
      for (let y = 0; y < NY; y += 1) d[z * NX * NY + y * NX + x] = dd[y];
    }
    if ((z & 15) === 0) progress(1 / 3 + z / NZ / 3);
  }
  for (let y = 0; y < NY; y += 1) {
    for (let x = 0; x < NX; x += 1) {
      for (let z = 0; z < NZ; z += 1) f[z] = d[z * NX * NY + y * NX + x];
      dt1d(f, NZ, dd, v, zz);
      for (let z = 0; z < NZ; z += 1) d[z * NX * NY + y * NX + x] = dd[z];
    }
    if ((y & 15) === 0) progress(2 / 3 + y / NY / 3);
  }
  for (let k = 0; k < n; k += 1) d[k] = Math.sqrt(d[k]);
  return d;
}

/* --------------------------------------------------------- layer study */

export interface LayerStats {
  /** Pose-frame height of the layer centre above the plate, mm. */
  z: number;
  area: number;
  islands: number;
  smallestIsland: number;
  largestIsland: number;
}

/** Per-layer cross-section area and islands (FDM-INSPECT `layerProfile`). */
export function layerProfile(vox: VoxelGrid, plateZ: number, onProgress?: (fraction: number) => void): LayerStats[] {
  const { NX, NY, NZ, grid, h } = vox;
  const cellArea = h * h;
  const layers: LayerStats[] = [];
  const labels = new Int32Array(NX * NY);
  const stack = new Int32Array(NX * NY);
  const progress = onProgress ?? (() => undefined);
  for (let z = 0; z < NZ; z += 1) {
    const base = z * NX * NY;
    labels.fill(0);
    let filled = 0;
    let islands = 0;
    let smallest = Infinity;
    let largest = 0;
    for (let i0 = 0; i0 < NX * NY; i0 += 1) {
      if (!grid[base + i0]) continue;
      filled += 1;
      if (labels[i0]) continue;
      islands += 1;
      let sp = 0;
      let count = 0;
      stack[sp++] = i0;
      labels[i0] = islands;
      while (sp > 0) {
        const p = stack[--sp];
        count += 1;
        const px = p % NX;
        const py = (p / NX) | 0;
        if (px > 0 && grid[base + p - 1] && !labels[p - 1]) {
          labels[p - 1] = islands;
          stack[sp++] = p - 1;
        }
        if (px < NX - 1 && grid[base + p + 1] && !labels[p + 1]) {
          labels[p + 1] = islands;
          stack[sp++] = p + 1;
        }
        if (py > 0 && grid[base + p - NX] && !labels[p - NX]) {
          labels[p - NX] = islands;
          stack[sp++] = p - NX;
        }
        if (py < NY - 1 && grid[base + p + NX] && !labels[p + NX]) {
          labels[p + NX] = islands;
          stack[sp++] = p + NX;
        }
      }
      if (count < smallest) smallest = count;
      if (count > largest) largest = count;
    }
    layers.push({
      z: vox.origin[2] + (z + 0.5) * h - plateZ,
      area: filled * cellArea,
      islands,
      smallestIsland: smallest === Infinity ? 0 : smallest * cellArea,
      largestIsland: largest * cellArea,
    });
    if ((z & 15) === 0) progress(z / NZ);
  }
  return layers;
}

/* ------------------------------------------------------- enclosed voids */

export interface VoidPocket {
  volume: number;
  size: Vec3;
}

/** Air pockets without connection to the outside (FDM-INSPECT `enclosedVoids`). */
export function enclosedVoids(vox: VoxelGrid): VoidPocket[] {
  const { NX, NY, NZ, grid, h } = vox;
  const n = NX * NY * NZ;
  const seen = new Uint8Array(n);
  const stack = scratchOf(vox);
  let sp = 0;
  const push = (i: number) => {
    if (!grid[i] && !seen[i]) {
      seen[i] = 1;
      stack[sp++] = i;
    }
  };
  for (let z = 0; z < NZ; z += 1) {
    for (let y = 0; y < NY; y += 1) {
      for (let x = 0; x < NX; x += 1) {
        if (x === 0 || y === 0 || z === 0 || x === NX - 1 || y === NY - 1 || z === NZ - 1) {
          push(z * NX * NY + y * NX + x);
        }
      }
    }
  }
  const flood = () => {
    while (sp > 0) {
      const p = stack[--sp];
      const px = p % NX;
      const py = ((p / NX) | 0) % NY;
      const pz = (p / (NX * NY)) | 0;
      if (px > 0) push(p - 1);
      if (px < NX - 1) push(p + 1);
      if (py > 0) push(p - NX);
      if (py < NY - 1) push(p + NX);
      if (pz > 0) push(p - NX * NY);
      if (pz < NZ - 1) push(p + NX * NY);
    }
  };
  flood();

  const pockets: VoidPocket[] = [];
  const cellVol = h * h * h;
  for (let i = 0; i < n; i += 1) {
    if (grid[i] || seen[i]) continue;
    let count = 0;
    const minb = [NX, NY, NZ];
    const maxb = [0, 0, 0];
    seen[i] = 1;
    sp = 0;
    stack[sp++] = i;
    while (sp > 0) {
      const q = stack[--sp];
      count += 1;
      const qx = q % NX;
      const qy = ((q / NX) | 0) % NY;
      const qz = (q / (NX * NY)) | 0;
      if (qx < minb[0]) minb[0] = qx;
      if (qx > maxb[0]) maxb[0] = qx;
      if (qy < minb[1]) minb[1] = qy;
      if (qy > maxb[1]) maxb[1] = qy;
      if (qz < minb[2]) minb[2] = qz;
      if (qz > maxb[2]) maxb[2] = qz;
      if (qx > 0) push(q - 1);
      if (qx < NX - 1) push(q + 1);
      if (qy > 0) push(q - NX);
      if (qy < NY - 1) push(q + NX);
      if (qz > 0) push(q - NX * NY);
      if (qz < NZ - 1) push(q + NX * NY);
    }
    pockets.push({
      volume: count * cellVol,
      size: [(maxb[0] - minb[0] + 1) * h, (maxb[1] - minb[1] + 1) * h, (maxb[2] - minb[2] + 1) * h],
    });
  }
  pockets.sort((a, b) => b.volume - a.volume);
  return pockets;
}

/* ------------------------------------------------------ support volume */

export interface SupportStats {
  /** Empty space below unsupported cells, mm³ (gross, before support density). */
  grossVolume: number;
  footprintArea: number;
  overhangCells: number;
  /** Largest distance of an unsupported cell to the nearest supported cell in its layer, mm. */
  maxUnsupportedDistanceMm: number;
  /** Unsupported cells without any supported cell reachable in their layer (start in mid-air). */
  floatingCells: number;
}

/**
 * Support demand column by column with FDM-INSPECT's 45° rule: a cell is
 * self-supporting when at least 2 of its 4 neighbours one layer down are
 * solid. Unsupported cells are marked (MARK.SUPPORT) and, per layer, their
 * distance to the nearest supported cell is measured (4-connected BFS,
 * heuristic) to detect long free spans.
 */
export function supportAnalysis(vox: VoxelGrid): SupportStats {
  const { NX, NY, NZ, grid, marks, h } = vox;
  const cellVol = h * h * h;
  const solidAt = (x: number, y: number, z: number): number => {
    if (x < 0 || y < 0 || z < 0 || x >= NX || y >= NY || z >= NZ) return 0;
    return grid[z * NX * NY + y * NX + x];
  };
  let gross = 0;
  let footprint = 0;
  let overhangCells = 0;
  // cells that sit on the lowest solid layer rest on the plate
  let plateLayer = -1;
  for (let z = 0; z < NZ && plateLayer < 0; z += 1) {
    const base = z * NX * NY;
    for (let i = 0; i < NX * NY; i += 1) {
      if (grid[base + i]) {
        plateLayer = z;
        break;
      }
    }
  }
  for (let y = 0; y < NY; y += 1) {
    for (let x = 0; x < NX; x += 1) {
      let columnNeeds = false;
      for (let z = plateLayer + 1; z < NZ; z += 1) {
        if (!solidAt(x, y, z) || solidAt(x, y, z - 1)) continue;
        const below =
          solidAt(x - 1, y, z - 1) + solidAt(x + 1, y, z - 1) + solidAt(x, y - 1, z - 1) + solidAt(x, y + 1, z - 1);
        if (below >= 2) continue;
        overhangCells += 1;
        marks[z * NX * NY + y * NX + x] |= MARK.SUPPORT;
        let zz = z - 1;
        let height = 0;
        while (zz >= plateLayer && !solidAt(x, y, zz)) {
          height += 1;
          zz -= 1;
        }
        gross += height * cellVol;
        columnNeeds = true;
      }
      if (columnNeeds) footprint += h * h;
    }
  }

  // per-layer free distance of unsupported regions
  const dist = new Int32Array(NX * NY);
  const queue = new Int32Array(NX * NY);
  let maxDist = 0;
  let floatingCells = 0;
  for (let z = plateLayer + 1; z < NZ && overhangCells > 0; z += 1) {
    const base = z * NX * NY;
    let any = false;
    for (let i = 0; i < NX * NY; i += 1) {
      if (marks[base + i] & MARK.SUPPORT) {
        any = true;
        break;
      }
    }
    if (!any) continue;
    let head = 0;
    let tail = 0;
    for (let i = 0; i < NX * NY; i += 1) {
      const solid = grid[base + i];
      const unsupported = (marks[base + i] & MARK.SUPPORT) !== 0;
      if (solid && !unsupported) {
        dist[i] = 0;
        queue[tail++] = i;
      } else {
        dist[i] = unsupported ? -1 : -2; // -1 unvisited region cell, -2 air
      }
    }
    while (head < tail) {
      const p = queue[head++];
      const px = p % NX;
      const py = (p / NX) | 0;
      const nd = dist[p] + 1;
      if (px > 0 && dist[p - 1] === -1) {
        dist[p - 1] = nd;
        queue[tail++] = p - 1;
      }
      if (px < NX - 1 && dist[p + 1] === -1) {
        dist[p + 1] = nd;
        queue[tail++] = p + 1;
      }
      if (py > 0 && dist[p - NX] === -1) {
        dist[p - NX] = nd;
        queue[tail++] = p - NX;
      }
      if (py < NY - 1 && dist[p + NX] === -1) {
        dist[p + NX] = nd;
        queue[tail++] = p + NX;
      }
    }
    for (let i = 0; i < NX * NY; i += 1) {
      if (dist[i] === -1) floatingCells += 1;
      else if (dist[i] > maxDist) maxDist = dist[i];
    }
  }

  return {
    grossVolume: gross,
    footprintArea: footprint,
    overhangCells,
    maxUnsupportedDistanceMm: maxDist * h,
    floatingCells,
  };
}
