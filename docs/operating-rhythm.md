# Operating Rhythm (B2B-Auftragsfunnel)

## Taeglich (10-15 Minuten)
1. Netlify Forms pruefen und neue Leads in `docs/lead-board.csv` eintragen.
2. Fuer jeden neuen Lead `response_due_at` auf Eingang + 24h setzen.
3. Interne Lead-Mail priorisieren: zuerst `Neu`, dann `Qualifiziert`.
4. Test-Mails markieren/archivieren, produktive Leads im Posteingang sichtbar halten.

## Woechentlich (freitags, 20 Minuten)
1. KPI-Werte in `docs/kpi-weekly-scorecard.csv` eintragen.
2. Drei Kennzahlen pruefen: qualifizierte Leads, B2B-Anteil, Antwortzeit.
3. Offene Leads in `Verhandlung` und `Angebot versendet` aktiv nachfassen.
4. Einen LinkedIn-Post mit CTA auf `/projekt-starten` veroeffentlichen.

## Monatlich (30 Minuten)
1. Neue freigegebene Case-Assets in `docs/case-asset-board.csv` pflegen.
2. Mindestens einen anonymisierten Case durch echten freigegebenen Case ersetzen.
3. Texte auf Startseite/Galerie mit echten Ergebnissaussagen nachschaerfen.

## GA4 Conversion Setup (einmalig)
1. GA4 -> Verwaltung -> Ereignisse.
2. `lead_form_submitted` als Schluesselereignis markieren.
3. `generate_lead` als Schluesselereignis markieren (wird automatisch bei Formular-Submit gesendet).
4. Nach einem Testformular in Echtzeit pruefen, dass beide Events ankommen.
