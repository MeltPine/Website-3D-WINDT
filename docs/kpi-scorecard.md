# KPI-Scorecard fuer 3D-WINDT (B2B)

## Was ist ein KPI?
- KPI = Key Performance Indicator.
- Einfach gesagt: eine klare Zahl, die zeigt, ob dein Funnel wirklich Auftraege bringt.
- Ohne KPIs fuehlt sich Marketing nach Zufall an. Mit KPIs siehst du jede Woche, was funktioniert.

## Die 6 wichtigsten KPI (fuer deinen Funnel)
1. Qualifizierte Leads pro Woche
- Definition: Anfragen mit Firma, Anwendungsfall, Stueckzahl und Deadline.
- Warum wichtig: Das sind echte Industrie-Chancen, nicht nur lose Kontakte.

2. Submit-Rate
- Formel: `lead_form_submitted / lead_form_started`
- Warum wichtig: Zeigt, ob Besucher das Formular wirklich fertig ausfuellen.

3. B2B-Anteil
- Formel: `B2B-Leads / alle Leads`
- B2B-Lead: Firmenname vorhanden.
- Warum wichtig: Trennt Industrieanfragen von unpassenden Privat-Anfragen.

4. Durchschnittliche Antwortzeit (Stunden)
- Formel: Zeit von Eingang bis erste persoenliche Rueckmeldung.
- Warum wichtig: Schnelle Reaktion ist einer der staerksten Abschlusshebel.

5. Angebotsquote
- Formel: `Angebote versendet / qualifizierte Leads`
- Warum wichtig: Zeigt, ob qualifizierte Leads sauber in den Angebotsprozess uebergehen.

6. Abschlussquote
- Formel: `Gewonnene Auftraege / versendete Angebote`
- Warum wichtig: Zeigt die Qualitaet von Vertrieb + Angebot.

## Woher kommen die Zahlen?
- Netlify Forms: Leads, Firmenname, Formularfelder
- GA4: `lead_form_started`, `lead_form_submitted`, `lead_form_error`, `file_upload_added`
- Vertrieb/CRM/Sheet: Antwortzeit, Angebote, gewonnene Auftraege

## 15-Minuten-Wochenroutine (jeden Freitag)
1. Netlify -> Site -> Forms
- Anzahl neuer Submissions dieser Woche notieren.
- Qualifizierte Leads zaehlen (Firma + Anwendungsfall + Stueckzahl + Deadline).
- B2B-Leads zaehlen (Firma ausgefuellt).

2. GA4 -> Reports -> Engagement -> Events
- Fuer diese Woche zaehlen:
  - `lead_form_started`
  - `lead_form_submitted`
  - `lead_form_error`

3. Vertriebsliste aktualisieren
- Durchschnittliche Antwortzeit in Stunden eintragen.
- Anzahl versendeter Angebote eintragen.
- Anzahl gewonnener Auftraege eintragen.

4. Werte in die Scorecard eintragen
- Vorlage: `docs/kpi-weekly-scorecard.csv`
- Prozentwerte als Prozent formatieren.

## Ampel-Logik (schnelle Entscheidung)
- Gruen:
  - Submit-Rate >= 0.30
  - Antwortzeit <= 24h
  - B2B-Anteil >= 0.70
- Gelb:
  - Einer der drei Werte knapp daneben
- Rot:
  - Mindestens zwei Werte deutlich unter Ziel

## Was tun, wenn Werte rot sind?
- Niedrige Submit-Rate:
  - Formular kuerzen, Pflichtfelder klar benennen, Upload-Hinweis vereinfachen.
- Niedriger B2B-Anteil:
  - Homepage/CTAs staerker auf Industrieproblem ausrichten.
- Hohe Antwortzeit:
  - Rueckrufslot + feste Reaktionsfenster intern verbindlich setzen.

## Mindestziel fuer die naechsten 30 Tage
- 8-12 qualifizierte Leads/Monat
- Submit-Rate >= 30 %
- B2B-Anteil >= 70 %
- Antwortzeit <= 24h
