import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrintCheckWorkerMessage, PrintCheckWorkerRequest } from '../src/lib/printcheck/protocol';
import { DEFAULT_PRINTCHECK_LIMITS, PRINTCHECK_STAGES, type PrintCheckGeometry } from '../src/lib/printcheck/types';
import { boxPositions } from './helpers/printcheckMeshes';

/*
 * Worker adapter: the worker module runs against a fake DedicatedWorkerGlobalScope,
 * the client against a fake Worker class, so the message contract, transfer
 * lists, cancel and timeout are tested without a browser.
 */

interface PostedMessage {
  message: PrintCheckWorkerMessage;
  transfer: Transferable[];
}

describe('printcheck.worker', () => {
  const posted: PostedMessage[] = [];
  const scope: { onmessage: ((event: MessageEvent<PrintCheckWorkerRequest>) => void) | null; postMessage: (m: PrintCheckWorkerMessage, t?: Transferable[]) => void } = {
    onmessage: null,
    postMessage: (message, transfer = []) => {
      posted.push({ message, transfer });
    },
  };

  beforeEach(async () => {
    posted.length = 0;
    vi.stubGlobal('self', scope);
    vi.resetModules();
    await import('../src/lib/printcheck/printcheck.worker');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts throttled progress, partial results per stage and the flags as a transferable', () => {
    const positions = boxPositions(10, 10, 10);
    scope.onmessage?.({ data: { positions, options: { format: 'stl', ...DEFAULT_PRINTCHECK_LIMITS } } } as MessageEvent<PrintCheckWorkerRequest>);
    const types = posted.map((entry) => entry.message.type);
    expect(types[types.length - 1]).toBe('done');
    expect(types.filter((type) => type === 'partial').length).toBeGreaterThanOrEqual(PRINTCHECK_STAGES.length);
    const progress = posted.filter((entry) => entry.message.type === 'progress');
    expect(progress.length).toBeLessThan(200);
    const done = posted[posted.length - 1];
    if (done.message.type !== 'done') throw new Error('expected done');
    expect(done.message.flags).toBeInstanceOf(Uint16Array);
    expect(done.message.flags.length).toBe(12);
    expect(done.transfer).toEqual([done.message.flags.buffer]);
    expect(Object.values(done.message.geometry.stages).every((stage) => stage.state === 'done')).toBe(true);
  });

  it('reports an error with the last partial geometry instead of throwing', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    scope.onmessage?.({
      data: { positions: new Float32Array(5), options: { format: 'stl', ...DEFAULT_PRINTCHECK_LIMITS } },
    } as MessageEvent<PrintCheckWorkerRequest>);
    expect(posted.map((entry) => entry.message)).toEqual([{ type: 'error', geometry: null }]);
  });
});

class FakeWorker {
  static instances: FakeWorker[] = [];
  onmessage: ((event: MessageEvent<PrintCheckWorkerMessage>) => void) | null = null;
  onerror: ((event: { preventDefault: () => void }) => void) | null = null;
  terminated = false;
  received: { request: PrintCheckWorkerRequest; transfer: Transferable[] } | null = null;
  constructor(
    public url: string | URL,
    public options: WorkerOptions,
  ) {
    FakeWorker.instances.push(this);
  }
  postMessage(request: PrintCheckWorkerRequest, transfer: Transferable[]) {
    this.received = { request, transfer };
  }
  terminate() {
    this.terminated = true;
  }
  emit(message: PrintCheckWorkerMessage) {
    this.onmessage?.({ data: message } as MessageEvent<PrintCheckWorkerMessage>);
  }
}

function partialGeometry(): PrintCheckGeometry {
  const stages = Object.fromEntries(PRINTCHECK_STAGES.map((stage) => [stage, { state: 'pending' }])) as PrintCheckGeometry['stages'];
  stages.mesh = { state: 'done', ms: 1 };
  return {
    triangleCount: 12,
    bbox: { min: [0, 0, 0], max: [1, 1, 1], size: [1, 1, 1] },
    volume: 1,
    signedVolume: 1,
    area: 6,
    centroid: [0.5, 0.5, 0.5],
    zeroAreaTriangles: 0,
    topology: null,
    orientation: null,
    fit: null,
    voxel: null,
    layers: null,
    slender: null,
    walls: null,
    gaps: null,
    voids: null,
    support: null,
    flaggedArea: {},
    stages,
    tessellationToleranceMm: null,
  };
}

