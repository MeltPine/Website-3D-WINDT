import { describe, expect, it } from 'vitest';
import {
  MATERIAL_CATALOG,
  MaterialCatalogError,
  validateMaterialCatalog,
  type MaterialCatalog,
} from '../src/lib/quote/materials';
import {
  PricingInputError,
  estimatePart,
  estimateProject,
  fitsBuildVolume,
  quantityDiscount,
  type PartGeometry,
} from '../src/lib/quote/pricing';
import { PRICING_CONFIG } from '../src/lib/quote/pricingConfig';

// 20 mm cube: V = 8000 mm³, A = 2400 mm²
const cube20: PartGeometry = { volumeMm3: 8000, surfaceAreaMm2: 2400, bboxSizeMm: [20, 20, 20] };
const base = { materialId: 'group-petg', infillId: 'i25', leadTimeId: 'standard', quantity: 1 };

describe('estimatePart (druckwerk cost model)', () => {
  it('matches the hand-calculated reference', () => {
    const part = estimatePart(cube20, base, MATERIAL_CATALOG, PRICING_CONFIG);
    // shell = 2400 × 1.2 = 2880; effective = 2880 + 5120 × 0.25 = 4160 mm³
    expect(part.weightG).toBeCloseTo(4.16 * 1.27, 9);
    expect(part.printHours).toBeCloseTo(4160 / 10 / 3600 + 0.2, 9);
    expect(part.materialCostEur).toBeCloseTo((4.16 * 1.27 * 42) / 1000, 9);
    expect(part.machineCostEur).toBeCloseTo((4160 / 10 / 3600 + 0.2) * 7.5, 9);
    expect(part.unitPriceEur).toBeCloseTo(part.materialCostEur + part.machineCostEur, 9);
    expect(part.positionTotalEur).toBeCloseTo(part.unitPriceEur + 15, 9);
    expect(part.fitsBuildVolume).toBe(true);
  });

  it('caps the effective volume at the solid volume for thin parts', () => {
    const plate: PartGeometry = { volumeMm3: 100, surfaceAreaMm2: 220, bboxSizeMm: [10, 10, 1] };
    const full = estimatePart(plate, { ...base, infillId: 'i100' }, MATERIAL_CATALOG, PRICING_CONFIG);
    const sparse = estimatePart(plate, base, MATERIAL_CATALOG, PRICING_CONFIG);
    expect(sparse.weightG).toBeCloseTo(full.weightG, 9);
  });

  it('applies lead-time factor and quantity discount to the unit price only', () => {
    const standard = estimatePart(cube20, { ...base, quantity: 50 }, MATERIAL_CATALOG, PRICING_CONFIG);
    const express = estimatePart(
      cube20,
      { ...base, quantity: 50, leadTimeId: 'express' },
      MATERIAL_CATALOG,
      PRICING_CONFIG,
    );
    expect(standard.discount).toBe(0.25);
    expect(express.unitPriceEur).toBeCloseTo(standard.unitPriceEur * 1.35, 9);
    expect(standard.positionTotalEur).toBeCloseTo(standard.unitPriceEur * 50 + 15, 9);
  });

  it('rejects invalid input explicitly', () => {
    expect(() => estimatePart(cube20, { ...base, quantity: 0 }, MATERIAL_CATALOG, PRICING_CONFIG)).toThrow(
      PricingInputError,
    );
    expect(() => estimatePart(cube20, { ...base, quantity: 1.5 }, MATERIAL_CATALOG, PRICING_CONFIG)).toThrow(
      PricingInputError,
    );
    expect(() => estimatePart(cube20, { ...base, infillId: 'x' }, MATERIAL_CATALOG, PRICING_CONFIG)).toThrow(
      PricingInputError,
    );
    expect(() => estimatePart(cube20, { ...base, materialId: 'unobtainium' }, MATERIAL_CATALOG, PRICING_CONFIG)).toThrow(
      MaterialCatalogError,
    );
    expect(() =>
      estimatePart({ ...cube20, volumeMm3: 0 }, base, MATERIAL_CATALOG, PRICING_CONFIG),
    ).toThrow(PricingInputError);
  });
});

