import { describe, expect, it } from 'vitest';
import { COMPARE_FIELDS, compareRows, datasheetValuesFor, filterMaterials, traitsFor } from '../src/lib/quote/materialCompare';
import { MATERIAL_CATALOG, findMaterial } from '../src/lib/quote/materials';

const byId = (id: string) => findMaterial(MATERIAL_CATALOG, id);

describe('material comparison', () => {
  it('keeps Izod and Charpy (and strength vs yield) in separate rows', () => {
    const labels = COMPARE_FIELDS.map((field) => field.label);
    expect(labels).toContain('Charpy-Kerbschlagzähigkeit');
    expect(labels).toContain('Izod-Kerbschlagzähigkeit');
    const rows = compareRows([byId('spectrum_abs_gp450'), byId('spectrum_hips_x')]);
    const izod = rows.find((row) => row.field === 'impact_izod_notched');
    const charpy = rows.find((row) => row.field === 'impact_charpy_notched');
    // ABS GP450 was relabelled Izod by the datasheet review; HIPS-X has Charpy
    expect(izod?.cells[0]?.display).toBeTruthy();
    expect(izod?.cells[1]).toBeNull();
    expect(charpy?.cells[0]).toBeNull();
  });

  it('never estimates: price groups have no datasheet values, empty rows are dropped', () => {
    expect(datasheetValuesFor(byId('group-petg'))).toEqual({});
    const rows = compareRows([byId('group-petg'), byId('group-pc')]);
    expect(rows).toEqual([]);
    for (const row of compareRows([byId('spectrum_pla_premium'), byId('group-petg')])) {
      expect(row.cells[1]).toBeNull();
      expect(row.cells[0]).not.toBeNull();
    }
  });

  it('filters by chamber, UV and fibre from the explicit trait tables', () => {
    const chamber = filterMaterials(MATERIAL_CATALOG, { query: '', chamber: true, uv: false, fibre: false });
    expect(chamber.every((material) => traitsFor(material)?.chamber)).toBe(true);
    expect(chamber.some((material) => material.polymer === 'PLA')).toBe(false);
    const uv = filterMaterials(MATERIAL_CATALOG, { query: '', chamber: false, uv: true, fibre: false });
    expect(uv.map((material) => material.polymer)).toEqual(uv.map(() => 'ASA'));
    const fibre = filterMaterials(MATERIAL_CATALOG, { query: 'cf', chamber: false, uv: false, fibre: true });
    expect(fibre.length).toBeGreaterThan(0);
    expect(fibre.every((material) => traitsFor(material)?.fibre)).toBe(true);
  });
});
