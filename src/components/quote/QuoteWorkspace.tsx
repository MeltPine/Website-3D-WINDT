import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardCheck, FileBox, Loader2, MinusCircle, Plus, Trash2, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MODEL_FORMAT_LABEL } from '../../lib/geometry/format';
import { ERSATZTEIL_CHECK_KEY, FIXED_PRICE_PRODUCTS, formatEuroCents } from '../../lib/payment/catalog';
import { HIGHLIGHTS, evaluatePrintCheck, type HighlightId } from '../../lib/printcheck/evaluate';
import { toPrintCheckMaterial } from '../../lib/printcheck/material';
import { POSES, poseMatrix } from '../../lib/printcheck/pose';
import { PRINTCHECK_RULES } from '../../lib/printcheck/standards';
import { formatCivilDate, tryShipWindow } from '../../lib/quote/leadDate';
import { MAX_COMPARED } from '../../lib/quote/materialCompare';
import { MATERIAL_CATALOG, validateMaterialCatalog, type MaterialCatalog } from '../../lib/quote/materials';
import {
  breakdownProject,
  estimatePart,
  estimateProject,
  minimumOrderQuantityLimit,
  quantityCurve,
} from '../../lib/quote/pricing';
import { PRICING_CONFIG } from '../../lib/quote/pricingConfig';
import {
  QUOTE_UPLOAD_LIMITS,
  USE_PURPOSES,
  removeQuoteFile,
  selectQuoteFile,
  setQuoteFilePose,
  setQuoteUsePurpose,
  updateQuoteSelection,
  useQuoteSession,
  type QuoteFileEntry,
  type UsePurpose,
} from '../../lib/quote/quoteSession';
import { sessionQuoteReference } from '../../lib/quote/requestPayload';
import { computeSessionEstimate } from '../../lib/quote/sessionEstimate';
import { formatDimensions, formatEur, formatMegabytes } from '../../lib/quote/summary';
import {
  modelBadge,
  printCheckBadge,
  printCheckHeadline,
  summaryState,
  type BadgeTone,
  type TabBadge,
} from '../../lib/quote/workspaceState';
import { trackEvent } from '../../lib/tracking';
import { ACCEPT_ATTRIBUTE } from '../../lib/upload/policy';
import PrintCheckPanel from '../printcheck/PrintCheckPanel';
import MaterialCompare from './MaterialCompare';
import MaterialPicker from './MaterialPicker';
import ModelReport from './ModelReport';
import PriceBreakdown from './PriceBreakdown';
import { PriceSummaryBar, PriceSummaryMobile, PriceSummaryPanel, type SummaryModel } from './PriceSummary';
import QuantityCurve from './QuantityCurve';
import type { PoseChoice } from './ModelViewer';
import { lookForPolymer } from './viewer/materialLook';

/*
 * The calculator workspace once a file is selected (lazy chunk with the
 * material database and pricing; three.js is split further into
 * ModelViewer). Viewer as the hero, tabs below, the sticky summary with the
 * one primary call to action on the right (tablet: bar on top, phone:
 * bottom bar). In the request form (mode "request") there is no summary CTA
 * and no "Anfrage" tab - the form itself is the request.
 */

const ModelViewer = lazy(() => import('./ModelViewer'));

type TabId = 'model' | 'printcheck' | 'material' | 'request';

const TAB_LABEL: Readonly<Record<TabId, string>> = {
  model: 'Modell',
  printcheck: 'Druckbarkeit',
  material: 'Material & Preis',
  request: 'Anfrage',
};

const BADGE_STYLE: Readonly<Record<BadgeTone, string>> = {
  ok: 'text-ok',
  warn: 'text-warn',
  crit: 'text-crit',
  neutral: 'text-ink-muted',
};

const BADGE_ICON: Readonly<Record<BadgeTone, typeof CheckCircle2>> = {
  ok: CheckCircle2,
  warn: AlertTriangle,
  crit: XCircle,
  neutral: MinusCircle,
};

let priceRangeTracked = false;

