/// <reference lib="webworker" />
import occtWasmUrl from 'occt-import-js/dist/occt-import-js.wasm?url';
import { analyzeMesh } from './analyze';
import { parseModel } from './parseModel';
import type { OcctModule } from './step';
import { GeometryParseError } from './types';
import type { GeometryWorkerRequest, GeometryWorkerResponse } from './workerProtocol';

/*
 * Parses and analyses one model file off the main thread. The worker is
 * single-use: the client terminates it after the response, which also frees
 * the (large) OpenCascade heap after STEP files.
 */

const scope = self as unknown as DedicatedWorkerGlobalScope;

async function loadOcct(): Promise<OcctModule> {
  const { default: occtimportjs } = await import('occt-import-js');
  // The WASM binary is self-hosted by Vite (hashed asset under /assets/).
  return occtimportjs({ locateFile: () => occtWasmUrl });
}

scope.onmessage = async (event: MessageEvent<GeometryWorkerRequest>) => {
  const { format, buffer } = event.data;
  try {
    const mesh = await parseModel(format, buffer, { loadOcct });
    const analysis = analyzeMesh(mesh);
    const response: GeometryWorkerResponse = { ok: true, analysis, positions: mesh.positions };
    scope.postMessage(response, [mesh.positions.buffer]);
  } catch (error) {
    if (!(error instanceof GeometryParseError)) {
      // Unexpected failure (kernel load, memory): keep the cause visible in the console.
      console.error('Geometry worker failed', error);
    }
    const message =
      error instanceof GeometryParseError
        ? error.message
        : error instanceof RangeError
          ? 'Das Modell ist zu groß für die Analyse im Browser.'
          : 'Das Modell konnte nicht analysiert werden.';
    const response: GeometryWorkerResponse = { ok: false, error: message };
    scope.postMessage(response);
  }
};
