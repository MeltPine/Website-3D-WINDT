import type { MaterialCatalog } from './materials';
import { estimateProject, type ProjectEstimate, type QuoteSelection } from './pricing';
import type { PricingConfig } from './pricingConfig';
import type { QuoteFileEntry } from './quoteSession';

export interface SessionEstimate {
  /** Null while no file has been analysed yet. */
  estimate: ProjectEstimate | null;
  /** Files still being analysed. */
  pendingCount: number;
  /** Files that are part of the request but not part of the price (no preview/analysis). */
  unpricedCount: number;
}

export function computeSessionEstimate(
  entries: readonly QuoteFileEntry[],
  selection: QuoteSelection,
  catalog: MaterialCatalog,
  config: PricingConfig,
): SessionEstimate {
  const ready = entries.filter((entry) => entry.status === 'ready' && entry.analysis);
  const pendingCount = entries.filter((entry) => entry.status === 'queued' || entry.status === 'analyzing').length;
  const unpricedCount = entries.filter((entry) => entry.status === 'failed' || entry.status === 'upload-only').length;
  const parts = ready
    .map((entry) => entry.analysis)
    .filter((analysis): analysis is NonNullable<typeof analysis> => analysis !== null && analysis.volumeMm3 > 0 && analysis.surfaceAreaMm2 > 0)
    .map((analysis) => ({
      volumeMm3: analysis.volumeMm3,
      surfaceAreaMm2: analysis.surfaceAreaMm2,
      bboxSizeMm: analysis.bbox.size,
    }));

  return {
    estimate: parts.length > 0 ? estimateProject(parts, selection, catalog, config) : null,
    pendingCount,
    unpricedCount: unpricedCount + (ready.length - parts.length),
  };
}
