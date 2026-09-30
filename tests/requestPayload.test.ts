import { describe, expect, it } from 'vitest';
import { LEAD_FIELDS } from '../server/leadSchema';
import { MATERIAL_CATALOG } from '../src/lib/quote/materials';
import { breakdownProject, type PartGeometry } from '../src/lib/quote/pricing';
import { PRICING_CONFIG } from '../src/lib/quote/pricingConfig';
import { breakdownDisplayLines, buildBreakdownSummary, formatCents } from '../src/lib/quote/breakdownDisplay';
import { sessionQuoteReference, shipWindowText, summarizeQuoteSession } from '../src/lib/quote/requestPayload';
import type { QuoteFileEntry, QuoteSessionState } from '../src/lib/quote/quoteSession';

const cube20: PartGeometry = { volumeMm3: 8000, surfaceAreaMm2: 2400, bboxSizeMm: [20, 20, 20] };
const selection = { materialId: 'group-petg', infillId: 'i25', leadTimeId: 'standard', quantity: 1 };

function entry(patch: Partial<QuoteFileEntry>): QuoteFileEntry {
  return {
    id: 'qf-1',
    file: new File([new Uint8Array(4)], 'halter.stl'),
    format: 'stl',
    status: 'ready',
    analysis: {
      triangleCount: 12,
      volumeMm3: 8000,
      surfaceAreaMm2: 2400,
      bbox: { min: [0, 0, 0], max: [20, 20, 20], size: [20, 20, 20] },
      openMeshSuspected: false,
    },
    positions: null,
    sha256: 'c'.repeat(64),
    error: null,
    printCheck: { status: 'none', stage: null, fraction: 0, geometry: null, flags: null, note: null, durationMs: null },
    chosenPoseId: null,
    ...patch,
  };
}

const session = (patch: Partial<QuoteSessionState> = {}): QuoteSessionState => ({
  entries: [entry({})],
  selectedId: 'qf-1',
  selection,
  requestIntent: null,
  usePurpose: null,
  ...patch,
});

describe('request payload of the next-gen calculator', () => {
  const now = new Date('2026-09-30T09:15:00+02:00');

  it('only sends fields the lead allowlist keeps', () => {
    const names = new Set(LEAD_FIELDS.map((field) => field.name));
    for (const name of ['quote_reference', 'price_breakdown', 'ship_window', 'print_pose', 'use_purpose']) {
      expect(names.has(name)).toBe(true);
    }
  });

  it('summarises reference id, breakdown, ship window, pose and purpose', () => {
    const summary = summarizeQuoteSession(
      session({ entries: [entry({ chosenPoseId: 1 })], usePurpose: 'ersatzteil' }),
      now,
    );
    expect(summary.quoteReference).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}$/);
    expect(summary.priceBreakdown).toContain('Mindestauftrag');
    expect(summary.priceBreakdown).toContain('Punktwert 39,00\u00a0€');
    expect(summary.shipWindow).toBe(
      'Versand zwischen Mo 05.10. und Mi 07.10.2026 (Standard), Freigabe des Angebots bis Do 01.10. 12:00',
    );
    expect(summary.printPose).toBe('halter.stl: Modellseite +Z unten');
    expect(summary.usePurpose).toBe('Ersatzteil');
    for (const [name, value] of [
      ['quote_reference', summary.quoteReference],
      ['price_breakdown', summary.priceBreakdown],
      ['ship_window', summary.shipWindow],
      ['print_pose', summary.printPose],
    ] as const) {
      const spec = LEAD_FIELDS.find((field) => field.name === name);
      expect(value.length).toBeLessThanOrEqual(spec?.maxLength ?? 0);
    }
  });

  it('sends empty values without analysed files', () => {
    const summary = summarizeQuoteSession(session({ entries: [entry({ status: 'upload-only', analysis: null, sha256: null, format: null })] }), now);
    expect(summary.quoteReference).toBe('');
    expect(summary.priceBreakdown).toBe('');
    expect(summary.shipWindow).toBe('');
    expect(sessionQuoteReference(session({ entries: [] }), now)).toBe('');
    expect(shipWindowText('unknown', now)).toBe('');
  });

  it('hides the machine rate by default and can show it', () => {
    const breakdown = breakdownProject([cube20], selection, MATERIAL_CATALOG, PRICING_CONFIG);
    if (!breakdown) throw new Error('expected breakdown');
    const merged = breakdownDisplayLines(breakdown, PRICING_CONFIG);
    expect(merged.map((line) => line.key)).toEqual(['production', 'setup', 'minimumOrder']);
    const split = breakdownDisplayLines(breakdown, PRICING_CONFIG, true);
    expect(split.map((line) => line.key)).toEqual(['material', 'machine', 'setup', 'minimumOrder']);
    for (const lines of [merged, split]) {
      expect(lines.reduce((sum, line) => sum + line.amountCents, 0)).toBe(breakdown.totalCents);
    }
    expect(buildBreakdownSummary(breakdown, PRICING_CONFIG)).not.toContain('€/h');
    expect(formatCents(-1234)).toBe('−12,34\u00a0€');
    expect(formatCents(1092, true)).toBe('+10,92\u00a0€');
  });

  it('lists lead-time and discount lines when they apply', () => {
    const breakdown = breakdownProject([cube20], { ...selection, leadTimeId: 'express', quantity: 30 }, MATERIAL_CATALOG, PRICING_CONFIG);
    if (!breakdown) throw new Error('expected breakdown');
    const lines = breakdownDisplayLines(breakdown, PRICING_CONFIG);
    expect(lines.find((line) => line.key === 'leadTime')?.detail).toBe('+35 % auf die Fertigung');
    expect(lines.find((line) => line.key === 'discount')?.detail).toBe('−18 % ab 25 Stück');
  });
});
