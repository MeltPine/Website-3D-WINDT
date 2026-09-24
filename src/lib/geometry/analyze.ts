import { GeometryParseError, type MeshAnalysis, type TriangleMesh, type Vec3 } from './types';

/*
 * Mass properties of a triangle soup. Volume via the divergence theorem
 * (signed tetrahedra), as in druckwerk `analyzeMesh` and FDM-INSPECT
 * `massProperties`.
 *
 * Two reference points are used: the bounding-box centre (better float
 * precision for parts far from the origin) and the bounding-box minimum. For a
 * closed mesh both yield the same volume; if they disagree, the mesh has holes
 * and the reported volume is not trustworthy.
 */

const OPEN_MESH_RELATIVE_TOLERANCE = 0.01;

export function analyzeMesh(mesh: TriangleMesh): MeshAnalysis {
  const p = mesh.positions;
  if (p.length === 0 || p.length % 9 !== 0) {
    throw new GeometryParseError('Das Modell enthält keine gültigen Dreiecke.');
  }

  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < p.length; i += 3) {
    for (let k = 0; k < 3; k += 1) {
      const value = p[i + k];
      if (!Number.isFinite(value)) {
        throw new GeometryParseError('Das Modell enthält ungültige Koordinaten.');
      }
      if (value < min[k]) min[k] = value;
      if (value > max[k]) max[k] = value;
    }
  }
  const size: Vec3 = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
  const cx = (min[0] + max[0]) / 2;
  const cy = (min[1] + max[1]) / 2;
  const cz = (min[2] + max[2]) / 2;

  let sixVolumeCentre = 0;
  let sixVolumeCorner = 0;
  let doubleArea = 0;
  for (let i = 0; i < p.length; i += 9) {
    const ax = p[i] - cx;
    const ay = p[i + 1] - cy;
    const az = p[i + 2] - cz;
    const bx = p[i + 3] - cx;
    const by = p[i + 4] - cy;
    const bz = p[i + 5] - cz;
    const dx = p[i + 6] - cx;
    const dy = p[i + 7] - cy;
    const dz = p[i + 8] - cz;

    sixVolumeCentre += ax * (by * dz - bz * dy) - ay * (bx * dz - bz * dx) + az * (bx * dy - by * dx);

    // Same triangle relative to the bbox minimum corner.
    const ox = cx - min[0];
    const oy = cy - min[1];
    const oz = cz - min[2];
    const a2x = ax + ox;
    const a2y = ay + oy;
    const a2z = az + oz;
    const b2x = bx + ox;
    const b2y = by + oy;
    const b2z = bz + oz;
    const d2x = dx + ox;
    const d2y = dy + oy;
    const d2z = dz + oz;
    sixVolumeCorner +=
      a2x * (b2y * d2z - b2z * d2y) - a2y * (b2x * d2z - b2z * d2x) + a2z * (b2x * d2y - b2y * d2x);

    const e1x = bx - ax;
    const e1y = by - ay;
    const e1z = bz - az;
    const e2x = dx - ax;
    const e2y = dy - ay;
    const e2z = dz - az;
    const nx = e1y * e2z - e1z * e2y;
    const ny = e1z * e2x - e1x * e2z;
    const nz = e1x * e2y - e1y * e2x;
    doubleArea += Math.sqrt(nx * nx + ny * ny + nz * nz);
  }

  const volumeCentre = Math.abs(sixVolumeCentre) / 6;
  const volumeCorner = Math.abs(sixVolumeCorner) / 6;
  const reference = Math.max(volumeCentre, volumeCorner);
  const openMeshSuspected =
    reference === 0 || Math.abs(volumeCentre - volumeCorner) / reference > OPEN_MESH_RELATIVE_TOLERANCE;

  return {
    triangleCount: mesh.triangleCount,
    volumeMm3: volumeCentre,
    surfaceAreaMm2: doubleArea / 2,
    bbox: { min, max, size },
    openMeshSuspected,
  };
}
