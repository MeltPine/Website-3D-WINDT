# Lead Board (einfaches Vertrieb-Board)

Datei: `docs/lead-board.csv`

## Ziel
- Jede Anfrage landet in einem klaren Status.
- Keine Anfrage geht verloren.
- Antwortzeit bleibt unter 24 Stunden.

## Statuslogik
- `Neu`: Anfrage eingegangen, noch nicht bewertet.
- `Qualifiziert`: passt zu B2B/Industrie und ist technisch sinnvoll.
- `Angebot versendet`: Angebot ist raus.
- `Verhandlung`: offene Rueckfragen/Klaerung beim Kunden.
- `Gewonnen` oder `Verloren`: Abschluss.

## So nutzt du das Board taeglich (5 Minuten)
1. Netlify Forms und Lead-Mails pruefen.
2. Neue Leads in `docs/lead-board.csv` eintragen.
3. `response_due_at` auf Eingang + 24h setzen.
4. Nach Erstantwort `first_response_at` und `response_hours` eintragen.
5. Status aktualisieren und `next_action` + `next_action_due_at` setzen.

## Qualifizierungsregel (einfach)
- Qualifiziert, wenn mindestens Firma, Anwendungsfall, Stueckzahl und Deadline vorhanden sind.

## Wichtige Felder
- `source_form`: `project-request` oder `contact-request`
- `outcome`: `offen`, `gewonnen`, `verloren`
- `owner`: wer den Lead aktiv bearbeitet

## Sofortregel
- Jeder neue Lead bekommt innerhalb von 24h eine erste Rueckmeldung.
