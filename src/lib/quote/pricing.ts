import { findMaterial, type MaterialCatalog, type MaterialSpec } from './materials';
import type { InfillOption, LeadTimeOption, PricingConfig } from './pricingConfig';

/*
 * Price estimation. The per-part cost model is a direct port of druckwerk
 * `computeQuote` (site/assets/quote.js):
 *
 *   effective volume = shell (area × wall) + infill × (solid − shell)
 *   weight           = effective volume × density
 *   print time       = effective volume / flow + heat-up
 *   unit price       = (material + machine) × lead-time factor × (1 − qty discount)
 *   position total   = unit × qty + setup fee
 *   project total    = max(Σ positions, minimum order)
 *
 * On top of that the website shows a RANGE (config.range) because the result
 * is explicitly a non-binding estimate.
 */

export interface PartGeometry {
  volumeMm3: number;
  surfaceAreaMm2: number;
  bboxSizeMm: readonly [number, number, number];
}

export interface QuoteSelection {
  materialId: string;
  infillId: string;
  leadTimeId: string;
  quantity: number;
}

export interface PartEstimate {
  fitsBuildVolume: boolean;
  weightG: number;
  printHours: number;
  materialCostEur: number;
  machineCostEur: number;
  unitPriceEur: number;
  discount: number;
  positionTotalEur: number;
}

export type ProjectEstimate =
  | {
      status: 'ok';
      material: MaterialSpec;
      infill: InfillOption;
      leadTime: LeadTimeOption;
      quantity: number;
      parts: PartEstimate[];
      pointEstimateEur: number;
      lowEur: number;
      highEur: number;
      minimumOrderApplied: boolean;
    }
  | {
      status: 'oversize';
      /** Indices (into the input array) of parts exceeding the build volume. */
      oversizePartIndices: number[];
    };

export class PricingInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PricingInputError';
  }
}

function findOption<T extends { id: string }>(options: readonly T[], id: string, kind: string): T {
  const option = options.find((entry) => entry.id === id);
  if (!option) {
    throw new PricingInputError(`Unknown ${kind} id: "${id}".`);
  }
  return option;
}

export function fitsBuildVolume(
  sizeMm: readonly [number, number, number],
  buildVolumeMm: readonly [number, number, number],
): boolean {
  // Orientation-independent check: sorted part dims vs sorted machine dims.
  const part = [...sizeMm].sort((a, b) => a - b);
  const machine = [...buildVolumeMm].sort((a, b) => a - b);
  return part.every((dimension, index) => dimension <= machine[index]);
}

export function quantityDiscount(quantity: number, config: PricingConfig): number {
  const tier = config.quantityDiscounts.find((entry) => quantity >= entry.minQuantity);
  return tier ? tier.discount : 0;
}

function validateQuantity(quantity: number, config: PricingConfig): void {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > config.maxQuantity) {
    throw new PricingInputError(`Quantity must be an integer between 1 and ${config.maxQuantity}.`);
  }
}

function validateGeometry(geometry: PartGeometry): void {
  if (!Number.isFinite(geometry.volumeMm3) || geometry.volumeMm3 <= 0) {
    throw new PricingInputError('Part volume must be a positive number.');
  }
  if (!Number.isFinite(geometry.surfaceAreaMm2) || geometry.surfaceAreaMm2 <= 0) {
    throw new PricingInputError('Part surface area must be a positive number.');
  }
  if (!geometry.bboxSizeMm.every((value) => Number.isFinite(value) && value >= 0)) {
    throw new PricingInputError('Part bounding box must contain non-negative numbers.');
  }
}

export function estimatePart(
  geometry: PartGeometry,
  selection: QuoteSelection,
  catalog: MaterialCatalog,
  config: PricingConfig,
): PartEstimate {
  validateGeometry(geometry);
  validateQuantity(selection.quantity, config);
  const material = findMaterial(catalog, selection.materialId);
  const infill = findOption(config.infillOptions, selection.infillId, 'infill');
  const leadTime = findOption(config.leadTimeOptions, selection.leadTimeId, 'lead time');

  const solidMm3 = geometry.volumeMm3;
  const shellMm3 = Math.min(solidMm3, geometry.surfaceAreaMm2 * config.wallThicknessMm);
  const effectiveMm3 = Math.min(solidMm3, shellMm3 + (solidMm3 - shellMm3) * infill.fraction);

  const weightG = (effectiveMm3 / 1000) * material.densityGPerCm3;
  const printHours = effectiveMm3 / config.layerProfile.flowMm3PerSecond / 3600 + config.heatupMinutes / 60;
  const materialCostEur = (weightG / 1000) * material.pricePerKgEur;
  const machineCostEur = printHours * config.machineRateEurPerHour;
  const discount = quantityDiscount(selection.quantity, config);
  const unitPriceEur = (materialCostEur + machineCostEur) * leadTime.factor * (1 - discount);

  return {
    fitsBuildVolume: fitsBuildVolume(geometry.bboxSizeMm, config.buildVolumeMm),
    weightG,
    printHours,
    materialCostEur,
    machineCostEur,
    unitPriceEur,
    discount,
    positionTotalEur: unitPriceEur * selection.quantity + config.setupFeeEur,
  };
}

