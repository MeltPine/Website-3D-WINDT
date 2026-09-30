import { createElement, type ComponentType } from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { describe, expect, it } from 'vitest';
import ModelReport from '../src/components/quote/ModelReport';
import { PriceSummaryPanel, type SummaryModel } from '../src/components/quote/PriceSummary';
import QuoteWorkbench from '../src/components/quote/QuoteWorkbench';
import { StagePlaceholder } from '../src/components/quote/QuoteWorkspace';
import type { PrintCheckReport } from '../src/lib/printcheck/evaluate';
import { estimateShipWindow } from '../src/lib/quote/leadDate';
import { MATERIAL_CATALOG, findMaterial } from '../src/lib/quote/materials';
import { breakdownProject, estimatePart } from '../src/lib/quote/pricing';
import { PRICING_CONFIG } from '../src/lib/quote/pricingConfig';
import type { QuoteFileEntry } from '../src/lib/quote/quoteSession';
import { computeSessionEstimate } from '../src/lib/quote/sessionEstimate';
import { modelBadge, printCheckBadge, printCheckHeadline, summaryState } from '../src/lib/quote/workspaceState';

const selection = { materialId: 'group-petg', infillId: 'i25', leadTimeId: 'standard', quantity: 1 };
const noCheck = { status: 'none', stage: null, fraction: 0, geometry: null, flags: null, note: null, durationMs: null } as const;

function entry(patch: Partial<QuoteFileEntry> = {}): QuoteFileEntry {
  return {
    id: 'qf-1',
    file: new File([new Uint8Array(8)], 'halter.step'),
    format: 'step',
    status: 'ready',
    analysis: {
      triangleCount: 7051,
      volumeMm3: 87_000,
      surfaceAreaMm2: 48_700,
      bbox: { min: [0, 0, 0], max: [150, 86.7, 26], size: [150, 86.7, 26] },
      openMeshSuspected: false,
    },
    positions: null,
    sha256: 'd'.repeat(64),
    error: null,
    printCheck: { ...noCheck },
    chosenPoseId: null,
    ...patch,
  };
}

function report(counts: { critical: number; hint: number }): PrintCheckReport {
  return {
    verdict: { level: counts.critical > 0 ? 'redesign' : 'adjust', title: 'Druckbar mit Anpassungen', text: '' },
    findings: [],
    counts: { ...counts, ok: 10, 'not-checked': 0 },
    recommendedPose: null,
    orientationRows: [],
    wallHistogram: null,
    toleranceRows: null,
    material: { id: 'group-petg', name: 'PETG', polymer: 'PETG', densityGPerCm3: 1.27, familySlug: null, familyName: null },
    showRedesignCta: false,
    resolutionMm: 0.2,
  };
}

/** SSR markup without React text separators and with plain spaces (Intl uses NBSP). */
const html = <P extends object>(element: ComponentType<P>, props: P) =>
  renderToString(createElement(StaticRouter, { location: '/3d-druck-preisrechner/' }, createElement(element, props)))
    .replace(/<!-- -->/g, '')
    .replace(/\u00a0/g, ' ');

function model(patch: Partial<SummaryModel>): SummaryModel {
  return {
    state: { kind: 'pending' },
    breakdown: null,
    shipWindow: null,
    leadTimeLabel: 'Standard',
    printCheckRunning: false,
    unpricedCount: 0,
    nextPieceDeltaEur: null,
    titleBlock: { file: 'halter.step', parameters: 'PETG · 25 % · 1 Stk · Standard', reference: '7F3A-21C9', date: '30.09.26' },
    ...patch,
  };
}

