import React, { Suspense, lazy, useRef, useState } from 'react';
import { AlertCircle, Loader2, ShieldCheck, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { MaterialCatalog } from '../../lib/quote/materials';
import { QUOTE_UPLOAD_LIMITS, addQuoteFiles, useQuoteSession } from '../../lib/quote/quoteSession';
import { ACCEPT_ATTRIBUTE, UPLOAD_POLICY } from '../../lib/upload/policy';

/*
 * File drop zone (server-rendered, part of the main bundle) plus the lazily
 * loaded QuoteDetails (viewer, calculator, price range) once files exist.
 */

const QuoteDetails = lazy(() => import('./QuoteDetails'));

interface QuoteWorkbenchProps {
  /** Pluggable material source; defaults to FDM-INSPECT products + 3D-WINDT price groups. */
  catalog?: MaterialCatalog;
  /** Small step label above the drop zone (e.g. inside the request form). */
  stepLabel?: string;
  /** Rendered below the price range (e.g. CTA to the request form). */
  footer?: React.ReactNode;
  /** Called on the first user interaction (file added or parameter changed). */
  onInteract?: () => void;
}

const QuoteWorkbench = ({ catalog, stepLabel, footer, onInteract }: QuoteWorkbenchProps) => {
  const session = useQuoteSession();
  const [addErrors, setAddErrors] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    onInteract?.();
    setAddErrors(addQuoteFiles(Array.from(fileList)));
  };

  return (
    <div className="space-y-6">
      <div
        className={`rounded-xl border-2 border-dashed p-6 md:p-8 text-center shadow-sm transition-colors bg-white ${
          isDragging ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/40' : 'border-gray-300 hover:border-primary-400'
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
        {stepLabel && (
          <p className="text-xs uppercase tracking-wide text-primary-700 font-semibold mb-2">{stepLabel}</p>
        )}
        <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" aria-hidden="true" />
        <h2 className="font-display text-lg font-semibold text-gray-900 mb-1">3D-Modell hochladen</h2>
        <p className="text-gray-600 mb-1">
          STL, OBJ, 3MF oder STEP – mit 3D-Vorschau, Maßen und Richtpreis. SVG wird ohne Vorschau übermittelt.
        </p>
        <p className="text-sm text-gray-500 mb-4">
          Bis {QUOTE_UPLOAD_LIMITS.maxFiles} Dateien, je max. {QUOTE_UPLOAD_LIMITS.maxFileMb} MB, zusammen max.{' '}
          {QUOTE_UPLOAD_LIMITS.maxTotalMb} MB. Datei hierher ziehen oder auswählen.
        </p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center justify-center bg-primary-700 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-primary-800 transition-colors"
        >
          Dateien auswählen
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
        <div className="mx-auto mt-5 max-w-2xl rounded-lg border border-primary-200 bg-primary-50/75 p-3 text-left">
          <p className="text-sm text-gray-700 inline-flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 text-primary-700 mt-0.5 shrink-0" aria-hidden="true" />
            <span>
              Vorschau und Richtpreis entstehen ausschließlich in Ihrem Browser. Ihre Dateien werden erst beim
              Absenden der Anfrage verschlüsselt übertragen, in der EU (Rechenzentrum Frankfurt) gespeichert, nur
              zur Prüfung Ihres Projekts genutzt und nach {UPLOAD_POLICY.retentionDays} Tagen automatisch gelöscht.{' '}
              <Link to="/datenschutz/" className="text-primary-700 underline hover:text-primary-800">
                Datenschutzerklärung
              </Link>
            </span>
          </p>
          <p className="text-xs text-gray-600 mt-2 ml-6">
            Auf Wunsch stellen wir vor dem Datenaustausch eine NDA-Vereinbarung bereit.
          </p>
        </div>
        {addErrors.length > 0 && (
          <div className="mt-4 text-sm text-red-700 flex items-start justify-center gap-2" role="alert">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
            <span>{addErrors.join(' • ')}</span>
          </div>
        )}
      </div>

      {session.entries.length > 0 && (
        <Suspense
          fallback={
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-600">
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> Vorschau und Rechner werden geladen …
            </div>
          }
        >
          <QuoteDetails catalog={catalog} footer={footer} onInteract={onInteract} />
        </Suspense>
      )}
    </div>
  );
};

export default QuoteWorkbench;
