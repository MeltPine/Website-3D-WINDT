import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const distServerDir = path.join(rootDir, 'dist-server');
const SITE_URL = 'https://3d-windt.de';
const GOOGLE_SITE_VERIFICATION = (process.env.VITE_GOOGLE_SITE_VERIFICATION ?? '').trim();

const coreRoutes = [
  '/',
  '/leistungen/',
  '/ersatzteile-3d-drucken/',
  '/prototypen-3d-druck/',
  '/montagehilfen-vorrichtungen/',
  '/kunststoffteile-nachfertigen/',
  '/projekt-starten/',
  '/danke-projekt/',
  '/kontakt/',
  '/danke-kontakt/',
  '/ueber-uns/',
  '/nachhaltigkeit/',
  '/galerie/',
  '/impressum/',
  '/datenschutz/',
  '/404/',
  '/wissen/',
];

const knowledgeRoutes = [
  '/wissen/ersatzteil-nachfertigung-maschinenstillstand/',
  '/wissen/vorrichtungen-fuer-montagequalitaet/',
  '/wissen/prototyping-iterationen-in-5-tagen/',
  '/wissen/materialwahl-abs-asa-pc-pa/',
  '/wissen/tpu-funktionsbauteile-belastbar-auslegen/',
  '/wissen/fdm-toleranzen-im-industriealltag/',
  '/wissen/lieferfenster-statt-unrealistischer-expressversprechen/',
  '/wissen/kleinserie-ohne-werkzeug-vorbereiten/',
  '/wissen/bauteiloptimierung-fuer-funktionssicherheit/',
  '/wissen/cad-checkliste-fuer-anfrage/',
  '/wissen/scan-basierte-ersatzteilversorgung/',
  '/wissen/wartungsfenster-mit-3d-druck-absichern/',
  '/wissen/uv-und-witterungsbestaendigkeit-kunststoffteile/',
  '/wissen/temperaturbestaendige-bauteile-richtig-auslegen/',
  '/wissen/chemische-bestaendigkeit-im-praktischen-einsatz/',
  '/wissen/montagehilfe-ergonomie-und-prozesssicherheit/',
  '/wissen/ersatzteil-dokumentation-und-versionierung/',
  '/wissen/qualitaetspruefung-von-funktionsbauteilen/',
  '/wissen/kosten-treiber-im-industrie-3d-druck/',
  '/wissen/express-anfragen-realistisch-bewerten/',
  '/wissen/risikoanalyse-fuer-funktionskritische-teile/',
  '/wissen/materialwechsel-ohne-qualitaetsverlust/',
  '/wissen/lieferantenwechsel-additive-fertigung/',
  '/wissen/digitales-ersatzteillager-mit-3d-druck/',
  '/wissen/industrie-3d-druck-checkliste-fuer-einkauf/',
];

const routes = [...coreRoutes, ...knowledgeRoutes];

const bundleCandidates = ['entry-server.js', 'entry-server.mjs'];

async function resolveServerBundlePath() {
  for (const bundleName of bundleCandidates) {
    const candidate = path.join(distServerDir, bundleName);
    try {
      await access(candidate);
      return candidate;
    } catch {
      // try next candidate
    }
  }
  throw new Error('Kein SSR-Bundle fuer Prerender gefunden.');
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function upsertTag(html, regex, tag) {
  return regex.test(html) ? html.replace(regex, tag) : html.replace('</head>', `${tag}\n  </head>`);
}

function addSeoTags(html, seo) {
  const canonical = new URL(seo.path, SITE_URL).toString();
  const robotsValue = seo.robots ?? 'index,follow';

  const title = `<title>${escapeHtml(seo.title)}</title>`;
  const description = `<meta name="description" content="${escapeHtml(seo.description)}" />`;
  const robotsTag = `<meta name="robots" content="${escapeHtml(robotsValue)}" data-prerender-seo="robots" />`;
  const canonicalTag = `<link rel="canonical" href="${escapeHtml(canonical)}" data-prerender-seo="canonical" />`;
  const ogTypeTag = `<meta property="og:type" content="${escapeHtml(seo.ogType ?? 'website')}" data-prerender-seo="og:type" />`;
  const ogTitleTag = `<meta property="og:title" content="${escapeHtml(seo.title)}" data-prerender-seo="og:title" />`;
  const ogDescriptionTag = `<meta property="og:description" content="${escapeHtml(seo.description)}" data-prerender-seo="og:description" />`;
  const ogUrlTag = `<meta property="og:url" content="${escapeHtml(canonical)}" data-prerender-seo="og:url" />`;
  const twitterCardTag = '<meta name="twitter:card" content="summary" data-prerender-seo="twitter:card" />';
  const twitterTitleTag = `<meta name="twitter:title" content="${escapeHtml(seo.title)}" data-prerender-seo="twitter:title" />`;
  const twitterDescriptionTag = `<meta name="twitter:description" content="${escapeHtml(seo.description)}" data-prerender-seo="twitter:description" />`;

  let output = html;
  output = output.replace(/<title>.*?<\/title>/is, title);
  output = output.replace(/<meta\s+name="description"[^>]*>/i, description);
  output = output.replace(/\n?\s*<meta\s+name="robots"[^>]*>/gi, '');
  output = output.replace(/\n?\s*<link rel="canonical"[^>]*>/gi, '');
  output = output.replace(/\n?\s*<meta[^>]+data-prerender-seo="[^"]+"[^>]*>/gi, '');
  output = output.replace(/\n?\s*<script id="prerender-json-ld"[^>]*>[\s\S]*?<\/script>/gi, '');
  output = output.replace(/\n?\s*<meta[^>]+data-prerender-google-site-verification="true"[^>]*>/gi, '');

  const tags = [
    robotsTag,
    canonicalTag,
    ogTypeTag,
    ogTitleTag,
    ogDescriptionTag,
    ogUrlTag,
    twitterCardTag,
    twitterTitleTag,
    twitterDescriptionTag,
  ];

  tags.forEach((tag) => {
    output = upsertTag(output, new RegExp(tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), tag);
  });

  if (seo.schema) {
    const safeSchema = JSON.stringify(seo.schema).replace(/</g, '\\u003c');
    const schemaTag = `<script id="prerender-json-ld" type="application/ld+json">${safeSchema}</script>`;
    output = output.replace('</head>', `${schemaTag}\n  </head>`);
  }

  if (GOOGLE_SITE_VERIFICATION) {
    const verificationTag = `<meta name="google-site-verification" content="${escapeHtml(GOOGLE_SITE_VERIFICATION)}" data-prerender-google-site-verification="true" />`;
    output = upsertTag(output, /<meta\s+name="google-site-verification"[^>]*>/i, verificationTag);
  }

  return output;
}

function buildOutputPath(route) {
  if (route === '/') {
    return path.join(distDir, 'index.html');
  }
  return path.join(distDir, route.replace(/^\//, ''), 'index.html');
}

async function run() {
  const template = await readFile(path.join(distDir, 'index.html'), 'utf-8');
  const bundlePath = await resolveServerBundlePath();
  const { render } = await import(pathToFileURL(bundlePath).href);

  for (const route of routes) {
    const { appHtml, seo } = render(route);
    const htmlWithApp = template.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`);
    const htmlWithSeo = addSeoTags(htmlWithApp, seo);
    const outputPath = buildOutputPath(route);

    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, htmlWithSeo, 'utf-8');
    console.log(`Prerendered ${route} -> ${path.relative(rootDir, outputPath)}`);
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
