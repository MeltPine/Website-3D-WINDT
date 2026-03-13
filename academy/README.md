# Academy Sidecar (separater Track)

Diese App ist bewusst getrennt von der bestehenden B2B-Service-Seite.

## Ziel
- Marketing-starker Academy-Funnel als eigenes Projekt.
- Bestehende B2B-Website bleibt stabil und wird nicht strategisch umgebaut.

## Struktur
- `index.html` -> Academy Landing + Lead Form
- `thank-you.html` -> Danke-Seite + optionales Purchase-Testevent
- `assets/academy.css` -> eigenes UI-System
- `assets/academy.js` -> Event-Tracking + Lead-Submit-Handling
- `netlify.toml` -> separates Deployment-Profil

## Tracking-Events (Academy)
- `academy_lp_view`
- `academy_cta_click`
- `academy_lead_submit`
- `academy_checkout_start`
- `academy_purchase`

## Deployment (separat)
1. Neues Netlify-Projekt anlegen.
2. `academy/` als Root fuer dieses Projekt nutzen.
3. Eigene Analytics-Property verwenden.
4. In `index.html` und `thank-you.html` das Attribut `data-ga-measurement-id` setzen.

## Lead Form
- Form-Name: `academy-lead`
- Netlify Form Submit via `fetch('/', { method: 'POST', body: formData })`
- Erfolgreich -> Redirect auf `thank-you.html`
