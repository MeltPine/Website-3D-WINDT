import React, { Suspense, lazy, useEffect, useMemo } from 'react';
import { Box, FileText, Loader2, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MODEL_FORMAT_LABEL } from '../../lib/geometry/format';
import {
  MATERIAL_CATALOG,
  validateMaterialCatalog,
  type MaterialCatalog,
  type MaterialSpec,
} from '../../lib/quote/materials';
import { PRICING_CONFIG } from '../../lib/quote/pricingConfig';
import {
  QUOTE_UPLOAD_LIMITS,
  removeQuoteFile,
  selectQuoteFile,
  updateQuoteSelection,
  useQuoteSession,
  type QuoteFileEntry,
} from '../../lib/quote/quoteSession';
import { computeSessionEstimate } from '../../lib/quote/sessionEstimate';
import { formatDimensions, formatEur, formatMegabytes, formatVolumeCm3 } from '../../lib/quote/summary';
import { trackEvent } from '../../lib/tracking';
import { familyForCatalogMaterial, werkstoffPath } from '../../lib/werkstoffe/families';

/*
 * Everything the workbench shows once at least one file is selected: viewer,
 * file list, calculator and price range. Split into its own chunk (together
 * with the material database and pricing code) so pages without a selected
 * file do not pay for it; three.js is split further into ModelViewer.
 */

const ModelViewer = lazy(() => import('./ModelViewer'));

const fieldClassName =
  'w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-primary-600 focus:border-primary-600 transition-colors';

let priceRangeTracked = false;

function statusLine(entry: QuoteFileEntry): React.ReactNode {
  switch (entry.status) {
    case 'queued':
      return <span className="text-gray-500">wartet auf Analyse …</span>;
    case 'analyzing':
      return (
        <span className="inline-flex items-center gap-1 text-primary-700">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          {entry.format === 'step' ? 'STEP wird trianguliert …' : 'wird analysiert …'}
        </span>
      );
    case 'ready':
      return entry.analysis ? (
        <span className="text-gray-700">
          {formatDimensions(entry.analysis.bbox.size)} · {formatVolumeCm3(entry.analysis.volumeMm3)}
        </span>
      ) : null;
    case 'failed':
      return <span className="text-amber-800">{entry.error} Die Datei wird trotzdem übermittelt.</span>;
    case 'upload-only':
      return <span className="text-gray-500">Keine Vorschau – wird mit der Anfrage übermittelt.</span>;
    default:
      return null;
  }
}

