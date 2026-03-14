# academy-growth-site (separates Projekt)

Dieses Verzeichnis ist der **Repo-Starter** fuer eine komplett eigenstaendige Academy-Website.
Die bestehende 3D-WIND Website bleibt davon unabhaengig.

## Ziel
- Eigene Marke, eigenes Deployment, eigenes Tracking.
- Kein Eingriff in den bestehenden B2B-Funnel von 3D-WIND.

## Enthalten
- `index.html` (Landing + Offer-Ladder + Lead-Form)
- `thank-you.html` (Follow-up + Conversion-Event)
- `impressum.html`, `datenschutz.html`, `cookies.html`
- `assets/academy.css` (UI)
- `assets/academy.js` (Tracking + Consent + Form-Handling)
- `netlify.toml` (separate Netlify-Config)

## Tracking-Events (Academy)
- `academy_lp_view`
- `academy_cta_click`
- `academy_lead_submit`
- `academy_checkout_start`
- `academy_purchase`

## Start lokal
```bash
npm install
npm run dev
```

## Separates Repo erstellen (Clean Cutover)
1. Neues Git-Repo anlegen (z. B. `academy-growth-site`).
2. Inhalt dieses Ordners in das neue Repo kopieren.
3. Eigenes Netlify-Projekt mit Root auf Repo-Root deployen.
4. Eigene GA4-Property verwenden (`data-ga-measurement-id` im `<html>` setzen).
5. Erst nach stabilem Academy-Launch optional dezenten Footer-Link von 3D-WIND setzen.

## Netlify Form
- Formularname: `academy-lead`
- Submit via `fetch('/', { method: 'POST', body: formData })`
- Erfolgsziel: Redirect auf `/thank-you.html`
