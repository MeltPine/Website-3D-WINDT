import { describe, expect, it } from 'vitest';
import { WORKER_CSP, handleGeometryWorker, workerBootstrapSource } from '../server/workerEntry';

describe('geometry worker bootstrap', () => {
  it('imports only hashed worker bundles from /assets/', () => {
    expect(workerBootstrapSource('/assets/geometry.worker-Hwa2Y5Si.js')).toBe(
      'import "/assets/geometry.worker-Hwa2Y5Si.js";\n',
    );
    for (const entry of [
      null,
      '',
      'https://evil.example/assets/geometry.worker-abcdef.js',
      '//evil.example/assets/geometry.worker-abcdef.js',
      '/assets/geometry.worker-abc.js', // hash too short
      '/assets/other-abcdef12.js',
      '/assets/geometry.worker-abcdef12.js";alert(1);//',
      '/assets/../api/geometry.worker-abcdef12.js',
    ]) {
      expect(workerBootstrapSource(entry)).toBeNull();
    }
  });

  it('keeps the worker policy narrow', () => {
    expect(WORKER_CSP).toContain("default-src 'none'");
    expect(WORKER_CSP).not.toContain('unsafe-inline');
    expect(WORKER_CSP).not.toMatch(/https?:/);
  });
});

describe('geometry worker endpoint', () => {
  it('serves the bootstrap with its own CSP and rejects foreign entries', async () => {
    const ok = handleGeometryWorker(
      new Request('https://3d-windt.de/api/geometry-worker?entry=/assets/geometry.worker-Hwa2Y5Si.js'),
    );
    expect(ok.status).toBe(200);
    expect(ok.headers.get('content-security-policy')).toBe(WORKER_CSP);
    expect(ok.headers.get('content-type')).toMatch(/^text\/javascript/);
    expect(await ok.text()).toBe('import "/assets/geometry.worker-Hwa2Y5Si.js";\n');

    const bad = handleGeometryWorker(new Request('https://3d-windt.de/api/geometry-worker?entry=/evil.js'));
    expect(bad.status).toBe(404);

    const post = handleGeometryWorker(new Request('https://3d-windt.de/api/geometry-worker', { method: 'POST' }));
    expect(post.status).toBe(405);
  });
});
