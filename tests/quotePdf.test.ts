import { readFileSync } from 'node:fs';
import path from 'node:path';
import { PDFDocument, PDFName, PDFRawStream } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { OWNER_DECISIONS } from '../src/lib/quote/ownerDecisions';
import { PRICING_CONFIG } from '../src/lib/quote/pricingConfig';
import { buildQuotePdf, dataUrlToBytes, toWinAnsi, type QuotePdfInput } from '../src/lib/quote/quotePdf';
import { SHARE_PARAMS, buildShareUrl, parseShareParams } from '../src/lib/quote/shareLink';

const root = path.resolve(__dirname, '..');
const logo = new Uint8Array(readFileSync(path.join(root, 'public/logo/3dw-logo-mark.png')));

function input(patch: Partial<QuotePdfInput> = {}): QuotePdfInput {
  return {
    reference: '7F3A-21C9',
    createdAt: new Date('2026-09-30T09:15:00+02:00'),
    files: [{ name: 'halter.step', sha256: 'a'.repeat(64), dimensions: '150,0 × 86,7 × 26,0 mm', pose: 'wie geladen' }],
    material: { name: 'PETG', libraryUrl: 'https://3d-windt.de/werkstoffe/petg-pctg/' },
    parameters: { infill: '25 % – Standard', quantity: 1, leadTime: 'Standard (3–5 Werktage)' },
    breakdown: [
      { label: 'Fertigung', detail: 'Material 83 g PETG + Maschinenzeit ca. 2,02 h', amount: '18,69 €' },
      { label: 'Rüsten & Prüfung', detail: '15,00 € je Position', amount: '15,00 €' },
      { label: 'Mindestauftrag', detail: 'aufgefüllt auf 39,00 €', amount: '+5,31 €' },
    ],
    pointEstimate: '39,00 €',
    range: '39 € – 55 €',
    rangeNote: 'Spanne: Stützen, Ausrichtung und Nacharbeit klären sich erst in der technischen Prüfung.',
    quantities: [
      { quantity: 1, perUnit: '39,00 €', total: '39,00 €', minimumOrder: true },
      { quantity: 10, perUnit: '18,32 €', total: '183,20 €', minimumOrder: false },
    ],
    unitLabel: 'Stück',
    shipWindow: 'Versand zwischen Mo 05.10. und Mi 07.10.2026 (Standard)',
    printCheck: 'Druckbar mit Anpassungen · 7 Hinweise · 0 kritisch',
    views: [
      { label: 'Isometrie', png: logo, caption: null },
      { label: 'Vorne', png: logo, caption: '150,0 × 26,0 mm (B × H)' },
      { label: 'Oben', png: logo, caption: '150,0 × 86,7 mm (B × T)' },
      { label: 'Rechts', png: logo, caption: '86,7 × 26,0 mm (T × H)' },
    ],
    logoPng: logo,
    validityDays: OWNER_DECISIONS.quoteValidityDays,
    ...patch,
  };
}

async function imageCount(bytes: Uint8Array): Promise<number> {
  const pdf = await PDFDocument.load(bytes);
  return pdf.context
    .enumerateIndirectObjects()
    .filter(([, object]) => object instanceof PDFRawStream && object.dict.get(PDFName.of('Subtype')) === PDFName.of('Image')).length;
}

describe('estimate PDF', () => {
  it('builds one A4 landscape page with the logo and all four views embedded', async () => {
    const bytes = await buildQuotePdf(input());
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-');
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(1);
    const { width, height } = pdf.getPage(0).getSize();
    expect(width).toBeGreaterThan(height);
    // pdf-lib embeds identical PNGs once per embedPng call: logo + 4 views (+ alpha masks)
    expect(await imageCount(bytes)).toBeGreaterThanOrEqual(5);
    expect(pdf.getTitle()).toContain('7F3A-21C9');
  });

  it('still carries the logo without views (no WebGL)', async () => {
    const bytes = await buildQuotePdf(input({ views: [] }));
    expect(await imageCount(bytes)).toBeGreaterThanOrEqual(1);
  });

  it('maps text to WinAnsi instead of failing on unsupported characters', () => {
    expect(toWinAnsi('ΔX −0,5 mm → ≈ 3')).toBe('DX -0,5 mm -> ca. 3');
    expect(toWinAnsi('Größe 150 × 86,7 mm – 39 €')).toBe('Größe 150 × 86,7 mm – 39 €');
    expect(toWinAnsi('Ω')).toBe('?');
    expect(() => dataUrlToBytes('data:text/plain;base64,AAAA')).toThrow();
  });
});

describe('parameter link', () => {
  const selection = { materialId: 'basf_pa', infillId: 'i50', leadTimeId: 'express', quantity: 12 };

  it('round-trips parameters and the reference, never geometry or file names', () => {
    const url = new URL(buildShareUrl('https://3d-windt.de', selection, '7F3A-21C9'));
    expect(url.pathname).toBe('/3d-druck-preisrechner/');
    expect([...url.searchParams.keys()].sort()).toEqual(Object.values(SHARE_PARAMS).sort());
    const parsed = parseShareParams(url.searchParams, PRICING_CONFIG);
    expect(parsed).toEqual({
      materialId: 'basf_pa',
      selection: { infillId: 'i50', quantity: 12, leadTimeId: 'express' },
      reference: '7F3A-21C9',
      rejected: [],
    });
  });

  it('rejects anything outside the allowlists', () => {
    const params = new URLSearchParams({ material: '<script>', fuellgrad: 'i99', menge: '0', lieferung: 'sofort', rp: 'abc' });
    const parsed = parseShareParams(params, PRICING_CONFIG);
    expect(parsed.selection).toEqual({});
    expect(parsed.materialId).toBeNull();
    expect(parsed.reference).toBeNull();
    expect(parsed.rejected.sort()).toEqual(['fuellgrad', 'lieferung', 'material', 'menge', 'rp']);
    expect(parseShareParams(new URLSearchParams({ menge: '20000' }), PRICING_CONFIG).rejected).toEqual(['menge']);
  });
});
