# Webseite 3D-Windt — Architecture Context

Public website + marketing funnel for 3D-Windt.de. Written 2026-08-28 from verified
repo structure — this file didn't exist before; keep it honest and update it when
the structure actually changes, don't let it drift like the old top-level SSoT did.

## Stack
- React + Vite + TypeScript + Tailwind, SSR build (`vite build --ssr
  src/entry-server.tsx`) plus a prerender pass (`scripts/prerender.mjs`).
- `npm run build` = client build → SSR build → prerender → outputs `dist/`
  (client) and `dist-server/` (SSR).
- Deployed on Netlify: `netlify.toml` at root, `publish = "dist"`, Netlify
  Functions in `netlify/functions` (esbuild bundler) — used for lead capture via
  Resend (`RESEND_API_KEY`, see `.env.example`).
- Security headers already set in `netlify.toml` (CSP, X-Frame-Options, etc.) —
  don't loosen these without a reason.
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
  through `/api/geometry-worker` (Function) because the STEP kernel needs
  `unsafe-eval`; Function responses do not receive the site-wide CSP from
  `netlify.toml`, so only that worker gets the relaxed policy
  (`netlify/shared/workerEntry.ts`). Do not add `unsafe-eval` to the site CSP.
- Pricing: `src/lib/quote/pricing.ts` is a port of druckwerk `computeQuote`
  (SSoT `Extrutex/3DW-3dprint-preisrechner-`, `assets/quote.js`) plus a range
  (`PRICING_CONFIG.range`). Materials: FDM-INSPECT DB vendored as
  `src/data/fdm-inspect-materials.json` (`npm run materials:sync -- <path>`),
  priced via explicit polymer -> price group mapping in `materials.ts`.
- Uploads: Netlify Forms caps a submission at 8 MB, Functions at ~4.5 MB binary.
  Files go in 3 MiB chunks through `netlify/functions/upload-*.mts` into Netlify
  Blobs (store `project-uploads`, region `eu-central-1`), HMAC-signed sessions and
  download links (`UPLOAD_SIGNING_SECRET`, required, >= 32 chars). The form
  submission carries signed links to `/datei-abruf/` (internal retrieval page,
  noindex). `upload-cleanup` deletes after 90 days (2 days if incomplete) — the
  privacy page states these numbers from `src/lib/upload/policy.ts`.
- Heavy code is lazy: `QuoteDetails` (calculator + material DB), `ModelViewer`
  (three.js), the STEP kernel and the upload client load only when used.

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
- `netlify/functions/create-checkout.mts` (`POST /api/checkout`): same-origin
  JSON only, B2B declaration required, product allowlist in
  `src/lib/payment/catalog.ts` (SSoT for key, name, net price; the Stripe price
  is cross-checked against it), or a signed quote link. Never takes an amount
  from the client. `TAX_MODE` unset/invalid = fail closed.
- Signed quote links: `netlify/shared/paymentLink.mjs` is plain ESM so the same
  code signs (`scripts/payment-link.mjs`, `PAYMENT_LINK_SECRET`) and verifies
  (Functions). `GET /api/payment-link` backs the `/bezahlen/` page. The query of
  `/bezahlen/` is kept out of analytics/attribution (`hasSensitiveQuery`).
- `stripe-webhook.mts` (`POST /api/stripe/webhook`): signature over the raw body,
  idempotency ledger in Netlify Blobs (`stripe-events`, eu-central-1, event
  id/type only), internal Resend mail to `LEAD_SALES_EMAIL`.

## Working here
- Follow the owner's cross-project rules (language split, subagent
  roster) and `01_Industrial_3DW/AGENTS.md` for the Dual-Branding split — this
  site is the 3D-Windt.de brand, keep Agentic-Gateway.de content out of it.
- Tests: vitest (`npm test`, `tests/`), typecheck `npm run typecheck` (`tsc -b`,
  covers `src/`, `netlify/`, `tests/`). Run `npm run release:check`
  (lint + typecheck + test + build) before calling work done here.
