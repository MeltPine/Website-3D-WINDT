# Webseite 3D-Windt — Architecture Context

Public website + marketing funnel for 3D-Windt.de. Written 2026-08-28 from verified
repo structure — this file didn't exist before; keep it honest and update it when
the structure actually changes, don't let it drift like the old top-level SSoT did.

## Stack
- React + Vite + TypeScript + Tailwind, SSR build (`vite build --ssr
  src/entry-server.tsx`) plus a prerender pass (`scripts/prerender.mjs`).
- `npm run build` = client build → SSR build → prerender → outputs `dist/`
  (client) and `dist-server/` (SSR).
- Hosting: **Cloudflare Pages** (migrated from Netlify 2026-09-30, branch
  `feat/cloudflare`; owner steps and DNS cutover in `docs/cloudflare-migration.md`,
  German). Build `npm run build`, output `dist/`, Node from `.node-version`,
  public build var `VITE_GA_MEASUREMENT_ID` from `.env.production` (a platform
  env var of the same name overrides it).
  `wrangler.toml` is the source of truth for bindings and `[vars]`; secrets live
  in the Pages project only (template `.dev.vars.example`).
- **Rollback** = redeploy the last Netlify-era `main` on the still-existing
  Netlify site and point DNS back (Netlify DNS / nameservers). Nothing in this
  repo supports Netlify anymore (`netlify.toml`, `netlify/`, `@netlify/*` removed).
- Pages Functions in `functions/api/**` are thin adapters (`server/pages.ts`
  resolves bindings, maps exceptions to JSON 500). All logic lives in
  platform-neutral `server/*.ts`, which only depend on the structural binding
  interfaces in `server/env.ts` (tests use `tests/helpers/cloudflare.ts` fakes).
  Runtime flag `nodejs_compat` (node:crypto/node:buffer, Stripe SDK).
- Bindings: R2 `UPLOADS` (bucket `3dw-uploads`, EU jurisdiction; prefixes
  `uploads/files/`, `uploads/parts/`, `leads/`), KV `STATE` (Stripe webhook
  markers, rate-limit counters). Var `SITE_URL` (absolute URLs, no fallback to
  the request host).
- Security headers in `public/_headers` (CSP, X-Frame-Options, etc.) — don't
  loosen these without a reason. `_headers` never applies to Function
  responses; rules are merged, so path rules detach a header (`! Name`) before
  replacing it. Unknown paths: Pages serves `dist/404.html` (moved there by
  `scripts/prerender.mjs`) with status 404; `_redirects` has no catch-all.
- Leads: `POST /api/lead` (`server/lead.ts`, field allowlist
  `server/leadSchema.ts`) stores `leads/YYYY/MM/<uuid>.json` in R2 **first**,
  then mails sales + customer via Resend (idempotency keys per lead). Success to
  the browser only if storage succeeded; mail failure = `notified: false` + log.
  Honeypot `bot-field`, same-origin, 64 KB, KV rate limit. `/api/lead-alert`
  mails only `LEAD_SALES_EMAIL`. No CORS anywhere. The old public
  `lead-followup` endpoint is gone (it was an open mail relay with wildcard CORS);
  its confirmation mail is part of `/api/lead`.
- Rate limits (`server/rateLimit.ts`) are approximate (KV is eventually
  consistent, no atomic increment) and fail open; the hard limit is the
  Cloudflare WAF rule from the migration doc.
- Remote: `github.com/MeltPine/Website-3D-WINDT.git` — a **different** GitHub
  account than the `Extrutex` org used for the HatchOS ecosystem repos. Don't
  assume `gh` auth carries over; check before pushing.

## Subprojects inside this repo
- **`academy-growth-site/`** — standalone static funnel/landing page (flat
  HTML/CSS/JS, own `netlify.toml`, own `package.json`). Not part of the main
  Vite build; deploys independently. Treat as its own small site when editing.
- **`academy/`** — separate from `academy-growth-site/`, not yet characterized
  here — check its own structure before assuming it's the same thing.
