import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const distServerDir = path.join(rootDir, 'dist-server');
const SITE_URL = 'https://3d-windt.de';
const GA_MEASUREMENT_ID = (process.env.VITE_GA_MEASUREMENT_ID ?? '').trim();
const GOOGLE_SITE_VERIFICATION = (process.env.VITE_GOOGLE_SITE_VERIFICATION ?? '').trim();

const routes = [
  '/',
  '/leistungen',
  '/ersatzteile-3d-drucken',
  '/prototypen-3d-druck',
  '/montagehilfen-vorrichtungen',
  '/kunststoffteile-nachfertigen',
  '/projekt-starten',
  '/danke-projekt',
  '/kontakt',
  '/danke-kontakt',
  '/ueber-uns',
  '/nachhaltigkeit',
  '/galerie',
  '/impressum',
  '/datenschutz',
];

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
  throw new Error('Kein SSR-Bundle für Prerender gefunden.');
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
  const title = `<title>${escapeHtml(seo.title)}</title>`;
  const description = `<meta name="description" content="${escapeHtml(seo.description)}" />`;
  const canonicalTag = `<link rel="canonical" href="${escapeHtml(canonical)}" data-prerender-seo="canonical" />`;
  const ogTypeTag = `<meta property="og:type" content="${escapeHtml(seo.ogType ?? 'website')}" data-prerender-seo="og:type" />`;
  const ogTitleTag = `<meta property="og:title" content="${escapeHtml(seo.title)}" data-prerender-seo="og:title" />`;
  const ogDescriptionTag = `<meta property="og:description" content="${escapeHtml(seo.description)}" data-prerender-seo="og:description" />`;
  const ogUrlTag = `<meta property="og:url" content="${escapeHtml(canonical)}" data-prerender-seo="og:url" />`;
  const twitterCardTag = `<meta name="twitter:card" content="summary" data-prerender-seo="twitter:card" />`;
  const twitterTitleTag = `<meta name="twitter:title" content="${escapeHtml(seo.title)}" data-prerender-seo="twitter:title" />`;
  const twitterDescriptionTag = `<meta name="twitter:description" content="${escapeHtml(seo.description)}" data-prerender-seo="twitter:description" />`;

  let output = html;
  output = output.replace(/<title>.*?<\/title>/is, title);
  output = output.replace(/<meta\s+name="description"[^>]*>/i, description);
  output = output.replace(/\n?\s*<link rel="canonical"[^>]*>/gi, '');
  output = output.replace(/\n?\s*<meta[^>]+data-prerender-seo="[^"]+"[^>]*>/gi, '');
  output = output.replace(/\n?\s*<script id="prerender-json-ld"[^>]*>[\s\S]*?<\/script>/gi, '');
  output = output.replace(/\n?\s*<meta[^>]+data-prerender-google-site-verification="true"[^>]*>/gi, '');
  output = output.replace(/\n?\s*<script id="prerender-ga-loader"[^>]*><\/script>/gi, '');
  output = output.replace(/\n?\s*<script id="prerender-ga-inline"[^>]*>[\s\S]*?<\/script>/gi, '');

  const tags = [
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

  if (GA_MEASUREMENT_ID) {
    const gaId = escapeHtml(GA_MEASUREMENT_ID);
    const gaLoader = `<script id="prerender-ga-loader" async src="https://www.googletagmanager.com/gtag/js?id=${gaId}"></script>`;
    const gaInline = `<script id="prerender-ga-inline">window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', '${gaId}', { anonymize_ip: true, send_page_view: false });</script>`;
    output = output.replace('</head>', `${gaLoader}\n${gaInline}\n  </head>`);
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