describe('estimateProject (price range)', () => {
  it('applies the minimum order value to small jobs', () => {
    const estimate = estimateProject([cube20], base, MATERIAL_CATALOG, PRICING_CONFIG);
    expect(estimate.status).toBe('ok');
    if (estimate.status !== 'ok') return;
    expect(estimate.minimumOrderApplied).toBe(true);
    expect(estimate.pointEstimateEur).toBe(39);
    expect(estimate.lowEur).toBe(39);
    expect(estimate.highEur).toBe(55); // ceil(39 × 1.3 = 50.7) to 5 €
  });

  it('rounds the range outward to 5 € steps', () => {
    const estimate = estimateProject([cube20], { ...base, quantity: 50 }, MATERIAL_CATALOG, PRICING_CONFIG);
    if (estimate.status !== 'ok') throw new Error('expected ok');
    expect(estimate.pointEstimateEur).toBeCloseTo(112.07, 1);
    expect(estimate.lowEur).toBe(95);
    expect(estimate.highEur).toBe(150);
    expect(estimate.lowEur).toBeLessThanOrEqual(estimate.pointEstimateEur);
    expect(estimate.highEur).toBeGreaterThanOrEqual(estimate.pointEstimateEur);
  });

  it('sums positions and charges the setup fee per part', () => {
    const single = estimateProject([cube20], { ...base, quantity: 20 }, MATERIAL_CATALOG, PRICING_CONFIG);
    const double = estimateProject([cube20, cube20], { ...base, quantity: 20 }, MATERIAL_CATALOG, PRICING_CONFIG);
    if (single.status !== 'ok' || double.status !== 'ok') throw new Error('expected ok');
    expect(double.pointEstimateEur).toBeCloseTo(single.pointEstimateEur * 2, 9);
  });

  it('refuses a price for parts exceeding the build volume', () => {
    const big: PartGeometry = { volumeMm3: 1e6, surfaceAreaMm2: 1e5, bboxSizeMm: [400, 50, 50] };
    const estimate = estimateProject([cube20, big], base, MATERIAL_CATALOG, PRICING_CONFIG);
    expect(estimate).toEqual({ status: 'oversize', oversizePartIndices: [1] });
  });

  it('requires at least one part', () => {
    expect(() => estimateProject([], base, MATERIAL_CATALOG, PRICING_CONFIG)).toThrow(PricingInputError);
  });
});

describe('helpers', () => {
  it('checks build volume orientation-independently', () => {
    expect(fitsBuildVolume([300, 340, 20], [350, 350, 300])).toBe(true);
    expect(fitsBuildVolume([320, 320, 320], [350, 350, 300])).toBe(false);
  });

  it('selects the highest applicable discount tier', () => {
    expect(quantityDiscount(1, PRICING_CONFIG)).toBe(0);
    expect(quantityDiscount(5, PRICING_CONFIG)).toBe(0.05);
    expect(quantityDiscount(99, PRICING_CONFIG)).toBe(0.25);
    expect(quantityDiscount(1000, PRICING_CONFIG)).toBe(0.3);
  });
});

describe('material catalog (pluggable)', () => {
  it('accepts the default catalog', () => {
    expect(validateMaterialCatalog(MATERIAL_CATALOG)).toBe(MATERIAL_CATALOG);
  });

  it('prices with an injected catalog', () => {
    const custom: MaterialCatalog = [
      {
        id: 'pa12cf',
        name: 'PA12-CF',
        origin: 'price-group',
        polymer: 'PA12-CF',
        manufacturer: null,
        category: 'Test',
        densityGPerCm3: 1.0,
        densitySource: 'price-group',
        pricePerKgEur: 1000,
        priceGroupId: 'test',
        priceGroupName: 'Test',
        datasheetUrl: null,
        datasheetIsMirror: false,
        keyFacts: [],
        description: null,
      },
    ];
    const part = estimatePart(cube20, { ...base, materialId: 'pa12cf' }, validateMaterialCatalog(custom), PRICING_CONFIG);
    expect(part.materialCostEur).toBeCloseTo(4.16, 9);
  });

  it('rejects invalid catalogs', () => {
    const valid = MATERIAL_CATALOG[0];
    expect(() => validateMaterialCatalog([])).toThrow(MaterialCatalogError);
    expect(() => validateMaterialCatalog([valid, valid])).toThrow(MaterialCatalogError);
    expect(() => validateMaterialCatalog([{ ...valid, densityGPerCm3: 0 }])).toThrow(MaterialCatalogError);
    expect(() => validateMaterialCatalog([{ ...valid, pricePerKgEur: Number.NaN }])).toThrow(MaterialCatalogError);
  });
});

describe('summary formatting', async () => {
  const { formatMegabytes, buildPriceRangeSummary } = await import('../src/lib/quote/summary');
  it('formats small files in KB and large files in MB', () => {
    expect(formatMegabytes(684)).toBe('1 KB');
    expect(formatMegabytes(20 * 1024)).toBe('20 KB');
    expect(formatMegabytes(19.2 * 1024 * 1024)).toBe('19,2 MB');
  });
  it('labels the range as non-binding', () => {
    const estimate = estimateProject([cube20], base, MATERIAL_CATALOG, PRICING_CONFIG);
    expect(buildPriceRangeSummary(estimate)).toMatch(/^39\s€ – 55\s€ netto .*unverbindlich\)$/);
    expect(buildPriceRangeSummary(null)).toBe('keine Richtpreis-Berechnung');
  });
});
