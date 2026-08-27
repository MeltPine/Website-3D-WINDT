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

## Working here
- Follow `~/.claude/CLAUDE.md` for cross-project rules (language split, subagent
  roster) and `01_Industrial_3DW/AGENTS.md` for the Dual-Branding split — this
  site is the 3D-Windt.de brand, keep Agentic-Gateway.de content out of it.
- No test suite exists yet (`package.json` has `lint` + `release:check` =
  `lint && build`) — run `npm run release:check` before calling frontend work
  done here.
