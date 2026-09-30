import { TRI_FLAG } from './flags';

/*
 * Mesh measurements and topology on a flat triangle soup (9 floats per
 * triangle). Ported from FDM-INSPECT `mesh.js` and extended:
 *
 * - Topology uses a CSR edge table keyed by the lower vertex index instead of
 *   sorting all edge keys: linear time and about half the memory, which matters
 *   for multi-million-triangle STL files.
 * - Face orientation is resolved per edge-connected component (breadth-first
 *   parity propagation) so that the report can name and highlight the flipped
 *   triangles, not only count contradicting edges.
 * - Sharp concave edges (stress raisers) are found in the same pass.
 */

export type Vec3 = [number, number, number];

export interface Bounds {
  min: Vec3;
  max: Vec3;
  size: Vec3;
}

export function bounds(pos: Float32Array): Bounds {
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < pos.length; i += 3) {
    for (let k = 0; k < 3; k += 1) {
      const v = pos[i + k];
      if (v < min[k]) min[k] = v;
      if (v > max[k]) max[k] = v;
    }
  }
  return { min, max, size: [max[0] - min[0], max[1] - min[1], max[2] - min[2]] };
}

export interface MassProperties {
  /** Absolute enclosed volume, mm³. */
  volume: number;
  /** Signed volume; negative = consistently inside-out. */
  signedVolume: number;
  area: number;
  /** Centre of mass of the homogeneous solid (not the vertex average). */
  centroid: Vec3;
  /** Triangles with (numerically) zero area. */
  zeroArea: number;
}

/**
 * Divergence theorem over tetrahedra to the bounding-box centre (better float
 * precision than the origin for parts far away from it).
 */
export function massProperties(pos: Float32Array, box: Bounds): MassProperties {
  const ox = (box.min[0] + box.max[0]) / 2;
  const oy = (box.min[1] + box.max[1]) / 2;
  const oz = (box.min[2] + box.max[2]) / 2;
  let vol6 = 0;
  let area2 = 0;
  let cx = 0;
  let cy = 0;
  let cz = 0;
  let zeroArea = 0;
  for (let i = 0; i < pos.length; i += 9) {
    const ax = pos[i] - ox;
    const ay = pos[i + 1] - oy;
    const az = pos[i + 2] - oz;
    const bx = pos[i + 3] - ox;
    const by = pos[i + 4] - oy;
    const bz = pos[i + 5] - oz;
    const dx = pos[i + 6] - ox;
    const dy = pos[i + 7] - oy;
    const dz = pos[i + 8] - oz;
    const v6 = ax * (by * dz - bz * dy) - ay * (bx * dz - bz * dx) + az * (bx * dy - by * dx);
    vol6 += v6;
    cx += (ax + bx + dx) * v6;
    cy += (ay + by + dy) * v6;
    cz += (az + bz + dz) * v6;
    const e1x = bx - ax;
    const e1y = by - ay;
    const e1z = bz - az;
    const e2x = dx - ax;
    const e2y = dy - ay;
    const e2z = dz - az;
    const nx = e1y * e2z - e1z * e2y;
    const ny = e1z * e2x - e1x * e2z;
    const nz = e1x * e2y - e1y * e2x;
    const a2 = Math.sqrt(nx * nx + ny * ny + nz * nz);
    area2 += a2;
    if (a2 / 2 < 1e-12) zeroArea += 1;
  }
  const centroid: Vec3 =
    vol6 !== 0 ? [ox + cx / (4 * vol6), oy + cy / (4 * vol6), oz + cz / (4 * vol6)] : [ox, oy, oz];
  return { volume: Math.abs(vol6 / 6), signedVolume: vol6 / 6, area: area2 / 2, centroid, zeroArea };
}

/* ------------------------------------------------------------------ weld */

export interface Welded {
  /** Unique vertex id per soup vertex (length = triangles * 3). */
  index: Int32Array;
  count: number;
}

/**
 * Merge vertices that coincide within `eps` (cell hash, FDM-INSPECT `weld`).
 * The own cell is probed first; the 26 neighbours only when nothing matched,
 * which keeps exact duplicates (the normal STL case) at one lookup.
 */
