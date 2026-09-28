import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { Route, Routes } from 'react-router-dom';
import { StaticRouter } from 'react-router-dom/server';
import { describe, expect, it } from 'vitest';
import vendored from '../src/data/fdm-inspect-materials.json';
import { knowledgePageBySlug, knowledgePages } from '../src/lib/knowledgePages';
import { MATERIAL_CATALOG } from '../src/lib/quote/materials';
import { routeSeo } from '../src/lib/seo';
import { USE_CASES, WERKSTOFF_CONTENT, WERKSTOFF_CONTENT_BY_SLUG } from '../src/lib/werkstoffe/content';
import {
  DB_FIELD_MAP,
  FIELD_REVIEW,
  UNIT_LABEL,
  formatDatasheetValue,
  resolveProperties,
} from '../src/lib/werkstoffe/datasheetValues';
import {
  WERKSTOFF_FAMILIES,
  WERKSTOFF_FAMILY_BY_SLUG,
  familyForCatalogMaterial,
  werkstoffPath,
  werkstoffRouteKey,
} from '../src/lib/werkstoffe/families';
import {
  COMPARISON_COLUMNS,
  LIBRARY_PRODUCTS,
  buildLibraryProducts,
  comparisonCell,
  type LibraryDatabase,
} from '../src/lib/werkstoffe/library';
import WerkstoffDetail from '../src/pages/WerkstoffDetail';
import Werkstoffe from '../src/pages/Werkstoffe';

const database = vendored as unknown as LibraryDatabase;
const root = path.resolve(__dirname, '..');
const dbMaterial = (id: string) => {
  const material = database.materials.find((entry) => entry.id === id);
  if (!material) throw new Error(`missing ${id}`);
  return material;
};

function renderPage(url: string): string {
  return renderToString(
    createElement(
      StaticRouter,
      { location: url },
      createElement(
        Routes,
        null,
        createElement(Route, { path: '/werkstoffe/', element: createElement(Werkstoffe) }),
        createElement(Route, { path: '/werkstoffe/:slug/', element: createElement(WerkstoffDetail) }),
      ),
    ),
  );
}

