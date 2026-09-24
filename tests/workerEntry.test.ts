import { describe, expect, it } from 'vitest';
import { WORKER_CSP, workerBootstrapSource } from '../netlify/shared/workerEntry';

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