export function weld(pos: Float32Array, box: Bounds, eps: number): Welded {
  const nv = pos.length / 3;
  const index = new Int32Array(nv);
  const inv = 1 / eps;
  let cap = 1;
  while (cap < Math.max(16, nv / 2)) cap <<= 1;
  const mask = cap - 1;
  const heads = new Int32Array(cap).fill(-1);
  let uniqueCap = Math.max(1024, Math.ceil(nv / 4));
  let ux = new Float32Array(uniqueCap * 3);
  let next = new Int32Array(uniqueCap);
  let count = 0;

  const hash = (gx: number, gy: number, gz: number) =>
    (Math.imul(gx, 73856093) ^ Math.imul(gy, 19349663) ^ Math.imul(gz, 83492791)) & mask;

  const search = (h: number, x: number, y: number, z: number): number => {
    for (let u = heads[h]; u !== -1; u = next[u]) {
      if (Math.abs(ux[u * 3] - x) <= eps && Math.abs(ux[u * 3 + 1] - y) <= eps && Math.abs(ux[u * 3 + 2] - z) <= eps) {
        return u;
      }
    }
    return -1;
  };

  for (let v = 0; v < nv; v += 1) {
    const x = pos[v * 3];
    const y = pos[v * 3 + 1];
    const z = pos[v * 3 + 2];
    const gx = Math.floor((x - box.min[0]) * inv);
    const gy = Math.floor((y - box.min[1]) * inv);
    const gz = Math.floor((z - box.min[2]) * inv);
    const own = hash(gx, gy, gz);
    let found = search(own, x, y, z);
    if (found < 0) {
      for (let ox = -1; ox <= 1 && found < 0; ox += 1) {
        for (let oy = -1; oy <= 1 && found < 0; oy += 1) {
          for (let oz = -1; oz <= 1 && found < 0; oz += 1) {
            if (ox === 0 && oy === 0 && oz === 0) continue;
            found = search(hash(gx + ox, gy + oy, gz + oz), x, y, z);
          }
        }
      }
    }
    if (found < 0) {
      if (count === uniqueCap) {
        uniqueCap *= 2;
        const biggerU = new Float32Array(uniqueCap * 3);
        biggerU.set(ux);
        ux = biggerU;
        const biggerN = new Int32Array(uniqueCap);
        biggerN.set(next);
        next = biggerN;
      }
      found = count;
      ux[count * 3] = x;
      ux[count * 3 + 1] = y;
      ux[count * 3 + 2] = z;
      next[count] = heads[own];
      heads[own] = count;
      count += 1;
    }
    index[v] = found;
  }
  return { index, count };
}

/* -------------------------------------------------------------- topology */

export interface Topology {
  triangles: number;
  vertices: number;
  /** Triangles that collapse after welding or have zero area. */
  degenerateTriangles: number;
  boundaryEdges: number;
  nonManifoldEdges: number;
  manifoldEdges: number;
  /** Manifold edges whose two triangles traverse them in the same direction. */
  inconsistentEdges: number;
  /** Triangles whose winding contradicts the outward orientation of their component. */
  flippedTriangles: number;
  /** Edge-connected components that are completely inside-out. */
  invertedComponents: number;
  /** Vertex-connected bodies. */
  shells: number;
  /** Shells below the splinter volume. */
  splinterShells: number;
  /** Volume of the largest shell, mm³. */
  largestShellVolume: number;
  sharpInnerEdges: number;
  sharpInnerEdgeLengthMm: number;
  watertight: boolean;
  /** Orientation is consistent everywhere (no flipped triangles, no inverted component). */
  orientationConsistent: boolean;
}

export interface TopologyOptions {
  splinterVolumeMm3: number;
  sharpInnerEdgeDeg: number;
  onProgress?: (fraction: number) => void;
}

/** Upper bound of nesting ray casts (each is one pass over all triangles). */
const MAX_NESTING_TESTS = 32;

/*
 * Slightly skewed ray direction: an axis-aligned ray hits shared edges and
 * vertices of axis-aligned CAD faces exactly, which would double-count.
 */
const RAY_DIR: Vec3 = [1, 0.000137, 0.000291];