describe('printcheck client', () => {
  beforeEach(() => {
    FakeWorker.instances = [];
    vi.stubGlobal('Worker', FakeWorker);
    vi.stubGlobal('window', globalThis);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('starts a module worker, transfers the positions and resolves with the result', async () => {
    const { startPrintCheck } = await import('../src/lib/printcheck/client');
    const onProgress = vi.fn();
    const onPartial = vi.fn();
    const positions = boxPositions(1, 1, 1);
    const handle = startPrintCheck(positions, { format: 'stl', ...DEFAULT_PRINTCHECK_LIMITS }, { onProgress, onPartial });
    const worker = FakeWorker.instances[0];
    expect(worker.options).toEqual({ type: 'module' });
    expect(worker.received?.transfer).toEqual([positions.buffer]);
    worker.emit({ type: 'progress', stage: 'mesh', fraction: 0.5 });
    const geometry = partialGeometry();
    worker.emit({ type: 'partial', geometry });
    const flags = new Uint16Array(12);
    worker.emit({ type: 'done', geometry, flags });
    await expect(handle.result).resolves.toEqual({ status: 'done', geometry, flags });
    expect(onProgress).toHaveBeenCalledWith('mesh', 0.5);
    expect(onPartial).toHaveBeenCalledWith(geometry);
    expect(worker.terminated).toBe(true);
  });

  it('cancel keeps finished stages and marks the rest "Prüfung abgebrochen"', async () => {
    const { startPrintCheck } = await import('../src/lib/printcheck/client');
    const handle = startPrintCheck(boxPositions(1, 1, 1), { format: 'stl', ...DEFAULT_PRINTCHECK_LIMITS }, {
      onProgress: () => undefined,
      onPartial: () => undefined,
    });
    FakeWorker.instances[0].emit({ type: 'partial', geometry: partialGeometry() });
    handle.cancel();
    const result = await handle.result;
    expect(result.status).toBe('cancelled');
    expect(result.geometry?.stages.mesh).toEqual({ state: 'done', ms: 1 });
    expect(result.geometry?.stages.walls).toEqual({ state: 'skipped', reason: 'Prüfung abgebrochen' });
    expect(FakeWorker.instances[0].terminated).toBe(true);
  });

  it('terminates the worker at the time limit', async () => {
    const { PRINTCHECK_TIMEOUT_MS, startPrintCheck } = await import('../src/lib/printcheck/client');
    const handle = startPrintCheck(boxPositions(1, 1, 1), { format: 'stl', ...DEFAULT_PRINTCHECK_LIMITS }, {
      onProgress: () => undefined,
      onPartial: () => undefined,
    });
    FakeWorker.instances[0].emit({ type: 'partial', geometry: partialGeometry() });
    vi.advanceTimersByTime(PRINTCHECK_TIMEOUT_MS + 1);
    const result = await handle.result;
    expect(result.status).toBe('timeout');
    expect(result.geometry?.stages.gaps).toEqual({ state: 'skipped', reason: 'Zeitlimit im Browser überschritten' });
  });

  it('treats a crashed worker (e.g. out of memory) as failed without throwing', async () => {
    const { startPrintCheck } = await import('../src/lib/printcheck/client');
    const handle = startPrintCheck(boxPositions(1, 1, 1), { format: 'stl', ...DEFAULT_PRINTCHECK_LIMITS }, {
      onProgress: () => undefined,
      onPartial: () => undefined,
    });
    const preventDefault = vi.fn();
    FakeWorker.instances[0].onerror?.({ preventDefault });
    await expect(handle.result).resolves.toMatchObject({ status: 'failed', geometry: null });
    expect(preventDefault).toHaveBeenCalled();
  });
});
