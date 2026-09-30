# UI/UX Audit Priority (FDM B2B)

Stand: 2026-03-13

## P0 (conversion + trust)

- Hero muss B2B-Fokus und technische Verlässlichkeit in den ersten 5 Sekunden vermitteln.
- Header-Navigation braucht bessere aktive States und klare CTA-Priorität.
- Primäre Conversion-Flows (`/projekt-starten`, `/kontakt`) müssen visuell fokussiert sein, ohne Lesbarkeit zu verlieren.

## P1 (professional polish)

- Wiederkehrende Card-Blöcke müssen visuell differenziert werden, damit Inhalte schneller erfassbar sind.
- Case-Galerie muss hochwertiger wirken, ohne vom industriellen Charakter abzuweichen.
- Typografie muss technischer und markanter werden, aber semantisch konsistent bleiben.

## P2 (operational quality)

- Motion nur sparsam und zielgerichtet; `prefers-reduced-motion` respektieren.
- Glass-Effekte nur auf Kernflächen einsetzen, um Performance stabil zu halten.
- Kontrast und Fokuszustände bei allen interaktiven Elementen AA-konform halten.

## Eingeführte Design-Leitplanken

- Keine neue Farbwelt: Nur vorhandene Primary/Gray-Familie mit Transparenzstufen.
- Subtiles Glassmorphism: Navigation, Hero, Case-/Info-Cards und CTA-Flächen.
  **Ausnahme (seit 2026-09-30):** Preisrechner (`/3d-druck-preisrechner/`), Druckbarkeits-Check
  (`/druckbarkeit-pruefen/`) und der eingebettete Rechner in `/projekt-starten/` folgen der
  technischen Richtung „Messplatz“ statt Glas: Klasse `.tech` in `src/index.css` (Graphit-Skala,
  ein Teal-Akzent, Statusfarben immer mit Icon + Wort, Radius 4/6 px, kein `backdrop-filter`,
  Blueprint-Raster nur in Viewer-Bühne, Upload-Fläche und Seitenkopf). Grundlage:
  `02_FDM-BUSINESS/Marketing/2026-09-30_nextgen-kalkulator-spec.md` §5. Der Rest der Website
  folgt schrittweise; bis dahin gilt dort die Glas-Leitplanke weiter.
- Schriften: IBM Plex Sans / Plex Sans Condensed / Plex Mono, selbst gehostet in `public/fonts/`
  (SIL OFL, Latin-Subset, `font-display: swap`, CSP `font-src 'self'` unverändert). Rajdhani entfällt.
- Formulare bleiben überwiegend solid für Lesbarkeit und Eingabesicherheit.
