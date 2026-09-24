import { GeometryParseError, type TriangleMesh } from './types';

/*
 * STL reader. Ported from druckwerk `site/assets/quote.js` with the binary
 * detection of FDM-INSPECT `mesh.js`: a binary file is recognised by its exact
 * length (84 + 50 * n) first, because plenty of binary exporters start their
 * 80-byte header with the word "solid".
 */

const BINARY_HEADER_BYTES = 84;
const BINARY_TRIANGLE_BYTES = 50;

function isExactBinaryLength(view: DataView): boolean {
  if (view.byteLength < BINARY_HEADER_BYTES) {
    return false;
  }
  const count = view.getUint32(80, true);
  return BINARY_HEADER_BYTES + count * BINARY_TRIANGLE_BYTES === view.byteLength;
}

function startsWithSolid(buffer: ArrayBuffer): boolean {
  const head = new TextDecoder().decode(new Uint8Array(buffer, 0, Math.min(512, buffer.byteLength)));
  return head.trimStart().toLowerCase().startsWith('solid');
}

function parseBinary(view: DataView, triangleCount: number): TriangleMesh {
  const positions = new Float32Array(triangleCount * 9);
  let offset = BINARY_HEADER_BYTES;
  let p = 0;
  for (let t = 0; t < triangleCount; t += 1) {
    offset += 12; // stored facet normal: ignored, recomputed from winding
    for (let k = 0; k < 9; k += 1) {
      const value = view.getFloat32(offset, true);
      if (!Number.isFinite(value)) {
        throw new GeometryParseError(`STL enthält ungültige Koordinaten (Dreieck ${t + 1}).`);
      }
      positions[p] = value;
      p += 1;
      offset += 4;
    }
    offset += 2; // attribute byte count
  }
  return { positions, triangleCount };
}

function parseAscii(buffer: ArrayBuffer): TriangleMesh {
  const text = new TextDecoder().decode(buffer);
  const pattern = /vertex\s+([-+\d.eE]+)\s+([-+\d.eE]+)\s+([-+\d.eE]+)/g;
  const values: number[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const x = Number(match[1]);
    const y = Number(match[2]);
    const z = Number(match[3]);
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
      throw new GeometryParseError('ASCII-STL enthält ungültige Koordinaten.');
    }
    values.push(x, y, z);
  }
  if (values.length === 0) {
    throw new GeometryParseError('Keine Dreiecke in der STL-Datei gefunden.');
  }
  if (values.length % 9 !== 0) {
    throw new GeometryParseError('ASCII-STL ist unvollständig (keine ganze Zahl von Dreiecken).');
  }
  return { positions: new Float32Array(values), triangleCount: values.length / 9 };
}

export function parseStl(buffer: ArrayBuffer): TriangleMesh {
  if (buffer.byteLength === 0) {
    throw new GeometryParseError('Die Datei ist leer.');
  }
  const view = new DataView(buffer);
  if (isExactBinaryLength(view)) {
    const count = view.getUint32(80, true);
    if (count === 0) {
      throw new GeometryParseError('Die STL-Datei enthält keine Dreiecke.');
    }
    return parseBinary(view, count);
  }
  if (startsWithSolid(buffer)) {
    return parseAscii(buffer);
  }
  if (buffer.byteLength >= BINARY_HEADER_BYTES) {
    // Some exporters append trailing bytes; accept as long as the declared
    // triangles fit into the file.
    const count = view.getUint32(80, true);
    if (count > 0 && BINARY_HEADER_BYTES + count * BINARY_TRIANGLE_BYTES <= buffer.byteLength) {
      return parseBinary(view, count);
    }
    throw new GeometryParseError(
      'Binäre STL-Datei ist unvollständig: Der Dateikopf passt nicht zur Dateigröße.',
    );
  }
  throw new GeometryParseError('Datei zu klein für eine STL.');
}
