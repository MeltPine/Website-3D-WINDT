# Academy Sidecar Prototype (nur Referenz)

Dieses Verzeichnis ist nur noch Prototyp-Referenz.
Die produktive Academy wird als eigenstaendiges Projekt in `academy-growth-site/`
vorbereitet und danach in ein separates Repo ueberfuehrt.

## Hinweis
- Nicht als finales Zielsystem weiterentwickeln.
- Fuer neue Umsetzung den Cutover-Guide nutzen: `docs/academy-repo-cutover.md`.

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
