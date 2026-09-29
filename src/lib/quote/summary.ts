import { MODEL_FORMAT_LABEL } from '../geometry/format';
import type { MeshAnalysis, ModelFormat } from '../geometry/types';
import type { ProjectEstimate } from './pricing';

/*
 * Human-readable summaries that travel with the request (lead record fields
 * and lead e-mail). Pure functions, German output.
 */

const numberFormat = (digits: number) =>
  new Intl.NumberFormat('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits });

export function formatEur(value: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(
    value,
  );
}

export function formatMm(value: number): string {
  return numberFormat(1).format(value);
}

export function formatDimensions(size: readonly [number, number, number]): string {
  return `${formatMm(size[0])} × ${formatMm(size[1])} × ${formatMm(size[2])} mm`;
}

export function formatVolumeCm3(volumeMm3: number): string {
  return `${numberFormat(2).format(volumeMm3 / 1000)} cm³`;
}

export function formatMegabytes(bytes: number): string {
  if (bytes < 100 * 1024) {
    return `${numberFormat(0).format(Math.max(1, Math.ceil(bytes / 1024)))} KB`;
  }
  return `${numberFormat(1).format(bytes / 1024 / 1024)} MB`;
}

export interface SummaryFile {
  name: string;
  format: ModelFormat | null;
  analysis: MeshAnalysis | null;
}

export function buildModelSummary(files: readonly SummaryFile[]): string {
  return files
    .map((file) => {
      const label = file.format ? MODEL_FORMAT_LABEL[file.format] : 'ohne Vorschau';
      if (!file.analysis) {
        return `${file.name} (${label}): keine automatische Analyse`;
      }
      const openNote = file.analysis.openMeshSuspected ? ', Netz evtl. nicht geschlossen' : '';
      return `${file.name} (${label}): ${formatDimensions(file.analysis.bbox.size)}, Volumen ${formatVolumeCm3(
        file.analysis.volumeMm3,
      )}${openNote}`;
    })
    .join('\n');
}

export function buildPriceRangeSummary(estimate: ProjectEstimate | null): string {
  if (!estimate) {
    return 'keine Richtpreis-Berechnung';
  }
  if (estimate.status === 'oversize') {
    return 'Bauteil größer als Bauraum – Preis nach Prüfung';
  }
  return (
    `${formatEur(estimate.lowEur)} – ${formatEur(estimate.highEur)} netto ` +
    `(${estimate.material.name}, Füllung ${estimate.infill.label}, ${estimate.leadTime.label}, ` +
    `${estimate.quantity} Stk. je Bauteil, unverbindlich)`
  );
}
