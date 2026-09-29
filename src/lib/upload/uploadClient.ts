import { validateUploadSelection } from './policy';

/*
 * Browser side of the chunked upload (see server/uploads.ts).
 * Flow: init (signed session) -> chunks (parallel, retried, SHA-256 checked
 * by the server) -> complete (manifest + signed retrieval links).
 */

export interface UploadedFileReference {
  name: string;
  size: number;
  /** Absolute URL of the internal retrieval page for this file. */
  url: string;
}

export interface UploadOutcome {
  uploadId: string;
  files: UploadedFileReference[];
  failedFileNames: string[];
}

export interface UploadProgress {
  uploadedBytes: number;
  totalBytes: number;
}

export class UploadError extends Error {
  constructor(
    message: string,
    readonly reason: 'validation' | 'unavailable' | 'network' | 'server' | 'rejected',
  ) {
    super(message);
    this.name = 'UploadError';
  }
}

const PARALLEL_CHUNKS = 3;
const MAX_ATTEMPTS = 4;
const RETRY_BASE_DELAY_MS = 800;

interface InitResponse {
  token: string;
  uploadId: string;
  chunkBytes: number;
  files: Array<{ fid: string; name: string; size: number; chunks: number }>;
}

interface CompleteResponse {
  uploadId: string;
  files: Array<{ fid: string; name: string; size: number; complete: boolean; downloadPath: string | null }>;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function readJson<T>(response: Response): Promise<T> {
  const type = response.headers.get('content-type') ?? '';
  if (!type.includes('application/json')) {
    throw new UploadError('Der Upload-Dienst ist nicht erreichbar.', 'unavailable');
  }
  return (await response.json()) as T;
}

async function errorFrom(response: Response): Promise<UploadError> {
  let message = `Upload fehlgeschlagen (HTTP ${response.status}).`;
  try {
    const body = await readJson<{ error?: string }>(response);
    if (body.error) message = body.error;
  } catch {
    // keep the generic message
  }
  if (response.status === 503 || response.status === 404) {
    return new UploadError(message, 'unavailable');
  }
  if (response.status >= 400 && response.status < 500 && response.status !== 429) {
    return new UploadError(message, 'rejected');
  }
  return new UploadError(message, 'server');
}

function isRetryable(error: unknown): boolean {
  return !(error instanceof UploadError) || error.reason === 'network' || error.reason === 'server';
}

async function withRetry<T>(operation: () => Promise<T>, signal: AbortSignal): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    if (signal.aborted) {
      throw new UploadError('Upload abgebrochen.', 'network');
    }
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isRetryable(error) || attempt === MAX_ATTEMPTS) break;
      await delay(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1));
    }
  }
  if (lastError instanceof UploadError) throw lastError;
  throw new UploadError('Netzwerkfehler beim Upload. Bitte Verbindung prüfen.', 'network');
}

async function sha256Base64url(data: ArrayBuffer): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', data));
  let binary = '';
  digest.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function postJson(url: string, body: unknown, signal: AbortSignal, token?: string): Promise<Response> {
  try {
    return await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
      signal,
      credentials: 'same-origin',
    });
  } catch {
    throw new UploadError('Netzwerkfehler beim Upload. Bitte Verbindung prüfen.', 'network');
  }
}

export async function uploadProjectFiles(
  files: readonly File[],
  onProgress: (progress: UploadProgress) => void,
  signal: AbortSignal,
): Promise<UploadOutcome> {
  const validationError = validateUploadSelection(files.map((file) => ({ name: file.name, size: file.size })));
  if (validationError) {
    throw new UploadError(validationError, 'validation');
  }

  const init = await withRetry(async () => {
    const response = await postJson(
      '/api/uploads/init',
      { files: files.map((file) => ({ name: file.name, size: file.size })), website: '' },
      signal,
    );
    if (!response.ok) throw await errorFrom(response);
    return readJson<InitResponse>(response);
  }, signal);

  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  let uploadedBytes = 0;
  onProgress({ uploadedBytes, totalBytes });

  const jobs: Array<{ file: File; fid: string; index: number }> = [];
  init.files.forEach((entry, fileIndex) => {
    for (let index = 0; index < entry.chunks; index += 1) {
      jobs.push({ file: files[fileIndex], fid: entry.fid, index });
    }
  });

  const failedFids = new Set<string>();
  let cursor = 0;
  const worker = async () => {
    while (cursor < jobs.length) {
      const job = jobs[cursor];
      cursor += 1;
      if (failedFids.has(job.fid)) continue;
      const start = job.index * init.chunkBytes;
      const blob = job.file.slice(start, Math.min(start + init.chunkBytes, job.file.size));
      try {
        const data = await blob.arrayBuffer();
        const checksum = await sha256Base64url(data);
        await withRetry(async () => {
          let response: Response;
          try {
            response = await fetch(
              `/api/uploads/chunk?fid=${encodeURIComponent(job.fid)}&index=${job.index}`,
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${init.token}`,
                  'Content-Type': 'application/octet-stream',
                  'X-Chunk-Sha256': checksum,
                },
                body: data,
                signal,
                credentials: 'same-origin',
              },
            );
          } catch {
            throw new UploadError('Netzwerkfehler beim Upload. Bitte Verbindung prüfen.', 'network');
          }
          if (!response.ok) throw await errorFrom(response);
        }, signal);
        uploadedBytes += data.byteLength;
        onProgress({ uploadedBytes, totalBytes });
      } catch (error) {
        if (signal.aborted) throw error;
        failedFids.add(job.fid);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(PARALLEL_CHUNKS, jobs.length) }, worker));

  if (failedFids.size === init.files.length) {
    throw new UploadError('Keine Datei konnte übertragen werden.', 'network');
  }

  const completion = await withRetry(async () => {
    const response = await postJson('/api/uploads/complete', {}, signal, init.token);
    if (!response.ok) throw await errorFrom(response);
    return readJson<CompleteResponse>(response);
  }, signal);

  const origin = window.location.origin;
  return {
    uploadId: completion.uploadId,
    files: completion.files
      .filter((entry) => entry.complete && entry.downloadPath)
      .map((entry) => ({ name: entry.name, size: entry.size, url: `${origin}${entry.downloadPath}` })),
    failedFileNames: completion.files.filter((entry) => !entry.complete).map((entry) => entry.name),
  };
}