- **`docs/`** — this repo already has substantial marketing-ops documentation:
  `funnel-operations.md`, `b2b-funnel-8-week-plan.md`, `operating-rhythm.md`,
  `kpi-scorecard.md` / `kpi-weekly-scorecard.csv`, `lead-board.md/.csv`,
  `ui-ux-audit-priority.md`, `release-checklist.md`, `academy-launch-checklist.md`,
  `linkedin-post-templates.md`, and more. **Read these before writing new
  marketing/funnel docs — don't duplicate what's already tracked here.**

## Price calculator, 3D viewer, file upload (added 2026-09-24)
- `/3d-druck-preisrechner/` and step 1 of `/projekt-starten/` share one in-memory
  session (`src/lib/quote/quoteSession.ts`); navigating from calculator to form
  keeps files and parameters. Files are never persisted in browser storage.
- Parsing/analysis (`src/lib/geometry/`: STL, OBJ, 3MF DOM-free; STEP via
  occt-import-js WASM) runs in a single-use Web Worker. The worker is started
  through `/api/geometry-worker` (Pages Function) because the STEP kernel needs
  `unsafe-eval`; Function responses do not receive the site-wide CSP from
  `public/_headers`, so only that worker gets the relaxed policy
  (`server/workerEntry.ts`). Do not add `unsafe-eval` to the site CSP.
- Pricing: `src/lib/quote/pricing.ts` is a port of druckwerk `computeQuote`
  (SSoT `Extrutex/3DW-3dprint-preisrechner-`, `assets/quote.js`) plus a range
  (`PRICING_CONFIG.range`). Materials: FDM-INSPECT DB vendored as
  `src/data/fdm-inspect-materials.json` (`npm run materials:sync -- <path>`),
  priced via explicit polymer -> price group mapping in `materials.ts`.
- Uploads: files go in 8 MiB chunks (`/api/uploads/init|chunk|complete|file`,
  `server/uploads.ts`); each file is one R2 multipart upload (chunk = part, R2
  requires equal parts >= 5 MiB except the last), the upload id is bound into
  the HMAC-signed session token, per-part receipts (etag + SHA-256) live under
  `uploads/parts/`. Download links are HMAC-signed too (`UPLOAD_SIGNING_SECRET`,
  required, >= 32 chars) and point to `/datei-abruf/` (internal retrieval page,
  noindex), which fetches byte ranges chunk by chunk and verifies them.
  Retention = R2 lifecycle rules `infra/r2-lifecycle.json` (90 days after
  upload, never-completed multipart uploads aborted after 2 days); the privacy
  page states the numbers from `src/lib/upload/policy.ts` and
  `tests/upload.test.ts` fails if the lifecycle file drifts.
- Heavy code is lazy: `QuoteWorkspace` (calculator + material DB), `ModelViewer`
  (three.js), the PDF builder, the STEP kernel and the upload client load
  only when used.

## Next-gen calculator workspace (added 2026-09-30)
- Spec: `02_FDM-BUSINESS/Marketing/2026-09-30_nextgen-kalkulator-spec.md`
  (German). Calculator, printability landing page and the embedded request
  step use the technical surface `.tech` (`src/index.css`): graphite scale,
  one teal accent, status colours, no glass (exception noted in
  `docs/ui-ux-audit-priority.md`). IBM Plex Sans/Condensed/Mono are
  self-hosted in `public/fonts/` (OFL), CSP unchanged.
- `QuoteWorkbench` (main bundle) = empty drop zone; with files it loads
  `QuoteWorkspace` (lazy): parts bar, viewer, tabs, `PriceSummary` (the only
  primary CTA). Request mode (form) has no CTA and no "Anfrage" tab.
- Viewer: `ModelViewer.tsx` (UI, keyboard, text equivalents) +
  `viewer/ViewerCore.ts` (three.js, on-demand rendering). Pure, tested
  helpers in `viewer/*.ts` and `viewer/tools/*.ts`. Creased normals, feature
  edges and the picking BVH (`three-mesh-bvh`, indirect) come from
  `viewer/viewerPrep.worker.ts`, which gets one copy of the positions; the
  viewer geometry itself shares the session's positions buffer. Stage colours are
  CSS variables (`--stage-*`), read on theme change.
