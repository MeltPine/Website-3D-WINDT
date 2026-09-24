import { parseStl } from './stl';
import { parseObj } from './obj';
import { parse3mf } from './threemf';
import { parseStepWith, type OcctModule } from './step';
import type { ModelFormat, TriangleMesh } from './types';

export interface ParseDependencies {
  /** Lazily provides the OpenCascade module; only invoked for STEP files. */
  loadOcct: () => Promise<OcctModule>;
}

export async function parseModel(
  format: ModelFormat,
  buffer: ArrayBuffer,
  dependencies: ParseDependencies,
): Promise<TriangleMesh> {
  switch (format) {
    case 'stl':
      return parseStl(buffer);
    case 'obj':
      return parseObj(buffer);
    case '3mf':
      return parse3mf(buffer);
    case 'step':
      return parseStepWith(await dependencies.loadOcct(), buffer);
    default: {
      const exhaustive: never = format;
      throw new Error(`Unsupported model format: ${String(exhaustive)}`);
    }
  }
}
