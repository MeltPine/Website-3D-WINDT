import { deflateRawSync } from 'node:zlib';

/** Outward-wound axis-aligned box as 12 triangles (vertex index triplets). */
export const BOX_FACES: ReadonlyArray<[number, number, number]> = [
  [0, 2, 1], [0, 3, 2], // bottom (z = min), normal -z
  [4, 5, 6], [4, 6, 7], // top, normal +z
  [0, 1, 5], [0, 5, 4], // front, normal -y
  [1, 2, 6], [1, 6, 5], // right, normal +x
  [2, 3, 7], [2, 7, 6], // back, normal +y
  [3, 0, 4], [3, 4, 7], // left, normal -x
];

export function boxVertices(sx: number, sy: number, sz: number, ox = 0, oy = 0, oz = 0): number[][] {
  return [
    [ox, oy, oz], [ox + sx, oy, oz], [ox + sx, oy + sy, oz], [ox, oy + sy, oz],
    [ox, oy, oz + sz], [ox + sx, oy, oz + sz], [ox + sx, oy + sy, oz + sz], [ox, oy + sy, oz + sz],
  ];
}

export function boxPositions(sx: number, sy: number, sz: number, ox = 0, oy = 0, oz = 0): Float32Array {
  const v = boxVertices(sx, sy, sz, ox, oy, oz);
  const out = new Float32Array(BOX_FACES.length * 9);
  BOX_FACES.forEach((face, i) => face.forEach((index, j) => out.set(v[index], i * 9 + j * 3)));
  return out;
}

export function binaryStl(positions: Float32Array, header = 'binary stl'): ArrayBuffer {
  const count = positions.length / 9;
  const buffer = new ArrayBuffer(84 + count * 50);
  const view = new DataView(buffer);
  new Uint8Array(buffer).set(new TextEncoder().encode(header.padEnd(80, ' ').slice(0, 80)));
  view.setUint32(80, count, true);
  let offset = 84;
  for (let t = 0; t < count; t += 1) {
    offset += 12;
    for (let k = 0; k < 9; k += 1) {
      view.setFloat32(offset, positions[t * 9 + k], true);
      offset += 4;
    }
    offset += 2;
  }
  return buffer;
}

export function asciiStl(positions: Float32Array): ArrayBuffer {
  const lines = ['solid test'];
  for (let i = 0; i < positions.length; i += 9) {
    lines.push('  facet normal 0 0 0', '    outer loop');
    for (let j = 0; j < 9; j += 3) {
      lines.push(`      vertex ${positions[i + j]} ${positions[i + j + 1]} ${positions[i + j + 2]}`);
    }
    lines.push('    endloop', '  endfacet');
  }
  lines.push('endsolid test');
  return toArrayBuffer(new TextEncoder().encode(lines.join('\n')));
}

export function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i += 1) {
    crc ^= data[i];
    for (let k = 0; k < 8; k += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** Builds a ZIP archive; `deflate` selects DEFLATE (method 8) over STORED. */
export function buildZip(entries: Array<{ name: string; content: string }>, deflate: boolean): ArrayBuffer {
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  for (const entry of entries) {
    const name = new TextEncoder().encode(entry.name);
    const raw = new TextEncoder().encode(entry.content);
    const data = deflate ? new Uint8Array(deflateRawSync(raw)) : raw;
    const crc = crc32(raw);
    const local = new Uint8Array(30 + name.length + data.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(8, deflate ? 8 : 0, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, data.length, true);
    lv.setUint32(22, raw.length, true);
    lv.setUint16(26, name.length, true);
    local.set(name, 30);
    local.set(data, 30 + name.length);

    const central = new Uint8Array(46 + name.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(10, deflate ? 8 : 0, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, raw.length, true);
    cv.setUint16(28, name.length, true);
    cv.setUint32(42, offset, true);
    central.set(name, 46);

    locals.push(local);
    centrals.push(central);
    offset += local.length;
  }
  const centralSize = centrals.reduce((sum, c) => sum + c.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);
  const total = new Uint8Array(offset + centralSize + 22);
  let p = 0;
  for (const part of [...locals, ...centrals, eocd]) {
    total.set(part, p);
    p += part.length;
  }
  return total.buffer;
}

export function boxModelXml(sx: number, sy: number, sz: number, options: { unit?: string; id?: string } = {}): string {
  const v = boxVertices(sx, sy, sz);
  const vertices = v.map(([x, y, z]) => `<vertex x="${x}" y="${y}" z="${z}"/>`).join('');
  const triangles = BOX_FACES.map(([a, b, c]) => `<triangle v1="${a}" v2="${b}" v3="${c}"/>`).join('');
  return `<object id="${options.id ?? '1'}" type="model"><mesh><vertices>${vertices}</vertices><triangles>${triangles}</triangles></mesh></object>`;
}
