import { MATERIAL_CATALOG, findMaterial } from './materials';
import { PRICING_CONFIG } from './pricingConfig';
import type { QuoteSessionState } from './quoteSession';
import { computeSessionEstimate } from './sessionEstimate';
import { buildModelSummary, buildPriceRangeSummary } from './summary';

/*
 * Values the request form transmits about the calculator session. Loaded
 * lazily by the form (keeps material data and pricing out of the main bundle).
 */

export interface RequestQuoteSummary {
  hasFiles: boolean;
  hasPriceRange: boolean;
  priceRange: string;
  modelSummary: string;
  materialName: string;
  infillLabel: string;
  leadTimeLabel: string;
  quantity: number;
  expressSelected: boolean;
}

export function summarizeQuoteSession(session: QuoteSessionState): RequestQuoteSummary {
  const estimate = computeSessionEstimate(
    session.entries,
    session.selection,
    MATERIAL_CATALOG,
    PRICING_CONFIG,
  ).estimate;
  const infill = PRICING_CONFIG.infillOptions.find((option) => option.id === session.selection.infillId);
  const leadTime = PRICING_CONFIG.leadTimeOptions.find((option) => option.id === session.selection.leadTimeId);
  return {
    hasFiles: session.entries.length > 0,
    hasPriceRange: estimate?.status === 'ok',
    priceRange: buildPriceRangeSummary(estimate),
    modelSummary: buildModelSummary(
      session.entries.map((entry) => ({ name: entry.file.name, format: entry.format, analysis: entry.analysis })),
    ),
    materialName: findMaterial(MATERIAL_CATALOG, session.selection.materialId).name,
    infillLabel: infill?.label ?? '',
    leadTimeLabel: leadTime?.label ?? '',
    quantity: session.selection.quantity,
    expressSelected: session.selection.leadTimeId === 'express',
  };
}
