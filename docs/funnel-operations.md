# Funnel Operations (Cloudflare Pages)

## Zielbild
- Ein einheitlicher B2B-Funnel mit Conversion-Zielen auf `/danke-projekt` und `/danke-kontakt`
- Event-Tracking für Form-Starts, Uploads, Submits, Errors und Follow-up
- Automatische Follow-up-E-Mails an Interessenten plus interne Lead-Benachrichtigung
- Keine Ad-Netzwerke oder Bannerwerbung auf der Website

## Erforderliche Variablen im Cloudflare-Pages-Projekt
- Build-Variable `VITE_GA_MEASUREMENT_ID` (z. B. `G-XXXXXXXXXX`)
- Secret `RESEND_API_KEY`
- Secret `LEAD_REPLY_FROM` (z. B. `3D-WINDT <noreply@3d-windt.de>`)
- Secret `LEAD_SALES_EMAIL` (z. B. `support@3d-windt.de`)
- Secret `LEAD_ALERT_FROM` (optional, z. B. `3D-WINDT Alert <alerts@3d-windt.de>`)

Hinweis: `VITE_*` Variablen sind Build-Variablen und erfordern ein neues Deploy.
Vollständige Liste und Einrichtung: `docs/cloudflare-migration.md`.

## Technischer Ablauf
1. Nutzer kommt über Startseite/Landingpage in den Funnel.
2. Event-Messung läuft ausschließlich über GA4. `/api/lead` nimmt nur echte Anfragen an.
3. Primär-CTA führt zu `/projekt-starten`.
4. Formular wird an `POST /api/lead` übermittelt (Pages Function, `server/lead.ts`).
5. Die Function speichert die Anfrage zuerst als JSON im R2-Bucket `3dw-uploads`
   unter `leads/JJJJ/MM/<id>.json` (maßgeblicher Datensatz) und versendet danach:
   - Interne Lead-Mail an Vertrieb (mit Lead-ID und R2-Pfad)
   - Auto-Eingangsbestätigung an den Lead
   Erfolg meldet sie nur, wenn das Speichern geklappt hat. Scheitert nur der
   Mailversand, bleibt der Lead gespeichert (Log-Eintrag `[lead]` in den Functions-Logs).
6. Nach Erfolg Weiterleitung auf `/danke-projekt` oder `/danke-kontakt`.
7. Schutz: Honeypot `bot-field`, Same-Origin-Pflicht, Größenlimit 64 KB,
   Rate-Limit 5 Anfragen je 10 Minuten und IP (KV, ungefähr).
8. Bei Submit-Fehlern triggert Frontend `/api/lead-alert`:
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
3. Datensatz im R2-Bucket prüfen (Dashboard → R2 → `3dw-uploads` → `leads/`).
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
   - In einer Preview-Umgebung absichtlich einen Fehler provozieren (z. B. Binding `UPLOADS` fehlt → 500)
   - Prüfen, dass Alert-Mail `"[ALERT] Formularfehler ..."` ankommt

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

## Google-/Funnel-Finalisierung
- Aktuelle Kontrollliste: `docs/google-funnel-final-checklist.md`
- Wichtig: Search Console und GA4 koennen technisch vorbereitet werden, aber die finale Bestaetigung muss im jeweiligen Google-Konto erfolgen.
- Lead-Attribution wird bei neuen Formularen automatisch mitgespeichert (`landing_page`, `initial_referrer`, `utm_*`, `gclid`, `gbraid`, `wbraid`).
