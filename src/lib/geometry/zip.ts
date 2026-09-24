import { GeometryParseError } from './types';

/*
 * Minimal ZIP reader, sufficient for 3MF packages: central directory lookup,
 * STORED and DEFLATE entries. Ported from druckwerk `site/assets/quote.js`
 * and hardened against truncated archives and decompression bombs.
 */

export type InflateRaw = (data: Uint8Array) => Promise<Uint8Array>;

export interface ZipEntry {
  /** Normalised absolute path inside the archive, e.g. "/3D/3dmodel.model". */
  path: string;
  data: Uint8Array;
}

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;
const ZIP64_MARKER = 0xffffffff;

/** Upper bound for a single decompressed entry; guards against zip bombs. */
export const MAX_UNCOMPRESSED_ENTRY_BYTES = 768 * 1024 * 1024;

export const inflateRawWithStreams: InflateRaw = async (data) => {
  if (typeof DecompressionStream === 'undefined') {
    throw new GeometryParseError(
      'Dieser Browser kann 3MF-Dateien nicht entpacken. Bitte einen aktuellen Browser verwenden oder STL hochladen.',
    );
  }
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
};

function findEndOfCentralDirectory(view: DataView): number {
  const minOffset = Math.max(0, view.byteLength - 65557);
  for (let i = view.byteLength - 22; i >= minOffset; i -= 1) {
    if (view.getUint32(i, true) === EOCD_SIGNATURE) {
      return i;
    }
  }
  throw new GeometryParseError('3MF: ZIP-Verzeichnis nicht gefunden (Datei beschädigt?).');
}

function normalisePath(name: string): string {
  return `/${name.replace(/\\/g, '/').replace(/^\/+/, '')}`;
}

export async function readZipEntries(
  buffer: ArrayBuffer,
  matcher: (path: string) => boolean,
  inflateRaw: InflateRaw = inflateRawWithStreams,
): Promise<ZipEntry[]> {
  if (buffer.byteLength < 22) {
    throw new GeometryParseError('3MF: Datei zu klein für ein ZIP-Archiv.');
  }
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  const decoder = new TextDecoder();
  const eocd = findEndOfCentralDirectory(view);
  const entryCount = view.getUint16(eocd + 10, true);
  let pointer = view.getUint32(eocd + 16, true);
  if (pointer === ZIP64_MARKER) {
    throw new GeometryParseError('3MF: ZIP64-Archive werden nicht unterstützt.');
  }

  const results: ZipEntry[] = [];
  for (let n = 0; n < entryCount; n += 1) {
    if (pointer + 46 > buffer.byteLength || view.getUint32(pointer, true) !== CENTRAL_SIGNATURE) {
      throw new GeometryParseError('3MF: defekter ZIP-Verzeichniseintrag.');
    }
    const method = view.getUint16(pointer + 10, true);
    const compressedSize = view.getUint32(pointer + 20, true);
    const uncompressedSize = view.getUint32(pointer + 24, true);
    const nameLength = view.getUint16(pointer + 28, true);
    const extraLength = view.getUint16(pointer + 30, true);
    const commentLength = view.getUint16(pointer + 32, true);
    const localOffset = view.getUint32(pointer + 42, true);
    const path = normalisePath(decoder.decode(bytes.subarray(pointer + 46, pointer + 46 + nameLength)));
    pointer += 46 + nameLength + extraLength + commentLength;

    if (!matcher(path)) {
      continue;
    }
    if (compressedSize === ZIP64_MARKER || uncompressedSize === ZIP64_MARKER || localOffset === ZIP64_MARKER) {
      throw new GeometryParseError('3MF: ZIP64-Einträge werden nicht unterstützt.');
    }
    if (uncompressedSize > MAX_UNCOMPRESSED_ENTRY_BYTES) {
      throw new GeometryParseError('3MF: Modelldatei ist entpackt zu groß für die Browser-Analyse.');
    }
    if (localOffset + 30 > buffer.byteLength || view.getUint32(localOffset, true) !== LOCAL_SIGNATURE) {
      throw new GeometryParseError('3MF: defekter lokaler ZIP-Eintrag.');
    }
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    if (dataStart + compressedSize > buffer.byteLength) {
      throw new GeometryParseError('3MF: ZIP-Eintrag ist abgeschnitten.');
    }
    const raw = bytes.subarray(dataStart, dataStart + compressedSize);

    let data: Uint8Array;
    if (method === 0) {
      data = raw.slice();
    } else if (method === 8) {
      data = await inflateRaw(raw);
    } else {
      throw new GeometryParseError(`3MF: nicht unterstützte ZIP-Kompression (Methode ${method}).`);
    }
    if (data.byteLength !== uncompressedSize) {
      throw new GeometryParseError('3MF: entpackte Größe stimmt nicht mit dem ZIP-Verzeichnis überein.');
    }
    results.push({ path, data });
  }
  return results;
}
