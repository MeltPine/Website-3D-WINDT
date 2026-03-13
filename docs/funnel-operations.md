# Funnel Operations (Netlify)

## Zielbild
- Ein einheitlicher B2B-Funnel mit Conversion-Zielen auf `/danke-projekt` und `/danke-kontakt`
- Event-Tracking für Form-Starts, Uploads, Submits, Errors und Follow-up
- Automatische Follow-up-E-Mails an Interessenten plus interne Lead-Benachrichtigung
- Keine Ad-Netzwerke oder Bannerwerbung auf der Website

## Erforderliche Netlify-Umgebungsvariablen
- `VITE_GA_MEASUREMENT_ID` (z. B. `G-XXXXXXXXXX`)
- `VITE_INTERNAL_TRACKING_ENABLED` (optional, Standard `1`; mit `0` deaktivieren)
- `RESEND_API_KEY`
- `LEAD_REPLY_FROM` (z. B. `3D-WINDT <noreply@3d-windt.de>`)
- `LEAD_SALES_EMAIL` (z. B. `support@3d-windt.de`)
- `LEAD_ALERT_FROM` (optional, z. B. `3D-WINDT Alert <alerts@3d-windt.de>`)

Hinweis: `VITE_*` Variablen sind Build-Variablen und erfordern ein neues Deploy.

## Technischer Ablauf
1. Nutzer kommt über Startseite/Landingpage in den Funnel.
2. Interne Event-Messung schreibt Lead-Events als `lead-metric` in Netlify Forms (GA-unabhängig).
3. Primär-CTA führt zu `/projekt-starten`.
4. Formular wird über Netlify Forms übermittelt.
5. Nach Erfolg Weiterleitung auf `/danke-projekt` oder `/danke-kontakt`.
6. Frontend triggert `/.netlify/functions/lead-followup`.
7. Funktion versendet:
   - Auto-Eingangsbestätigung an den Lead
   - Interne Lead-Mail an Vertrieb
8. Bei Submit-Fehlern triggert Frontend `/.netlify/functions/lead-alert`:
   - Alert-Mail an Vertrieb mit Fehlerdetails und Formular-Kontext

## Vertriebsprozess (SLA)
1. Status `Neu eingegangen` nach Submission.
2. Erste Sichtung innerhalb von 2 Stunden (werktags).
3. Technische Rückmeldung und Angebot innerhalb von 24 Stunden.
4. Follow-up bei fehlender Rückmeldung nach 48 Stunden.
5. Lead-Status in CRM/Sheet pflegen:
   - `Neu`
   - `Qualifiziert`
   - `Angebot versendet`
   - `Verhandlung`
   - `Gewonnen/Verloren`

## KPI-Steuerung (woechentlich)
- KPI-Definitionen und Wochenroutine: `docs/kpi-scorecard.md`
- Direkt nutzbare Vorlage: `docs/kpi-weekly-scorecard.csv`
- Ziel: Jede Woche die gleichen 6 Zahlen erfassen und datenbasiert entscheiden.

## Referenz-Pipeline (6 Wochen)
- Nach jedem abgeschlossenen Auftrag einen anonymisierten Referenzdatensatz anlegen.
- Pflichtinhalt je Datensatz:
  - 3 Bilder oder CAD-Screens
  - 1 Problemsatz
  - 1 Lösungssatz
  - 1 Ergebnissatz mit messbarem Nutzen
  - Freigabestatus: `anonymisiert` oder `public`
- Ziel: 6 veröffentlichbare Industrie-Cases in 6 Wochen.
- Detaillierte Vorlage: `docs/reference-pipeline.md`

## Test-Checkliste nach Deploy
1. Formular auf `/projekt-starten` mit Testdaten absenden.
2. Redirect auf `/danke-projekt` prüfen.
3. Netlify Forms Submission prüfen.
4. Auto-Mail an Testadresse prüfen.
5. Interne Lead-Mail prüfen.
6. In GA4 Realtime prüfen:
   - `page_view` auf Danke-Seite
   - `lead_form_submitted`
7. Tracking-Healthcheck im Browser prüfen:
   - `/?tracking_debug=1` aufrufen
   - Panel auf `Consent`, `GA-ID gesetzt`, `gtag bereit`, `Script geladen` prüfen
   - Optional `Testevent senden` klicken und in GA4 Realtime auf `tracking_healthcheck_ping` prüfen
8. Fehler-Monitoring prüfen:
   - Testweise Netlify-Form-Erkennung deaktivieren (nur kurz in Staging) oder absichtlich 500 simulieren
   - Prüfen, dass Alert-Mail `"[ALERT] Formularfehler ..."` ankommt
9. GA-unabhängiges Tracking prüfen:
   - Netlify -> Forms -> `lead-metric`
   - Neue Einträge für `cta_clicked`, `lead_form_started`, `lead_form_submitted`, `generate_lead` prüfen

## Release-Standard (verbindlich)
- Vor jedem Push `npm run release:check` ausfuehren.
- Manuelle Deploy-Abnahme nach `docs/release-checklist.md`.

## Ergaenzung: Proof- und Betriebsroutine (Maerz 2026)
- Case-Asset-Board: `docs/case-asset-board.csv`
- Taeglicher/Woechentlicher Rhythmus: `docs/operating-rhythm.md`
- Lead-Board fuer Vertriebsstatus: `docs/lead-board.csv`

## GA4 Conversion-Hinweis
- In GA4 beide Events als Schluesselereignis markieren:
  - `lead_form_submitted`
  - `generate_lead`
- `generate_lead` wird beim Formular-Submit automatisch mitgesendet.