describe('workspace state (spec 2.5)', () => {
  it('derives the summary state from the session', () => {
    const run = (entries: QuoteFileEntry[]) => summaryState(entries, computeSessionEstimate(entries, selection, MATERIAL_CATALOG, PRICING_CONFIG));
    expect(run([entry({ status: 'analyzing', analysis: null })])).toEqual({ kind: 'pending' });
    expect(run([entry()])).toEqual({ kind: 'ok' });
    const big = entry({
      analysis: { triangleCount: 12, volumeMm3: 1e6, surfaceAreaMm2: 1e5, bbox: { min: [0, 0, 0], max: [420, 100, 100], size: [420, 100, 100] }, openMeshSuspected: false },
    });
    expect(run([big])).toEqual({ kind: 'oversize', fileNames: ['halter.step'] });
    expect(run([entry({ status: 'failed', analysis: null, error: 'kaputt' })])).toEqual({ kind: 'manual', reason: 'parse-error' });
    expect(run([entry({ status: 'upload-only', analysis: null, format: null })])).toEqual({ kind: 'manual', reason: 'no-model' });
  });

  it('labels the tabs with text, never colour only', () => {
    expect(modelBadge(null, false).text).toBe('offen');
    expect(modelBadge(entry({ status: 'analyzing' }), false).text).toBe('wird gelesen');
    expect(modelBadge(entry(), true)).toEqual({ text: 'Übergröße', tone: 'warn' });
    expect(modelBadge(entry({ analysis: { ...entry().analysis!, openMeshSuspected: true } }), false)).toEqual({ text: 'Netz offen', tone: 'warn' });
    expect(modelBadge(entry({ status: 'failed' }), false).text).toBe('Lesefehler');
    expect(printCheckBadge(entry({ printCheck: { ...noCheck, status: 'running' } }), null).text).toBe('Prüfung läuft');
    expect(printCheckBadge(entry({ printCheck: { ...noCheck, status: 'unavailable' } }), null).text).toBe('manuell');
    const done = entry({ printCheck: { ...noCheck, status: 'done' } });
    expect(printCheckBadge(done, report({ critical: 2, hint: 1 }))).toEqual({ text: '2 kritisch', tone: 'crit' });
    expect(printCheckBadge(done, report({ critical: 0, hint: 1 }))).toEqual({ text: '1 Hinweis', tone: 'warn' });
    expect(printCheckBadge(done, report({ critical: 0, hint: 0 }))).toEqual({ text: 'OK', tone: 'ok' });
    expect(printCheckHeadline(report({ critical: 0, hint: 2 }))).toBe('Druckbar mit Anpassungen · 2 Hinweise · 0 kritisch');
  });
});

describe('price summary renders every state', () => {
  const now = new Date('2026-09-30T09:15:00+02:00');
  const parts = [{ volumeMm3: 8000, surfaceAreaMm2: 2400, bboxSizeMm: [20, 20, 20] as [number, number, number] }];
  const breakdown = breakdownProject(parts, selection, MATERIAL_CATALOG, PRICING_CONFIG);
  const cta = { label: 'Verbindliches Angebot anfordern', onClick: () => undefined };

  it('pending', () => {
    const out = html(PriceSummaryPanel, { model: model({}), cta });
    expect(out).toContain('Wird berechnet');
    expect(out).toContain('Termin kommt mit dem Angebot');
  });

  it('ready with breakdown, minimum order, ship date, one CTA and title block', () => {
    const out = html(PriceSummaryPanel, {
      model: model({ state: { kind: 'ok' }, breakdown, shipWindow: estimateShipWindow(now, { minWorkdays: 3, maxWorkdays: 5 }), nextPieceDeltaEur: 2.1 }),
      cta,
    });
    expect(out).toContain('39 €');
    expect(out).toContain('Punktwert');
    expect(out).toContain('Mindestauftrag');
    expect(out).toContain('Ein weiteres Stück kostet Sie nur rund 2');
    expect(out).toContain('Mo 05.10.2026');
    expect(out).toContain('Do 01.10. 12:00');
    expect(out.match(/Verbindliches Angebot anfordern/g)).toHaveLength(1);
    expect(out).toContain('7F3A-21C9');
    expect(out).toContain('Warum eine Spanne?');
    expect(out).not.toContain('€/h');
  });

  it('printability running does not promise a narrower range', () => {
    const out = html(PriceSummaryPanel, { model: model({ state: { kind: 'ok' }, breakdown, printCheckRunning: true }), cta });
    expect(out).toContain('Druckbarkeitsprüfung läuft');
    expect(out).not.toContain('enger');
  });

  it('oversize: no price, splitting text and the CTA', () => {
    const out = html(PriceSummaryPanel, { model: model({ state: { kind: 'oversize', fileNames: ['rahmen.step'] } }), cta });
    expect(out).toContain('größer als mein Bauraum (350 × 350 × 300 mm)');
    expect(out).toContain('Verbindliches Angebot anfordern');
    expect(out).not.toContain('Punktwert');
  });

  it('manual: parse error and upload-only', () => {
    expect(html(PriceSummaryPanel, { model: model({ state: { kind: 'manual', reason: 'parse-error' } }), cta })).toContain('trotzdem mit der Anfrage übermittelt');
    expect(html(PriceSummaryPanel, { model: model({ state: { kind: 'manual', reason: 'no-model' } }), cta })).toContain('Manuell kalkuliert');
  });

  it('request form variant has no CTA', () => {
    expect(html(PriceSummaryPanel, { model: model({ state: { kind: 'ok' }, breakdown }), cta: null })).not.toContain('Verbindliches Angebot anfordern');
  });
});

