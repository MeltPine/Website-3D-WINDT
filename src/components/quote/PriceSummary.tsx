import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Loader2, X } from 'lucide-react';
import { formatCents } from '../../lib/quote/breakdownDisplay';
import { formatCivilDate, type ShipWindow } from '../../lib/quote/leadDate';
import type { ProjectBreakdown } from '../../lib/quote/pricing';
import { PRICING_CONFIG } from '../../lib/quote/pricingConfig';
import { formatEur } from '../../lib/quote/summary';
import type { SummaryState } from '../../lib/quote/workspaceState';
import PriceBreakdown from './PriceBreakdown';

/*
 * The one place with the primary call to action. Desktop: sticky sidebar.
 * Tablet: one-line sticky bar under the header. Phone: bottom bar with a
 * sheet for the breakdown. All variants render the same state.
 */

export interface SummaryModel {
  state: SummaryState;
  breakdown: ProjectBreakdown | null;
  shipWindow: ShipWindow | null;
  leadTimeLabel: string;
  printCheckRunning: boolean;
  unpricedCount: number;
  /** Extra cost of one more piece while the minimum order applies (null otherwise). */
  nextPieceDeltaEur: number | null;
  titleBlock: { file: string; parameters: string; reference: string; date: string };
}

export interface SummaryCta {
  label: string;
  onClick: () => void;
}

const buildVolumeText = PRICING_CONFIG.buildVolumeMm.join(' × ');

function rangeText(breakdown: ProjectBreakdown): string {
  return `${formatEur(breakdown.estimate.lowEur)} – ${formatEur(breakdown.estimate.highEur)}`;
}

function shipText(window: ShipWindow | null): string | null {
  return window ? formatCivilDate(window.earliest, true) : null;
}

const StateText = ({ model }: { model: SummaryModel }) => {
  const { state } = model;
  if (state.kind === 'pending') {
    return (
      <p className="flex items-center gap-2 text-sm text-ink-soft" role="status">
        <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> Wird berechnet …
      </p>
    );
  }
  if (state.kind === 'oversize') {
    return (
      <p className="text-sm text-ink-soft">
        {state.fileNames.length > 0 ? `${state.fileNames.join(', ')}: ` : ''}größer als mein Bauraum ({buildVolumeText} mm). Teilen und
        verkleben geht oft gut – ich sage Ihnen, wo die Naht hingehört. Einen Preis nenne ich nach der Prüfung.
      </p>
    );
  }
  if (state.kind === 'manual') {
    return (
      <p className="text-sm text-ink-soft">
        Manuell kalkuliert.{' '}
        {state.reason === 'parse-error'
          ? 'Die Datei ließ sich im Browser nicht lesen – sie wird trotzdem mit der Anfrage übermittelt.'
          : 'Für diese Datei gibt es keine automatische Berechnung – ich rechne sie von Hand.'}
      </p>
    );
  }
  return null;
};

