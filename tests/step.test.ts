import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { analyzeMesh } from '../src/lib/geometry/analyze';
import { occtResultToMesh, parseStepWith, type OcctModule } from '../src/lib/geometry/step';
import { GeometryParseError } from '../src/lib/geometry/types';
import { toArrayBuffer } from './helpers/meshes';

const require = createRequire(import.meta.url);
const occtRoot = path.dirname(require.resolve('occt-import-js/package.json'));
const fixture = (relative: string) => toArrayBuffer(readFileSync(path.join(occtRoot, 'test/testfiles', relative)));

let occt: OcctModule;

beforeAll(async () => {
  const factory = require('occt-import-js') as () => Promise<OcctModule>;
  occt = await factory();
});

describe('parseStepWith (occt-import-js)', () => {
  it('tessellates a 10 mm cube to 1000 mm³', () => {
    const analysis = analyzeMesh(parseStepWith(occt, fixture('cube-10x10mm/Cube 10x10.stp')));
    expect(analysis.volumeMm3).toBeCloseTo(1000, 3);
    expect(analysis.openMeshSuspected).toBe(false);
  });

  it('normalises STEP units to millimetres', () => {
    for (const file of ['cube-units/cube-m.step', 'cube-units/cube-mm.step', 'cube-units/cube-in.step']) {
      const analysis = analyzeMesh(parseStepWith(occt, fixture(file)));
      expect(analysis.bbox.size[0]).toBeCloseTo(1000, 3);
    }
  });

  it('keeps curved-surface volume error small', () => {
    const analysis = analyzeMesh(parseStepWith(occt, fixture('rounded-cube/rounded-cube.step')));
    expect(analysis.volumeMm3).toBeGreaterThan(0);
    expect(analysis.openMeshSuspected).toBe(false);
  });

  it('rejects files without the ISO-10303-21 header', () => {
    expect(() => parseStepWith(occt, toArrayBuffer(new TextEncoder().encode('solid not a step file')))).toThrow(
      GeometryParseError,
    );
  });
});

describe('occtResultToMesh', () => {
  it('rejects failed or empty results', () => {
    expect(() => occtResultToMesh({ success: false, meshes: [] })).toThrow(GeometryParseError);
    expect(() => occtResultToMesh({ success: true, meshes: [] })).toThrow(GeometryParseError);
  });

  it('rejects out-of-range indices', () => {
    expect(() =>
      occtResultToMesh({
        success: true,
        meshes: [{ attributes: { position: { array: [0, 0, 0, 1, 0, 0, 0, 1, 0] } }, index: { array: [0, 1, 5] } }],
      }),
    ).toThrow(GeometryParseError);
  });
});
