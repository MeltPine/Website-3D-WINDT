# Release Checklist (Stabilitaets-Freeze)

## Ziel
- Keine spontanen UI-Brueche mehr.
- Jeder Push laeuft durch denselben Qualitaetsprozess.
- B2B-Conversion-Funnel bleibt technisch stabil.

## Regeln pro Commit
1. Nur ein Thema pro Commit (z. B. nur CTA-Text, nur Header-Fix, nur Formular-Hinweis).
2. Keine Misch-Commits mit UI, Tracking und Content in einem Schritt.
3. Commit-Message beschreibt exakt die sichtbare Aenderung.

## Pflicht vor jedem Push
1. `npm run release:check`
2. Ergebnis dokumentieren:
   - `lint`: erfolgreich
   - `build`: erfolgreich
3. Nur bei gruener Pipeline pushen.

## Deploy-Abnahme (manuell, Pflicht)
1. Header Desktop: Navigation lesbar, nichts gequetscht.
2. Header Mobile: Menue oeffnet/schliesst sauber.
3. Dark Mode: Umschalten funktioniert, Logo/CTA lesbar.
4. CTA-Pfade:
   - Primary: `Projekt starten`
   - Secondary: `Rueckruf anfragen`
5. Form-Test `Projekt starten`:
   - Upload-Hinweis sichtbar
   - Submit erfolgreich
   - Redirect auf `/danke-projekt/`
6. Form-Test `Kontakt`:
   - Submit erfolgreich
   - Redirect auf `/danke-kontakt/`

## Ad/Script Guardrail (ohne Werbenetzwerk)
1. Keine Banner- oder Ad-Netzwerke auf der Website einbauen.
2. Keine neuen Third-Party-Werbe-Skripte ohne explizite Freigabe.
3. Fokus bleibt auf organischem B2B-Funnel und sauberer Conversion.
