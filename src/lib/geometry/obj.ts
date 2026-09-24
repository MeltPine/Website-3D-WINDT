import { GeometryParseError, type TriangleMesh } from './types';

/*
 * Wavefront OBJ reader (geometry only). Ported from druckwerk
 * `site/assets/quote.js`: polygons are fan-triangulated, negative (relative)
 * indices are resolved, texture/normal references are ignored.
 * OBJ carries no unit; millimetres are assumed, as in every slicer.
 */

export function parseObj(buffer: ArrayBuffer): TriangleMesh {
  const text = new TextDecoder().decode(buffer);
  const vertices: number[] = [];
  const faces: number[] = [];

  const lines = text.split(/\r?\n/);
  for (let lineNo = 0; lineNo < lines.length; lineNo += 1) {
    const line = lines[lineNo].trim();
    if (line.startsWith('v ') || line.startsWith('v\t')) {
      const parts = line.split(/\s+/);
      const x = Number(parts[1]);
      const y = Number(parts[2]);
      const z = Number(parts[3]);
      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
        throw new GeometryParseError(`OBJ: ungültiger Eckpunkt in Zeile ${lineNo + 1}.`);
      }
      vertices.push(x, y, z);
    } else if (line.startsWith('f ') || line.startsWith('f\t')) {
      const vertexCount = vertices.length / 3;
      const indices = line
        .split(/\s+/)
        .slice(1)
        .filter((token) => token.length > 0)
        .map((token) => {
          const raw = Number.parseInt(token.split('/')[0], 10);
          if (!Number.isFinite(raw) || raw === 0) {
            throw new GeometryParseError(`OBJ: ungültiger Flächenindex in Zeile ${lineNo + 1}.`);
          }
          const index = raw < 0 ? vertexCount + raw : raw - 1;
          if (index < 0 || index >= vertexCount) {
            throw new GeometryParseError(`OBJ: Flächenindex außerhalb des Bereichs (Zeile ${lineNo + 1}).`);
          }
          return index;
        });
      if (indices.length < 3) {
        throw new GeometryParseError(`OBJ: Fläche mit weniger als drei Eckpunkten (Zeile ${lineNo + 1}).`);
      }
      for (let i = 1; i < indices.length - 1; i += 1) {
        faces.push(indices[0], indices[i], indices[i + 1]);
      }
    }
  }

  if (faces.length === 0) {
    throw new GeometryParseError('OBJ enthält keine Flächen.');
  }

  const triangleCount = faces.length / 3;
  const positions = new Float32Array(triangleCount * 9);
  for (let i = 0; i < faces.length; i += 1) {
    const v = faces[i] * 3;
    positions[i * 3] = vertices[v];
    positions[i * 3 + 1] = vertices[v + 1];
    positions[i * 3 + 2] = vertices[v + 2];
  }
  return { positions, triangleCount };
}
