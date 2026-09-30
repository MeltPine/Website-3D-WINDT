import type { ReactNode } from 'react';
import { MODEL_FORMAT_LABEL } from '../../lib/geometry/format';
import { PRINTCHECK_RULES } from '../../lib/printcheck/standards';
import { formatHoursDecimal, formatWeight } from '../../lib/quote/breakdownDisplay';
import type { MaterialSpec } from '../../lib/quote/materials';
import type { PartEstimate } from '../../lib/quote/pricing';
import { PRICING_CONFIG } from '../../lib/quote/pricingConfig';
import type { QuoteFileEntry } from '../../lib/quote/quoteSession';
import { formatDimensions, formatMegabytes, formatVolumeCm3 } from '../../lib/quote/summary';
import { formatDimension } from './viewer/dimensions';

/*
 * "Messprotokoll" of the selected part: everything the viewer shows, as text.
 * Weight and machine time refer to the selected material and infill, one
 * piece. Triangle count and file details sit in a collapsed block.
 */

interface ModelReportProps {
  entry: QuoteFileEntry;
  material: MaterialSpec | null;
  part: PartEstimate | null;
  infillLabel: string;
}

const area = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 });
const count = new Intl.NumberFormat('de-DE');

function unitNote(size: readonly [number, number, number]): { text: string; warn: boolean } {
  const largest = Math.max(...size);
  const smallest = Math.min(...size);
  if (largest < PRINTCHECK_RULES.unitTinyMm.value) {
    return { text: `Größte Kante ${formatDimension(largest)} mm – war das vielleicht in Zoll oder Metern exportiert?`, warn: true };
  }
  if (largest > PRINTCHECK_RULES.unitHugeMm.value) {
    return { text: `Größte Kante ${formatDimension(largest)} mm – war das vielleicht in Zehntelmillimetern exportiert?`, warn: true };
  }
  return { text: `kleinste Kante ${formatDimension(smallest)} mm – Einheit mm plausibel`, warn: false };
}

const Row = ({ label, children, warn = false }: { label: string; children: ReactNode; warn?: boolean }) => (
  <tr className="border-b border-line last:border-b-0 align-top">
    <th scope="row" className="w-44 py-2 pr-3 text-left text-sm font-normal text-ink-soft">
      {label}
    </th>
    <td className={`num py-2 text-sm ${warn ? 'text-warn' : 'text-ink'}`}>{children}</td>
  </tr>
);

const ModelReport = ({ entry, material, part, infillLabel }: ModelReportProps) => {
  const analysis = entry.analysis;
  if (!analysis) {
    return (
      <p className="text-sm text-ink-soft">
        {entry.status === 'failed'
          ? `${entry.error ?? 'Die Datei konnte nicht gelesen werden.'} Die Datei wird trotzdem mit der Anfrage übermittelt.`
          : entry.status === 'upload-only'
            ? 'Ohne Vorschau – diese Datei wird mit der Anfrage übermittelt und von Hand kalkuliert.'
            : 'Wird gelesen …'}
      </p>
    );
  }
  const size = analysis.bbox.size;
  const [bx, by, bz] = PRICING_CONFIG.buildVolumeMm;
  const longestShare = Math.max(...size) / Math.max(bx, by, bz);
  const unit = unitNote(size);
  return (
    <div className="space-y-3">
      <table className="w-full">
        <caption className="sr-only">Messprotokoll</caption>
        <tbody>
          <Row label="Maße B × T × H">{formatDimensions(size)}</Row>
          <Row label="Volumen">{formatVolumeCm3(analysis.volumeMm3)}</Row>
          <Row label="Oberfläche">{area.format(analysis.surfaceAreaMm2 / 100)} cm²</Row>
          <Row label="Gewicht (1 Stück)">
            {part && material ? `${formatWeight(part.weightG)} · ${material.name}, Füllung ${infillLabel}` : '–'}
          </Row>
          <Row label="Maschinenzeit (Schätzung)">
            {part ? `ca. ${formatHoursDecimal(part.printHours)} je Stück inkl. Aufheizen – kein Slicer` : '–'}
          </Row>
          <Row label="Bauraum" warn={part ? !part.fitsBuildVolume : false}>
            {part && !part.fitsBuildVolume
              ? `größer als ${bx} × ${by} × ${bz} mm – Teilung prüfe ich`
              : `passt in ${bx} × ${by} × ${bz} mm, ${Math.round(longestShare * 100)} % der längsten Achse`}
          </Row>
          <Row label="Einheit" warn={unit.warn}>
            {unit.text}
          </Row>
        </tbody>
      </table>
      {analysis.openMeshSuspected && (
        <p className="rounded border border-line bg-warn-bg px-3 py-2 text-sm text-ink">
          <span className="font-medium text-warn">Hinweis:</span> Das Netz scheint nicht geschlossen zu sein. Volumen und Richtpreis können
          abweichen – ich prüfe die Datei im Angebot.
        </p>
      )}
      <details className="text-sm">
        <summary className="cursor-pointer font-medium text-ink">Technische Details</summary>
        <table className="mt-1 w-full">
          <tbody>
            <Row label="Datei">{entry.file.name}</Row>
            <Row label="Format">{entry.format ? MODEL_FORMAT_LABEL[entry.format] : 'ohne Vorschau'}</Row>
            <Row label="Größe">{formatMegabytes(entry.file.size)}</Row>
            <Row label="Dreiecke (Tessellierung)">{count.format(analysis.triangleCount)}</Row>
            {entry.sha256 && <Row label="SHA-256">{entry.sha256.slice(0, 16)}…</Row>}
          </tbody>
        </table>
      </details>
    </div>
  );
};

export default ModelReport;