export const PriceSummaryPanel = ({ model, cta }: { model: SummaryModel; cta: SummaryCta | null }) => {
  const { breakdown, state } = model;
  const minimum = breakdown?.lines.find((line) => line.key === 'minimumOrder' && line.amountCents > 0) ?? null;
  const ship = shipText(model.shipWindow);
  return (
    <section aria-labelledby="summary-title" className="tech-panel space-y-4 p-4 xl:p-5" style={{ boxShadow: 'var(--summary-shadow)' }}>
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="summary-title" className="label-caps">
          Richtpreis
        </h2>
        <span className="label-caps">netto</span>
      </div>
      <div aria-live="polite">
        {state.kind === 'ok' && breakdown ? (
          <>
            <p className="font-display tabular-nums text-[44px] font-semibold leading-[48px] text-ink">{rangeText(breakdown)}</p>
            <p className="num mt-1 text-sm text-ink-soft">Punktwert {formatCents(breakdown.totalCents)}</p>
            {model.printCheckRunning && <p className="mt-1 text-xs text-ink-muted">Druckbarkeitsprüfung läuft – der Preis hängt nicht davon ab.</p>}
          </>
        ) : (
          <StateText model={model} />
        )}
      </div>

      {state.kind === 'ok' && breakdown && (
        <>
          <PriceBreakdown breakdown={breakdown} compact />
          {minimum && (
            <p className="text-xs text-ink-soft">
              Hier greift der Mindestauftrag von {formatEur(PRICING_CONFIG.minimumOrderEur)}.
              {model.nextPieceDeltaEur !== null &&
                ` Ein weiteres Stück kostet Sie nur rund ${formatEur(Math.max(1, Math.round(model.nextPieceDeltaEur)))} mehr.`}
            </p>
          )}
          <details className="text-xs text-ink-soft">
            <summary className="cursor-pointer font-medium text-ink">Warum eine Spanne?</summary>
            <p className="mt-1">
              Stützen, Ausrichtung und Nacharbeit sehe ich erst im Slicer. Nachbearbeitung ist im Richtpreis nicht enthalten – sie steckt
              nur im oberen Wert der Spanne und wird im Angebot einzeln genannt.
            </p>
          </details>
          {model.unpricedCount > 0 && (
            <p className="text-xs text-ink-muted">
              {model.unpricedCount === 1 ? '1 Datei ohne Analyse ist' : `${model.unpricedCount} Dateien ohne Analyse sind`} nicht enthalten und
              werden von Hand kalkuliert.
            </p>
          )}
        </>
      )}

      <div className="border-t border-line pt-3">
        <p className="label-caps">Versand frühestens</p>
        <p className="num mt-0.5 text-sm text-ink">
          {ship ? `${ship} (${model.leadTimeLabel})` : 'Termin kommt mit dem Angebot'}
        </p>
        {model.shipWindow && (
          <p className="mt-0.5 text-xs text-ink-muted">
            wenn Sie das Angebot bis {formatCivilDate(model.shipWindow.approvalBy)} {model.shipWindow.cutoffHour}:00 Uhr freigeben
          </p>
        )}
      </div>

      {cta && (
        <div className="space-y-1.5">
          <button type="button" onClick={cta.onClick} className="tech-btn tech-btn-primary w-full text-base">
            {cta.label} <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
          <p className="text-xs text-ink-muted">Ich prüfe Ihre Datei selbst und melde mich werktags binnen 24 h. Richtpreis – kein Angebot.</p>
        </div>
      )}

      <table className="w-full border border-line text-xs" aria-label="Schriftfeld">
        <tbody>
          <tr className="border-b border-line">
            <th scope="row" className="label-caps w-20 px-2 py-1 text-left">
              Datei
            </th>
            <td className="num break-all px-2 py-1 text-ink">{model.titleBlock.file}</td>
          </tr>
          <tr className="border-b border-line">
            <th scope="row" className="label-caps px-2 py-1 text-left">
              Parameter
            </th>
            <td className="px-2 py-1 text-ink">{model.titleBlock.parameters}</td>
          </tr>
          <tr>
            <th scope="row" className="label-caps px-2 py-1 text-left">
              RP-ID
            </th>
            <td className="num px-2 py-1 text-ink">
              {model.titleBlock.reference || '–'} · {model.titleBlock.date}
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  );
};

/** Tablet: one line under the header. */
export const PriceSummaryBar = ({ model, cta }: { model: SummaryModel; cta: SummaryCta | null }) => {
  const ship = shipText(model.shipWindow);
  return (
    <div className="tech-panel flex items-center gap-4 px-4 py-2" style={{ boxShadow: 'var(--summary-shadow)' }}>
      <p className="label-caps">Richtpreis netto</p>
      <p className="num font-display text-2xl font-semibold text-ink">
        {model.state.kind === 'ok' && model.breakdown ? rangeText(model.breakdown) : model.state.kind === 'pending' ? '…' : 'nach Prüfung'}
      </p>
      <p className="num text-sm text-ink-soft">{ship ? `Versand ab ${ship}` : ''}</p>
      {cta && (
        <button type="button" onClick={cta.onClick} className="tech-btn tech-btn-primary ml-auto">
          {cta.label} <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
};

/** Phone: fixed bottom bar with a sheet for the breakdown. */
export const PriceSummaryMobile = ({ model, cta }: { model: SummaryModel; cta: SummaryCta | null }) => {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const ship = shipText(model.shipWindow);
  useEffect(() => {
    if (!open) return undefined;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-panel px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2" style={{ boxShadow: 'var(--summary-shadow)' }}>
        <div className="flex items-baseline justify-between gap-2">
          <p className="num font-display text-xl font-semibold text-ink">
            {model.state.kind === 'ok' && model.breakdown ? `${rangeText(model.breakdown)} netto` : model.state.kind === 'pending' ? 'Wird berechnet …' : 'Preis nach Prüfung'}
          </p>
          <p className="num text-xs text-ink-soft">{ship ? `Versand ${ship.slice(3, 9)}` : ''}</p>
        </div>
        <div className="mt-1.5 flex gap-2">
          <button type="button" onClick={() => setOpen(true)} className="tech-btn tech-btn-secondary flex-1 text-sm" aria-haspopup="dialog">
            Aufschlüsselung
          </button>
          {cta && (
            <button type="button" onClick={cta.onClick} className="tech-btn tech-btn-primary flex-1 text-sm">
              Angebot <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40" role="presentation" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Aufschlüsselung des Richtpreises"
            className="max-h-[85vh] w-full overflow-y-auto rounded-t-md bg-canvas p-3 pb-[max(1rem,env(safe-area-inset-bottom))]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-2 flex justify-end">
              <button ref={closeRef} type="button" onClick={() => setOpen(false)} className="tech-btn tech-btn-secondary" aria-label="Schließen">
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <PriceSummaryPanel model={model} cta={null} />
          </div>
        </div>
      )}
    </>
  );
};
