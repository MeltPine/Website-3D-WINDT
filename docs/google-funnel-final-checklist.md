# Google- und Funnel-Finalisierung

Stand: 2026-05-05

Diese Liste trennt sauber zwischen Dingen, die im Code erledigt sind, und Dingen, die nur im Google- oder Netlify-Konto bestaetigt werden koennen.

## Im Code erledigt

- GA4 Measurement ID ist eingebunden: `G-ZYS9S1RYB9`
- Consent Mode ist aktiv: Statistik nur nach Einwilligung, Ads-Speicher deaktiviert
- Funnel-Events sind eingebaut:
  - `cta_clicked`
  - `lead_form_started`
  - `file_upload_added`
  - `lead_form_submitted`
  - `generate_lead`
  - `lead_form_error`
  - `lead_form_filtered`
- Netlify-Forms-Funnel ist aktiv:
  - `contact-request`
  - `project-request`
  - `lead-metric`
- Lead-Qualifizierung ist aktiv:
  - Unternehmen ist Pflichtfeld
  - Rolle im Unternehmen ist Pflichtfeld
  - Geschaeftliche Anfrage ist Pflicht-Checkbox
  - Bewerbungs-/Jobbegriffe werden blockiert
- Kampagnen- und Referrer-Attribution wird bei Leads gespeichert:
  - `landing_page`
  - `initial_referrer`
  - `utm_source`
  - `utm_medium`
  - `utm_campaign`
  - `utm_term`
  - `utm_content`
  - `gclid`
  - `gbraid`
  - `wbraid`
- Technisches SEO ist aktiv:
  - Canonicals
  - Meta Titles und Descriptions
  - OpenGraph/Twitter-Metadaten
  - LocalBusiness-Schema
  - Service-Schema
  - FAQPage-Schema auf der Startseite
  - Sitemap und Robots
  - Google-Verification-Datei

## Muss im Google-Konto bestaetigt werden

### Google Search Console

1. Property `https://3d-windt.de/` oeffnen.
2. Pruefen, ob die Property als bestaetigt angezeigt wird.
3. Unter `Sitemaps` einreichen:
   - `https://3d-windt.de/sitemap.xml`
4. Unter `URL-Pruefung` diese URLs testen und Indexierung beantragen:
   - `https://3d-windt.de/`
   - `https://3d-windt.de/leistungen/`
   - `https://3d-windt.de/projekt-starten/`
   - `https://3d-windt.de/kontakt/`
   - `https://3d-windt.de/wissen/`
5. Alte WordPress-/Blog-URLs pruefen. Wenn Google sie noch kennt, `Neu crawlen` beantragen. Die Weiterleitung laeuft bereits per `301`.

### GA4

1. GA4 Property oeffnen.
2. In `Berichte > Echtzeit` die Website in einem zweiten Tab oeffnen.
3. Website mit `?tracking_debug=1` testen:
   - `https://3d-windt.de/?tracking_debug=1`
4. Im Panel pruefen:
   - GA-ID gesetzt: ja
   - Script geladen: ja
   - gtag bereit: ja
5. Testevent senden und in GA4 Realtime suchen:
   - `tracking_healthcheck_ping`
6. Diese Events als Schluesselereignisse markieren:
   - `lead_form_submitted`
   - `generate_lead`

## Woechentliche Kontrolle

Jeden Freitag 15 Minuten:

1. Netlify Forms:
   - Anzahl `contact-request`
   - Anzahl `project-request`
   - Anzahl `lead-metric`
2. GA4:
   - `lead_form_started`
   - `lead_form_submitted`
   - `lead_form_error`
3. Vertrieb:
   - qualifizierte B2B-Leads
   - Angebote versendet
   - Auftraege gewonnen
4. Werte in `docs/kpi-weekly-scorecard.csv` eintragen.
