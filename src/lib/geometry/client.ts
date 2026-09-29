import geometryWorkerUrl from './geometry.worker.ts?worker&url';
import type { MeshAnalysis, ModelFormat } from './types';
import type { GeometryWorkerRequest, GeometryWorkerResponse } from './workerProtocol';

/** Hard limit for in-browser analysis; larger files are still uploaded. */
export const MAX_ANALYSIS_BYTES = 150 * 1024 * 1024;

/** STEP tessellation of large assemblies can take a while on slow laptops. */
export const ANALYSIS_TIMEOUT_MS = 120_000;

export interface AnalyzedModel {
  analysis: MeshAnalysis;
  positions: Float32Array;
}

export class ModelAnalysisError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ModelAnalysisError';
  }
}

/**
 * In production the worker is started through /api/geometry-worker, which
 * wraps the hashed bundle with a worker-only CSP that permits the STEP
 * kernel's code generation (server/workerEntry.ts). The Vite dev
 * server has no CSP and no Functions, so it loads the bundle directly.
 */
function workerScriptUrl(): string {
  if (import.meta.env.DEV) {
    return geometryWorkerUrl;
  }
  return `/api/geometry-worker?entry=${encodeURIComponent(geometryWorkerUrl)}`;
}

/**
 * Parses and analyses a model file in a dedicated, single-use Web Worker so
 * that large meshes and the STEP kernel never block the UI thread.
 */
export async function analyzeModelFile(file: File, format: ModelFormat): Promise<AnalyzedModel> {
  if (file.size === 0) {
    throw new ModelAnalysisError('Die Datei ist leer.');
  }
  if (file.size > MAX_ANALYSIS_BYTES) {
    throw new ModelAnalysisError(
      'Die Datei ist zu groß für die Vorschau im Browser. Sie wird trotzdem mit der Anfrage übermittelt.',
    );
  }

  const buffer = await file.arrayBuffer();
  const worker = new Worker(workerScriptUrl(), { type: 'module' });

  try {
    return await new Promise<AnalyzedModel>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        reject(
          new ModelAnalysisError(
            'Die Analyse dauert zu lange. Die Datei wird trotzdem mit der Anfrage übermittelt.',
          ),
        );
      }, ANALYSIS_TIMEOUT_MS);

      worker.onmessage = (event: MessageEvent<GeometryWorkerResponse>) => {
        window.clearTimeout(timer);
        const data = event.data;
        if (data.ok) {
          resolve({ analysis: data.analysis, positions: data.positions });
        } else {
          reject(new ModelAnalysisError(data.error));
        }
      };
      worker.onerror = (event) => {
        window.clearTimeout(timer);
        event.preventDefault();
        reject(new ModelAnalysisError('Die Analyse ist im Browser fehlgeschlagen (zu wenig Arbeitsspeicher?).'));
      };

      const request: GeometryWorkerRequest = { format, buffer };
      worker.postMessage(request, [buffer]);
    });
  } finally {
    worker.terminate();
  }
}
