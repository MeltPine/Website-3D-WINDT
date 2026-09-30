/*
 * Business parameters of the price estimator.
 *
 * Source: druckwerk price calculator, SSoT repo
 * `Extrutex/3DW-3dprint-preisrechner-`, `assets/quote.js` (PRICING, QUALITIES,
 * INFILLS, SPEEDS, BUILD_VOLUME; verified identical on 2026-09-24). Keep both
 * in sync until one of them is declared the single source of truth.
 *
 * `range` is new here: the website shows a non-binding price RANGE instead of
 * a point price, because orientation, support structures and post-processing
 * are unknown before the technical review.
 */

export interface InfillOption {
  id: string;
  label: string;
  fraction: number;
}

export interface LeadTimeOption {
  id: string;
  label: string;
  days: string;
  /** Workdays from the approval of the binding offer to shipping (same numbers as `days`, tested). */
  minWorkdays: number;
  maxWorkdays: number;
  factor: number;
}

export interface QuantityDiscount {
  minQuantity: number;
  discount: number;
}

export interface PricingConfig {
  /** EUR per position: technical review, preparation, QA. */
  setupFeeEur: number;
  /** EUR per machine hour. */
  machineRateEurPerHour: number;
  /** Fixed machine overhead per print job (heat-up, first layer). */
  heatupMinutes: number;
  /** Assumed perimeter shell thickness for the effective volume, mm. */
  wallThicknessMm: number;
  /** Minimum order value (net EUR) per request. */
  minimumOrderEur: number;
  /** Layer profile used for the time estimate (fixed, explicit). */
  layerProfile: { label: string; layerHeightMm: number; flowMm3PerSecond: number };
  infillOptions: readonly InfillOption[];
  leadTimeOptions: readonly LeadTimeOption[];
  /** Sorted descending by minQuantity. */
  quantityDiscounts: readonly QuantityDiscount[];
  /** Largest build volume in the fleet, mm. */
  buildVolumeMm: readonly [number, number, number];
  range: {
    /** Multiplier for the lower bound of the displayed range. */
    lowFactor: number;
    /** Multiplier for the upper bound (supports, orientation, finishing). */
    highFactor: number;
    /** Displayed bounds are rounded outward to this step, EUR. */
    roundingStepEur: number;
  };
  maxQuantity: number;
}

export const PRICING_CONFIG: PricingConfig = {
  setupFeeEur: 15,
  machineRateEurPerHour: 7.5,
  heatupMinutes: 12,
  wallThicknessMm: 1.2,
  minimumOrderEur: 39,
  layerProfile: { label: '0,20 mm Standard', layerHeightMm: 0.2, flowMm3PerSecond: 10 },
  infillOptions: [
    { id: 'i25', label: '25 % – Standard', fraction: 0.25 },
    { id: 'i50', label: '50 % – Verstärkt', fraction: 0.5 },
    { id: 'i75', label: '75 % – Hochfest', fraction: 0.75 },
    { id: 'i100', label: '100 % – Vollmaterial', fraction: 1 },
  ],
  leadTimeOptions: [
    { id: 'eco', label: 'Eco', days: '7–9 Werktage', minWorkdays: 7, maxWorkdays: 9, factor: 0.9 },
    { id: 'standard', label: 'Standard', days: '3–5 Werktage', minWorkdays: 3, maxWorkdays: 5, factor: 1 },
    { id: 'express', label: 'Express', days: '1–2 Werktage', minWorkdays: 1, maxWorkdays: 2, factor: 1.35 },
  ],
  quantityDiscounts: [
    { minQuantity: 100, discount: 0.3 },
    { minQuantity: 50, discount: 0.25 },
    { minQuantity: 25, discount: 0.18 },
    { minQuantity: 10, discount: 0.1 },
    { minQuantity: 5, discount: 0.05 },
  ],
  buildVolumeMm: [350, 350, 300],
  range: {
    lowFactor: 0.85,
    highFactor: 1.3,
    roundingStepEur: 5,
  },
  maxQuantity: 10_000,
};

/** Explicit initial selections of the calculator UI. */
export const INITIAL_QUOTE_SELECTION = {
  materialId: 'group-petg',
  infillId: 'i25',
  leadTimeId: 'standard',
  quantity: 1,
} as const;