interface QuoteWorkspaceProps {
  catalog?: MaterialCatalog;
  mode: 'calculator' | 'request';
  onInteract?: () => void;
  /** Primary CTA of the calculator ("Verbindliches Angebot anfordern"). */
  onRequest?: () => void;
  onAddFiles: (files: FileList | null) => void;
}

const Badge = ({ badge }: { badge: TabBadge }) => {
  const Icon = BADGE_ICON[badge.tone];
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-normal ${BADGE_STYLE[badge.tone]}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {badge.text}
    </span>
  );
};

function entryStatusBadge(entry: QuoteFileEntry): TabBadge {
  return modelBadge(entry, false);
}

const PHASES = ['Lesen', 'Triangulieren', 'Analysieren', 'Druckbarkeit'] as const;

const ReadingState = ({ entry }: { entry: QuoteFileEntry }) => {
  const phase = entry.status === 'queued' ? 0 : entry.format === 'step' ? 1 : 2;
  return (
    <div className="blueprint flex h-full flex-col items-center justify-center gap-3 p-6 text-center" role="status">
      <ol className="flex flex-wrap items-center justify-center gap-2 text-sm">
        {PHASES.map((label, index) => (
          <li key={label} className={`flex items-center gap-2 ${index === phase ? 'font-medium text-ink' : index < phase ? 'text-ok' : 'text-ink-muted'}`}>
            {index > 0 && <span aria-hidden="true">→</span>}
            {label}
          </li>
        ))}
      </ol>
      <div className="h-1 w-56 overflow-hidden rounded-sm bg-panel-2" aria-hidden="true">
        <div className="h-full bg-accent" style={{ width: `${((phase + 0.5) / PHASES.length) * 100}%` }} />
      </div>
      <p className="max-w-md text-sm text-ink-soft">
        {entry.format === 'step'
          ? 'STEP wird trianguliert … bei großen Baugruppen dauert das eine halbe Minute.'
          : 'Modell wird gelesen und vermessen …'}
      </p>
      <p className="num text-xs text-ink-muted">
        {entry.file.name} · {formatMegabytes(entry.file.size)} · Lokal · nichts übertragen
      </p>
    </div>
  );
};

/** Stage content when there is no 3D view (reading, memory budget, parse error, upload only). */
export const StagePlaceholder = ({ entry }: { entry: QuoteFileEntry }) => {
  if (entry.status === 'queued' || entry.status === 'analyzing') return <ReadingState entry={entry} />;
  const text =
    entry.status === 'ready'
      ? 'Vorschau pausiert – das Speicherbudget der 3D-Ansicht ist erreicht. Schließen Sie zuerst ein anderes Teil. Maße und Richtpreis sind berechnet.'
      : entry.status === 'failed'
        ? `${entry.error ?? 'Die Datei konnte nicht gelesen werden.'} Die Datei wird trotzdem übermittelt.`
        : 'Ohne Vorschau – diese Datei wird mit der Anfrage übermittelt und von Hand kalkuliert.';
  return (
    <div className="blueprint flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
      <FileBox className="h-8 w-8 text-ink-muted" aria-hidden="true" />
      <p className="max-w-md text-sm text-ink-soft">{text}</p>
    </div>
  );
};

