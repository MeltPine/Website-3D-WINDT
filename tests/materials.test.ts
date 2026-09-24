import { describe, expect, it } from 'vitest';
import vendored from '../src/data/fdm-inspect-materials.json';
import {
  MATERIAL_CATALOG,
  MaterialCatalogError,
  POLYMER_PRICE_GROUP,
  PRICE_GROUPS,
  buildMaterialCatalog,
  findMaterial,
  type MaterialDatabase,
} from '../src/lib/quote/materials';
import { INITIAL_QUOTE_SELECTION } from '../src/lib/quote/pricingConfig';

const database = vendored as unknown as MaterialDatabase;

function syntheticDb(overrides: Partial<MaterialDatabase['materials'][number]>): MaterialDatabase {
  return {
    schema_version: '1.0',
    materials: [
      {
        id: 'x',
        manufacturer: 'Hersteller',
        product: 'Produkt',
        polymer: 'PLA',
        source: { url: 'https://example.com/tds.pdf', origin: 'official' },
        properties: {},
        flags: null,
        ...overrides,
      },
    ],
  };
}

const property = (value: number | null, unit: string, standard: string | null = null, suspect = false) => ({
  value,
  min: null,
  max: null,
  unit,
  standard,
  ...(suspect ? { suspect } : {}),
});

describe('FDM-INSPECT material database adapter', () => {
  it('prices every vendored product via an explicit polymer mapping', () => {
    const { catalog, excluded } = buildMaterialCatalog(database, PRICE_GROUPS, POLYMER_PRICE_GROUP);
    expect(excluded).toEqual([]);
    const datasheetEntries = catalog.filter((entry) => entry.origin === 'datasheet');
    expect(datasheetEntries).toHaveLength(database.materials.length);
  });

  it('uses datasheet density and never estimates missing values', () => {
    const pla = findMaterial(MATERIAL_CATALOG, 'spectrum_pla_premium');
    expect(pla.densityGPerCm3).toBe(1.24);
    expect(pla.densitySource).toBe('datasheet');
    expect(pla.pricePerKgEur).toBe(39);

    // Ultrafuse TPU 95A: datasheet has no density -> labelled group fallback
    const tpu = findMaterial(MATERIAL_CATALOG, 'basf_tpu95a');
    expect(tpu.densitySource).toBe('price-group');
    expect(tpu.densityGPerCm3).toBe(PRICE_GROUPS.find((group) => group.id === 'tpu')?.densityGPerCm3);
  });

  it('maps non-identical polymers to price tiers explicitly', () => {
    expect(findMaterial(MATERIAL_CATALOG, 'spectrum_pa6_lowwarp_cf15').priceGroupId).toBe('petcf');
    expect(findMaterial(MATERIAL_CATALOG, 'spectrum_pctg').priceGroupId).toBe('petg');
  });

  it('adds labelled price-group entries only for polymers the database does not cover', () => {
    const generic = MATERIAL_CATALOG.filter((entry) => entry.origin === 'price-group').map((entry) => entry.id);
    expect(generic).toEqual(['group-petg', 'group-pc', 'group-petcf']);
    expect(() => findMaterial(MATERIAL_CATALOG, INITIAL_QUOTE_SELECTION.materialId)).not.toThrow();
  });

  it('marks retailer-hosted datasheets', () => {
    expect(findMaterial(MATERIAL_CATALOG, 'extrudr_pla_nx2').datasheetIsMirror).toBe(true);
    expect(findMaterial(MATERIAL_CATALOG, 'spectrum_asa_275').datasheetIsMirror).toBe(false);
  });

  it('excludes polymers without a price group instead of guessing', () => {
    const { catalog, excluded } = buildMaterialCatalog(
      syntheticDb({ polymer: 'PEEK' }),
      PRICE_GROUPS,
      POLYMER_PRICE_GROUP,
    );
    expect(excluded).toEqual([{ id: 'x', reason: 'no price group for polymer "PEEK"' }]);
    expect(catalog.some((entry) => entry.id === 'x')).toBe(false);
  });

  it('ignores suspect or flagged values for density and key facts', () => {
    const { catalog } = buildMaterialCatalog(
      syntheticDb({
        properties: {
          density: property(9.9, 'g/cm3', 'D 792', true),
          tensile_strength: property(999, 'MPa', 'ISO 527'),
          hdt_a: property(55, 'degC', 'ISO 75'),
        },
        flags: [{ field: 'tensile_strength' }],
      }),
      PRICE_GROUPS,
      POLYMER_PRICE_GROUP,
    );
    const entry = findMaterial(catalog, 'x');
    expect(entry.densitySource).toBe('price-group');
    expect(entry.keyFacts).toEqual(['Wärmeformbeständigkeit HDT/A 55 °C (ISO 75)']);
  });

  it('rejects unsupported schema versions', () => {
    expect(() =>
      buildMaterialCatalog({ ...syntheticDb({}), schema_version: '2.0' }, PRICE_GROUPS, POLYMER_PRICE_GROUP),
    ).toThrow(MaterialCatalogError);
  });
});
