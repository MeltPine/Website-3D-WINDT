import { describe, expect, it } from 'vitest';
import { analyzeMesh } from '../src/lib/geometry/analyze';
import { detectModelFormat } from '../src/lib/geometry/format';
import { parseObj } from '../src/lib/geometry/obj';
import { parseStl } from '../src/lib/geometry/stl';
import { GeometryParseError } from '../src/lib/geometry/types';
import { asciiStl, binaryStl, boxPositions, toArrayBuffer } from './helpers/meshes';

describe('detectModelFormat', () => {
  it('maps supported extensions case-insensitively', () => {
    expect(detectModelFormat('Teil.STL')).toBe('stl');
    expect(detectModelFormat('a.obj')).toBe('obj');
    expect(detectModelFormat('a.3mf')).toBe('3mf');
    expect(detectModelFormat('a.step')).toBe('step');
    expect(detectModelFormat('a.STP')).toBe('step');
  });

  it('returns null for upload-only or unknown files', () => {
    expect(detectModelFormat('zeichnung.svg')).toBeNull();
    expect(detectModelFormat('noextension')).toBeNull();
    expect(detectModelFormat('trailingdot.')).toBeNull();
  });
});

describe('analyzeMesh', () => {
  it('computes volume, area and bbox of a closed box', () => {
    const result = analyzeMesh({ positions: boxPositions(20, 10, 5), triangleCount: 12 });
    expect(result.volumeMm3).toBeCloseTo(1000, 6);
    expect(result.surfaceAreaMm2).toBeCloseTo(2 * (200 + 100 + 50), 6);
    expect(result.bbox.size).toEqual([20, 10, 5]);
    expect(result.openMeshSuspected).toBe(false);
  });

  it('stays precise for parts far from the origin', () => {
    const result = analyzeMesh({ positions: boxPositions(10, 10, 10, 5000, -3000, 2000), triangleCount: 12 });
    expect(result.volumeMm3).toBeCloseTo(1000, 1);
    expect(result.bbox.min).toEqual([5000, -3000, 2000]);
  });

  it('flags meshes with holes', () => {
    const open = boxPositions(10, 10, 10).slice(0, 10 * 9); // drop the left face
    const result = analyzeMesh({ positions: open, triangleCount: 10 });
    expect(result.openMeshSuspected).toBe(true);
  });

  it('reports inside-out meshes with a positive volume', () => {
    const positions = boxPositions(10, 10, 10);
    for (let i = 0; i < positions.length; i += 9) {
      // swap vertex b and c to flip the winding
      for (let k = 0; k < 3; k += 1) {
        const tmp = positions[i + 3 + k];
        positions[i + 3 + k] = positions[i + 6 + k];
        positions[i + 6 + k] = tmp;
      }
    }
    expect(analyzeMesh({ positions, triangleCount: 12 }).volumeMm3).toBeCloseTo(1000, 6);
  });

  it('rejects empty meshes', () => {
    expect(() => analyzeMesh({ positions: new Float32Array(0), triangleCount: 0 })).toThrow(GeometryParseError);
  });
});

describe('parseStl', () => {
  it('reads binary STL', () => {
    const mesh = parseStl(binaryStl(boxPositions(10, 20, 30)));
    expect(mesh.triangleCount).toBe(12);
    expect(analyzeMesh(mesh).volumeMm3).toBeCloseTo(6000, 4);
  });

  it('reads binary STL whose header starts with "solid"', () => {
    const mesh = parseStl(binaryStl(boxPositions(10, 10, 10), 'solid exported by CAD'));
    expect(mesh.triangleCount).toBe(12);
  });

  it('reads ASCII STL', () => {
    const mesh = parseStl(asciiStl(boxPositions(10, 10, 10)));
    expect(mesh.triangleCount).toBe(12);
    expect(analyzeMesh(mesh).volumeMm3).toBeCloseTo(1000, 4);
  });

  it('rejects truncated binary STL', () => {
    const full = binaryStl(boxPositions(10, 10, 10));
    expect(() => parseStl(full.slice(0, full.byteLength - 60))).toThrow(GeometryParseError);
  });

  it('rejects empty files and ASCII without facets', () => {
    expect(() => parseStl(new ArrayBuffer(0))).toThrow(GeometryParseError);
    expect(() => parseStl(toArrayBuffer(new TextEncoder().encode('solid empty\nendsolid empty')))).toThrow(
      GeometryParseError,
    );
  });
});

describe('parseObj', () => {
  const quadCube = [
    '# cube with quads',
    'v 0 0 0', 'v 10 0 0', 'v 10 10 0', 'v 0 10 0',
    'v 0 0 10', 'v 10 0 10', 'v 10 10 10', 'v 0 10 10',
    'vn 0 0 1',
    'f 1//1 4//1 3//1 2//1',
    'f 5/1/1 6/1/1 7/1/1 8/1/1',
    'f 1 2 6 5',
    'f 2 3 7 6',
    'f 3 4 8 7',
    'f 4 1 5 8',
  ].join('\r\n');

  it('fan-triangulates polygons and ignores texture/normal refs', () => {
    const mesh = parseObj(toArrayBuffer(new TextEncoder().encode(quadCube)));
    expect(mesh.triangleCount).toBe(12);
    const analysis = analyzeMesh(mesh);
    expect(analysis.volumeMm3).toBeCloseTo(1000, 6);
    expect(analysis.openMeshSuspected).toBe(false);
  });

  it('resolves negative indices', () => {
    const text = 'v 0 0 0\nv 1 0 0\nv 0 1 0\nf -3 -2 -1\n';
    const mesh = parseObj(toArrayBuffer(new TextEncoder().encode(text)));
    expect(Array.from(mesh.positions)).toEqual([0, 0, 0, 1, 0, 0, 0, 1, 0]);
  });

  it('rejects out-of-range indices and files without faces', () => {
    expect(() => parseObj(toArrayBuffer(new TextEncoder().encode('v 0 0 0\nf 1 2 3\n')))).toThrow(
      GeometryParseError,
    );
    expect(() => parseObj(toArrayBuffer(new TextEncoder().encode('v 0 0 0\n')))).toThrow(GeometryParseError);
  });
});
