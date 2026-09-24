import { GeometryParseError, type TriangleMesh } from './types';
import { readZipEntries, type InflateRaw, inflateRawWithStreams } from './zip';

/*
 * 3MF reader. The resolution logic (build items, nested components,
 * production-extension sub-models as written by Bambu Studio / OrcaSlicer /
 * PrusaSlicer) is ported from druckwerk `site/assets/quote.js`.
 *
 * Unlike the druckwerk original this version does not use DOMParser: it runs
 * inside a Web Worker (where DOMParser does not exist) and in Node tests. The
 * 3MF model schema is flat and attribute-driven, so a tag/attribute scanner is
 * sufficient and considerably faster on large meshes.
 */

type Transform = readonly number[]; // 12 values, 3MF row-vector convention

interface MeshObject {
  kind: 'mesh';
  vertices: number[];
  triangles: number[];
}

interface ComponentRef {
  path: string;
  objectId: string;
  transform: Transform | null;
}

interface ComponentsObject {
  kind: 'components';
  components: ComponentRef[];
}

type ObjectDefinition = MeshObject | ComponentsObject;

interface BuildItem {
  path: string;
  objectId: string;
  transform: Transform | null;
}

const UNIT_TO_MM: Readonly<Record<string, number>> = {
  micron: 0.001,
  millimeter: 1,
  centimeter: 10,
  inch: 25.4,
  foot: 304.8,
  meter: 1000,
};

const MAX_COMPONENT_DEPTH = 16;

const TAG_PATTERN = /<(\/?)([A-Za-z_][\w.:-]*)([^>]*)>/g;
const ATTRIBUTE_PATTERN = /([A-Za-z_][\w.:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

function localName(qualified: string): string {
  const colon = qualified.lastIndexOf(':');
  return colon >= 0 ? qualified.slice(colon + 1) : qualified;
}

function parseAttributes(source: string): Map<string, string> {
  const attributes = new Map<string, string>();
  ATTRIBUTE_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = ATTRIBUTE_PATTERN.exec(source)) !== null) {
    attributes.set(match[1], match[2] ?? match[3] ?? '');
  }
  return attributes;
}

/** Reads the production-extension path attribute regardless of its prefix. */
function pathAttribute(attributes: Map<string, string>): string | null {
  for (const [key, value] of attributes) {
    if (localName(key) === 'path' && value.trim()) {
      return normaliseModelPath(value.trim());
    }
  }
  return null;
}

function normaliseModelPath(path: string): string {
  return `/${path.replace(/\\/g, '/').replace(/^\/+/, '')}`;
}

function requireNumber(value: string | undefined, context: string): number {
  const parsed = Number(value);
  if (value === undefined || value.trim() === '' || !Number.isFinite(parsed)) {
    throw new GeometryParseError(`3MF: ungültiger Zahlenwert (${context}).`);
  }
  return parsed;
}

export function parseTransform(value: string | undefined): Transform | null {
  if (!value || !value.trim()) {
    return null;
  }
  const numbers = value.trim().split(/\s+/).map(Number);
  if (numbers.length !== 12 || !numbers.every(Number.isFinite)) {
    throw new GeometryParseError('3MF: ungültige Transformationsmatrix.');
  }
  return numbers;
}

/** Returns the transform equivalent to applying `inner` first, then `outer`. */
export function composeTransform(outer: Transform | null, inner: Transform | null): Transform | null {
  if (!outer) return inner;
  if (!inner) return outer;
  const r = new Array<number>(12);
  for (let col = 0; col < 3; col += 1) {
    r[col] = inner[0] * outer[col] + inner[1] * outer[3 + col] + inner[2] * outer[6 + col];
    r[3 + col] = inner[3] * outer[col] + inner[4] * outer[3 + col] + inner[5] * outer[6 + col];
    r[6 + col] = inner[6] * outer[col] + inner[7] * outer[3 + col] + inner[8] * outer[6 + col];
    r[9 + col] =
      inner[9] * outer[col] + inner[10] * outer[3 + col] + inner[11] * outer[6 + col] + outer[9 + col];
  }
  return r;
}

interface ParsedModelFile {
  objects: Map<string, ObjectDefinition>;
  items: BuildItem[];
}

