import { CALCULATOR_MATERIAL_PARAM, CALCULATOR_PATH } from '../werkstoffe/families';
import type { PricingConfig } from './pricingConfig';
import type { QuoteSelection } from './pricing';

/*
 * "Link mit Parametern": material, infill, quantity, lead time and the
 * reference id in the URL - never geometry, never the file name. Parsing is
 * allowlist-based; anything unknown is ignored (the calculator keeps its
 * defaults) and reported, not guessed.
 */

export const SHARE_PARAMS = {
  material: CALCULATOR_MATERIAL_PARAM,
  infill: 'fuellgrad',
  quantity: 'menge',
  leadTime: 'lieferung',
  reference: 'rp',
} as const;

const MATERIAL_ID = /^[a-z0-9_-]{1,64}$/;
const REFERENCE_ID = /^[0-9A-F]{4}-[0-9A-F]{4}$/;

export function buildShareUrl(origin: string, selection: QuoteSelection, reference: string): string {
  const url = new URL(CALCULATOR_PATH, origin);
  url.searchParams.set(SHARE_PARAMS.material, selection.materialId);
  url.searchParams.set(SHARE_PARAMS.infill, selection.infillId);
  url.searchParams.set(SHARE_PARAMS.quantity, String(selection.quantity));
  url.searchParams.set(SHARE_PARAMS.leadTime, selection.leadTimeId);
  if (REFERENCE_ID.test(reference)) url.searchParams.set(SHARE_PARAMS.reference, reference);
  return url.toString();
}

export interface SharedParameters {
  /** Material id to look up in the catalog (validated there). */
  materialId: string | null;
  selection: Partial<Omit<QuoteSelection, 'materialId'>>;
  reference: string | null;
  /** Parameters that were present but not valid. */
  rejected: string[];
}

export function parseShareParams(params: URLSearchParams, config: PricingConfig): SharedParameters {
  const result: SharedParameters = { materialId: null, selection: {}, reference: null, rejected: [] };
  const material = params.get(SHARE_PARAMS.material);
  if (material !== null) {
    if (MATERIAL_ID.test(material)) result.materialId = material;
    else result.rejected.push(SHARE_PARAMS.material);
  }
  const infill = params.get(SHARE_PARAMS.infill);
  if (infill !== null) {
    if (config.infillOptions.some((option) => option.id === infill)) result.selection.infillId = infill;
    else result.rejected.push(SHARE_PARAMS.infill);
  }
  const quantity = params.get(SHARE_PARAMS.quantity);
  if (quantity !== null) {
    const parsed = /^\d{1,6}$/.test(quantity) ? Number(quantity) : Number.NaN;
    if (Number.isInteger(parsed) && parsed >= 1 && parsed <= config.maxQuantity) result.selection.quantity = parsed;
    else result.rejected.push(SHARE_PARAMS.quantity);
  }
  const leadTime = params.get(SHARE_PARAMS.leadTime);
  if (leadTime !== null) {
    if (config.leadTimeOptions.some((option) => option.id === leadTime)) result.selection.leadTimeId = leadTime;
    else result.rejected.push(SHARE_PARAMS.leadTime);
  }
  const reference = params.get(SHARE_PARAMS.reference);
  if (reference !== null) {
    if (REFERENCE_ID.test(reference)) result.reference = reference;
    else result.rejected.push(SHARE_PARAMS.reference);
  }
  return result;
}
