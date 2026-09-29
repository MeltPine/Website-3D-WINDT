/*
 * Upload policy shared by the browser client and the Pages Functions
 * (server/uploads.ts imports this file), so limits cannot drift between what
 * the UI promises and what the server accepts.
 *
 * Why chunks: files are sent in fixed-size chunks, each stored as one part of
 * an R2 multipart upload (bucket in the EU jurisdiction). Chunks keep single
 * requests small and retryable on flaky connections. R2 requires every part
 * except the last to have the same size and to be at least 5 MiB.
 *
 * Retention is enforced by R2 lifecycle rules generated from these numbers
 * (infra/r2-lifecycle.json, checked by tests/upload.test.ts); the privacy
 * page renders the same values.
 */

const MIB = 1024 * 1024;

export const UPLOAD_POLICY = {
  maxFiles: 8,
  maxFileBytes: 100 * MIB,
  maxTotalBytes: 200 * MIB,
  /** R2 multipart part size: >= 5 MiB, far below the 100 MB request body limit. */
  chunkBytes: 8 * MIB,
  /** Completed uploads are deleted after this many days. */
  retentionDays: 90,
  /** Uploads that were never completed are deleted after this many days. */
  incompleteRetentionDays: 2,
  /** Lifetime of an upload session token. */
  sessionTtlSeconds: 6 * 60 * 60,
  maxFileNameLength: 180,
  allowedExtensions: ['stl', 'obj', '3mf', 'step', 'stp', 'svg'] as const,
} as const;

export const ACCEPT_ATTRIBUTE = UPLOAD_POLICY.allowedExtensions.map((extension) => `.${extension}`).join(',');

export function chunkCountFor(sizeBytes: number): number {
  return Math.max(1, Math.ceil(sizeBytes / UPLOAD_POLICY.chunkBytes));
}

export function expectedChunkLength(sizeBytes: number, index: number): number {
  const count = chunkCountFor(sizeBytes);
  if (!Number.isInteger(index) || index < 0 || index >= count) {
    return -1;
  }
  if (index < count - 1) {
    return UPLOAD_POLICY.chunkBytes;
  }
  return sizeBytes - UPLOAD_POLICY.chunkBytes * (count - 1);
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot < 0 ? '' : name.slice(dot + 1).toLowerCase();
}

export function isAllowedFileName(name: string): boolean {
  return (UPLOAD_POLICY.allowedExtensions as readonly string[]).includes(extensionOf(name));
}

export interface UploadFileDescriptor {
  name: string;
  size: number;
}

/**
 * Validates a complete file selection. Returns a German, user-facing error
 * message or null when the selection is acceptable.
 */
export function validateUploadSelection(files: readonly UploadFileDescriptor[]): string | null {
  if (files.length === 0) {
    return 'Keine Datei ausgewählt.';
  }
  if (files.length > UPLOAD_POLICY.maxFiles) {
    return `Maximal ${UPLOAD_POLICY.maxFiles} Dateien pro Anfrage.`;
  }
  let total = 0;
  for (const file of files) {
    if (!file.name || file.name.length > UPLOAD_POLICY.maxFileNameLength) {
      return 'Ungültiger Dateiname.';
    }
    if (!isAllowedFileName(file.name)) {
      return `${file.name}: Dateityp nicht unterstützt.`;
    }
    if (!Number.isInteger(file.size) || file.size <= 0) {
      return `${file.name}: Datei ist leer.`;
    }
    if (file.size > UPLOAD_POLICY.maxFileBytes) {
      return `${file.name}: größer als ${UPLOAD_POLICY.maxFileBytes / MIB} MB.`;
    }
    total += file.size;
  }
  if (total > UPLOAD_POLICY.maxTotalBytes) {
    return `Gesamtgröße über ${UPLOAD_POLICY.maxTotalBytes / MIB} MB.`;
  }
  return null;
}