function floorToStep(value: number, step: number): number {
  return Math.floor(value / step) * step;
}

function ceilToStep(value: number, step: number): number {
  return Math.ceil(value / step) * step;
}

/**
 * Non-binding price range for a request with one or more parts. The same
 * selection (material, infill, lead time, quantity per part) applies to all
 * parts. Parts that exceed the build volume make the estimate unavailable:
 * they need splitting or a manual review.
 */
export function estimateProject(
  parts: readonly PartGeometry[],
  selection: QuoteSelection,
  catalog: MaterialCatalog,
  config: PricingConfig,
): ProjectEstimate {
  if (parts.length === 0) {
    throw new PricingInputError('At least one part is required.');
  }
  const estimates = parts.map((part) => estimatePart(part, selection, catalog, config));
  const oversizePartIndices = estimates
    .map((estimate, index) => (estimate.fitsBuildVolume ? -1 : index))
    .filter((index) => index >= 0);
  if (oversizePartIndices.length > 0) {
    return { status: 'oversize', oversizePartIndices };
  }

  const sum = estimates.reduce((total, estimate) => total + estimate.positionTotalEur, 0);
  const minimumOrderApplied = sum < config.minimumOrderEur;
  const pointEstimateEur = minimumOrderApplied ? config.minimumOrderEur : sum;
  const step = config.range.roundingStepEur;
  const lowEur = Math.max(config.minimumOrderEur, floorToStep(pointEstimateEur * config.range.lowFactor, step));
  const highEur = Math.max(lowEur + step, ceilToStep(pointEstimateEur * config.range.highFactor, step));

  return {
    status: 'ok',
    material: findMaterial(catalog, selection.materialId),
    infill: findOption(config.infillOptions, selection.infillId, 'infill'),
    leadTime: findOption(config.leadTimeOptions, selection.leadTimeId, 'lead time'),
    quantity: selection.quantity,
    parts: estimates,
    pointEstimateEur,
    lowEur,
    highEur,
    minimumOrderApplied,
  };
}

/* ------------------------------------------------------------ breakdown */

/*
 * The same calculation as estimateProject, taken apart into the items the
 * customer sees in the "Rechenweg". No new values: every amount is derived
 * from estimatePart/estimateProject and the lines add up to
 * pointEstimateEur to the cent (see reconcile below).
 */

export type BreakdownKey = 'material' | 'machine' | 'leadTime' | 'discount' | 'setup' | 'minimumOrder';

export interface BreakdownLine {
  key: BreakdownKey;
  /** Amount in euro cents (negative for the quantity discount). */
  amountCents: number;
}

export interface ProjectBreakdown {
  estimate: Extract<ProjectEstimate, { status: 'ok' }>;
  /** In display order; zero lines are kept so the table layout is stable. */
  lines: BreakdownLine[];
  /** Σ lines except the minimum-order top-up, cents. */
  subtotalCents: number;
  /** = round(pointEstimateEur × 100) = Σ lines. */
  totalCents: number;
  /** Total over all parts × quantity. */
  weightG: number;
  /** Machine hours over all parts × quantity (each part incl. heat-up). */
  printHours: number;
  /** Solid volume over all parts (one set), mm³. */
  solidVolumeMm3: number;
  /** Effective (printed) volume over all parts (one set), mm³. */
  effectiveVolumeMm3: number;
  /** Share of the point estimate that is setup + minimum-order top-up (0..1). */
  fixedShare: number;
}

export const BREAKDOWN_ORDER: readonly BreakdownKey[] = ['material', 'machine', 'leadTime', 'discount', 'setup', 'minimumOrder'];

function effectiveVolume(geometry: PartGeometry, fraction: number, config: PricingConfig): number {
  const solid = geometry.volumeMm3;
  const shell = Math.min(solid, geometry.surfaceAreaMm2 * config.wallThicknessMm);
  return Math.min(solid, shell + (solid - shell) * fraction);
}

/**
 * Rounds each raw amount to cents and puts the rounding difference against
 * the target total on the largest line, so the displayed items always add up
 * to the displayed total. The difference is at most half a cent per line.
 */
function reconcile(raw: ReadonlyArray<{ key: BreakdownKey; eur: number }>, totalCents: number): BreakdownLine[] {
  const lines = raw.map((entry) => ({ key: entry.key, amountCents: Math.round(entry.eur * 100) }));
  const diff = totalCents - lines.reduce((sum, line) => sum + line.amountCents, 0);
  if (diff !== 0) {
    let largest = 0;
    lines.forEach((line, index) => {
      if (Math.abs(line.amountCents) > Math.abs(lines[largest].amountCents)) largest = index;
    });
    lines[largest] = { ...lines[largest], amountCents: lines[largest].amountCents + diff };
  }
  return lines;
}