const QuoteWorkspace = ({ catalog = MATERIAL_CATALOG, mode, onInteract, onRequest, onAddFiles }: QuoteWorkspaceProps) => {
  const session = useQuoteSession();
  const materials = useMemo(() => validateMaterialCatalog(catalog), [catalog]);
  const [tab, setTab] = useState<TabId>('model');
  const [activeHighlight, setActiveHighlight] = useState<HighlightId | null>(null);
  const [pinned, setPinned] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tabRefs = useRef<Partial<Record<TabId, HTMLButtonElement | null>>>({});
  const now = useMemo(() => new Date(), [session.selection, session.entries]); // eslint-disable-line react-hooks/exhaustive-deps

  const sessionEstimate = useMemo(
    () => computeSessionEstimate(session.entries, session.selection, materials, PRICING_CONFIG),
    [session.entries, session.selection, materials],
  );
  const { estimate, parts, unpricedCount } = sessionEstimate;
  const state = summaryState(session.entries, sessionEstimate);
  const breakdown = useMemo(
    () => (estimate?.status === 'ok' ? breakdownProject(parts, session.selection, materials, PRICING_CONFIG) : null),
    [estimate, parts, session.selection, materials],
  );
  const curve = useMemo(
    () => (estimate?.status === 'ok' ? quantityCurve(parts, session.selection, materials, PRICING_CONFIG) : null),
    [estimate, parts, session.selection, materials],
  );
  const minimumLimit = useMemo(
    () => (estimate?.status === 'ok' && estimate.minimumOrderApplied ? minimumOrderQuantityLimit(parts, session.selection, materials, PRICING_CONFIG) : 0),
    [estimate, parts, session.selection, materials],
  );
  const nextPieceDeltaEur = useMemo(() => {
    if (estimate?.status !== 'ok' || !estimate.minimumOrderApplied || session.selection.quantity >= PRICING_CONFIG.maxQuantity) return null;
    const next = estimateProject(parts, { ...session.selection, quantity: session.selection.quantity + 1 }, materials, PRICING_CONFIG);
    return next.status === 'ok' ? next.pointEstimateEur - estimate.pointEstimateEur : null;
  }, [estimate, parts, session.selection, materials]);

  const selected = session.entries.find((entry) => entry.id === session.selectedId) ?? null;
  const selectedMaterial = materials.find((material) => material.id === session.selection.materialId) ?? null;
  const infill = PRICING_CONFIG.infillOptions.find((option) => option.id === session.selection.infillId) ?? PRICING_CONFIG.infillOptions[0];
  const leadTime = PRICING_CONFIG.leadTimeOptions.find((option) => option.id === session.selection.leadTimeId) ?? PRICING_CONFIG.leadTimeOptions[0];
  const shipWindow = useMemo(() => tryShipWindow(now, leadTime), [now, leadTime]);

  const selectedPart = useMemo(() => {
    if (!selected?.analysis || !selectedMaterial) return null;
    if (!(selected.analysis.volumeMm3 > 0 && selected.analysis.surfaceAreaMm2 > 0)) return null;
    return estimatePart(
      { volumeMm3: selected.analysis.volumeMm3, surfaceAreaMm2: selected.analysis.surfaceAreaMm2, bboxSizeMm: selected.analysis.bbox.size },
      session.selection,
      materials,
      PRICING_CONFIG,
    );
  }, [selected, selectedMaterial, session.selection, materials]);

  const checkGeometry = selected?.printCheck.geometry ?? null;
  const report = useMemo(
    () => (checkGeometry && selectedMaterial ? evaluatePrintCheck(checkGeometry, toPrintCheckMaterial(selectedMaterial)) : null),
    [checkGeometry, selectedMaterial],
  );
  const selectedId = selected?.id ?? null;
  useEffect(() => {
    setActiveHighlight(null);
  }, [selectedId]);

  useEffect(() => {
    if (estimate?.status === 'ok' && !priceRangeTracked) {
      priceRangeTracked = true;
      trackEvent('quote_price_range_shown', {
        form: 'quote',
        material: estimate.material.id,
        quantity: estimate.quantity,
        low_eur: estimate.lowEur,
        high_eur: estimate.highEur,
        part_count: estimate.parts.length,
      });
    }
  }, [estimate]);

  const handleSelection = useCallback(
    (patch: Parameters<typeof updateQuoteSelection>[0]) => {
      onInteract?.();
      updateQuoteSelection(patch);
    },
    [onInteract],
  );

  /* ------------------------------------------------ viewer inputs */

  const flags = selected?.printCheck.flags ?? null;
  const highlightSpec = activeHighlight ? HIGHLIGHTS[activeHighlight] : null;
  const viewerHighlight = useMemo(
    () => (highlightSpec && flags && highlightSpec.layers.length > 0 ? { flags, spec: highlightSpec } : null),
    [highlightSpec, flags],
  );
  const toggleHighlight = useCallback((id: HighlightId) => {
    setActiveHighlight((current) => {
      const next = current === id ? null : id;
      if (next) trackEvent('printcheck_highlight_shown', { form: 'quote', finding: next });
      return next;
    });
  }, []);
  const toggleHeatmap = useMemo(() => {
    if (!report || !flags) return null;
    return () =>
      setActiveHighlight((current) => {
        if (current) return null;
        const firstFinding = report.findings.find(
          (finding) => finding.highlight && finding.highlight !== 'pose' && (finding.status === 'critical' || finding.status === 'hint'),
        );
        return (firstFinding?.highlight as HighlightId | undefined) ?? 'overhang';
      });
  }, [report, flags]);

  const recommendedId = report?.recommendedPose?.id ?? null;
  const poses: PoseChoice[] = useMemo(() => {
    const list: PoseChoice[] = [{ value: 'loaded', label: 'Wie geladen', matrix: null }];
    if (recommendedId !== null) {
      list.push({ value: 'recommended', label: 'Empfohlen (Druckbarkeit)', matrix: poseMatrix(POSES[recommendedId]) });
    }
    for (const pose of POSES) {
      list.push({ value: `p${pose.id}`, label: `${pose.label}${pose.id === recommendedId ? ' – empfohlen' : ''}`, matrix: poseMatrix(pose) });
    }
    return list;
  }, [recommendedId]);
  const chosenPoseId = selected?.chosenPoseId ?? null;
  const highlightNeedsRecommended = highlightSpec?.pose === 'recommended' && recommendedId !== null;
  const poseValue = highlightNeedsRecommended
    ? 'recommended'
    : chosenPoseId === null
      ? 'loaded'
      : chosenPoseId === recommendedId
        ? 'recommended'
        : `p${chosenPoseId}`;
  const onPoseChange = useCallback(
    (value: string) => {
      if (!selected) return;
      setActiveHighlight((current) => (current && HIGHLIGHTS[current].pose === 'recommended' ? null : current));
      if (value === 'loaded') setQuoteFilePose(selected.id, null);
      else if (value === 'recommended' && recommendedId !== null) setQuoteFilePose(selected.id, recommendedId);
      else if (/^p[0-5]$/.test(value)) setQuoteFilePose(selected.id, Number(value.slice(1)));
    },
    [selected, recommendedId],
  );
  const recommendedRow = report?.orientationRows.find((row) => row.recommended) ?? null;
  const poseReason = recommendedRow
    ? `Empfohlen: ${recommendedRow.label} · ${recommendedRow.criticalShare.toFixed(1).replace('.', ',')} % kritische Überhänge · Stützmaterial ca. ${(
        (recommendedRow.supportVolumeUpper * PRINTCHECK_RULES.supportDensity.value) /
        1000
      )
        .toFixed(1)
        .replace('.', ',')} cm³`
    : selected?.printCheck.status === 'running' || selected?.printCheck.status === 'queued'
      ? 'Empfehlung folgt, sobald die Druckbarkeitsprüfung fertig ist.'
      : null;
  const voxelPoseId = checkGeometry?.voxel?.poseId ?? null;
  const layerProfile =
    checkGeometry?.layers?.areaProfile && voxelPoseId !== null
      ? { profile: checkGeometry.layers.areaProfile, poseValue: voxelPoseId === recommendedId ? 'recommended' : `p${voxelPoseId}` }
      : null;
  const look = useMemo(() => lookForPolymer(selectedMaterial?.polymer ?? null), [selectedMaterial]);

  /* ------------------------------------------------------ summary */

  const reference = sessionQuoteReference(session, now);
  const summaryModel: SummaryModel = {
    state,
    breakdown,
    shipWindow: state.kind === 'ok' || state.kind === 'manual' ? shipWindow : null,
    leadTimeLabel: leadTime.label,
    printCheckRunning: session.entries.some((entry) => entry.printCheck.status === 'running' || entry.printCheck.status === 'queued'),
    unpricedCount,
    nextPieceDeltaEur,
    titleBlock: {
      file: session.entries.length === 1 ? session.entries[0].file.name : `${session.entries.length} Dateien`,
      parameters: `${selectedMaterial?.priceGroupName ?? '–'} · ${Math.round(infill.fraction * 100)} % · ${session.selection.quantity} Stk · ${leadTime.label}`,
      reference,
      date: new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'Europe/Berlin' }).format(now),
    },
  };
  const cta = mode === 'calculator' && onRequest ? { label: 'Verbindliches Angebot anfordern', onClick: onRequest } : null;

  /* --------------------------------------------------------- tabs */

  const tabs: TabId[] = mode === 'calculator' ? ['model', 'printcheck', 'material', 'request'] : ['model', 'printcheck', 'material'];
  const badges: Record<TabId, TabBadge | null> = {
    model: modelBadge(selected, state.kind === 'oversize'),
    printcheck: selected?.format ? printCheckBadge(selected, report) : null,
    material: state.kind === 'ok' && breakdown ? { text: `${formatEur(breakdown.estimate.lowEur)} – ${formatEur(breakdown.estimate.highEur)}`, tone: 'neutral' } : null,
    request: reference ? { text: reference, tone: 'neutral' } : null,
  };
  const onTabKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (event.key === 'Home' || event.key === 'End' || delta !== 0) {
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + delta + tabs.length) % tabs.length;
      setTab(tabs[next]);
      tabRefs.current[tabs[next]]?.focus();
    }
  };

  const togglePin = (id: string) =>
    setPinned((current) => (current.includes(id) ? current.filter((entry) => entry !== id) : current.length >= MAX_COMPARED ? current : [...current, id]));
  const showCheckOffer =
    session.usePurpose === 'ersatzteil' ||
    session.usePurpose === 'vorrichtung' ||
    (session.entries.length >= 3 && selectedMaterial !== null && selectedMaterial.category !== 'Standard');
  const checkProduct = FIXED_PRICE_PRODUCTS[ERSATZTEIL_CHECK_KEY];

  /* ------------------------------------------------------- render */

  const stage = (() => {
    if (!selected) return null;
    if (selected.positions) {
      return (
        <Suspense
          fallback={
            <div className="blueprint flex h-full items-center justify-center gap-2 text-sm text-ink-soft">
              <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> 3D-Ansicht wird geladen …
            </div>
          }
        >
          <ModelViewer
            positions={selected.positions}
            label={`${selected.file.name}${selected.analysis ? `, ${formatDimensions(selected.analysis.bbox.size)}` : ''}`}
            look={look}
            highlight={viewerHighlight}
            onToggleHeatmap={toggleHeatmap}
            poses={poses}
            poseValue={poseValue}
            onPoseChange={onPoseChange}
            poseReason={poseReason}
            layerProfile={layerProfile}
            printTime={selectedPart ? { totalHours: selectedPart.printHours, fixedHours: PRICING_CONFIG.heatupMinutes / 60 } : null}
            layerHeightMm={PRICING_CONFIG.layerProfile.layerHeightMm}
            buildVolumeMm={PRICING_CONFIG.buildVolumeMm}
            oversize={selectedPart !== null && !selectedPart.fitsBuildVolume}
          />
        </Suspense>
      );
    }
    return <StagePlaceholder entry={selected} />;
  })();

  return (
    <div
      className={`grid grid-cols-1 gap-4 ${mode === 'calculator' ? 'xl:grid-cols-12 xl:gap-6' : ''}`}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        onAddFiles(event.dataTransfer.files);
      }}
    >
      {mode === 'calculator' && (
        <div className="sticky top-20 z-30 hidden md:block xl:hidden">
          <PriceSummaryBar model={summaryModel} cta={cta} />
        </div>
      )}

      <div className={`min-w-0 space-y-3 ${mode === 'calculator' ? 'xl:col-span-8' : ''}`}>
        {/* parts bar */}
        <div className={`flex items-center gap-2 overflow-x-auto rounded-md border bg-panel p-1.5 ${dragging ? 'border-accent' : 'border-line'}`}>
          <ul className="flex min-w-0 gap-1.5" aria-label="Dateien">
            {session.entries.map((entry) => {
              const badge = entryStatusBadge(entry);
              const Icon = BADGE_ICON[badge.tone];
              const active = entry.id === session.selectedId;
              return (
                <li key={entry.id} className={`flex shrink-0 items-center rounded border ${active ? 'border-accent bg-accent-soft' : 'border-line'}`}>
                  <button
                    type="button"
                    onClick={() => selectQuoteFile(entry.id)}
                    aria-pressed={active}
                    className="flex min-h-[40px] max-w-[14rem] items-center gap-2 px-2 text-left text-sm text-ink"
                    title={`${entry.file.name} – ${badge.text}`}
                  >
                    <FileBox className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
                    <span className="truncate">{entry.file.name}</span>
                    <Icon className={`h-3.5 w-3.5 shrink-0 ${BADGE_STYLE[badge.tone]}`} aria-hidden="true" />
                    <span className="sr-only">{badge.text}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeQuoteFile(entry.id)}
                    className="flex min-h-[40px] items-center px-1.5 text-ink-muted hover:text-crit"
                    aria-label={`${entry.file.name} entfernen`}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
          {session.entries.length < QUOTE_UPLOAD_LIMITS.maxFiles && (
            <button type="button" onClick={() => fileInputRef.current?.click()} className="tech-btn tech-btn-secondary ml-auto min-h-[40px] shrink-0 text-sm">
              <Plus className="h-4 w-4" aria-hidden="true" /> Datei
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPT_ATTRIBUTE}
            className="hidden"
            onChange={(event) => {
              onAddFiles(event.target.files);
              event.target.value = '';
            }}
          />
        </div>

        {/* viewer stage */}
        <div className="h-[52vh] min-h-[360px] overflow-hidden rounded-md border border-line md:h-[560px] xl:h-[600px]">{stage}</div>

        {/* tabs */}
        <div role="tablist" aria-label="Arbeitsschritte" className="grid grid-cols-2 gap-1 rounded-md border border-line bg-panel p-1 sm:flex">
          {tabs.map((id, index) => {
            const active = tab === id;
            return (
              <button
                key={id}
                ref={(element) => {
                  tabRefs.current[id] = element;
                }}
                type="button"
                role="tab"
                id={`ws-tab-${id}`}
                aria-selected={active}
                aria-controls={`ws-panel-${id}`}
                tabIndex={active ? 0 : -1}
                onClick={() => setTab(id)}
                onKeyDown={(event) => onTabKey(event, index)}
                className={`flex min-h-[48px] flex-1 flex-col items-start justify-center rounded px-3 py-1 text-left transition-colors duration-100 ${
                  active ? 'bg-panel-2 text-ink shadow-[inset_0_-2px_0_var(--accent)]' : 'text-ink-soft hover:bg-panel-2'
                }`}
              >
                <span className="text-sm font-medium">
                  <span className="num text-ink-muted">{index + 1}</span> {TAB_LABEL[id]}
                </span>
                {badges[id] && <Badge badge={badges[id] as TabBadge} />}
              </button>
            );
          })}
        </div>

        <div role="tabpanel" id={`ws-panel-${tab}`} aria-labelledby={`ws-tab-${tab}`} className="tech-panel p-4 md:p-5" tabIndex={0}>
          {tab === 'model' &&
            (selected ? (
              <ModelReport entry={selected} material={selectedMaterial} part={selectedPart} infillLabel={infill.label} />
            ) : (
              <p className="text-sm text-ink-soft">Keine Datei ausgewählt.</p>
            ))}

          {tab === 'printcheck' &&
            (selected?.format ? (
              <div className="space-y-3">
                {report && <p className="text-sm font-medium text-ink">{printCheckHeadline(report)}</p>}
                <PrintCheckPanel
                  entry={selected}
                  report={report}
                  mode={mode}
                  activeHighlight={activeHighlight}
                  onToggleHighlight={toggleHighlight}
                  highlightAvailable={Boolean(selected.positions && flags)}
                  onApplyPose={selected.positions ? (poseId) => setQuoteFilePose(selected.id, poseId) : undefined}
                  appliedPoseId={highlightNeedsRecommended ? recommendedId : chosenPoseId}
                />
              </div>
            ) : (
              <p className="text-sm text-ink-soft">Für diese Datei gibt es keine automatische Prüfung – ich prüfe sie von Hand.</p>
            ))}

          {tab === 'material' && (
            <div className="space-y-6">
              <section aria-labelledby="ws-material-title" className="space-y-3">
                <h3 id="ws-material-title" className="text-lg font-semibold text-ink">
                  Werkstoff
                </h3>
                <MaterialPicker
                  materials={materials}
                  selectedId={session.selection.materialId}
                  onSelect={(id) => handleSelection({ materialId: id })}
                  pinned={pinned}
                  onTogglePin={togglePin}
                />
                <MaterialCompare
                  materials={pinned.map((id) => materials.find((material) => material.id === id)).filter((material): material is NonNullable<typeof material> => Boolean(material))}
                  catalog={materials}
                  parts={parts}
                  selection={session.selection}
                  onUnpin={togglePin}
                  onSelect={(id) => handleSelection({ materialId: id })}
                />
              </section>

              <section aria-labelledby="ws-params-title" className="space-y-3">
                <h3 id="ws-params-title" className="text-lg font-semibold text-ink">
                  Füllgrad, Stückzahl, Lieferstufe
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="block text-sm text-ink-soft">
                    Füllgrad
                    <select
                      value={session.selection.infillId}
                      onChange={(event) => handleSelection({ infillId: event.target.value })}
                      className="tech-field mt-1"
                    >
                      {PRICING_CONFIG.infillOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm text-ink-soft">
                    Stückzahl {session.entries.length > 1 ? 'je Teil' : ''}
                    <input
                      type="number"
                      min={1}
                      max={PRICING_CONFIG.maxQuantity}
                      step={1}
                      value={session.selection.quantity}
                      onKeyDown={(event) => {
                        // the workspace may sit inside the request form: Enter must not submit it
                        if (event.key === 'Enter') event.preventDefault();
                      }}
                      onChange={(event) => {
                        const parsed = Number.parseInt(event.target.value, 10);
                        if (Number.isInteger(parsed)) handleSelection({ quantity: Math.min(PRICING_CONFIG.maxQuantity, Math.max(1, parsed)) });
                      }}
                      className="tech-field num mt-1"
                    />
                  </label>
                </div>
                <fieldset>
                  <legend className="mb-1 text-sm text-ink-soft">Lieferstufe</legend>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {PRICING_CONFIG.leadTimeOptions.map((option) => {
                      const window = tryShipWindow(now, option);
                      const active = session.selection.leadTimeId === option.id;
                      return (
                        <label
                          key={option.id}
                          className={`cursor-pointer rounded border px-3 py-2 text-sm transition-colors duration-100 ${active ? 'border-accent bg-accent-soft' : 'border-line hover:border-line-strong'}`}
                        >
                          <input
                            type="radio"
                            name="quote_lead_time"
                            value={option.id}
                            checked={active}
                            onChange={() => handleSelection({ leadTimeId: option.id })}
                            className="sr-only"
                          />
                          <span className="block font-medium text-ink">{option.label}</span>
                          <span className="block text-xs text-ink-muted">
                            {option.days}
                            {option.factor !== 1 ? ` · ${option.factor > 1 ? '+' : '−'}${Math.round(Math.abs(option.factor - 1) * 100)} % Fertigung` : ''}
                          </span>
                          <span className="num block text-xs text-ink">
                            {window ? `Versand ${formatCivilDate(window.earliest)} – ${formatCivilDate(window.latest)}` : 'Termin mit dem Angebot'}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  {shipWindow && (
                    <p className="mt-1 text-xs text-ink-muted">
                      Ab Freigabe des Angebots bis {formatCivilDate(shipWindow.approvalBy)} {shipWindow.cutoffHour}:00 Uhr; Werktage Mo–Fr ohne hessische
                      Feiertage.
                    </p>
                  )}
                </fieldset>
              </section>

              {breakdown && (
                <section aria-labelledby="ws-breakdown-title" className="space-y-2">
                  <h3 id="ws-breakdown-title" className="text-lg font-semibold text-ink">
                    Rechenweg
                  </h3>
                  <PriceBreakdown breakdown={breakdown} />
                </section>
              )}

              {curve && (
                <section aria-labelledby="ws-curve-title" className="space-y-2">
                  <h3 id="ws-curve-title" className="text-lg font-semibold text-ink">
                    Preis nach Menge
                  </h3>
                  <QuantityCurve
                    points={curve}
                    selected={session.selection.quantity}
                    onSelect={(quantity) => handleSelection({ quantity })}
                    unitLabel={parts.length > 1 ? 'Satz' : 'Stück'}
                    minimumLimit={minimumLimit}
                  />
                </section>
              )}
              {state.kind === 'oversize' && (
                <p className="text-sm text-ink-soft">Größer als mein Bauraum – Rechenweg und Mengenkurve gibt es nach der Prüfung.</p>
              )}
            </div>
          )}

          {tab === 'request' && mode === 'calculator' && (
            <div className="space-y-4">
              <table className="w-full text-sm">
                <caption className="sr-only">Zusammenfassung der Anfrage</caption>
                <thead>
                  <tr className="border-b border-line">
                    <th scope="col" className="label-caps py-1 text-left">
                      Datei
                    </th>
                    <th scope="col" className="label-caps py-1 text-left">
                      Maße
                    </th>
                    <th scope="col" className="label-caps py-1 text-left">
                      Drucklage
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {session.entries.map((entry) => (
                    <tr key={entry.id} className="border-b border-line align-top last:border-b-0">
                      <td className="py-1.5 pr-2 text-ink">
                        {entry.file.name}
                        <span className="block text-xs text-ink-muted">{entry.format ? MODEL_FORMAT_LABEL[entry.format] : 'ohne Vorschau'}</span>
                      </td>
                      <td className="num py-1.5 pr-2 text-ink">{entry.analysis ? formatDimensions(entry.analysis.bbox.size) : '–'}</td>
                      <td className="py-1.5 text-ink-soft">{entry.chosenPoseId === null ? 'wie geladen' : POSES[entry.chosenPoseId].label}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-sm text-ink-soft">
                Richtpreis-ID <span className="num text-ink">{reference || '–'}</span>
                {report ? ` · Druckbarkeit: ${printCheckHeadline(report)}` : ''}
              </p>
              <label className="block max-w-sm text-sm text-ink-soft">
                Einsatzzweck (optional)
                <select
                  value={session.usePurpose ?? ''}
                  onChange={(event) => setQuoteUsePurpose((event.target.value || null) as UsePurpose | null)}
                  className="tech-field mt-1"
                >
                  <option value="">keine Angabe</option>
                  {USE_PURPOSES.map((purpose) => (
                    <option key={purpose.id} value={purpose.id}>
                      {purpose.label}
                    </option>
                  ))}
                </select>
              </label>
              {showCheckOffer && (
                <div className="rounded border border-line bg-panel-2 p-3 text-sm">
                  <p className="flex items-center gap-2 font-medium text-ink">
                    <ClipboardCheck className="h-4 w-4 text-accent" aria-hidden="true" /> {checkProduct.name} ·{' '}
                    <span className="num">{formatEuroCents(checkProduct.netAmountCents)} netto</span>
                  </p>
                  <p className="mt-1 text-ink-soft">
                    Sie haben mehrere Ersatzteile? Beim Ersatzteil-Check gehe ich mit Ihnen vor Ort durch, welche Teile sich lohnen – und lege sie für
                    Nachdrucke an.
                  </p>
                  <Link to="/ersatzteile-3d-drucken/#check" className="mt-1 inline-block text-accent underline">
                    Zum Ersatzteil-Check
                  </Link>
                </div>
              )}
              <p className="text-sm text-ink-soft">
                Mit „Verbindliches Angebot anfordern“ geht es zum Anfrageformular – Dateien, Parameter, Drucklage und Richtpreis-ID sind dort schon
                eingetragen. Hochgeladen wird erst beim Absenden.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* summary: desktop sidebar (request form: also inline below xl) */}
      <aside className={mode === 'calculator' ? 'hidden xl:col-span-4 xl:block' : ''}>
        <div className={mode === 'calculator' ? 'xl:sticky xl:top-24' : ''}>
          <PriceSummaryPanel model={summaryModel} cta={cta} />
        </div>
      </aside>

      {mode === 'calculator' && (
        <div className="md:hidden">
          {/* reserve space so the fixed bar never covers content */}
          <div className="h-28" aria-hidden="true" />
          <PriceSummaryMobile model={summaryModel} cta={cta} />
        </div>
      )}
    </div>
  );
};

export default QuoteWorkspace;
