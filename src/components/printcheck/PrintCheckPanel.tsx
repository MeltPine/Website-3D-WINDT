import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  EyeOff,
  Loader2,
  MinusCircle,
  Printer,
  ShieldCheck,
  Wrench,
  XCircle,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BASIS_LABEL,
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  STATUS_LABEL,
  fmtMm,
  type Finding,
  type FindingStatus,
  type HighlightId,
  type PrintCheckReport,
  type VerdictLevel,
} from '../../lib/printcheck/evaluate';
import { PRINTCHECK_STAGES, STAGE_LABEL } from '../../lib/printcheck/types';
import {
  cancelPrintCheck,
  getQuoteSession,
  setQuoteRequestIntent,
  type QuoteFileEntry,
  type QuoteRequestIntent,
} from '../../lib/quote/quoteSession';
import { trackEvent } from '../../lib/tracking';
import PrintCheckPrintReport from './PrintCheckPrintReport';

/*
 * The customer-facing printability report next to the 3D viewer. Results
 * appear stage by stage while the worker runs; every finding can be shown in
 * 3D. In the calculator the report ends in lead CTAs; inside the request form
 * it only notes that the findings travel with the request.
 */

export type PrintCheckMode = 'calculator' | 'request';

const STATUS_STYLE: Record<FindingStatus, { badge: string; icon: typeof CheckCircle2; iconClass: string }> = {
  ok: { badge: 'bg-ok-bg text-ok border-line', icon: CheckCircle2, iconClass: 'text-ok' },
  hint: { badge: 'bg-warn-bg text-warn border-line', icon: AlertTriangle, iconClass: 'text-warn' },
  critical: { badge: 'bg-crit-bg text-crit border-line', icon: XCircle, iconClass: 'text-crit' },
  'not-checked': { badge: 'bg-panel-2 text-ink-muted border-line', icon: MinusCircle, iconClass: 'text-ink-muted' },
};

const VERDICT_STYLE: Record<VerdictLevel, { box: string; icon: typeof CheckCircle2; iconClass: string }> = {
  direct: { box: 'border-line bg-ok-bg', icon: CheckCircle2, iconClass: 'text-ok' },
  adjust: { box: 'border-line bg-warn-bg', icon: AlertTriangle, iconClass: 'text-warn' },
  redesign: { box: 'border-line bg-crit-bg', icon: Wrench, iconClass: 'text-crit' },
  unsuitable: { box: 'border-line bg-crit-bg', icon: XCircle, iconClass: 'text-crit' },
  incomplete: { box: 'border-line bg-panel-2', icon: MinusCircle, iconClass: 'text-ink-muted' },
};

const StatusBadge = ({ status }: { status: FindingStatus }) => {
  const style = STATUS_STYLE[status];
  const Icon = style.icon;
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium ${style.badge}`}>
      <Icon className={`h-3.5 w-3.5 ${style.iconClass}`} aria-hidden="true" />
      {STATUS_LABEL[status]}
    </span>
  );
};

interface FindingRowProps {
  finding: Finding;
  highlightAvailable: boolean;
  active: boolean;
  onToggleHighlight: (id: HighlightId) => void;
}

const FindingRow = ({ finding, highlightAvailable, active, onToggleHighlight }: FindingRowProps) => {
  const [open, setOpen] = useState(finding.status === 'critical');
  const detailsId = `pc-${finding.id.replace(/\./g, '-')}`;
  return (
    <li className="rounded border border-line bg-panel p-3">
      <div className="flex items-start gap-2">
        <StatusBadge status={finding.status} />
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          aria-expanded={open}
          aria-controls={detailsId}
          onClick={() => setOpen((value) => !value)}
        >
          <span className="block text-sm font-medium text-ink">{finding.title}</span>
          <span className="block text-sm text-ink-soft">{finding.measured}</span>
        </button>
        {finding.highlight && highlightAvailable && (
          <button
            type="button"
            onClick={() => onToggleHighlight(finding.highlight as HighlightId)}
            aria-pressed={active}
            className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
              active ? 'border-accent bg-accent text-accent-contrast' : 'border-line-strong text-ink hover:border-accent'
            }`}
          >
            {active ? <EyeOff className="h-3.5 w-3.5" aria-hidden="true" /> : <Eye className="h-3.5 w-3.5" aria-hidden="true" />}
            {finding.highlight === 'pose' ? (active ? 'Lage aus' : 'Lage zeigen') : active ? 'Ausblenden' : 'In 3D zeigen'}
          </button>
        )}
      </div>
      {open && (
        <div id={detailsId} className="mt-2 space-y-1.5 border-t border-line pt-2 text-sm text-ink-soft">
          <p>
            <span className="font-medium text-ink">Grenzwert:</span> {finding.threshold}
          </p>
          {finding.explanation && <p>{finding.explanation}</p>}
          {finding.recommendation && (
            <p>
              <span className="font-medium text-ink">Empfehlung:</span> {finding.recommendation}
            </p>
          )}
          {finding.link && (
            <p>
              <Link to={finding.link.href} className="text-accent underline">
                {finding.link.label}
              </Link>
            </p>
          )}
          <p className="text-xs text-ink-muted">Grundlage: {BASIS_LABEL[finding.basis]}</p>
        </div>
      )}
    </li>
  );
};

