import { describe, expect, it } from 'vitest';
import { MATERIAL_CATALOG } from '../src/lib/quote/materials';
import {
  BREAKDOWN_ORDER,
  CURVE_QUANTITIES,
  breakdownProject,
  estimateProject,
  minimumOrderQuantityLimit,
  quantityCurve,
  type PartGeometry,
  type QuoteSelection,
} from '../src/lib/quote/pricing';
import { PRICING_CONFIG } from '../src/lib/quote/pricingConfig';
import { OWNER_DECISIONS } from '../src/lib/quote/ownerDecisions';
import { quoteReferenceId } from '../src/lib/quote/quoteId';

const cube20: PartGeometry = { volumeMm3: 8000, surfaceAreaMm2: 2400, bboxSizeMm: [20, 20, 20] };
// reference part of the spec: 150 × 86.7 × 26 mm, 87 cm³, surface assumed 250 cm²
const reference: PartGeometry = { volumeMm3: 87_000, surfaceAreaMm2: 25_000, bboxSizeMm: [150, 86.7, 26] };
const big: PartGeometry = { volumeMm3: 900_000, surfaceAreaMm2: 90_000, bboxSizeMm: [200, 150, 100] };
const base: QuoteSelection = { materialId: 'group-petg', infillId: 'i25', leadTimeId: 'standard', quantity: 1 };

const sumCents = (lines: { amountCents: number }[]) => lines.reduce((sum, line) => sum + line.amountCents, 0);

describe('breakdownProject', () => {
  const cases: Array<[string, PartGeometry[], Partial<QuoteSelection>]> = [
    ['minimum order dominates', [cube20], {}],
    ['reference part', [reference], {}],
    ['express, quantity discount', [big], { leadTimeId: 'express', quantity: 12 }],
    ['eco, several parts', [big, reference, cube20], { leadTimeId: 'eco', quantity: 60, infillId: 'i75' }],
    ['large quantity', [reference], { quantity: 250, materialId: 'basf_pa' }],
  ];

  it.each(cases)('adds up to the point estimate to the cent: %s', (_name, parts, patch) => {
    const selection = { ...base, ...patch };
    const breakdown = breakdownProject(parts, selection, MATERIAL_CATALOG, PRICING_CONFIG);
    const estimate = estimateProject(parts, selection, MATERIAL_CATALOG, PRICING_CONFIG);
    expect(breakdown).not.toBeNull();
    if (!breakdown || estimate.status !== 'ok') return;
    expect(breakdown.totalCents).toBe(Math.round(estimate.pointEstimateEur * 100));
    expect(sumCents(breakdown.lines)).toBe(breakdown.totalCents);
    expect(breakdown.lines.map((line) => line.key)).toEqual(BREAKDOWN_ORDER);
  });

  it('keeps every line within a cent of its exact value', () => {
    const selection = { ...base, leadTimeId: 'express', quantity: 12 };
    const breakdown = breakdownProject([big], selection, MATERIAL_CATALOG, PRICING_CONFIG);
    const estimate = estimateProject([big], selection, MATERIAL_CATALOG, PRICING_CONFIG);
    if (!breakdown || estimate.status !== 'ok') throw new Error('expected ok');
    const part = estimate.parts[0];
    const q = selection.quantity;
    const exact: Record<string, number> = {
      material: part.materialCostEur * q,
      machine: part.machineCostEur * q,
      leadTime: (part.materialCostEur + part.machineCostEur) * 0.35 * q,
      discount: -(part.materialCostEur + part.machineCostEur) * 1.35 * part.discount * q,
      setup: 15,
      minimumOrder: 0,
    };
    for (const line of breakdown.lines) {
      expect(Math.abs(line.amountCents - exact[line.key] * 100)).toBeLessThanOrEqual(1.5);
    }
    expect(part.discount).toBe(0.1);
  });

  it('shows the minimum-order top-up honestly for small parts', () => {
    const breakdown = breakdownProject([cube20], base, MATERIAL_CATALOG, PRICING_CONFIG);
    if (!breakdown) throw new Error('expected ok');
    const topUp = breakdown.lines.find((line) => line.key === 'minimumOrder');
    expect(breakdown.totalCents).toBe(PRICING_CONFIG.minimumOrderEur * 100);
    expect(topUp?.amountCents).toBeGreaterThan(0);
    expect(breakdown.subtotalCents + (topUp?.amountCents ?? 0)).toBe(3900);
    // setup + top-up dominate the price of a tiny part
    expect(breakdown.fixedShare).toBeGreaterThan(0.8);
  });

  it('reports weight, hours and volumes of the whole order', () => {
    const selection = { ...base, quantity: 3 };
    const breakdown = breakdownProject([cube20, reference], selection, MATERIAL_CATALOG, PRICING_CONFIG);
    const estimate = estimateProject([cube20, reference], selection, MATERIAL_CATALOG, PRICING_CONFIG);
    if (!breakdown || estimate.status !== 'ok') throw new Error('expected ok');
    expect(breakdown.weightG).toBeCloseTo((estimate.parts[0].weightG + estimate.parts[1].weightG) * 3, 9);
    expect(breakdown.printHours).toBeCloseTo((estimate.parts[0].printHours + estimate.parts[1].printHours) * 3, 9);
    expect(breakdown.solidVolumeMm3).toBe(95_000);
    // cube: 2880 + 5120 × 0.25
    expect(breakdown.effectiveVolumeMm3).toBeGreaterThan(4160);
  });

  it('returns null when a part does not fit the build volume', () => {
    const huge: PartGeometry = { volumeMm3: 1e6, surfaceAreaMm2: 1e5, bboxSizeMm: [400, 100, 100] };
    expect(breakdownProject([huge], base, MATERIAL_CATALOG, PRICING_CONFIG)).toBeNull();
    expect(quantityCurve([huge], base, MATERIAL_CATALOG, PRICING_CONFIG)).toBeNull();
  });
});