describe('stage and model report states', () => {
  it('reading shows the phases, file size and the local status', () => {
    const out = html(StagePlaceholder, { entry: entry({ status: 'analyzing', analysis: null }) });
    expect(out).toContain('Triangulieren');
    expect(out).toContain('STEP wird trianguliert');
    expect(out).toContain('Lokal · nichts übertragen');
  });

  it('memory budget, parse error and upload-only have their own text', () => {
    expect(html(StagePlaceholder, { entry: entry() })).toContain('Vorschau pausiert');
    expect(html(StagePlaceholder, { entry: entry({ status: 'failed', error: 'STEP ohne Körper.' }) })).toContain('STEP ohne Körper. Die Datei wird trotzdem übermittelt.');
    expect(html(StagePlaceholder, { entry: entry({ status: 'upload-only', format: null }) })).toContain('Ohne Vorschau');
  });

  it('the measurement protocol lists what the viewer shows, as text', () => {
    const material = findMaterial(MATERIAL_CATALOG, 'group-petg');
    const e = entry({ analysis: { ...entry().analysis!, openMeshSuspected: true } });
    const part = estimatePart({ volumeMm3: 87_000, surfaceAreaMm2: 48_700, bboxSizeMm: [150, 86.7, 26] }, selection, MATERIAL_CATALOG, PRICING_CONFIG);
    const out = html(ModelReport, { entry: e, material, part, infillLabel: '25 %' });
    expect(out).toContain('150,0 × 86,7 × 26,0 mm');
    expect(out).toContain('43 % der längsten Achse');
    expect(out).toContain('Einheit mm plausibel');
    expect(out).toContain('nicht geschlossen');
    expect(out).toContain('kein Slicer');
    expect(out).toContain('Dreiecke (Tessellierung)');
    const tiny = entry({ analysis: { ...entry().analysis!, bbox: { min: [0, 0, 0], max: [2.4, 1, 1], size: [2.4, 1, 1] } } });
    expect(html(ModelReport, { entry: tiny, material, part: null, infillLabel: '25 %' })).toContain('Zoll oder Metern');
  });

  it('empty state: drop zone with microcopy and the local status', () => {
    const out = html(QuoteWorkbench, { printCheckMode: 'calculator' });
    expect(out).toContain('Modell reinziehen.');
    expect(out).toContain('STEP ist mir am liebsten');
    expect(out).toContain('Lokal · nichts übertragen.');
    expect(out).toContain('Datei auswählen');
  });
});
