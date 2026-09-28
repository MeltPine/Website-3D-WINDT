import { ExternalLink } from 'lucide-react';
import type { ResolvedValue } from '../../lib/werkstoffe/datasheetValues';
import { FIELD_REVIEW_DATE } from '../../lib/werkstoffe/datasheetValues';
import { LIBRARY_DISCLAIMER, formatGermanDate, type LibraryProduct } from '../../lib/werkstoffe/library';

/*
 * Small building blocks shared by the library pages. Every number taken from
 * the material database is rendered through DbValue (data-db-value) or, for
 * quoted datasheet text, DbSourceText (data-db-source). Tests rely on these
 * markers to prove that no page shows a number that is not in the database.
 */

export const DbValue = ({ productId, value }: { productId: string; value: ResolvedValue }) => (
  <span data-db-value={`${productId}.${value.sourceField}`} className="font-semibold text-gray-900 whitespace-nowrap">
    {value.display}
  </span>
);

export const DbSourceText = ({ productId, sourceField, text }: { productId: string; sourceField: string; text: string }) => (
  <span data-db-source={`${productId}.${sourceField}`} className="font-mono text-xs text-gray-700 break-words">
    {text}
  </span>
);

/** Notes from the database (e.g. unit conversions) may contain numbers. */
export const DbNote = ({ productId, sourceField, note }: { productId: string; sourceField: string; note: string }) => (
  <span data-db-note={`${productId}.${sourceField}`}>{note}</span>
);

export const DatasheetLink = ({ product, compact = false }: { product: LibraryProduct; compact?: boolean }) => (
  <a
    href={product.datasheetUrl}
    target="_blank"
    rel="noopener noreferrer"
    data-datasheet={product.id}
    className="inline-flex items-center gap-1 text-primary-700 underline hover:text-primary-800"
  >
    {compact ? 'Datenblatt (PDF)' : 'Original-Datenblatt (PDF)'}
    {product.datasheetIsMirror ? ' – Händler-Kopie' : ''}
    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
    <span className="sr-only">(öffnet in neuem Tab)</span>
  </a>
);

export const RetrievedDate = ({ product }: { product: LibraryProduct }) => (
  <span>abgerufen am {formatGermanDate(product.retrieved)}</span>
);

export const LibraryDisclaimer = () => (
  <div className="rounded-xl border border-primary-200 bg-primary-50 p-5 text-sm text-gray-700 space-y-2">
    <p className="font-semibold text-gray-900">Wie diese Kennwerte zu lesen sind</p>
    <p>{LIBRARY_DISCLAIMER}</p>
    <p>
      Fehlt eine Angabe im Datenblatt, steht hier „keine Herstellerangabe“. Zusätzlich haben wir die Werte am{' '}
      {formatGermanDate(FIELD_REVIEW_DATE)} manuell gegen den Datenblatttext geprüft: Offensichtlich falsch
      ausgelesene Angaben werden nicht übernommen, sondern mit Begründung und Datenblatt-Auszug ausgewiesen.
    </p>
    <p>
      Gedruckte Bauteile sind richtungsabhängig (anisotrop): Quer zu den Druckschichten sind Festigkeit und
      Bruchdehnung geringer als in der Schichtebene. Außerdem prüfen Hersteller nach unterschiedlichen Normen
      (ISO, ASTM) und Bedingungen – Werte verschiedener Datenblätter sind deshalb nur eingeschränkt vergleichbar.
    </p>
  </div>
);
