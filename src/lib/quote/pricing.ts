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