- Pricing UX only re-computes the existing model: `breakdownProject`,
  `quantityCurve`, `minimumOrderQuantityLimit` (`pricing.ts`, lines add up to
  the point estimate to the cent). Ship dates: `leadDate.ts` with the Hessen
  holiday table 2026-2027 - extend it every year, `tests/leadDate.test.ts`
  fails when the current year is missing. Owner decisions (machine rate
  visible, colours, cut-off, range narrowing, validity, name) are single
  constants in `src/lib/quote/ownerDecisions.ts`.
- Request: `requestPayload.ts` sends `quote_reference`, `price_breakdown`,
  `ship_window`, `print_pose`, `use_purpose`; they are allowlisted in
  `server/leadSchema.ts`.
- Estimate PDF (`quotePdf.ts`, pdf-lib, lazy on click) and the PNG export
  are generated in the browser; the logo for them is
  `public/logo/3dw-logo-mark.png`. Parameter links (`shareLink.ts`) carry
  only material, infill, quantity, lead time and the reference id.

## Material library `/werkstoffe/` (added 2026-09-28)
- Families + routing: `src/lib/werkstoffe/families.ts` (light, main bundle;
  explicit `productIds` per family). Copy: `content.ts` (no numbers allowed).
  Values: `datasheetValues.ts` resolves the FDM-INSPECT DB incl. a manual
  review (`FIELD_REVIEW`: withhold mis-parsed values, relabel e.g. Izod vs
  Charpy). The calculator key facts use the same reviewed values.
- Pages + DB are a lazy chunk (`src/pages/werkstoffePages.ts`); `main.tsx`
  preloads it on direct visits. Server routes import the pages eagerly.
- `?material=<catalog id>` on `/3d-druck-preisrechner/` preselects a material.
- After `npm run materials:sync`: re-check `FIELD_REVIEW`, assign new products
  to a family; `tests/werkstoffe.test.ts` fails until done. New family = add it
  to `scripts/prerender.mjs` and `public/sitemap.xml` too (tested).

## Payments (Stripe, added 2026-09-29)
- Hosted Stripe Checkout only (top-level redirect to checkout.stripe.com, no
  Stripe.js, site CSP unchanged). Setup, env vars and owner decisions:
  `docs/stripe-setup.md` (German).
- `server/checkout.ts` (`POST /api/checkout`): same-origin
  JSON only, B2B declaration required, product allowlist in
  `src/lib/payment/catalog.ts` (SSoT for key, name, net price; the Stripe price
  is cross-checked against it), or a signed quote link. Never takes an amount
  from the client. `TAX_MODE` unset/invalid = fail closed.
- Signed quote links: `server/paymentLink.mjs` is plain ESM so the same
  code signs (`scripts/payment-link.mjs`, `PAYMENT_LINK_SECRET`) and verifies
  (Functions). `GET /api/payment-link` backs the `/bezahlen/` page. The query of
  `/bezahlen/` is kept out of analytics/attribution (`hasSensitiveQuery`).
- `server/stripeWebhook.ts` (`POST /api/stripe/webhook`): signature over the raw
  body (`constructEventAsync` + WebCrypto, `server/stripeClient.ts`; the SDK
  uses its fetch HTTP client), idempotency markers in KV (`stripe-event:<id>`,
  30 days, event id/type only) plus the Resend idempotency key
  `stripe-event-<id>`. KV is eventually consistent: two concurrent deliveries
  may both claim; Resend dedupes within 24 h (residual risk documented in
  `server/stripeEventStore.ts`). Internal mail to `LEAD_SALES_EMAIL`.

## Working here
- Follow the owner's cross-project rules (language split, subagent
  roster) and `01_Industrial_3DW/AGENTS.md` for the Dual-Branding split — this
  site is the 3D-Windt.de brand, keep Agentic-Gateway.de content out of it.
- Tests: vitest (`npm test`, `tests/`), typecheck `npm run typecheck` (`tsc -b`,
  covers `src/`, `server/`, `functions/`, `tests/`). Run `npm run release:check`
  (lint + typecheck + test + build) before calling work done here.
- Local Cloudflare runtime: `npm run build && npm run cf:dev` (= `wrangler
  pages dev dist`, local R2/KV simulation in `.wrangler/`, secrets from
  `.dev.vars`).