/** Möller-Trumbore crossings of a ray from p along RAY_DIR with the accepted triangles. */
export function countRayCrossings(
  pos: Float32Array,
  px: number,
  py: number,
  pz: number,
  accept: (triangle: number) => boolean,
): number {
  const [dx, dy, dz] = RAY_DIR;
  let crossings = 0;
  const nt = pos.length / 9;
  for (let t = 0; t < nt; t += 1) {
    if (!accept(t)) continue;
    const i = t * 9;
    const ax = pos[i];
    const ay = pos[i + 1];
    const az = pos[i + 2];
    // quick reject: triangle entirely behind the origin along x
    if (pos[i] < px && pos[i + 3] < px && pos[i + 6] < px) continue;
    const e1x = pos[i + 3] - ax;
    const e1y = pos[i + 4] - ay;
    const e1z = pos[i + 5] - az;
    const e2x = pos[i + 6] - ax;
    const e2y = pos[i + 7] - ay;
    const e2z = pos[i + 8] - az;
    const hx = dy * e2z - dz * e2y;
    const hy = dz * e2x - dx * e2z;
    const hz = dx * e2y - dy * e2x;
    const det = e1x * hx + e1y * hy + e1z * hz;
    if (Math.abs(det) < 1e-18) continue;
    const f = 1 / det;
    const sx = px - ax;
    const sy = py - ay;
    const sz = pz - az;
    const u = f * (sx * hx + sy * hy + sz * hz);
    if (u < 0 || u > 1) continue;
    const qx = sy * e1z - sz * e1y;
    const qy = sz * e1x - sx * e1z;
    const qz = sx * e1y - sy * e1x;
    const w = f * (dx * qx + dy * qy + dz * qz);
    if (w < 0 || u + w > 1) continue;
    const dist = f * (e2x * qx + e2y * qy + e2z * qz);
    if (dist > 1e-9) crossings += 1;
  }
  return crossings;
}

function triangleNormal(pos: Float32Array, t: number, out: Float64Array): number {
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
  if (len === 0) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    return 0;
  }
  out[0] = nx / len;
  out[1] = ny / len;
  out[2] = nz / len;
  return len;
}

/**
 * Edge classification, orientation, shells and sharp inner edges. Writes the
 * matching TRI_FLAG bits into `flags`.
 */
