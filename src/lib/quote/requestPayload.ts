import { evaluatePrintCheck } from '../printcheck/evaluate';
import { toPrintCheckMaterial } from '../printcheck/material';
import { POSES } from '../printcheck/pose';
import { buildPrintCheckSummary, type PrintCheckSummaryInput } from '../printcheck/summary';
import { buildBreakdownSummary } from './breakdownDisplay';
import { formatCivilDate, tryShipWindow } from './leadDate';
import { MATERIAL_CATALOG, findMaterial } from './materials';
import { breakdownProject } from './pricing';
import { PRICING_CONFIG } from './pricingConfig';
import { quoteReferenceId } from './quoteId';
import { USE_PURPOSES, type QuoteSessionState } from './quoteSession';
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
  /** "Richtpreis-ID" shown in the calculator (empty without analysed files). */
  quoteReference: string;
  /** Breakdown text as shown in the calculator (empty without price). */
  priceBreakdown: string;
  /** Shipping window as shown (empty without price or outside the calendar). */
  shipWindow: string;
  /** Chosen print pose per analysed file. */
  printPose: string;
  /** Optional purpose label. */
  usePurpose: string;
}

/** Reference id of the current session, or '' if no analysed file has a hash. */
export function sessionQuoteReference(session: QuoteSessionState, now: Date): string {
  const hashes = session.entries.filter((entry) => entry.status === 'ready' && entry.sha256).map((entry) => entry.sha256 as string);
  if (hashes.length === 0) return '';
  const dateIso = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(now);
  return quoteReferenceId({ fileHashes: hashes, selection: session.selection, dateIso });
}

/** Ship window sentence, e.g. "Versand zwischen Mo 05.10. und Mi 07.10., Freigabe bis Do 01.10. 12:00". */
export function shipWindowText(leadTimeId: string, now: Date): string {
  const leadTime = PRICING_CONFIG.leadTimeOptions.find((option) => option.id === leadTimeId);
  if (!leadTime) return '';
  const window = tryShipWindow(now, leadTime);
  if (!window) return '';
  return (
    `Versand zwischen ${formatCivilDate(window.earliest)} und ${formatCivilDate(window.latest, true)} ` +
    `(${leadTime.label}), Freigabe des Angebots bis ${formatCivilDate(window.approvalBy)} ${window.cutoffHour}:00`
  );
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

export function summarizeQuoteSession(session: QuoteSessionState, now: Date = new Date()): RequestQuoteSummary {
  const sessionEstimate = computeSessionEstimate(
    session.entries,
    session.selection,
    MATERIAL_CATALOG,
    PRICING_CONFIG,
  );
  const estimate = sessionEstimate.estimate;
  const breakdown =
    estimate?.status === 'ok'
      ? breakdownProject(sessionEstimate.parts, session.selection, MATERIAL_CATALOG, PRICING_CONFIG)
      : null;
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
    quoteReference: sessionQuoteReference(session, now),
    priceBreakdown: buildBreakdownSummary(breakdown, PRICING_CONFIG),
    shipWindow: estimate?.status === 'ok' ? shipWindowText(session.selection.leadTimeId, now) : '',
    printPose: session.entries
      .filter((entry) => entry.status === 'ready')
      .map((entry) => `${entry.file.name}: ${entry.chosenPoseId === null ? 'wie geladen' : POSES[entry.chosenPoseId].label}`)
      .join('\n'),
    usePurpose: USE_PURPOSES.find((purpose) => purpose.id === session.usePurpose)?.label ?? '',
  };
}
