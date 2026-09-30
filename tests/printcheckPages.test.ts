import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { describe, expect, it } from 'vitest';
import DruckbarkeitPruefen from '../src/pages/DruckbarkeitPruefen';
import Preisrechner from '../src/pages/Preisrechner';
import Services from '../src/pages/Services';
import { PRINTCHECK_CHECKS, PRINTCHECK_FAQ, PRINTCHECK_PATH, PRINTCHECK_ROUTE_KEY } from '../src/lib/printcheck/content';
import { routeSeo } from '../src/lib/seo';

const root = path.resolve(__dirname, '..');

function render(url: string, element: Parameters<typeof createElement>[0]): string {
  return renderToString(createElement(StaticRouter, { location: url }, createElement(element)));
}

describe('printability landing page and SEO', () => {
  it('is registered for SEO, prerender and the sitemap', () => {
    const seo = routeSeo[PRINTCHECK_ROUTE_KEY];
    expect(seo.path).toBe(PRINTCHECK_PATH);
    expect(seo.title).toContain('Druckbarkeit');
    expect(seo.robots ?? 'index,follow').toBe('index,follow');
    const schemas = Array.isArray(seo.schema) ? seo.schema : [seo.schema];
    const faq = schemas.find((schema) => schema?.['@type'] === 'FAQPage') as { mainEntity: unknown[] } | undefined;
    expect(faq?.mainEntity).toHaveLength(PRINTCHECK_FAQ.length);
    expect(readFileSync(path.join(root, 'scripts/prerender.mjs'), 'utf-8')).toContain(`'${PRINTCHECK_PATH}'`);
    expect(readFileSync(path.join(root, 'public/sitemap.xml'), 'utf-8')).toContain(
      `<loc>https://3d-windt.de${PRINTCHECK_PATH}</loc>`,
    );
    const calculator = routeSeo['/3d-druck-preisrechner'];
    expect((calculator.schema as Array<Record<string, unknown>>).some((schema) => schema['@type'] === 'FAQPage')).toBe(true);
  });

  it('renders the landing page server-side with drop zone, checks and FAQ', () => {
    const html = render(PRINTCHECK_PATH, DruckbarkeitPruefen);
    expect(html).toContain('<h1');
    expect(html).toContain('3D-Druck-Datei prüfen');
    expect(html).toContain('Datei auswählen');
    for (const check of PRINTCHECK_CHECKS) expect(html).toContain(check.title.replace('&', '&amp;'));
    for (const entry of PRINTCHECK_FAQ) expect(html).toContain(entry.question);
  });

  it('explains the check on the calculator page and links the landing page', () => {
    const html = render('/3d-druck-preisrechner/', Preisrechner);
    expect(html).toContain('Was wird geprüft?');
    expect(html).toContain(`href="${PRINTCHECK_PATH}"`);
  });

  it('links the landing page from the services page', () => {
    expect(render('/leistungen/', Services)).toContain(`href="${PRINTCHECK_PATH}"`);
  });
});