const MaterialFacts = ({ material }: { material: MaterialSpec }) => {
  const family = familyForCatalogMaterial(material);
  return (
    <div className="mt-2 space-y-1 text-xs text-gray-600">
      {material.description && <p>{material.description}</p>}
      {material.keyFacts.length > 0 && (
        <ul className="space-y-0.5">
          {material.keyFacts.map((fact) => (
            <li key={fact}>{fact}</li>
          ))}
        </ul>
      )}
      <p>
        Dichte {new Intl.NumberFormat('de-DE', { maximumFractionDigits: 3 }).format(material.densityGPerCm3)} g/cm³
        {material.densitySource === 'price-group'
          ? ` (Richtwert Werkstoffgruppe ${material.priceGroupName}${
              material.origin === 'datasheet' ? ', Datenblatt ohne Angabe' : ''
            })`
          : ' (Herstellerdatenblatt)'}
        {material.origin === 'datasheet' && material.priceGroupName !== material.polymer
          ? ` · Preisgruppe ${material.priceGroupName}`
          : ''}
      </p>
      {material.datasheetUrl && (
        <p>
          <a
            href={material.datasheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-700 underline hover:text-primary-800"
          >
            Technisches Datenblatt{material.datasheetIsMirror ? ' (Händler-Kopie des Herstellerdokuments)' : ''}
          </a>
        </p>
      )}
      {material.origin === 'datasheet' && (
        <p className="text-gray-500">Kennwerte des Rohmaterials laut Hersteller, nicht des gedruckten Bauteils.</p>
      )}
      {family && (
        <p>
          <Link
            to={`${werkstoffPath(family.slug)}${material.origin === 'datasheet' ? `#${material.id}` : ''}`}
            className="text-primary-700 underline hover:text-primary-800"
          >
            Datenblatt & Eigenschaften: {family.name} in der Werkstoff-Bibliothek
          </Link>
        </p>
      )}
    </div>
  );
};

interface QuoteDetailsProps {
  catalog?: MaterialCatalog;
  footer?: React.ReactNode;
  onInteract?: () => void;
}

const QuoteDetails = ({ catalog = MATERIAL_CATALOG, footer, onInteract }: QuoteDetailsProps) => {
  const session = useQuoteSession();
  const materials = useMemo(() => validateMaterialCatalog(catalog), [catalog]);

  const { estimate, pendingCount, unpricedCount } = useMemo(
    () => computeSessionEstimate(session.entries, session.selection, materials, PRICING_CONFIG),
    [session.entries, session.selection, materials],
  );
  const selected = session.entries.find((entry) => entry.id === session.selectedId) ?? null;
  const selectedMaterial = materials.find((material) => material.id === session.selection.materialId) ?? null;
  const totalBytes = session.entries.reduce((sum, entry) => sum + entry.file.size, 0);

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

  const handleSelection = (patch: Parameters<typeof updateQuoteSelection>[0]) => {
    onInteract?.();
    updateQuoteSelection(patch);
  };

  return (
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-3">
          <div className="h-72 md:h-96 overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
            {selected?.positions ? (
              <Suspense
                fallback={
                  <div className="flex h-full items-center justify-center text-sm text-gray-600">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" aria-hidden="true" /> 3D-Vorschau wird geladen …
                  </div>
                }
              >
                <ModelViewer
                  positions={selected.positions}
                  label={`${selected.file.name}${
                    selected.analysis ? `, ${formatDimensions(selected.analysis.bbox.size)}` : ''
                  }`}
                />
              </Suspense>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-gray-600">
                <Box className="h-8 w-8 text-gray-400" aria-hidden="true" />
                {selected?.status === 'queued' || selected?.status === 'analyzing'
                  ? 'Modell wird analysiert …'
                  : selected?.status === 'ready'
                    ? 'Vorschau nicht verfügbar (Speicherlimit erreicht) – Maße und Richtpreis sind berechnet.'
                    : 'Für diese Datei ist keine Vorschau verfügbar.'}
              </div>
            )}
          </div>
          {selected?.analysis && (
            <dl className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <div className="glass-lite rounded-lg px-3 py-2">
                <dt className="text-gray-500">Maße (B × T × H)</dt>
                <dd className="font-semibold text-gray-900">{formatDimensions(selected.analysis.bbox.size)}</dd>
              </div>
              <div className="glass-lite rounded-lg px-3 py-2">
                <dt className="text-gray-500">Volumen</dt>
                <dd className="font-semibold text-gray-900">{formatVolumeCm3(selected.analysis.volumeMm3)}</dd>
              </div>
              <div className="glass-lite rounded-lg px-3 py-2">
                <dt className="text-gray-500">Oberfläche</dt>
                <dd className="font-semibold text-gray-900">
                  {new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 }).format(
                    selected.analysis.surfaceAreaMm2 / 100,
                  )}{' '}
                  cm²
                </dd>
              </div>
              <div className="glass-lite rounded-lg px-3 py-2">
                <dt className="text-gray-500">Dreiecke</dt>
                <dd className="font-semibold text-gray-900">
                  {new Intl.NumberFormat('de-DE').format(selected.analysis.triangleCount)}
                </dd>
              </div>
            </dl>
          )}
          {selected?.analysis?.openMeshSuspected && (
            <p className="text-sm text-amber-800 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              Das Netz scheint nicht geschlossen zu sein. Volumen und Richtpreis können abweichen – wir prüfen
              die Datei im Angebot.
            </p>
          )}
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-1">Ihre Dateien</h3>
            <p className="text-xs text-gray-500 mb-3">
              {session.entries.length}/{QUOTE_UPLOAD_LIMITS.maxFiles} Dateien · {formatMegabytes(totalBytes)} von{' '}
              {QUOTE_UPLOAD_LIMITS.maxTotalMb} MB
            </p>
            <ul className="space-y-2">
              {session.entries.map((entry) => (
                <li
                  key={entry.id}
                  className={`flex items-start justify-between gap-2 rounded-lg border p-2.5 ${
                    entry.id === session.selectedId
                      ? 'border-primary-400 bg-primary-50/60 dark:bg-primary-900/40'
                      : 'border-gray-200'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => selectQuoteFile(entry.id)}
                    className="flex min-w-0 flex-1 items-start gap-2 text-left"
                    aria-pressed={entry.id === session.selectedId}
                  >
                    <FileText className="h-4 w-4 mt-0.5 shrink-0 text-primary-600" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-gray-900">{entry.file.name}</span>
                      <span className="block text-xs">
                        {entry.format ? `${MODEL_FORMAT_LABEL[entry.format]} · ` : ''}
                        {formatMegabytes(entry.file.size)} · {statusLine(entry)}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeQuoteFile(entry.id)}
                    className="shrink-0 rounded p-1 text-gray-500 hover:text-red-600"
                    aria-label={`${entry.file.name} entfernen`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
            <h3 className="font-semibold text-gray-900">Parameter für den Richtpreis</h3>
            <div>
              <label htmlFor="quote_material" className="block text-sm font-medium text-gray-700 mb-1">
                Material
              </label>
              <select
                id="quote_material"
                value={session.selection.materialId}
                onChange={(event) => handleSelection({ materialId: event.target.value })}
                className={fieldClassName}
              >
                <optgroup label="Herstellermaterialien mit Datenblatt">
                  {materials
                    .filter((material) => material.origin === 'datasheet')
                    .map((material) => (
                      <option key={material.id} value={material.id}>
                        {material.name} ({material.polymer})
                      </option>
                    ))}
                </optgroup>
                <optgroup label="Weitere Werkstoffgruppen (Richtwerte)">
                  {materials
                    .filter((material) => material.origin === 'price-group')
                    .map((material) => (
                      <option key={material.id} value={material.id}>
                        {material.name} – {material.category}
                      </option>
                    ))}
                </optgroup>
              </select>
              {selectedMaterial && <MaterialFacts material={selectedMaterial} />}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="quote_infill" className="block text-sm font-medium text-gray-700 mb-1">
                  Füllgrad
                </label>
                <select
                  id="quote_infill"
                  value={session.selection.infillId}
                  onChange={(event) => handleSelection({ infillId: event.target.value })}
                  className={fieldClassName}
                >
                  {PRICING_CONFIG.infillOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="quote_quantity" className="block text-sm font-medium text-gray-700 mb-1">
                  Stückzahl je Teil
                </label>
                <input
                  id="quote_quantity"
                  type="number"
                  min={1}
                  max={PRICING_CONFIG.maxQuantity}
                  step={1}
                  value={session.selection.quantity}
                  onKeyDown={(event) => {
                    // The workbench may sit inside the request form: Enter must not submit it.
                    if (event.key === 'Enter') event.preventDefault();
                  }}
                  onChange={(event) => {
                    const parsed = Number.parseInt(event.target.value, 10);
                    if (Number.isInteger(parsed)) {
                      handleSelection({ quantity: Math.min(PRICING_CONFIG.maxQuantity, Math.max(1, parsed)) });
                    }
                  }}
                  className={fieldClassName}
                />
              </div>
            </div>
            <fieldset>
              <legend className="block text-sm font-medium text-gray-700 mb-1">Lieferzeit</legend>
              <div className="grid grid-cols-3 gap-2">
                {PRICING_CONFIG.leadTimeOptions.map((option) => (
                  <label
                    key={option.id}
                    className={`cursor-pointer rounded-lg border px-2 py-2 text-center text-sm ${
                      session.selection.leadTimeId === option.id
                        ? 'border-primary-500 bg-primary-50 text-primary-800'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="quote_lead_time"
                      value={option.id}
                      checked={session.selection.leadTimeId === option.id}
                      onChange={() => handleSelection({ leadTimeId: option.id })}
                      className="sr-only"
                    />
                    <span className="block font-semibold">{option.label}</span>
                    <span className="block text-xs text-gray-500">{option.days}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="rounded-xl border border-primary-200 bg-primary-50 p-4" aria-live="polite">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-800">
              Unverbindliche Richtpreis-Spanne
            </p>
            {estimate?.status === 'ok' ? (
              <>
                <p className="font-display text-3xl font-bold text-gray-900 mt-1">
                  {formatEur(estimate.lowEur)} – {formatEur(estimate.highEur)}
                </p>
                <p className="text-sm text-gray-700">
                  netto zzgl. USt. · {estimate.parts.length} Bauteil{estimate.parts.length === 1 ? '' : 'e'} ×{' '}
                  {estimate.quantity} Stk. · {estimate.material.name} · {estimate.leadTime.days}
                </p>
                {estimate.minimumOrderApplied && (
                  <p className="mt-1 text-xs text-gray-600">
                    Enthält den Mindestauftragswert von {formatEur(PRICING_CONFIG.minimumOrderEur)}.
                  </p>
                )}
              </>
            ) : estimate?.status === 'oversize' ? (
              <p className="mt-1 text-sm text-amber-900">
                Mindestens ein Bauteil ist größer als unser Bauraum (
                {PRICING_CONFIG.buildVolumeMm.join(' × ')} mm). Wir prüfen Teilung oder Alternativen und
                melden uns mit einem Angebot.
              </p>
            ) : (
              <p className="mt-1 text-sm text-gray-700">
                {pendingCount > 0
                  ? 'Wird berechnet, sobald die Analyse abgeschlossen ist …'
                  : 'Für diese Dateien ist keine automatische Berechnung möglich – Sie erhalten ein individuelles Angebot.'}
              </p>
            )}
            {estimate?.status === 'ok' && unpricedCount > 0 && (
              <p className="mt-1 text-xs text-gray-600">
                {unpricedCount === 1
                  ? '1 Datei ohne automatische Analyse ist nicht enthalten und wird manuell kalkuliert.'
                  : `${unpricedCount} Dateien ohne automatische Analyse sind nicht enthalten und werden manuell kalkuliert.`}
              </p>
            )}
            <p className="mt-3 text-xs text-gray-600">
              Kein verbindliches Angebot. Die Spanne basiert auf Volumen, Oberfläche und Bauraum Ihres Modells.
              Ausrichtung, Stützstrukturen, Toleranzen und Nachbearbeitung klären wir in der technischen Prüfung
              – das verbindliche Angebot erhalten Sie in der Regel innerhalb von 24 Stunden (werktags).
            </p>
            {footer && <div className="mt-4">{footer}</div>}
          </div>
        </div>
      </div>
  );
};

export default QuoteDetails;
