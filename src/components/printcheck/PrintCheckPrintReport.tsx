import { createPortal } from 'react-dom';
import {
  BASIS_LABEL,
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  STATUS_LABEL,
  fmtMm,
  type PrintCheckReport,
} from '../../lib/printcheck/evaluate';
import { MODEL_FORMAT_LABEL } from '../../lib/geometry/format';
import type { QuoteFileEntry } from '../../lib/quote/quoteSession';
import { formatDimensions, formatVolumeCm3 } from '../../lib/quote/summary';

/*
 * Printable report ("Prüfbericht"). Rendered into document.body through a
 * portal only while printing; index.css hides everything else for
 * body.printcheck-printing. Uses its own pc-report classes with fixed colours,
 * so the dark-mode overrides of the site never put light text on paper.
 * Contains no personal data: file name, hash, measurements only.
 */

interface PrintCheckPrintReportProps {
  entry: QuoteFileEntry;
  report: PrintCheckReport;
}

const PrintCheckPrintReport = ({ entry, report }: PrintCheckPrintReportProps) => {
  if (typeof document === 'undefined') return null;
  const created = new Date();
  const findings = CATEGORY_ORDER.flatMap((category) =>
    report.findings.filter((finding) => finding.category === category).map((finding) => ({ category, finding })),
  );
  return createPortal(
    <div className="pc-report" aria-hidden="true">
      <header className="pc-report__header">
        <div>
          <p className="pc-report__brand">3D-WINDT · Druckbarkeits-Check</p>
          <h1 className="pc-report__title">Prüfbericht: automatische Vorprüfung</h1>
        </div>
        <img className="pc-report__logo" src="/logo/3dw-logo-full.webp" alt="" />
      </header>
      <p className="pc-report__disclaimer">
        Automatische Vorprüfung – verbindlich erst nach technischer Prüfung durch 3D-WINDT. Heuristiken sind als solche
        gekennzeichnet; nicht geprüfte Punkte gelten nicht als bestanden.
      </p>
      <table className="pc-report__meta">
        <tbody>
          <tr>
            <th>Datum</th>
            <td>{created.toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })}</td>
          </tr>
          <tr>
            <th>Datei</th>
            <td>
              {entry.file.name}
              {entry.format ? ` (${MODEL_FORMAT_LABEL[entry.format]})` : ''}
            </td>
          </tr>
          <tr>
            <th>SHA-256</th>
            <td className="pc-report__mono">{entry.sha256 ?? 'nicht verfügbar'}</td>
          </tr>
          {entry.analysis && (
            <tr>
              <th>Maße / Volumen</th>
              <td>
                {formatDimensions(entry.analysis.bbox.size)} · {formatVolumeCm3(entry.analysis.volumeMm3)} ·{' '}
                {new Intl.NumberFormat('de-DE').format(entry.analysis.triangleCount)} Dreiecke
              </td>
            </tr>
          )}
          <tr>
            <th>Werkstoff</th>
            <td>
              {report.material.name} ({report.material.polymer})
            </td>
          </tr>
          <tr>
            <th>Prozess</th>
            <td>
              FDM, Düse 0,4 mm, Schicht 0,2 mm, beheizte Kammer, Bauraum 350 × 350 × 300 mm
              {report.resolutionMm !== null ? ` · Prüfraster ${fmtMm(report.resolutionMm)}` : ''}
            </td>
          </tr>
        </tbody>
      </table>

      <section className={`pc-report__verdict pc-report__verdict--${report.verdict.level}`}>
        <h2>{report.verdict.title}</h2>
        <p>{report.verdict.text}</p>
        <p className="pc-report__small">
          {report.counts.critical} kritisch · {report.counts.hint} Hinweise · {report.counts.ok} OK ·{' '}
          {report.counts['not-checked']} nicht geprüft
        </p>
      </section>

      <table className="pc-report__table">
        <thead>
          <tr>
            <th>Nr.</th>
            <th>Prüfpunkt</th>
            <th>Messwert</th>
            <th>Grenzwert</th>
            <th>Status</th>
            <th>Grundlage</th>
          </tr>
        </thead>
        <tbody>
          {findings.map(({ category, finding }, index) => (
            <tr key={finding.id}>
              <td>{index + 1}</td>
              <td>
                <span className="pc-report__category">{CATEGORY_LABEL[category]}</span>
                <br />
                {finding.title}
              </td>
              <td>{finding.measured}</td>
              <td>{finding.threshold}</td>
              <td className={`pc-report__status pc-report__status--${finding.status}`}>{STATUS_LABEL[finding.status]}</td>
              <td>{BASIS_LABEL[finding.basis]}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="pc-report__notes">
        <h2>Erläuterungen und Empfehlungen</h2>
        {findings
          .filter(({ finding }) => finding.status === 'critical' || finding.status === 'hint')
          .map(({ finding }) => (
            <div key={finding.id} className="pc-report__note">
              <h3>
                {STATUS_LABEL[finding.status]}: {finding.title}
              </h3>
              <p>{finding.explanation}</p>
              {finding.recommendation && <p>Empfehlung: {finding.recommendation}</p>}
            </div>
          ))}
      </section>

      {report.orientationRows.length > 0 && (
        <section>
          <h2>Vergleich der Drucklagen</h2>
          <table className="pc-report__table">
            <thead>
              <tr>
                <th>Lage</th>
                <th>Bauhöhe</th>
                <th>&gt; 45°</th>
                <th>&gt; 60°</th>
                <th>Auflage</th>
                <th>Bewertung</th>
              </tr>
            </thead>
            <tbody>
              {report.orientationRows.map((row) => (
                <tr key={row.poseId}>
                  <td>
                    {row.label}
                    {row.recommended ? ' (empfohlen)' : ''}
                  </td>
                  <td>{fmtMm(row.height)}</td>
                  <td>{row.supportShare.toFixed(1).replace('.', ',')} %</td>
                  <td>{row.criticalShare.toFixed(1).replace('.', ',')} %</td>
                  <td>{(row.bedContact / 100).toFixed(1).replace('.', ',')} cm²</td>
                  <td>{Math.round(row.score)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {report.toleranceRows && (
        <section>
          <h2>Maßhaltigkeit je Hauptmaß (DIN ISO 2768-1)</h2>
          <table className="pc-report__table">
            <thead>
              <tr>
                <th>Maß</th>
                <th>Nennmaß</th>
                <th>ISO 2768-m</th>
                <th>ISO 2768-c</th>
                <th>FDM erwartet</th>
              </tr>
            </thead>
            <tbody>
              {report.toleranceRows.map((row) => (
                <tr key={row.axis}>
                  <td>{row.axis}</td>
                  <td>{fmtMm(row.nominal)}</td>
                  <td>{row.isoM === null ? '–' : `±${fmtMm(row.isoM)}`}</td>
                  <td>{row.isoC === null ? '–' : `±${fmtMm(row.isoC)}`}</td>
                  <td>±{fmtMm(row.expectedDeviation)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <footer className="pc-report__footer">
        Erstellt mit dem Druckbarkeits-Check auf 3d-windt.de. Die Analyse lief lokal im Browser; die Datei wurde dafür
        nicht übertragen. Technische Prüfung und verbindliches Angebot: 3d-windt.de/projekt-starten/
      </footer>
    </div>,
    document.body,
  );
};

export default PrintCheckPrintReport;