function parseModelXml(xml: string, modelPath: string): ParsedModelFile {
  const objects = new Map<string, ObjectDefinition>();
  const items: BuildItem[] = [];
  let scale = 1;
  let currentObjectId: string | null = null;
  let currentMesh: MeshObject | null = null;
  let currentComponents: ComponentRef[] | null = null;
  let inBuild = false;

  TAG_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TAG_PATTERN.exec(xml)) !== null) {
    const closing = match[1] === '/';
    const name = localName(match[2]);
    const rawAttributes = match[3];
    const selfClosing = rawAttributes.trimEnd().endsWith('/');

    if (closing) {
      if (name === 'object' && currentObjectId !== null) {
        if (currentMesh && currentMesh.triangles.length > 0) {
          objects.set(currentObjectId, currentMesh);
        } else if (currentComponents && currentComponents.length > 0) {
          objects.set(currentObjectId, { kind: 'components', components: currentComponents });
        }
        currentObjectId = null;
        currentMesh = null;
        currentComponents = null;
      } else if (name === 'build') {
        inBuild = false;
      }
      continue;
    }

    switch (name) {
      case 'model': {
        const unit = parseAttributes(rawAttributes).get('unit') ?? 'millimeter';
        const factor = UNIT_TO_MM[unit];
        if (factor === undefined) {
          throw new GeometryParseError(`3MF: unbekannte Einheit "${unit}".`);
        }
        scale = factor;
        break;
      }
      case 'object': {
        const id = parseAttributes(rawAttributes).get('id');
        if (!id) {
          throw new GeometryParseError('3MF: Objekt ohne ID.');
        }
        currentObjectId = id;
        currentMesh = null;
        currentComponents = null;
        if (selfClosing) {
          currentObjectId = null;
        }
        break;
      }
      case 'mesh':
        if (currentObjectId !== null) {
          currentMesh = { kind: 'mesh', vertices: [], triangles: [] };
        }
        break;
      case 'vertex': {
        if (!currentMesh) break;
        const a = parseAttributes(rawAttributes);
        currentMesh.vertices.push(
          requireNumber(a.get('x'), 'vertex x') * scale,
          requireNumber(a.get('y'), 'vertex y') * scale,
          requireNumber(a.get('z'), 'vertex z') * scale,
        );
        break;
      }
      case 'triangle': {
        if (!currentMesh) break;
        const a = parseAttributes(rawAttributes);
        currentMesh.triangles.push(
          requireNumber(a.get('v1'), 'triangle v1'),
          requireNumber(a.get('v2'), 'triangle v2'),
          requireNumber(a.get('v3'), 'triangle v3'),
        );
        break;
      }
      case 'components':
        if (currentObjectId !== null) {
          currentComponents = [];
        }
        break;
      case 'component': {
        if (!currentComponents) break;
        const a = parseAttributes(rawAttributes);
        const objectId = a.get('objectid');
        if (!objectId) {
          throw new GeometryParseError('3MF: Komponente ohne Objektverweis.');
        }
        currentComponents.push({
          path: pathAttribute(a) ?? modelPath,
          objectId,
          transform: parseTransform(a.get('transform')),
        });
        break;
      }
      case 'build':
        inBuild = !selfClosing;
        break;
      case 'item': {
        if (!inBuild) break;
        const a = parseAttributes(rawAttributes);
        const objectId = a.get('objectid');
        if (!objectId) {
          throw new GeometryParseError('3MF: Bauteil ohne Objektverweis.');
        }
        items.push({
          path: pathAttribute(a) ?? modelPath,
          objectId,
          transform: parseTransform(a.get('transform')),
        });
        break;
      }
      default:
        break;
    }
  }

  return { objects, items };
}

function objectKey(path: string, id: string): string {
  return `${path}#${id}`;
}

export async function parse3mf(
  buffer: ArrayBuffer,
  inflateRaw: InflateRaw = inflateRawWithStreams,
): Promise<TriangleMesh> {
  const entries = await readZipEntries(buffer, (path) => path.toLowerCase().endsWith('.model'), inflateRaw);
  if (entries.length === 0) {
    throw new GeometryParseError('3MF: kein Modell in der Datei gefunden.');
  }

  const decoder = new TextDecoder();
  const objects = new Map<string, ObjectDefinition>();
  let buildItems: BuildItem[] = [];

  for (const entry of entries) {
    const parsed = parseModelXml(decoder.decode(entry.data), entry.path);
    parsed.objects.forEach((definition, id) => objects.set(objectKey(entry.path, id), definition));
    if (parsed.items.length > 0) {
      buildItems = buildItems.concat(parsed.items);
    }
  }

  if (buildItems.length === 0) {
    // No build section: fall back to every mesh object, untransformed.
    objects.forEach((definition, key) => {
      if (definition.kind === 'mesh') {
        const hash = key.lastIndexOf('#');
        buildItems.push({ path: key.slice(0, hash), objectId: key.slice(hash + 1), transform: null });
      }
    });
  }

  const chunks: Float32Array[] = [];
  let triangleTotal = 0;

  const resolve = (path: string, objectId: string, transform: Transform | null, depth: number): void => {
    if (depth > MAX_COMPONENT_DEPTH) {
      throw new GeometryParseError('3MF: Komponenten zu tief verschachtelt (Zyklus?).');
    }
    const definition = objects.get(objectKey(path, objectId));
    if (!definition) {
      throw new GeometryParseError(`3MF: Objekt ${objectId} in ${path} nicht gefunden.`);
    }
    if (definition.kind === 'components') {
      definition.components.forEach((component) => {
        resolve(component.path, component.objectId, composeTransform(transform, component.transform), depth + 1);
      });
      return;
    }

    const { vertices, triangles } = definition;
    const vertexCount = vertices.length / 3;
    const positions = new Float32Array(triangles.length * 3);
    const t = transform;
    for (let i = 0; i < triangles.length; i += 1) {
      const vertexIndex = triangles[i];
      if (!Number.isInteger(vertexIndex) || vertexIndex < 0 || vertexIndex >= vertexCount) {
        throw new GeometryParseError('3MF: Dreiecks-Index außerhalb des Bereichs.');
      }
      const x = vertices[vertexIndex * 3];
      const y = vertices[vertexIndex * 3 + 1];
      const z = vertices[vertexIndex * 3 + 2];
      const o = i * 3;
      if (t) {
        positions[o] = x * t[0] + y * t[3] + z * t[6] + t[9];
        positions[o + 1] = x * t[1] + y * t[4] + z * t[7] + t[10];
        positions[o + 2] = x * t[2] + y * t[5] + z * t[8] + t[11];
      } else {
        positions[o] = x;
        positions[o + 1] = y;
        positions[o + 2] = z;
      }
    }
    triangleTotal += triangles.length / 3;
    chunks.push(positions);
  };

  buildItems.forEach((item) => resolve(item.path, item.objectId, item.transform, 0));

  if (triangleTotal === 0) {
    throw new GeometryParseError('3MF enthält kein druckbares Netz.');
  }
  const positions = new Float32Array(triangleTotal * 9);
  let offset = 0;
  chunks.forEach((chunk) => {
    positions.set(chunk, offset);
    offset += chunk.length;
  });
  return { positions, triangleCount: triangleTotal };
}
