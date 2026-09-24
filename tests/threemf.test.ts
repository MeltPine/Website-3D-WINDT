import { describe, expect, it } from 'vitest';
import { analyzeMesh } from '../src/lib/geometry/analyze';
import { composeTransform, parse3mf, parseTransform } from '../src/lib/geometry/threemf';
import { GeometryParseError } from '../src/lib/geometry/types';
import { boxModelXml, buildZip } from './helpers/meshes';

const CORE_NS = 'http://schemas.microsoft.com/3dmanufacturing/core/2015/02';
const PROD_NS = 'http://schemas.microsoft.com/3dmanufacturing/production/2015/06';

function rootModel(body: string, unit = 'millimeter'): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<model unit="${unit}" xml:lang="en-US" xmlns="${CORE_NS}" xmlns:p="${PROD_NS}">${body}</model>`;
}

describe('parse3mf', () => {
  it('reads a plain deflated package with a build item', async () => {
    const xml = rootModel(`<resources>${boxModelXml(10, 20, 30)}</resources><build><item objectid="1"/></build>`);
    const mesh = await parse3mf(buildZip([{ name: '3D/3dmodel.model', content: xml }], true));
    const analysis = analyzeMesh(mesh);
    expect(mesh.triangleCount).toBe(12);
    expect(analysis.volumeMm3).toBeCloseTo(6000, 3);
  });

  it('applies the model unit', async () => {
    const xml = rootModel(`<resources>${boxModelXml(1, 1, 1)}</resources><build><item objectid="1"/></build>`, 'centimeter');
    const mesh = await parse3mf(buildZip([{ name: '3D/3dmodel.model', content: xml }], false));
    expect(analyzeMesh(mesh).bbox.size).toEqual([10, 10, 10]);
  });

  it('applies item transforms (scale + translation)', async () => {
    const xml = rootModel(
      `<resources>${boxModelXml(10, 10, 10)}</resources><build><item objectid="1" transform="2 0 0 0 1 0 0 0 1 100 50 0"/></build>`,
    );
    const analysis = analyzeMesh(await parse3mf(buildZip([{ name: '3D/3dmodel.model', content: xml }], true)));
    expect(analysis.bbox.min).toEqual([100, 50, 0]);
    expect(analysis.bbox.size).toEqual([20, 10, 10]);
    expect(analysis.volumeMm3).toBeCloseTo(2000, 3);
  });

  it('resolves production-extension components in sub-model files (Bambu/Orca layout)', async () => {
    const subModel = rootModel(`<resources>${boxModelXml(10, 10, 10, { id: '7' })}</resources>`);
    const root = rootModel(
      '<resources><object id="2" type="model"><components>' +
        '<p:component p:path="/3D/Objects/object_1.model" objectid="7" transform="1 0 0 0 1 0 0 0 1 0 0 0"/>' +
        '<p:component p:path="/3D/Objects/object_1.model" objectid="7" transform="1 0 0 0 1 0 0 0 1 20 0 0"/>' +
        '</components></object></resources>' +
        '<build><p:item objectid="2" p:path="/3D/3dmodel.model" transform="1 0 0 0 1 0 0 0 1 5 5 0"/></build>',
    );
    const mesh = await parse3mf(
      buildZip(
        [
          { name: '[Content_Types].xml', content: '<Types/>' },
          { name: '3D/3dmodel.model', content: root },
          { name: '3D/Objects/object_1.model', content: subModel },
        ],
        true,
      ),
    );
    const analysis = analyzeMesh(mesh);
    expect(mesh.triangleCount).toBe(24);
    expect(analysis.volumeMm3).toBeCloseTo(2000, 3);
    expect(analysis.bbox.min).toEqual([5, 5, 0]);
    expect(analysis.bbox.size).toEqual([30, 10, 10]);
  });

  it('falls back to all mesh objects when the build section is missing', async () => {
    const xml = rootModel(`<resources>${boxModelXml(10, 10, 10)}</resources>`);
    const mesh = await parse3mf(buildZip([{ name: '3D/3dmodel.model', content: xml }], false));
    expect(mesh.triangleCount).toBe(12);
  });

  it('rejects dangling object references and non-zip input', async () => {
    const xml = rootModel(`<resources>${boxModelXml(10, 10, 10)}</resources><build><item objectid="99"/></build>`);
    await expect(parse3mf(buildZip([{ name: '3D/3dmodel.model', content: xml }], false))).rejects.toThrow(
      GeometryParseError,
    );
    await expect(parse3mf(new TextEncoder().encode('not a zip file at all, just text').buffer as ArrayBuffer)).rejects.toThrow(
      GeometryParseError,
    );
  });

  it('rejects packages without a model part', async () => {
    await expect(parse3mf(buildZip([{ name: 'readme.txt', content: 'x' }], false))).rejects.toThrow(
      GeometryParseError,
    );
  });
});

describe('3MF transforms', () => {
  it('composes inner-then-outer', () => {
    const inner = parseTransform('1 0 0 0 1 0 0 0 1 10 0 0');
    const outer = parseTransform('2 0 0 0 2 0 0 0 2 0 0 5');
    // point (0,0,0): inner -> (10,0,0), outer -> (20,0,5)
    expect(composeTransform(outer, inner)?.slice(9)).toEqual([20, 0, 5]);
  });

  it('rejects malformed matrices', () => {
    expect(() => parseTransform('1 0 0')).toThrow(GeometryParseError);
  });
});