export function topology(
  pos: Float32Array,
  welded: Welded,
  box: Bounds,
  flags: Uint16Array,
  options: TopologyOptions,
): Topology {
  const idx = welded.index;
  const nt = idx.length / 3;
  const V = welded.count;
  const progress = options.onProgress ?? (() => undefined);

  const degenerate = new Uint8Array(nt);
  let degenerateTriangles = 0;
  const normal = new Float64Array(3);
  for (let t = 0; t < nt; t += 1) {
    const a = idx[t * 3];
    const b = idx[t * 3 + 1];
    const c = idx[t * 3 + 2];
    if (a === b || b === c || c === a || triangleNormal(pos, t, normal) / 2 < 1e-12) {
      degenerate[t] = 1;
      degenerateTriangles += 1;
    }
  }

  // CSR edge table: every undirected edge is stored under its lower vertex.
  const start = new Int32Array(V + 1);
  for (let t = 0; t < nt; t += 1) {
    if (degenerate[t]) continue;
    for (let k = 0; k < 3; k += 1) {
      const p = idx[t * 3 + k];
      const q = idx[t * 3 + ((k + 1) % 3)];
      start[(p < q ? p : q) + 1] += 1;
    }
  }
  for (let v = 0; v < V; v += 1) start[v + 1] += start[v];
  const E = start[V];
  const other = new Int32Array(E);
  const etri = new Int32Array(E);
  // bit 0: edge runs from the lower to the higher vertex in this triangle
  const eforward = new Uint8Array(E);
  const cursor = start.slice(0, V);
  for (let t = 0; t < nt; t += 1) {
    if (degenerate[t]) continue;
    for (let k = 0; k < 3; k += 1) {
      const p = idx[t * 3 + k];
      const q = idx[t * 3 + ((k + 1) % 3)];
      const lo = p < q ? p : q;
      const slot = cursor[lo];
      cursor[lo] += 1;
      other[slot] = p < q ? q : p;
      etri[slot] = t;
      eforward[slot] = p < q ? 1 : 0;
    }
  }
  progress(0.25);

  // Sort each vertex's short edge list by the other vertex (insertion sort).
  for (let v = 0; v < V; v += 1) {
    const s = start[v];
    const e = start[v + 1];
    for (let i = s + 1; i < e; i += 1) {
      const o = other[i];
      const tr = etri[i];
      const fw = eforward[i];
      let j = i - 1;
      while (j >= s && other[j] > o) {
        other[j + 1] = other[j];
        etri[j + 1] = etri[j];
        eforward[j + 1] = eforward[j];
        j -= 1;
      }
      other[j + 1] = o;
      etri[j + 1] = tr;
      eforward[j + 1] = fw;
    }
  }

  // Manifold adjacency (up to 3 neighbours per triangle) for the parity walk.
  const neighbour = new Int32Array(nt * 3).fill(-1);
  const neighbourFlip = new Uint8Array(nt * 3);
  const neighbourCount = new Uint8Array(nt);
  let boundaryEdges = 0;
  let nonManifoldEdges = 0;
  let manifoldEdges = 0;
  let inconsistentEdges = 0;
  for (let v = 0; v < V; v += 1) {
    const e = start[v + 1];
    let i = start[v];
    while (i < e) {
      let j = i + 1;
      while (j < e && other[j] === other[i]) j += 1;
      const run = j - i;
      if (run === 1) {
        boundaryEdges += 1;
        flags[etri[i]] |= TRI_FLAG.OPEN_EDGE;
      } else if (run === 2) {
        manifoldEdges += 1;
        const t1 = etri[i];
        const t2 = etri[i + 1];
        const same = eforward[i] === eforward[i + 1] ? 1 : 0;
        if (same) inconsistentEdges += 1;
        if (t1 !== t2 && neighbourCount[t1] < 3 && neighbourCount[t2] < 3) {
          neighbour[t1 * 3 + neighbourCount[t1]] = t2;
          neighbourFlip[t1 * 3 + neighbourCount[t1]] = same;
          neighbourCount[t1] += 1;
          neighbour[t2 * 3 + neighbourCount[t2]] = t1;
          neighbourFlip[t2 * 3 + neighbourCount[t2]] = same;
          neighbourCount[t2] += 1;
        }
      } else {
        nonManifoldEdges += 1;
        for (let k = i; k < j; k += 1) flags[etri[k]] |= TRI_FLAG.NON_MANIFOLD;
      }
      i = j;
    }
  }
  progress(0.5);

  // Parity propagation: parity 1 = wound opposite to the component seed.
  const parity = new Uint8Array(nt).fill(255);
  const queue = new Int32Array(nt);
  const component = new Int32Array(nt).fill(-1);
  const componentVolume: number[] = [];
  const ox = (box.min[0] + box.max[0]) / 2;
  const oy = (box.min[1] + box.max[1]) / 2;
  const oz = (box.min[2] + box.max[2]) / 2;
  const signedV6 = (t: number): number => {
    const i = t * 9;
    const ax = pos[i] - ox;
    const ay = pos[i + 1] - oy;
    const az = pos[i + 2] - oz;
    const bx = pos[i + 3] - ox;
    const by = pos[i + 4] - oy;
    const bz = pos[i + 5] - oz;
    const dx = pos[i + 6] - ox;
    const dy = pos[i + 7] - oy;
    const dz = pos[i + 8] - oz;
    return ax * (by * dz - bz * dy) - ay * (bx * dz - bz * dx) + az * (bx * dy - by * dx);
  };
  for (let seed = 0; seed < nt; seed += 1) {
    if (degenerate[seed] || parity[seed] !== 255) continue;
    const id = componentVolume.length;
    let head = 0;
    let tail = 0;
    queue[tail++] = seed;
    parity[seed] = 0;
    let vol = 0;
    while (head < tail) {
      const t = queue[head++];
      component[t] = id;
      vol += parity[t] ? -signedV6(t) : signedV6(t);
      for (let k = 0; k < neighbourCount[t]; k += 1) {
        const n = neighbour[t * 3 + k];
        if (parity[n] !== 255) continue;
        parity[n] = neighbourFlip[t * 3 + k] ? parity[t] ^ 1 : parity[t];
        queue[tail++] = n;
      }
    }
    componentVolume.push(vol);
  }
  // The outward parity of a closed component is the one giving a positive
  // volume. An open component has no inside, so the majority winding is
  // taken as reference instead (otherwise a whole open patch would be
  // reported as "flipped" on the strength of a meaningless volume sign).
  const componentCount = componentVolume.length;
  const componentOpen = new Uint8Array(componentCount);
  const parityOnes = new Float64Array(componentCount);
  const componentSize = new Float64Array(componentCount);
  for (let t = 0; t < nt; t += 1) {
    const c = component[t];
    if (c < 0) continue;
    componentSize[c] += 1;
    parityOnes[c] += parity[t];
    if (flags[t] & (TRI_FLAG.OPEN_EDGE | TRI_FLAG.NON_MANIFOLD)) componentOpen[c] = 1;
  }
  // A closed component nested inside another one is a cavity wall: its
  // outward direction points into the cavity, i.e. its volume is negative by
  // design. The nesting depth is found by casting a ray from one of its
  // vertices (even-odd count against the other closed components). Only
  // negative components need the test; it is capped for lattice-like files.
  const componentSeedTriangle = new Int32Array(componentCount).fill(-1);
  for (let t = 0; t < nt; t += 1) {
    const c = component[t];
    if (c >= 0 && componentSeedTriangle[c] < 0) componentSeedTriangle[c] = t;
  }
  const nestedOdd = new Uint8Array(componentCount);
  let nestingTests = 0;
  for (let c = 0; c < componentCount; c += 1) {
    if (componentOpen[c] || componentVolume[c] >= 0 || nestingTests >= MAX_NESTING_TESTS) continue;
    nestingTests += 1;
    const seed = componentSeedTriangle[c] * 9;
    const crossings = countRayCrossings(pos, pos[seed], pos[seed + 1], pos[seed + 2], (t) => {
      const other = component[t];
      return other >= 0 && other !== c && !componentOpen[other];
    });
    nestedOdd[c] = crossings % 2;
  }
  let flippedTriangles = 0;
  const componentFlippedAll = new Uint8Array(componentCount).fill(1);
  const componentOutward = componentVolume.map((vol, c) => {
    if (componentOpen[c]) return parityOnes[c] * 2 > componentSize[c] ? 1 : 0;
    const positive = vol >= 0 ? 0 : 1;
    return nestedOdd[c] ? positive ^ 1 : positive;
  });
  for (let t = 0; t < nt; t += 1) {
    if (degenerate[t]) continue;
    const c = component[t];
    if (parity[t] !== componentOutward[c]) {
      flippedTriangles += 1;
      flags[t] |= TRI_FLAG.FLIPPED;
    } else {
      componentFlippedAll[c] = 0;
    }
  }
  let invertedComponents = 0;
  for (let c = 0; c < componentCount; c += 1) {
    if (componentFlippedAll[c] && !componentOpen[c]) invertedComponents += 1;
  }
  progress(0.65);

  // Shells: union-find over shared vertices (FDM-INSPECT).
  const parent = new Int32Array(V);
  for (let v = 0; v < V; v += 1) parent[v] = v;
  const find = (x: number): number => {
    let r = x;
    while (parent[r] !== r) {
      parent[r] = parent[parent[r]];
      r = parent[r];
    }
    return r;
  };
  for (let t = 0; t < nt; t += 1) {
    const a = find(idx[t * 3]);
    const b = find(idx[t * 3 + 1]);
    if (a !== b) parent[a] = b;
    const b2 = find(idx[t * 3 + 1]);
    const c = find(idx[t * 3 + 2]);
    if (b2 !== c) parent[b2] = c;
  }
  const shellVolume = new Float64Array(V);
  const isRoot = new Uint8Array(V);
  for (let v = 0; v < V; v += 1) {
    if (find(v) === v) isRoot[v] = 1;
  }
  for (let t = 0; t < nt; t += 1) {
    const r = find(idx[t * 3]);
    const c = component[t];
    // orientation-corrected contribution
    const v6 = degenerate[t] ? 0 : signedV6(t);
    shellVolume[r] += c >= 0 && parity[t] !== componentOutward[c] ? -v6 : v6;
  }
  let shells = 0;
  let splinterShells = 0;
  let largestShellVolume = 0;
  const splinterRoot = new Uint8Array(V);
  for (let v = 0; v < V; v += 1) {
    if (!isRoot[v]) continue;
    shells += 1;
    const vol = Math.abs(shellVolume[v]) / 6;
    if (vol > largestShellVolume) largestShellVolume = vol;
    if (vol < options.splinterVolumeMm3) {
      splinterRoot[v] = 1;
      splinterShells += 1;
    }
  }
  // A single shell is the part itself, even if tiny (that is a unit question).
  if (shells > 1 && splinterShells > 0) {
    for (let t = 0; t < nt; t += 1) {
      if (splinterRoot[find(idx[t * 3])]) flags[t] |= TRI_FLAG.SPLINTER;
    }
  } else {
    splinterShells = 0;
  }
  progress(0.8);

  // Sharp concave edges on correctly oriented manifold edges.
  const cosLimit = Math.cos((options.sharpInnerEdgeDeg * Math.PI) / 180);
  const n1 = new Float64Array(3);
  const n2 = new Float64Array(3);
  let sharpInnerEdges = 0;
  let sharpInnerEdgeLengthMm = 0;
  const scale = Math.max(box.size[0], box.size[1], box.size[2], 1e-9);
  for (let v = 0; v < V; v += 1) {
    const e = start[v + 1];
    let i = start[v];
    while (i < e) {
      let j = i + 1;
      while (j < e && other[j] === other[i]) j += 1;
      if (j - i === 2 && eforward[i] !== eforward[i + 1]) {
        const t1 = etri[i];
        const t2 = etri[i + 1];
        const c1 = component[t1];
        const c2 = component[t2];
        if (
          c1 >= 0 &&
          c1 === c2 &&
          parity[t1] === componentOutward[c1] &&
          parity[t2] === componentOutward[c2]
        ) {
          triangleNormal(pos, t1, n1);
          triangleNormal(pos, t2, n2);
          const cosTurn = n1[0] * n2[0] + n1[1] * n2[1] + n1[2] * n2[2];
          if (cosTurn < cosLimit) {
            // vertex of t2 that is not on the shared edge
            const hi = other[i];
            let w = 0;
            for (let k = 0; k < 3; k += 1) {
              const vid = idx[t2 * 3 + k];
              if (vid !== v && vid !== hi) w = k;
            }
            // any soup vertex of t1 lies on its plane
            const px = pos[t1 * 9];
            const py = pos[t1 * 9 + 1];
            const pz = pos[t1 * 9 + 2];
            const wx = pos[t2 * 9 + w * 3] - px;
            const wy = pos[t2 * 9 + w * 3 + 1] - py;
            const wz = pos[t2 * 9 + w * 3 + 2] - pz;
            const side = wx * n1[0] + wy * n1[1] + wz * n1[2];
            if (side > scale * 1e-7) {
              sharpInnerEdges += 1;
              flags[t1] |= TRI_FLAG.SHARP_INNER;
              flags[t2] |= TRI_FLAG.SHARP_INNER;
              // edge length from the soup coordinates of t1
              let a = -1;
              let b = -1;
              for (let k = 0; k < 3; k += 1) {
                const vid = idx[t1 * 3 + k];
                if (vid === v) a = k;
                if (vid === hi) b = k;
              }
              if (a >= 0 && b >= 0) {
                const dx = pos[t1 * 9 + a * 3] - pos[t1 * 9 + b * 3];
                const dy = pos[t1 * 9 + a * 3 + 1] - pos[t1 * 9 + b * 3 + 1];
                const dz = pos[t1 * 9 + a * 3 + 2] - pos[t1 * 9 + b * 3 + 2];
                sharpInnerEdgeLengthMm += Math.sqrt(dx * dx + dy * dy + dz * dz);
              }
            }
          }
        }
      }
      i = j;
    }
  }
  progress(1);

  return {
    triangles: nt,
    vertices: V,
    degenerateTriangles,
    boundaryEdges,
    nonManifoldEdges,
    manifoldEdges,
    inconsistentEdges,
    flippedTriangles,
    invertedComponents,
    shells,
    splinterShells,
    largestShellVolume,
    sharpInnerEdges,
    sharpInnerEdgeLengthMm,
    watertight: boundaryEdges === 0 && nonManifoldEdges === 0,
    orientationConsistent: flippedTriangles === 0,
  };
}
