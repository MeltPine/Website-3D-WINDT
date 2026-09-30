import { evaluatePrintCheck } from '../printcheck/evaluate';
import { toPrintCheckMaterial } from '../printcheck/material';
import { buildPrintCheckSummary, type PrintCheckSummaryInput } from '../printcheck/summary';
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
  /** Compact printability findings per file (empty without analysed files). */
  printCheckSummary: string;
  /** Request intent chosen in the printability report, as lead field value. */
  printCheckRequest: string;
}

const INTENT_LABEL = {
  'technische-pruefung': 'Kostenlose technische Prüfung angefordert',
  nachkonstruktion: 'Nachkonstruktion/Optimierung angefragt',
} as const;

function printCheckInputs(session: QuoteSessionState): PrintCheckSummaryInput[] {
  const material = toPrintCheckMaterial(findMaterial(MATERIAL_CATALOG, session.selection.materialId));
  return session.entries
    .filter((entry) => entry.format !== null)
    .map((entry) => {
      const check = entry.printCheck;
      const report = check.geometry ? evaluatePrintCheck(check.geometry, material) : null;
      const missingReason =
        check.status === 'queued' || check.status === 'running'
          ? 'Prüfung lief beim Absenden noch'
          : (check.note ?? 'keine Prüfung');
      return {
        fileName: entry.file.name,
        sha256: entry.sha256,
        report,
        missingReason: report ? null : missingReason,
      };
    });
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
    printCheckSummary: buildPrintCheckSummary(printCheckInputs(session)),
    printCheckRequest: session.requestIntent ? INTENT_LABEL[session.requestIntent] : '',
  };
}
