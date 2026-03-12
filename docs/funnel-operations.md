# Funnel Operations (Netlify)

## Zielbild
- Ein einheitlicher B2B-Funnel mit Conversion-Zielen auf `/danke-projekt` und `/danke-kontakt`
- Event-Tracking für Form-Starts, Uploads, Submits, Errors und Follow-up
- Automatische Follow-up-E-Mails an Interessenten plus interne Lead-Benachrichtigung

## Erforderliche Netlify-Umgebungsvariablen
- `VITE_GA_MEASUREMENT_ID` (z. B. `G-XXXXXXXXXX`)
- `RESEND_API_KEY`
- `LEAD_REPLY_FROM` (z. B. `3D-WINDT <noreply@3d-windt.de>`)
- `LEAD_SALES_EMAIL` (z. B. `support@3d-windt.de`)

Hinweis: `VITE_*` Variablen sind Build-Variablen und erfordern ein neues Deploy.

## Technischer Ablauf
1. Nutzer kommt über Startseite/Landingpage in den Funnel.
2. Primär-CTA führt zu `/projekt-starten`.
3. Formular wird über Netlify Forms übermittelt.
4. Nach Erfolg Weiterleitung auf `/danke-projekt` oder `/danke-kontakt`.
5. Frontend triggert `/.netlify/functions/lead-followup`.
6. Funktion versendet:
   - Auto-Eingangsbestätigung an den Lead
   - Interne Lead-Mail an Vertrieb

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

## Test-Checkliste nach Deploy
1. Formular auf `/projekt-starten` mit Testdaten absenden.
2. Redirect auf `/danke-projekt` prüfen.
3. Netlify Forms Submission prüfen.
4. Auto-Mail an Testadresse prüfen.
5. Interne Lead-Mail prüfen.
6. In GA4 Realtime prüfen:
   - `page_view` auf Danke-Seite
   - `lead_form_submitted`