const WallHistogram = ({ report }: { report: PrintCheckReport }) => {
  const histogram = report.wallHistogram;
  if (!histogram) return null;
  // show up to the last populated bin (at least 4 mm)
  let last = histogram.bins.length - 1;
  while (last > 20 && histogram.bins[last] < 0.05) last -= 1;
  const bins = histogram.bins.slice(0, last + 1);
  const max = Math.max(...bins, 1e-9);
  return (
    <figure className="rounded border border-line bg-panel p-3">
      <figcaption className="mb-2 text-xs font-medium text-ink-soft">
        Wandstärken-Verteilung (Volumenanteil je {fmtMm(histogram.binWidth)})
      </figcaption>
      <div className="flex h-20 items-end gap-px" role="img" aria-label="Histogramm der Wandstärken">
        {bins.map((value, index) => {
          const from = index * histogram.binWidth;
          const tone = from < 0.4 ? 'bg-crit' : from < 0.8 ? 'bg-warn' : 'bg-accent';
          return (
            <div
              key={from}
              className={`flex-1 rounded-t-sm ${tone}`}
              style={{ height: `${Math.max(value > 0 ? 3 : 0, (value / max) * 100)}%` }}
              title={`${fmtMm(from)}–${fmtMm(from + histogram.binWidth)}: ${value.toFixed(1)} %`}
            />
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-ink-muted">
        <span>0 mm</span>
        <span>{fmtMm((last + 1) * histogram.binWidth)}</span>
      </div>
    </figure>
  );
};

const OrientationTable = ({
  report,
  onApplyPose,
  appliedPoseId,
}: {
  report: PrintCheckReport;
  onApplyPose?: (poseId: number) => void;
  appliedPoseId?: number | null;
}) => (
  <div className="overflow-x-auto rounded border border-line bg-panel">
    <table className="w-full min-w-[520px] text-left text-xs text-ink-soft">
      <caption className="sr-only">Vergleich der sechs Drucklagen</caption>
      <thead className="bg-panel-2 text-ink">
        <tr>
          <th scope="col" className="px-2 py-1.5">Lage</th>
          <th scope="col" className="px-2 py-1.5 text-right">Höhe</th>
          <th scope="col" className="px-2 py-1.5 text-right">&gt; 60°</th>
          <th scope="col" className="px-2 py-1.5 text-right">Auflage</th>
          <th scope="col" className="px-2 py-1.5">Bauraum</th>
          <th scope="col" className="px-2 py-1.5 text-right">Bewertung</th>
          {onApplyPose && (
            <th scope="col" className="px-2 py-1.5">
              <span className="sr-only">Im Viewer</span>
            </th>
          )}
        </tr>
      </thead>
      <tbody>
        {report.orientationRows.map((row) => (
          <tr key={row.poseId} className={row.recommended ? 'bg-accent-soft font-medium text-ink' : ''}>
            <td className="px-2 py-1.5">
              {row.label}
              {row.recommended ? ' – empfohlen' : ''}
            </td>
            <td className="px-2 py-1.5 text-right">{fmtMm(row.height)}</td>
            <td className="px-2 py-1.5 text-right">{row.criticalShare.toFixed(1).replace('.', ',')} %</td>
            <td className="px-2 py-1.5 text-right">{(row.bedContact / 100).toFixed(1).replace('.', ',')} cm²</td>
            <td className="px-2 py-1.5">{row.fits === 'axis' ? 'passt' : row.fits === 'diagonal' ? 'diagonal' : 'zu groß'}</td>
            <td className="num px-2 py-1.5 text-right">{Math.round(row.score)}</td>
            {onApplyPose && (
              <td className="px-2 py-1 text-right">
                {appliedPoseId === row.poseId ? (
                  <span className="text-xs text-ink-muted">im Viewer</span>
                ) : (
                  <button type="button" onClick={() => onApplyPose(row.poseId)} className="min-h-[32px] text-xs font-medium text-accent underline">
                    Im Viewer übernehmen
                  </button>
                )}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const ToleranceTable = ({ report }: { report: PrintCheckReport }) => {
  if (!report.toleranceRows) return null;
  return (
    <div className="overflow-x-auto rounded border border-line bg-panel">
      <table className="w-full min-w-[460px] text-left text-xs text-ink-soft">
        <caption className="sr-only">Maßhaltigkeit je Hauptmaß</caption>
        <thead className="bg-panel-2 text-ink">
          <tr>
            <th scope="col" className="px-2 py-1.5">Maß</th>
            <th scope="col" className="px-2 py-1.5 text-right">Nennmaß</th>
            <th scope="col" className="px-2 py-1.5 text-right">ISO 2768-m</th>
            <th scope="col" className="px-2 py-1.5 text-right">ISO 2768-c</th>
            <th scope="col" className="px-2 py-1.5 text-right">FDM erwartet</th>
          </tr>
        </thead>
        <tbody>
          {report.toleranceRows.map((row) => (
            <tr key={row.axis}>
              <td className="px-2 py-1.5">{row.axis}</td>
              <td className="px-2 py-1.5 text-right">{fmtMm(row.nominal)}</td>
              <td className="px-2 py-1.5 text-right">{row.isoM === null ? '–' : `±${fmtMm(row.isoM)}`}</td>
              <td className="px-2 py-1.5 text-right">{row.isoC === null ? '–' : `±${fmtMm(row.isoC)}`}</td>
              <td className={`px-2 py-1.5 text-right ${row.withinGeneral ? '' : 'font-medium text-warn'}`}>
                ±{fmtMm(row.expectedDeviation)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

interface PrintCheckPanelProps {
  entry: QuoteFileEntry;
  report: PrintCheckReport | null;
  mode: PrintCheckMode;
  activeHighlight: HighlightId | null;
  onToggleHighlight: (id: HighlightId) => void;
  /** False when the viewer has no geometry (memory budget) or no flags yet. */
  highlightAvailable: boolean;
  /** Shows a pose of the orientation study in the viewer. */
  onApplyPose?: (poseId: number) => void;
  appliedPoseId?: number | null;
}

const SEVERITY: Readonly<Record<FindingStatus, number>> = { critical: 0, hint: 1, ok: 2, 'not-checked': 3 };

const PrintCheckPanel = ({
  entry,
  report,
  mode,
  activeHighlight,
  onToggleHighlight,
  highlightAvailable,
  onApplyPose,
  appliedPoseId,
}: PrintCheckPanelProps) => {
  const navigate = useNavigate();
  const check = entry.printCheck;
  const [printRequested, setPrintRequested] = useState(false);
  const running = check.status === 'running' || check.status === 'queued';

  const grouped = useMemo(() => {
    if (!report) return [];
    // categories and findings sorted critical -> hint -> OK -> not checked
    return CATEGORY_ORDER.map((category) => ({
      category,
      findings: report.findings
        .filter((finding) => finding.category === category)
        .sort((a, b) => SEVERITY[a.status] - SEVERITY[b.status]),
    }))
      .map((group) => ({ ...group, worst: Math.min(...group.findings.map((finding) => SEVERITY[finding.status]), 3) }))
      .sort((a, b) => a.worst - b.worst || CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category));
  }, [report]);

  useEffect(() => {
    if (!printRequested) return undefined;
    const done = () => {
      document.body.classList.remove('printcheck-printing');
      setPrintRequested(false);
    };
    document.body.classList.add('printcheck-printing');
    window.addEventListener('afterprint', done);
    // let React commit the print portal before opening the dialog
    const timer = window.setTimeout(() => window.print(), 50);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('afterprint', done);
      document.body.classList.remove('printcheck-printing');
    };
  }, [printRequested]);

  const requestReview = (intent: QuoteRequestIntent) => {
    const session = getQuoteSession();
    setQuoteRequestIntent(intent);
    trackEvent('printcheck_cta_clicked', {
      form: 'quote',
      cta: intent,
      verdict: report?.verdict.level ?? 'none',
      file_count: session.entries.length,
    });
    navigate('/projekt-starten/');
  };

  if (check.status === 'none' || check.status === 'unavailable') {
    return (
      <section className="rounded-md border border-line bg-panel p-4" aria-labelledby="printcheck-title">
        <h3 id="printcheck-title" className="font-medium text-ink">Druckbarkeits-Check</h3>
        <p className="mt-1 text-sm text-ink-muted">
          {check.status === 'none'
            ? 'Startet automatisch, sobald das Modell eingelesen ist.'
            : `Für diese Datei nicht verfügbar (${check.note ?? 'kein 3D-Modell'}). Ich prüfe sie bei der technischen Prüfung von Hand.`}
        </p>
      </section>
    );
  }

  const verdictStyle = report ? VERDICT_STYLE[report.verdict.level] : null;
  const VerdictIcon = verdictStyle?.icon ?? Loader2;

  return (
    <section className="space-y-3 rounded-md border border-line bg-panel p-4 " aria-labelledby="printcheck-title">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 id="printcheck-title" className="font-display text-lg font-medium text-ink">
            Druckbarkeits-Check
          </h3>
          <p className="inline-flex items-center gap-1 text-xs text-ink-muted">
            <ShieldCheck className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
            Läuft lokal in Ihrem Browser – die Datei wird für die Prüfung nicht hochgeladen.
          </p>
        </div>
        {report && !running && (
          <button
            type="button"
            onClick={() => {
              trackEvent('printcheck_report_printed', { form: 'quote', verdict: report.verdict.level });
              setPrintRequested(true);
            }}
            className="inline-flex items-center gap-1.5 rounded border border-line-strong px-3 py-1.5 text-sm font-medium text-ink hover:border-accent"
          >
            <Printer className="h-4 w-4" aria-hidden="true" /> Prüfbericht drucken / PDF
          </button>
        )}
      </div>

      {running && (
        <div className="rounded border border-line bg-accent-soft p-3" role="status" aria-live="polite">
          <div className="flex items-center justify-between gap-2 text-sm text-ink">
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-accent" aria-hidden="true" />
              {check.status === 'queued' ? 'Wartet auf die Prüfung …' : `${check.stage ? STAGE_LABEL[check.stage] : 'Prüfung'} …`}
            </span>
            {check.status === 'running' && (
              <button
                type="button"
                onClick={() => cancelPrintCheck(entry.id)}
                className="text-xs font-medium text-accent underline"
              >
                Abbrechen
              </button>
            )}
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded bg-panel-2">
            <div
              className="h-full bg-accent transition-[width]"
              style={{
                width: `${Math.round(
                  (((check.stage ? PRINTCHECK_STAGES.indexOf(check.stage) : 0) + check.fraction) / PRINTCHECK_STAGES.length) *
                    100,
                )}%`,
              }}
            />
          </div>
          <p className="mt-1 text-xs text-ink-muted">Teilergebnisse erscheinen unten, sobald sie vorliegen.</p>
        </div>
      )}

      {check.status === 'partial' && check.note && (
        <p className="rounded border border-line bg-warn-bg px-3 py-2 text-sm text-warn" role="status">
          {check.note}. Die bis dahin abgeschlossenen Prüfungen sind unten aufgeführt, der Rest ist als „nicht geprüft“ markiert.
        </p>
      )}

      {report && verdictStyle && (
        <div className={`rounded border p-3 ${verdictStyle.box}`} aria-live="polite">
          <p className="flex items-center gap-2 font-display text-xl font-semibold text-ink">
            <VerdictIcon className={`h-6 w-6 shrink-0 ${verdictStyle.iconClass}`} aria-hidden="true" />
            {running ? `Vorläufig: ${report.verdict.title}` : report.verdict.title}
          </p>
          <p className="mt-1 text-sm text-ink">{report.verdict.text}</p>
          <p className="mt-2 text-xs text-ink-muted">
            {report.counts.critical} kritisch · {report.counts.hint} Hinweise · {report.counts.ok} OK ·{' '}
            {report.counts['not-checked']} nicht geprüft
            {report.resolutionMm !== null && ` · Prüfraster ${fmtMm(report.resolutionMm)}`}
          </p>
        </div>
      )}

      {report && mode === 'calculator' && !running && (
        <div className="rounded border border-line bg-accent-soft p-3">
          <p className="text-sm text-ink">
            {report.verdict.level === 'direct'
              ? 'Sicher gehen? Ich prüfe Ihr Modell kostenlos am Originaldatensatz und bestätige Drucklage, Werkstoff und Toleranzen.'
              : 'Befund ist keine Absage: Ich prüfe jeden Punkt am Originaldatensatz und sage Ihnen, was sich ohne Änderung fertigen lässt.'}
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={() => requestReview('technische-pruefung')}
              className="tech-btn tech-btn-secondary text-sm"
            >
              <ClipboardCheck className="h-4 w-4" aria-hidden="true" /> Kostenlose technische Prüfung anfordern
            </button>
            {report.showRedesignCta && (
              <button
                type="button"
                onClick={() => requestReview('nachkonstruktion')}
                className="tech-btn tech-btn-secondary text-sm"
              >
                <Wrench className="h-4 w-4" aria-hidden="true" /> Nachkonstruktion/Optimierung anfragen
              </button>
            )}
          </div>
          <p className="mt-2 text-xs text-ink-muted">
            Datei und Prüfergebnis werden in die Anfrage übernommen. Mehrere Ersatzteile im Betrieb?{' '}
            <Link
              to="/ersatzteile-3d-drucken/#check"
              onClick={() => trackEvent('printcheck_cta_clicked', { form: 'quote', cta: 'ersatzteil-check' })}
              className="text-accent underline"
            >
              Ersatzteil-Check vor Ort buchen
            </Link>
          </p>
        </div>
      )}
      {report && mode === 'request' && (
        <p className="text-xs text-ink-muted">Das Ergebnis dieser Vorprüfung wird mit Ihrer Anfrage übermittelt.</p>
      )}

      {report && (
        <div className="space-y-2">
          {grouped.map(({ category, findings }) => {
            const critical = findings.filter((finding) => finding.status === 'critical').length;
            const hints = findings.filter((finding) => finding.status === 'hint').length;
            return (
              <details key={category} className="group rounded border border-line bg-panel-2" open={critical > 0}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-sm font-medium text-ink">
                  <span>
                    {CATEGORY_ORDER.indexOf(category) + 1}. {CATEGORY_LABEL[category]}
                  </span>
                  <span className="text-xs font-normal text-ink-muted">
                    {critical > 0 ? `${critical} kritisch` : hints > 0 ? `${hints} Hinweis${hints === 1 ? '' : 'e'}` : findings.every((f) => f.status === 'not-checked') ? 'nicht geprüft' : 'OK'}
                  </span>
                </summary>
                <div className="space-y-2 px-3 pb-3">
                  <ul className="space-y-2">
                    {findings.map((finding) => (
                      <FindingRow
                        key={finding.id}
                        finding={finding}
                        highlightAvailable={highlightAvailable || finding.highlight === 'pose'}
                        active={activeHighlight === finding.highlight}
                        onToggleHighlight={onToggleHighlight}
                      />
                    ))}
                  </ul>
                  {category === 'walls' && <WallHistogram report={report} />}
                  {category === 'orientation' && report.orientationRows.length > 0 && (
                    <OrientationTable report={report} onApplyPose={onApplyPose} appliedPoseId={appliedPoseId} />
                  )}
                  {category === 'holes' && <ToleranceTable report={report} />}
                </div>
              </details>
            );
          })}
        </div>
      )}

      <p className="text-xs text-ink-muted">
        Automatische Vorprüfung – verbindlich erst nach meiner technischen Prüfung. Punkte mit „Heuristik“
        beruhen auf Erfahrungswerten; was im Browser nicht geprüft werden konnte, ist als „nicht geprüft“ markiert.
        {!highlightAvailable && check.status === 'done' && ' 3D-Markierung nicht verfügbar (Vorschau aus Speichergründen abgeschaltet).'}
      </p>

      {report && printRequested && <PrintCheckPrintReport entry={entry} report={report} />}
    </section>
  );
};

export default PrintCheckPanel;
