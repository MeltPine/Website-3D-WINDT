# Academy Launch Checklist (separater Track)

## Vor Go-Live
1. Bestehende B2B-Seite unveraendert lassen (nur Bugfixes erlaubt).
2. Academy auf eigenem Netlify-Projekt deployen (`academy/` als Root).
3. Eigene GA-Property fuer Academy nutzen.
4. CTA-Links pruefen (`hero`, `offer`, `form`, `thank-you`).
5. Netlify Form `academy-lead` nach erstem Testsubmit sichtbar.

## Technischer Smoke-Test
1. Seite auf Mobile/Desktop laden.
2. Event `academy_lp_view` pruefen.
3. CTA-Klick erzeugt `academy_cta_click`.
4. Primary-CTA erzeugt `academy_checkout_start`.
5. Formular erfolgreich absenden -> `academy_lead_submit` + Redirect auf `/thank-you.html`.
6. Demo-Button auf Danke-Seite feuert `academy_purchase`.

## Stability Gate
- Keine Broken Links.
- Keine Tracking-Luecken in den 5 Kern-Events.
- Keine Kontrastfehler bei CTAs (insbesondere auf Mobile).