function decodeHtml(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

const pageUrls = ['/werkstoffe/', ...WERKSTOFF_FAMILIES.map((family) => werkstoffPath(family.slug))];
const renderedPages = pageUrls.map((url) => ({ url, html: renderPage(url) }));

/** Number followed by a material-value unit, e.g. "60 MPa", "1,24 g/cm³", "15 %". */
const VALUE_WITH_UNIT = /\d[\d.,]*\s*(?:°C|°F|MPa|GPa|ksi|kJ\/m²|kJ\/m2|g\/cm³|g\/cm3|kg\/m3|%|g\/10\s?min)/g;
/** Test-method definitions (ISO 75 method A/B loads), not material values. */
const ALLOWED_DEFINITIONS = new Set(['1,8 MPa', '0,45 MPa']);

describe('material library data layer', () => {
  it('assigns every database product to exactly one family', () => {
    const assigned = WERKSTOFF_FAMILIES.flatMap((family) => family.productIds);
    expect(new Set(assigned).size).toBe(assigned.length);
    expect([...assigned].sort()).toEqual(database.materials.map((material) => material.id).sort());
  });

  it('maps generic polymers to at most one family', () => {
    const polymers = WERKSTOFF_FAMILIES.flatMap((family) => family.genericPolymers);
    expect(new Set(polymers).size).toBe(polymers.length);
  });

  it('knows every database property key and unit (no silent drops after a sync)', () => {
    for (const material of database.materials) {
      for (const [key, property] of Object.entries(material.properties)) {
        expect(DB_FIELD_MAP[key], `${material.id}.${key}`).toBeDefined();
        expect(UNIT_LABEL[property?.unit ?? ''], `${material.id}.${key} unit`).toBeDefined();
      }
      expect(resolveProperties(material).unmapped).toEqual([]);
    }
  });

  it('gives every displayed value a unit, a datasheet source and the database number', () => {
    for (const product of LIBRARY_PRODUCTS) {
      const material = dbMaterial(product.id);
      expect(product.datasheetUrl).toBe(material.source.url);
      expect(product.datasheetUrl.startsWith('https://')).toBe(true);
      expect(product.retrieved).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      for (const value of product.values) {
        const property = material.properties[value.sourceField];
        expect(property, `${product.id}.${value.sourceField}`).toBeDefined();
        expect(value.unitLabel.length).toBeGreaterThan(0);
        expect(value.display.endsWith(` ${value.unitLabel}`)).toBe(true);
        expect(value.display).toBe(formatDatasheetValue(property!));
        expect(value.sourceText).toBe(property!.source_text);
        expect(value.standard).toBe(property!.standard);
      }
    }
  });

  it('shows ranges as ranges, never the computed midpoint', () => {
    const pla = LIBRARY_PRODUCTS.find((product) => product.id === 'spectrum_pla_premium')!;
    const bed = pla.values.find((value) => value.sourceField === 'bed_temperature')!;
    expect(bed.display).toBe('0–45 °C');
    const glass = pla.values.find((value) => value.sourceField === 'glass_transition')!;
    expect(glass.display).toBe('55–60 °C');
  });

  it('withholds suspect, flagged and review-withheld values with a reason', () => {
    const withheldKeys = LIBRARY_PRODUCTS.flatMap((product) =>
      product.withheld.map((entry) => `${product.id}.${entry.sourceField}`),
    ).sort();
    expect(withheldKeys).toEqual(
      [
        'basf_tpu95a.impact_charpy_notched',
        'basf_tpu95a.vicat',
        'spectrum_asa_275.vicat',
        'spectrum_pa6_lowwarp_cf15.moisture_absorption',
        'spectrum_pla_premium.flexural_modulus',
      ].sort(),
    );
    for (const product of LIBRARY_PRODUCTS) {
      for (const entry of product.withheld) {
        expect(entry.reason.length).toBeGreaterThan(20);
        expect(product.values.some((value) => value.sourceField === entry.sourceField)).toBe(false);
      }
    }
  });

  it('only reviews values that exist in the database', () => {
    for (const [materialId, fields] of Object.entries(FIELD_REVIEW)) {
      const material = dbMaterial(materialId);
      for (const field of Object.keys(fields)) {
        expect(material.properties[field], `${materialId}.${field}`).toBeDefined();
      }
    }
  });

  it('labels reclassified values by what the datasheet names', () => {
    const abs = LIBRARY_PRODUCTS.find((product) => product.id === 'spectrum_abs_gp450')!;
    expect(abs.values.find((value) => value.sourceField === 'impact_charpy_notched')?.field).toBe('impact_izod_notched');
    const hips = LIBRARY_PRODUCTS.find((product) => product.id === 'spectrum_hips_x')!;
    expect(hips.values.find((value) => value.sourceField === 'hdt_a')?.field).toBe('hdt_b');
  });

  it('reports missing comparison values instead of estimating them', () => {
    const tpu = LIBRARY_PRODUCTS.find((product) => product.id === 'basf_tpu95a')!;
    const density = COMPARISON_COLUMNS.find((column) => column.id === 'density')!;
    expect(comparisonCell(tpu, density)).toEqual({ kind: 'missing' });
    const vicat = COMPARISON_COLUMNS.find((column) => column.id === 'vicat')!;
    expect(comparisonCell(tpu, vicat).kind).toBe('withheld');
  });

  it('rejects unknown products and unsupported schemas', () => {
    expect(() =>
      buildLibraryProducts(database, [{ ...WERKSTOFF_FAMILIES[0], productIds: ['does_not_exist'] }]),
    ).toThrow();
    expect(() => buildLibraryProducts({ ...database, schema_version: '2.0' }, WERKSTOFF_FAMILIES)).toThrow();
  });
});

describe('material library and calculator', () => {
  it('maps every calculator material to a library page', () => {
    for (const material of MATERIAL_CATALOG) {
      const family = familyForCatalogMaterial(material);
      expect(family, material.id).not.toBeNull();
      expect(WERKSTOFF_CONTENT_BY_SLUG[family!.slug]).toBeDefined();
    }
  });

  it('preselects an existing calculator material from every family CTA', () => {
    const ids = new Set(MATERIAL_CATALOG.map((material) => material.id));
    for (const family of WERKSTOFF_FAMILIES) {
      expect(ids.has(family.calculatorMaterialId), family.slug).toBe(true);
      expect(familyForCatalogMaterial(MATERIAL_CATALOG.find((m) => m.id === family.calculatorMaterialId)!)?.slug).toBe(
        family.slug,
      );
    }
  });

  it('never shows a withheld value as calculator key fact', () => {
    const tpu = MATERIAL_CATALOG.find((material) => material.id === 'basf_tpu95a')!;
    expect(tpu.keyFacts.some((fact) => fact.startsWith('Vicat'))).toBe(false);
    expect(tpu.keyFacts.some((fact) => fact.startsWith('Kerbschlag'))).toBe(false);
    const abs = MATERIAL_CATALOG.find((material) => material.id === 'spectrum_abs_gp450')!;
    expect(abs.keyFacts).toContain('Kerbschlagzähigkeit (Izod) 19 kJ/m² (ISO 180-1A)');
  });
});

describe('material library content and routing', () => {
  it('has content, SEO, prerender and sitemap entries for every family', () => {
    const prerender = readFileSync(path.join(root, 'scripts/prerender.mjs'), 'utf-8');
    const sitemap = readFileSync(path.join(root, 'public/sitemap.xml'), 'utf-8');
    expect(prerender).toContain("'/werkstoffe/'");
    expect(sitemap).toContain('<loc>https://3d-windt.de/werkstoffe/</loc>');
    const titles = new Set<string>();
    const descriptions = new Set<string>();
    for (const family of WERKSTOFF_FAMILIES) {
      expect(WERKSTOFF_CONTENT_BY_SLUG[family.slug], family.slug).toBeDefined();
      const seo = routeSeo[werkstoffRouteKey(family.slug)];
      expect(seo?.path).toBe(werkstoffPath(family.slug));
      titles.add(seo.title);
      descriptions.add(seo.description);
      expect(seo.description.length).toBeLessThanOrEqual(160);
      expect(prerender).toContain(`'${werkstoffPath(family.slug)}'`);
      expect(sitemap).toContain(`<loc>https://3d-windt.de${werkstoffPath(family.slug)}</loc>`);
    }
    expect(titles.size).toBe(WERKSTOFF_FAMILIES.length);
    expect(descriptions.size).toBe(WERKSTOFF_FAMILIES.length);
    expect(WERKSTOFF_CONTENT.map((content) => content.slug).sort()).toEqual(
      WERKSTOFF_FAMILIES.map((family) => family.slug).sort(),
    );
  });

  it('uses honest structured data (no offers, prices or reviews)', () => {
    const serialized = JSON.stringify(
      Object.entries(routeSeo)
        .filter(([key]) => key.startsWith('/werkstoffe'))
        .map(([, seo]) => seo.schema),
    );
    expect(serialized).toContain('BreadcrumbList');
    for (const forbidden of ['Offer', 'Product', 'AggregateRating', 'Review', 'price']) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it('only links existing families and knowledge pages', () => {
    const slugs = new Set(WERKSTOFF_FAMILIES.map((family) => family.slug));
    for (const content of WERKSTOFF_CONTENT) {
      content.related.forEach((slug) => expect(slugs.has(slug), slug).toBe(true));
      content.relatedKnowledge.forEach((slug) => expect(knowledgePageBySlug[slug], slug).toBeDefined());
    }
    for (const useCase of USE_CASES) {
      [...useCase.recommended, ...useCase.avoid].forEach((entry) => expect(slugs.has(entry.slug)).toBe(true));
    }
    for (const page of knowledgePages) {
      (page.relatedMaterials ?? []).forEach((slug) => expect(WERKSTOFF_FAMILY_BY_SLUG[slug], slug).toBeDefined());
    }
    expect(knowledgePageBySlug['materialwahl-abs-asa-pc-pa'].relatedMaterials).toContain('abs');
  });

  it('keeps numeric material values out of the qualitative copy', () => {
    const copy = JSON.stringify([WERKSTOFF_CONTENT, USE_CASES, WERKSTOFF_FAMILIES]);
    expect(copy.match(VALUE_WITH_UNIT)).toBeNull();
  });
});

describe('rendered library pages', () => {
  it('renders every page', () => {
    for (const { url, html } of renderedPages) {
      expect(html, url).toContain('<h1');
      expect(html, url).not.toContain('Seite nicht gefunden');
    }
  });

  it('renders each database value exactly as stored, next to its datasheet link', () => {
    let checked = 0;
    for (const { url, html } of renderedPages) {
      for (const match of html.matchAll(/<span data-db-value="([^"]+)"[^>]*>([^<]*)<\/span>/g)) {
        const [materialId, field] = match[1].split('.');
        const property = dbMaterial(materialId).properties[field];
        expect(property, `${url} ${match[1]}`).toBeDefined();
        expect(decodeHtml(match[2]), `${url} ${match[1]}`).toBe(formatDatasheetValue(property!));
        expect(html, `${url} datasheet ${materialId}`).toContain(`data-datasheet="${materialId}"`);
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(100);
  });

  it('renders datasheet quotes and notes verbatim from the database', () => {
    for (const { html } of renderedPages) {
      for (const match of html.matchAll(/<span data-db-source="([^"]+)"[^>]*>([^<]*)<\/span>/g)) {
        const [materialId, field] = match[1].split('.');
        expect(decodeHtml(match[2])).toBe(dbMaterial(materialId).properties[field]?.source_text);
      }
      for (const match of html.matchAll(/<span data-db-note="([^"]+)"[^>]*>([^<]*)<\/span>/g)) {
        const [materialId, field] = match[1].split('.');
        expect(dbMaterial(materialId).properties[field]?.notes ?? []).toContain(decodeHtml(match[2]));
      }
    }
  });

  it('shows no number with a unit that does not come from the database', () => {
    // Guard against a vacuous pass: the unstripped page does contain values.
    const overview = renderedPages.find((page) => page.url === '/werkstoffe/')!.html;
    expect(decodeHtml(overview.replace(/<[^>]+>/g, ' ')).match(VALUE_WITH_UNIT)?.length ?? 0).toBeGreaterThan(30);
    for (const { url, html } of renderedPages) {
      const withoutDbContent = html
        .replace(/<span data-db-(?:value|source|note)="[^"]+"[^>]*>[^<]*<\/span>/g, ' ')
        .replace(/<[^>]+>/g, ' ');
      const text = decodeHtml(withoutDbContent);
      const offenders = (text.match(VALUE_WITH_UNIT) ?? []).filter((hit) => !ALLOWED_DEFINITIONS.has(hit.trim()));
      expect(offenders, url).toEqual([]);
    }
  });

  it('marks missing values and states the disclaimer on every page with data', () => {
    const overview = renderedPages.find((page) => page.url === '/werkstoffe/')!.html;
    expect(overview).toContain('keine Herstellerangabe');
    for (const { url, html } of renderedPages) {
      expect(decodeHtml(html), url).toContain(database.disclaimer);
    }
  });

  it('links the calculator with a preselected material', () => {
    for (const family of WERKSTOFF_FAMILIES) {
      const html = renderedPages.find((page) => page.url === werkstoffPath(family.slug))!.html;
      expect(html).toContain(`href="/3d-druck-preisrechner/?material=${family.calculatorMaterialId}"`);
    }
  });
});
