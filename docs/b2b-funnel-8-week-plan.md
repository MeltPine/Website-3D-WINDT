# B2B Funnel 8-Wochen Plan (ohne Werbebudget)

## Leitplanken
- Kein Ad-Network auf der Website.
- Fokus auf B2B-Service-Leads vor Nebenprojekten.
- Stabilitaet vor Tempo: erst Conversion sauber, dann Reichweite.

## Woche 1: Stabilitaets-Freeze
- Release-Prozess fixieren: `docs/release-checklist.md`
- Vor jedem Push: `npm run release:check`
- Abnahme manuell fuer Header, Dark Mode, CTA, Form-Submit.
- Done-Kriterium: keine regressiven UI-Ausfaelle in einem gesamten Wochenzyklus.

## Woche 2: Conversion-Klarheit
- CTA-Sprache vereinheitlichen:
  - Primary: `Projekt starten`
  - Secondary: `Rueckruf anfragen`
- Hero + Abschluss-CTA auf Kernseiten mit gleicher Prioritaet ausrichten.
- Formular-Hinweise straffen, Fehlermeldungen klar sichtbar.
- Done-Kriterium: konsistente CTA-Logik auf Home/Services/Gallery/About/Wissen.

## Woche 3-4: Kostenloser Reichweiten-Stack
- Pro Woche 1 hochwertiger Wissen-Beitrag mit CTA auf `/projekt-starten/`.
- Case-Assets nach `docs/case-asset-board.csv` kontinuierlich freigeben.
- Google Business Profil pflegen (Leistungen, Standort, Branchenbezug, Proof).
- Done-Kriterium: 2 neue Fachbeitraege + sichtbarer Proof-Fortschritt.

## Woche 5-6: KPI-Steuerung + Vertrieb
- Woechentliche KPI-Routine strikt nach `docs/kpi-scorecard.md`.
- Lead-Board diszipliniert pflegen: `docs/lead-board.csv`.
- SLA halten: erste Rueckmeldung werktags schnell, technische Rueckmeldung <= 24h.
- Done-Kriterium: lueckenlose KPI-Werte und stabile Antwortzeit.

## Woche 7-8: Monetarisierungsvorbereitung (ohne Funnel-Stoerung)
- Mini-Discovery fuer spaeteres Produkt in separatem Track fahren.
- 10 wiederkehrende Kundenfragen sammeln und clustern.
- Ein kleines MVP-Thema definieren (Problem + Zahlungsbereitschaft).
- Sidecar-Umsetzung als separates Projekt unter `academy/` betreiben.
- Launch-Checkliste fuer den separaten Track nutzen: `docs/academy-launch-checklist.md`.
- Done-Kriterium: priorisierter MVP-Problemraum ohne Eingriff in Service-Funnel.

## Erfolgsmessung nach 8 Wochen
- Qualifizierte Leads steigen.
- Submit-Rate steigt.
- Antwortzeit bleibt im SLA.
- Keine regressiven Fehler in Header/CTA/Formularfluss.