describe('quantityCurve', () => {
  it('equals estimateProject for every quantity and includes the selected one', () => {
    const selection = { ...base, quantity: 7 };
    const curve = quantityCurve([reference], selection, MATERIAL_CATALOG, PRICING_CONFIG);
    if (!curve) throw new Error('expected curve');
    expect(curve.map((point) => point.quantity)).toEqual([1, 2, 5, 7, 10, 25, 50, 100]);
    for (const point of curve) {
      const estimate = estimateProject([reference], { ...selection, quantity: point.quantity }, MATERIAL_CATALOG, PRICING_CONFIG);
      if (estimate.status !== 'ok') throw new Error('expected ok');
      expect(point.totalEur).toBe(estimate.pointEstimateEur);
      expect(point.lowEur).toBe(estimate.lowEur);
      expect(point.highEur).toBe(estimate.highEur);
      expect(point.perUnitEur).toBeCloseTo(estimate.pointEstimateEur / point.quantity, 12);
      expect(point.minimumOrderApplied).toBe(estimate.minimumOrderApplied);
    }
  });

  it('has real steps at the discount tiers and falling unit prices', () => {
    const curve = quantityCurve([big], base, MATERIAL_CATALOG, PRICING_CONFIG, CURVE_QUANTITIES);
    if (!curve) throw new Error('expected curve');
    expect(curve.map((point) => point.discount)).toEqual([0, 0, 0.05, 0.1, 0.18, 0.25, 0.3]);
    for (let i = 1; i < curve.length; i += 1) {
      expect(curve[i].perUnitEur).toBeLessThan(curve[i - 1].perUnitEur);
    }
  });

  it('drops quantities outside 1..maxQuantity', () => {
    const curve = quantityCurve([cube20], base, MATERIAL_CATALOG, PRICING_CONFIG, [0, 1, 20_000]);
    expect(curve?.map((point) => point.quantity)).toEqual([1]);
  });

  it('finds the quantity up to which the minimum order sets the price', () => {
    const limit = minimumOrderQuantityLimit([cube20], base, MATERIAL_CATALOG, PRICING_CONFIG);
    expect(limit).toBeGreaterThan(1);
    const at = estimateProject([cube20], { ...base, quantity: limit }, MATERIAL_CATALOG, PRICING_CONFIG);
    const after = estimateProject([cube20], { ...base, quantity: limit + 1 }, MATERIAL_CATALOG, PRICING_CONFIG);
    expect(at.status === 'ok' && at.minimumOrderApplied).toBe(true);
    expect(after.status === 'ok' && after.minimumOrderApplied).toBe(false);
    expect(minimumOrderQuantityLimit([big], base, MATERIAL_CATALOG, PRICING_CONFIG)).toBe(0);
  });
});

describe('configuration used by the next-gen calculator', () => {
  it('keeps workday numbers and labels of the lead times consistent', () => {
    for (const option of PRICING_CONFIG.leadTimeOptions) {
      expect(option.days).toBe(`${option.minWorkdays}–${option.maxWorkdays} Werktage`);
    }
  });

  it('uses the conservative owner defaults', () => {
    expect(OWNER_DECISIONS.showMachineRate).toBe(false);
    expect(OWNER_DECISIONS.filamentColours).toBeNull();
    expect(OWNER_DECISIONS.narrowRangeWithPrintCheck).toBe(false);
    expect(PRICING_CONFIG.range).toEqual({ lowFactor: 0.85, highFactor: 1.3, roundingStepEur: 5 });
  });
});

describe('quoteReferenceId', () => {
  const hash = 'a'.repeat(64);
  const other = 'b'.repeat(64);
  it('is stable, order-independent and parameter-sensitive', () => {
    const id = quoteReferenceId({ fileHashes: [hash, other], selection: base, dateIso: '2026-09-30' });
    expect(id).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}$/);
    expect(quoteReferenceId({ fileHashes: [other, hash], selection: base, dateIso: '2026-09-30' })).toBe(id);
    expect(quoteReferenceId({ fileHashes: [hash, other], selection: { ...base, quantity: 2 }, dateIso: '2026-09-30' })).not.toBe(id);
    expect(quoteReferenceId({ fileHashes: [hash, other], selection: base, dateIso: '2026-10-01' })).not.toBe(id);
  });

  it('rejects inputs without a file hash or with a malformed date', () => {
    expect(() => quoteReferenceId({ fileHashes: [], selection: base, dateIso: '2026-09-30' })).toThrow();
    expect(() => quoteReferenceId({ fileHashes: ['xyz'], selection: base, dateIso: '2026-09-30' })).toThrow();
    expect(() => quoteReferenceId({ fileHashes: [hash], selection: base, dateIso: '30.09.2026' })).toThrow();
  });
});
