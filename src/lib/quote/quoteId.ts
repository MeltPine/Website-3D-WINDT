import type { QuoteSelection } from './pricing';

/*
 * "Richtpreis-ID": a short reference that ties a later request to the
 * estimate the customer saw. Derived from the file hashes, the parameters and
 * the day, so the same file with the same parameters on the same day gives
 * the same id. Not a secret and not a signature - only a reference.
 */

/** FNV-1a 32 bit over UTF-16 code units. */
function fnv1a(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

export interface QuoteIdInput {
  /** Hex SHA-256 per analysed file (order-independent). */
  fileHashes: readonly string[];
  selection: QuoteSelection;
  /** ISO date (YYYY-MM-DD) of the estimate. */
  dateIso: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const SHA256_HEX = /^[0-9a-f]{64}$/;

export function quoteReferenceId(input: QuoteIdInput): string {
  if (!ISO_DATE.test(input.dateIso)) {
    throw new Error(`Invalid ISO date "${input.dateIso}".`);
  }
  if (input.fileHashes.length === 0 || !input.fileHashes.every((hash) => SHA256_HEX.test(hash))) {
    throw new Error('Quote id needs at least one SHA-256 hex hash.');
  }
  const canonical = [
    [...input.fileHashes].sort().join(','),
    input.selection.materialId,
    input.selection.infillId,
    input.selection.leadTimeId,
    String(input.selection.quantity),
    input.dateIso,
  ].join('|');
  const hex = fnv1a(canonical).toString(16).padStart(8, '0').toUpperCase();
  return `${hex.slice(0, 4)}-${hex.slice(4, 8)}`;
}
