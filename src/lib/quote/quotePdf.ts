import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from 'pdf-lib';
import { BRAND, CONTACT, FULL_ADDRESS, SITE } from '../brand';

/*
 * "Richtpreis-PDF": A4 landscape sheet laid out like a drawing, generated in
 * the browser (lazy chunk, pdf-lib). No server, no account, the model file
 * is not part of it - only the views rendered by the viewer.
 *
 * Standard fonts (Helvetica) use WinAnsi encoding: text is mapped to it
 * explicitly (toWinAnsi) instead of letting unsupported characters throw.
 */

export interface QuotePdfView {
  label: string;
  png: Uint8Array;
  /** e.g. "150,0 × 26,0 mm (B × H)"; null for the isometric view. */
  caption: string | null;
}

export interface QuotePdfInput {
  reference: string;
  createdAt: Date;
  files: ReadonlyArray<{ name: string; sha256: string | null; dimensions: string | null; pose: string }>;
  material: { name: string; libraryUrl: string | null };
  parameters: { infill: string; quantity: number; leadTime: string };
  breakdown: ReadonlyArray<{ label: string; detail: string; amount: string }>;
  pointEstimate: string;
  range: string;
  rangeNote: string;
  quantities: ReadonlyArray<{ quantity: number; perUnit: string; total: string; minimumOrder: boolean }>;
  unitLabel: string;
  shipWindow: string;
  printCheck: string | null;
  views: readonly QuotePdfView[];
  logoPng: Uint8Array | null;
  /** Owner decision; null = no validity period is stated. */
  validityDays: number | null;
}

const WIN_ANSI_REPLACEMENTS: ReadonlyArray<[RegExp, string]> = [
  [/\u2212/g, '-'],
  [/[\u2009\u202f\u00a0]/g, ' '],
  [/\u2192/g, '->'],
  [/\u2248/g, 'ca.'],
  [/\u0394/g, 'D'],
  [/\u2264/g, '<='],
  [/\u2265/g, '>='],
  [/\u2011/g, '-'],
];

/** Maps text to characters Helvetica (WinAnsi) can encode; anything else becomes '?'. */
export function toWinAnsi(text: string): string {
  let out = text;
  for (const [pattern, replacement] of WIN_ANSI_REPLACEMENTS) out = out.replace(pattern, replacement);
  // WinAnsi: Latin-1 printable plus the cp1252 extras used in German texts
  return out.replace(/[^\u0020-\u007e\u00a0-\u00ff\u20ac\u2013\u2014\u2018\u2019\u201a\u201c\u201d\u201e\u2022\u2026\u2030\u2122]/g, '?');
}

const PAGE: [number, number] = [841.89, 595.28];
const MARGIN = 24;
const INK = rgb(0.055, 0.067, 0.075);
const MUTED = rgb(0.35, 0.38, 0.42);
const LINE = rgb(0.6, 0.63, 0.66);
const ACCENT = rgb(0.059, 0.463, 0.431);

interface Fonts {
  regular: PDFFont;
  bold: PDFFont;
  mono: PDFFont;
}

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const words = toWinAnsi(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= width || !line) line = candidate;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

class Cursor {
  constructor(
    private readonly page: PDFPage,
    private readonly fonts: Fonts,
    public x: number,
    public y: number,
    private readonly width: number,
  ) {}

  text(text: string, options: { size?: number; font?: keyof Fonts; color?: ReturnType<typeof rgb>; gap?: number } = {}): void {
    const size = options.size ?? 8.5;
    const font = this.fonts[options.font ?? 'regular'];
    for (const line of wrap(text, font, size, this.width)) {
      this.y -= size + 2;
      this.page.drawText(line, { x: this.x, y: this.y, size, font, color: options.color ?? INK });
    }
    this.y -= options.gap ?? 2;
  }

  heading(text: string): void {
    this.y -= 4;
    this.text(text.toUpperCase(), { size: 7, font: 'bold', color: MUTED, gap: 3 });
  }

  row(label: string, value: string, options: { bold?: boolean } = {}): void {
    const size = 8.5;
    this.y -= size + 3;
    const labelFont = this.fonts.regular;
    const valueFont = options.bold ? this.fonts.bold : this.fonts.mono;
    const value1252 = toWinAnsi(value);
    const valueWidth = valueFont.widthOfTextAtSize(value1252, size);
    const labelLines = wrap(label, labelFont, size, this.width - valueWidth - 8);
    this.page.drawText(labelLines[0] ?? '', { x: this.x, y: this.y, size, font: labelFont, color: INK });
    this.page.drawText(value1252, { x: this.x + this.width - valueWidth, y: this.y, size, font: valueFont, color: INK });
    for (const extra of labelLines.slice(1)) {
      this.y -= size + 2;
      this.page.drawText(extra, { x: this.x, y: this.y, size, font: labelFont, color: INK });
    }
  }

