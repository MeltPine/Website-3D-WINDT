# Academy Repo Cutover (Clean Separation)

## Ziel
- Academy als eigenes Projekt betreiben.
- Bestehende 3D-WIND Seite bleibt technisch isoliert.

## Quelle
- Starter liegt in `academy-growth-site/`.
- `academy/` bleibt nur Prototype-Referenz.

## Schrittfolge
1. Neues Repo `academy-growth-site` anlegen.
2. Inhalt von `academy-growth-site/` in das neue Repo kopieren.
3. Eigene GA4-Property fuer Academy erstellen.
4. In `index.html` und `thank-you.html` das Attribut `data-ga-measurement-id` setzen.
5. Eigenes Netlify-Projekt anlegen und mit neuem Repo verbinden.
6. Root-Publish im neuen Projekt auf Repo-Root belassen (`netlify.toml` ist enthalten).
7. Ersten Testsubmit in Netlify Forms auf `academy-lead` pruefen.
8. Event-Smoketest nach `docs/academy-launch-checklist.md` durchlaufen.

## Guardrails
- Keine Academy-Dateien in den Build der B2B-App integrieren.
- Keine gemeinsamen Analytics-Properties fuer B2B und Academy.
- Keine Cross-Deployments (jede Site eigenes Netlify-Projekt).