export function breakdownProject(
  parts: readonly PartGeometry[],
  selection: QuoteSelection,
  catalog: MaterialCatalog,
  config: PricingConfig,
): ProjectBreakdown | null {
  const estimate = estimateProject(parts, selection, catalog, config);
  if (estimate.status !== 'ok') return null;
  const q = estimate.quantity;
  const factor = estimate.leadTime.factor;
  let material = 0;
  let machine = 0;
  let leadTime = 0;
  let discount = 0;
  let setup = 0;
  let weightG = 0;
  let printHours = 0;
  estimate.parts.forEach((part) => {
    const base = part.materialCostEur + part.machineCostEur;
    material += part.materialCostEur * q;
    machine += part.machineCostEur * q;
    leadTime += base * (factor - 1) * q;
    discount -= base * factor * part.discount * q;
    setup += config.setupFeeEur;
    weightG += part.weightG * q;
    printHours += part.printHours * q;
  });
  const sum = material + machine + leadTime + discount + setup;
  const topUp = estimate.minimumOrderApplied ? estimate.pointEstimateEur - sum : 0;
  const totalCents = Math.round(estimate.pointEstimateEur * 100);
  const lines = reconcile(
    [
      { key: 'material', eur: material },
      { key: 'machine', eur: machine },
      { key: 'leadTime', eur: leadTime },
      { key: 'discount', eur: discount },
      { key: 'setup', eur: setup },
      { key: 'minimumOrder', eur: topUp },
    ],
    totalCents,
  );
  const topUpCents = lines.find((line) => line.key === 'minimumOrder')?.amountCents ?? 0;
  const setupCents = lines.find((line) => line.key === 'setup')?.amountCents ?? 0;
  return {
    estimate,
    lines,
    subtotalCents: totalCents - topUpCents,
    totalCents,
    weightG,
    printHours,
    solidVolumeMm3: parts.reduce((total, part) => total + part.volumeMm3, 0),
    effectiveVolumeMm3: parts.reduce(
      (total, part) => total + effectiveVolume(part, estimate.infill.fraction, config),
      0,
    ),
    fixedShare: totalCents > 0 ? (setupCents + topUpCents) / totalCents : 0,
  };
}

/* ------------------------------------------------------- quantity curve */

export interface QuantityPoint {
  quantity: number;
  /** Project total (all parts × quantity), EUR. */
  totalEur: number;
  lowEur: number;
  highEur: number;
  /** Per set (one of each part), EUR. */
  perUnitEur: number;
  perUnitLowEur: number;
  perUnitHighEur: number;
  discount: number;
  minimumOrderApplied: boolean;
}

/** Quantities shown in the curve (plus the currently selected one). */
export const CURVE_QUANTITIES: readonly number[] = [1, 2, 5, 10, 25, 50, 100];

/**
 * Point estimate and range per quantity, computed with estimateProject for
 * each quantity (so steps at the discount tiers are real, not smoothed).
 * Returns null when a part exceeds the build volume.
 */
export function quantityCurve(
  parts: readonly PartGeometry[],
  selection: QuoteSelection,
  catalog: MaterialCatalog,
  config: PricingConfig,
  quantities: readonly number[] = CURVE_QUANTITIES,
): QuantityPoint[] | null {
  const wanted = [...new Set([...quantities, selection.quantity])]
    .filter((quantity) => Number.isInteger(quantity) && quantity >= 1 && quantity <= config.maxQuantity)
    .sort((a, b) => a - b);
  const points: QuantityPoint[] = [];
  for (const quantity of wanted) {
    const estimate = estimateProject(parts, { ...selection, quantity }, catalog, config);
    if (estimate.status !== 'ok') return null;
    points.push({
      quantity,
      totalEur: estimate.pointEstimateEur,
      lowEur: estimate.lowEur,
      highEur: estimate.highEur,
      perUnitEur: estimate.pointEstimateEur / quantity,
      perUnitLowEur: estimate.lowEur / quantity,
      perUnitHighEur: estimate.highEur / quantity,
      discount: quantityDiscount(quantity, config),
      minimumOrderApplied: estimate.minimumOrderApplied,
    });
  }
  return points;
}

/**
 * Largest quantity for which the minimum order value still sets the price
 * (0 if it never applies). Searched upwards; the total grows with the
 * quantity, so the first quantity above the minimum ends the search.
 */
export function minimumOrderQuantityLimit(
  parts: readonly PartGeometry[],
  selection: QuoteSelection,
  catalog: MaterialCatalog,
  config: PricingConfig,
): number {
  let limit = 0;
  for (let quantity = 1; quantity <= config.maxQuantity; quantity += 1) {
    const estimate = estimateProject(parts, { ...selection, quantity }, catalog, config);
    if (estimate.status !== 'ok' || !estimate.minimumOrderApplied) break;
    limit = quantity;
  }
  return limit;
}