  rule(): void {
    this.y -= 3;
    this.page.drawLine({ start: { x: this.x, y: this.y }, end: { x: this.x + this.width, y: this.y }, thickness: 0.4, color: LINE });
  }
}

function drawImageInBox(page: PDFPage, image: PDFImage, x: number, y: number, width: number, height: number): void {
  const scale = Math.min(width / image.width, height / image.height);
  const w = image.width * scale;
  const h = image.height * scale;
  page.drawImage(image, { x: x + (width - w) / 2, y: y + (height - h) / 2, width: w, height: h });
}

const dateFormat = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Berlin' });

export async function buildQuotePdf(input: QuotePdfInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(toWinAnsi(`Richtpreis ${input.reference} – ${BRAND.publicName}`));
  pdf.setAuthor(BRAND.legalName);
  pdf.setSubject('Richtpreis – kein Angebot');
  pdf.setCreator('3d-windt.de Preisrechner (im Browser erzeugt)');
  pdf.setCreationDate(input.createdAt);
  const page = pdf.addPage(PAGE);
  const fonts: Fonts = {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
    mono: await pdf.embedFont(StandardFonts.Courier),
  };
  const [pageWidth, pageHeight] = PAGE;

  // drawing frame
  page.drawRectangle({ x: MARGIN, y: MARGIN, width: pageWidth - 2 * MARGIN, height: pageHeight - 2 * MARGIN, borderColor: INK, borderWidth: 0.8 });

  // head
  const headTop = pageHeight - MARGIN;
  const headHeight = 46;
  page.drawLine({ start: { x: MARGIN, y: headTop - headHeight }, end: { x: pageWidth - MARGIN, y: headTop - headHeight }, thickness: 0.6, color: INK });
  let headX = MARGIN + 10;
  if (input.logoPng) {
    const logo = await pdf.embedPng(input.logoPng);
    drawImageInBox(page, logo, headX, headTop - headHeight + 6, 34, 34);
    headX += 44;
  }
  page.drawText(toWinAnsi('Richtpreis – kein Angebot'), { x: headX, y: headTop - 22, size: 15, font: fonts.bold, color: INK });
  page.drawText(toWinAnsi(`${BRAND.publicName} · ${BRAND.descriptor}`), { x: headX, y: headTop - 36, size: 8, font: fonts.regular, color: MUTED });
  const headRight = [
    `Richtpreis-ID ${input.reference || '–'}`,
    `Erstellt ${dateFormat.format(input.createdAt)}`,
    input.validityDays === null ? 'Gültig ist nur das verbindliche Angebot' : `Richtwert für ${input.validityDays} Tage`,
  ];
  headRight.forEach((line, index) => {
    const text = toWinAnsi(line);
    const font = index === 0 ? fonts.bold : fonts.regular;
    const width = font.widthOfTextAtSize(text, 8.5);
    page.drawText(text, { x: pageWidth - MARGIN - 10 - width, y: headTop - 15 - index * 11, size: 8.5, font, color: INK });
  });

  // columns
  const bodyTop = headTop - headHeight;
  const leftX = MARGIN + 10;
  const leftWidth = 440;
  const rightX = MARGIN + leftWidth + 30;
  const rightWidth = pageWidth - MARGIN - 10 - rightX;
  page.drawLine({ start: { x: rightX - 10, y: bodyTop }, end: { x: rightX - 10, y: MARGIN }, thickness: 0.4, color: LINE });

  // views: isometric large, three normal views below
  const iso = input.views[0];
  const normals = input.views.slice(1, 4);
  const isoHeight = 250;
  const isoY = bodyTop - 10 - isoHeight;
  if (iso) {
    drawImageInBox(page, await pdf.embedPng(iso.png), leftX, isoY, leftWidth, isoHeight);
    page.drawText(toWinAnsi(iso.label), { x: leftX, y: isoY + isoHeight - 8, size: 7, font: fonts.bold, color: MUTED });
  } else {
    page.drawText(toWinAnsi('Keine 3D-Ansicht verfügbar (ohne WebGL oder Datei ohne Vorschau).'), {
      x: leftX,
      y: isoY + isoHeight / 2,
      size: 9,
      font: fonts.regular,
      color: MUTED,
    });
  }
  const cellWidth = (leftWidth - 20) / 3;
  const cellHeight = 150;
  const cellY = isoY - 16 - cellHeight;
  for (let i = 0; i < normals.length; i += 1) {
    const view = normals[i];
    const x = leftX + i * (cellWidth + 10);
    page.drawRectangle({ x, y: cellY, width: cellWidth, height: cellHeight, borderColor: LINE, borderWidth: 0.4 });
    drawImageInBox(page, await pdf.embedPng(view.png), x + 4, cellY + 18, cellWidth - 8, cellHeight - 30);
    page.drawText(toWinAnsi(view.label), { x: x + 4, y: cellY + cellHeight - 10, size: 7, font: fonts.bold, color: MUTED });
    if (view.caption) page.drawText(toWinAnsi(view.caption), { x: x + 4, y: cellY + 6, size: 7.5, font: fonts.mono, color: INK });
  }

  // files under the views
  const files = new Cursor(page, fonts, leftX, cellY - 6, leftWidth);
  files.heading('Teile');
  for (const file of input.files.slice(0, 6)) {
    files.text(`${file.name} · ${file.dimensions ?? 'ohne Analyse'} · Drucklage ${file.pose}`, { size: 8 });
  }
  if (input.files.length > 6) files.text(`… und ${input.files.length - 6} weitere Dateien`, { size: 8, color: MUTED });

  // right column: parameters, breakdown, range, quantities, date, check
  const right = new Cursor(page, fonts, rightX, bodyTop - 4, rightWidth);
  right.heading('Parameter');
  right.row('Werkstoff', input.material.name);
  right.row('Füllgrad', input.parameters.infill);
  right.row('Stückzahl', String(input.parameters.quantity));
  right.row('Lieferstufe', input.parameters.leadTime);
  right.heading('Rechenweg (netto)');
  for (const line of input.breakdown) right.row(`${line.label} – ${line.detail}`, line.amount);
  right.rule();
  right.row('Punktwert', input.pointEstimate, { bold: true });
  right.row('Richtpreis-Spanne', input.range, { bold: true });
  right.text(input.rangeNote, { size: 7, color: MUTED });
  if (input.quantities.length > 0) {
    right.heading(`Preis nach Menge (je ${input.unitLabel} / Summe)`);
    for (const point of input.quantities) {
      right.row(`${point.quantity}${point.minimumOrder ? ' (Mindestauftrag)' : ''}`, `${point.perUnit} / ${point.total}`);
    }
  }
  right.heading('Versand');
  right.text(input.shipWindow, { size: 8 });
  if (input.printCheck) {
    right.heading('Druckbarkeit (automatische Vorprüfung)');
    right.text(input.printCheck, { size: 8 });
  }
  if (input.material.libraryUrl) {
    right.heading('Werkstoff-Datenblatt');
    right.text(input.material.libraryUrl, { size: 8, color: ACCENT });
  }

  // title block bottom right
  const blockHeight = 74;
  const blockY = MARGIN;
  const blockX = rightX - 10;
  const blockWidth = pageWidth - MARGIN - blockX;
  page.drawRectangle({ x: blockX, y: blockY, width: blockWidth, height: blockHeight, color: rgb(1, 1, 1), borderColor: INK, borderWidth: 0.8 });
  const firstFile = input.files[0];
  const blockRows: Array<[string, string]> = [
    ['Datei', input.files.length === 1 && firstFile ? firstFile.name : `${input.files.length} Dateien`],
    ['SHA-256', firstFile?.sha256 ? `${firstFile.sha256.slice(0, 16)}…` : '–'],
    ['Werkstoff', input.material.name],
    ['Maßstab', 'ohne Maßstab (Bildschirmansicht)'],
    ['Herkunft', 'Erstellt im Browser – Datei wurde nicht übertragen'],
  ];
  blockRows.forEach(([label, value], index) => {
    const y = blockY + blockHeight - 13 - index * 13;
    page.drawText(toWinAnsi(label.toUpperCase()), { x: blockX + 6, y, size: 6.5, font: fonts.bold, color: MUTED });
    const text = wrap(value, fonts.regular, 8, blockWidth - 70)[0] ?? '';
    page.drawText(text, { x: blockX + 64, y, size: 8, font: fonts.regular, color: INK });
    if (index < blockRows.length - 1) {
      page.drawLine({ start: { x: blockX, y: y - 4 }, end: { x: blockX + blockWidth, y: y - 4 }, thickness: 0.3, color: LINE });
    }
  });

  // footer (inside the frame, left of the title block)
  const footer = toWinAnsi(
    `Verbindlich nach technischer Prüfung. ${BRAND.legalName} · ${FULL_ADDRESS} · ${CONTACT.email} · ${CONTACT.phone} · ${SITE.url.replace('https://', '')}`,
  );
  const footerLines = wrap(footer, fonts.regular, 7, leftWidth);
  footerLines.forEach((line, index) => {
    page.drawText(line, { x: leftX, y: MARGIN + 8 + (footerLines.length - 1 - index) * 9, size: 7, font: fonts.regular, color: MUTED });
  });

  return pdf.save();
}

/** Decodes a data URL (image/png;base64) to bytes. */
export function dataUrlToBytes(dataUrl: string): Uint8Array {
  const match = /^data:image\/png;base64,(.+)$/.exec(dataUrl);
  if (!match) throw new Error('Expected a PNG data URL.');
  const binary = atob(match[1]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
