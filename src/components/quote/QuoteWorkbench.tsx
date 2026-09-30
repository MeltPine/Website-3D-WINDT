import { Suspense, lazy, useRef, useState } from 'react';
import { AlertCircle, Loader2, Lock, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { MaterialCatalog } from '../../lib/quote/materials';
import { QUOTE_UPLOAD_LIMITS, addQuoteFiles, useQuoteSession } from '../../lib/quote/quoteSession';
import { ACCEPT_ATTRIBUTE, UPLOAD_POLICY } from '../../lib/upload/policy';

/*
 * Empty state (server-rendered, main bundle): the drop zone on a blueprint
 * grid. As soon as a file is selected the page turns into the workspace
 * (lazy QuoteWorkspace: viewer, tabs, summary); further files are added from
 * its parts bar or by dropping onto it.
 */

const QuoteWorkspace = lazy(() => import('./QuoteWorkspace'));

interface QuoteWorkbenchProps {
  /** Pluggable material source; defaults to FDM-INSPECT products + 3D-WINDT price groups. */
  catalog?: MaterialCatalog;
  /** Small step label above the drop zone (e.g. inside the request form). */
  stepLabel?: string;
  /** Called on the first user interaction (file added or parameter changed). */
  onInteract?: () => void;
  /** Where the workbench is embedded: the calculator has the primary CTA, the request form not. */
  printCheckMode: 'calculator' | 'request';
  /** Primary CTA of the calculator ("Verbindliches Angebot anfordern"). */
  onRequest?: () => void;
}

/** Status element "file stays local" (spec: permanent, not prose). */
export const LocalStatus = ({ className = '' }: { className?: string }) => (
  <p className={`inline-flex items-center gap-2 text-sm text-ink-soft ${className}`}>
    <span className="inline-block h-2.5 w-2.5 bg-ok" aria-hidden="true" />
    <span>
      <span className="font-medium text-ink">Lokal · nichts übertragen.</span> Ihre Datei verlässt den Rechner erst, wenn Sie die Anfrage
      abschicken.
    </span>
  </p>
);

const QuoteWorkbench = ({ catalog, stepLabel, onInteract, printCheckMode, onRequest }: QuoteWorkbenchProps) => {
  const session = useQuoteSession();
  const [addErrors, setAddErrors] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    onInteract?.();
    setAddErrors(addQuoteFiles(Array.from(fileList)));
  };

  const errors = addErrors.length > 0 && (
    <div className="flex items-start gap-2 rounded border border-line bg-crit-bg px-3 py-2 text-sm text-ink" role="alert">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-crit" aria-hidden="true" />
      <span>{addErrors.join(' · ')}</span>
    </div>
  );

  if (session.entries.length > 0) {
    return (
      <div className="space-y-3">
        {errors}
        <Suspense
          fallback={
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-ink-soft">
              <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> Arbeitsfläche wird geladen …
            </div>
          }
        >
          <QuoteWorkspace catalog={catalog} mode={printCheckMode} onInteract={onInteract} onRequest={onRequest} onAddFiles={handleFiles} />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        className={`blueprint rounded-md border-2 border-dashed p-6 text-center transition-colors duration-100 md:p-10 ${
          isDragging ? 'border-accent bg-accent-soft' : 'border-line-strong bg-panel'
        }`}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          handleFiles(event.dataTransfer.files);
        }}
      >
        {stepLabel && <p className="label-caps mb-2">{stepLabel}</p>}
        <Upload className="mx-auto mb-3 h-8 w-8 text-ink-muted" aria-hidden="true" />
        <h2 className="mb-1 text-2xl font-semibold text-ink">Modell reinziehen.</h2>
        <p className="mx-auto max-w-xl text-ink-soft">STEP ist mir am liebsten – da stimmen Maße und Radien.</p>
        <p className="num mx-auto mt-2 text-sm text-ink-muted">
          STEP · STL · 3MF · OBJ mit 3D-Ansicht · SVG ohne Vorschau · bis {QUOTE_UPLOAD_LIMITS.maxFiles} Dateien, je {QUOTE_UPLOAD_LIMITS.maxFileMb} MB,
          zusammen {QUOTE_UPLOAD_LIMITS.maxTotalMb} MB
        </p>
        <button type="button" onClick={() => inputRef.current?.click()} className="tech-btn tech-btn-primary mt-5 px-6 text-base">
          Datei auswählen
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT_ATTRIBUTE}
          className="hidden"
          onChange={(event) => {
            handleFiles(event.target.files);
            event.target.value = '';
          }}
        />
        <div className="mx-auto mt-6 max-w-2xl space-y-1 border-t border-line pt-4 text-left">
          <LocalStatus />
          <p className="flex items-start gap-2 text-xs text-ink-muted">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>
              Ansicht, Richtpreis und Druckbarkeitsprüfung laufen in Ihrem Browser. Beim Absenden der Anfrage wird verschlüsselt übertragen, in der
              EU (Rechenzentrum Frankfurt) gespeichert und nach {UPLOAD_POLICY.retentionDays} Tagen gelöscht. Auf Wunsch vorher eine NDA.{' '}
              <Link to="/datenschutz/" className="text-accent underline">
                Datenschutzerklärung
              </Link>
            </span>
          </p>
        </div>
      </div>
      {errors}
    </div>
  );
};

export default QuoteWorkbench;
