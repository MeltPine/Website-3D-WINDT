export type KnowledgeSection = {
  title: string;
  content: string;
};

export type KnowledgePage = {
  slug: string;
  title: string;
  description: string;
  intro: string;
  checklist: string[];
  sections: KnowledgeSection[];
};

export function knowledgeRouteKey(slug: string): string {
  return `/wissen/${slug}`;
}

export function knowledgePath(slug: string): string {
  return `${knowledgeRouteKey(slug)}/`;
}

export const knowledgePages: KnowledgePage[] = [
  {
    slug: 'ersatzteil-nachfertigung-maschinenstillstand',
    title: 'Ersatzteil-Nachfertigung bei Maschinenstillstand',
    description:
      'Leitfaden fuer Instandhaltungsteams, wenn Originalteile fehlen und ein belastbares Lieferfenster benoetigt wird.',
    intro:
      'Wenn eine Anlage steht, sind klare Entscheidungen wichtiger als ein Schnellpreis ohne Kontext. Dieser Leitfaden zeigt, welche Daten fuer eine sichere Nachfertigung notwendig sind.',
    checklist: ['Bauteilfunktion und Lastfall', 'Stueckzahl und Wiederholbedarf', 'Terminfenster der Anlage'],
    sections: [
      {
        title: 'Technische Startdaten',
        content:
          'Uebergeben Sie Geometrie, Einsatzbedingungen und kritische Masse. Ohne diese drei Punkte steigt das Risiko fuer Nacharbeit.',
      },
      {
        title: 'Material- und Freigabeentscheidung',
        content:
          'Das Material wird nicht nach Name, sondern nach Temperatur, Medienkontakt und mechanischer Belastung gewaehlt.',
      },
    ],
  },
  {
    slug: 'vorrichtungen-fuer-montagequalitaet',
    title: 'Vorrichtungen fuer stabile Montagequalitaet',
    description:
      'Wie passgenaue Montagehilfen Nacharbeit reduzieren und Taktstabilitaet in der Linie verbessern.',
    intro:
      'Vorrichtungen sind dann wirtschaftlich, wenn sie wiederkehrende Fehlerquellen eliminieren und Bedienung vereinfachen.',
    checklist: ['Ist-Zustand am Arbeitsplatz', 'Fehlerbild pro Schicht', 'Gewuenschtes Zielbild'],
    sections: [
      {
        title: 'Arbeitsplatznah entwickeln',
        content:
          'Die Geometrie wird auf den realen Arbeitsablauf abgestimmt, nicht auf ein theoretisches CAD-Szenario.',
      },
      {
        title: 'Iterationen kurz halten',
        content:
          'Schnelle Testschleifen mit kleinen Anpassungen sind meist wirksamer als ein einmaliger Grosswurf.',
      },
    ],
  },
  {
    slug: 'prototyping-iterationen-in-5-tagen',
    title: 'Prototyping-Iterationen in kurzen Testfenstern',
    description:
      'Praxismodell fuer Entwicklungsteams, die Varianten schnell pruefen und Entscheidungen frueher absichern wollen.',
    intro:
      'Kurze Iterationen reduzieren Unsicherheit in Konstruktion, Einkauf und Fertigung. Entscheidend ist eine klare Priorisierung der Pruefkriterien.',
    checklist: ['Welche Funktion wird getestet', 'Welche Toleranz ist relevant', 'Welche Variante ist Entscheidungstreiber'],
    sections: [
      {
        title: 'Variante vor Perfektion',
        content:
          'In fruehen Phasen sollte die Testfrage zuerst beantwortet werden. Oberflaechenfinish kommt spaeter.',
      },
      {
        title: 'Rueckkopplung dokumentieren',
        content:
          'Jede Iteration braucht eine kurze Ergebnisnotiz, damit Folgeschritte reproduzierbar bleiben.',
      },
    ],
  },
  {
    slug: 'materialwahl-abs-asa-pc-pa',
    title: 'Materialwahl: ABS, ASA, PC, PA im Industrieeinsatz',
    description:
      'Vergleich typischer Werkstoffklassen fuer funktionale 3D-Druckbauteile in Produktion und Instandhaltung.',
    intro:
      'Materialauswahl ist ein Risikohebel. Ohne Lastprofil, Temperaturbereich und Umgebungsdaten bleibt jede Empfehlung unscharf.',
    checklist: ['Temperaturbereich', 'UV- und Medienkontakt', 'Mechanische Lastspitzen'],
    sections: [
      {
        title: 'Werkstoffvergleich nach Einsatzprofil',
        content:
          'Bewerten Sie zuerst den realen Einsatz, danach den Werkstoff. So vermeiden Sie Ueber- und Unterdimensionierung.',
      },
      {
        title: 'Freigabe mit Einsatzkriterien',
        content:
          'Eine belastbare Freigabe dokumentiert Grenzbedingungen und Ausschlusskriterien fuer den Betrieb.',
      },
    ],
  },
  {
    slug: 'tpu-funktionsbauteile-belastbar-auslegen',
    title: 'TPU-Funktionsbauteile belastbar auslegen',
    description:
      'Wann flexible Werkstoffe sinnvoll sind und welche Grenzen bei Geometrie und Dauerlast zu beachten sind.',
    intro:
      'TPU ist stark bei Daempfung, Griff und Verformung, aber nicht fuer jeden Lastfall geeignet.',
    checklist: ['Verformungsweg', 'Rueckstellverhalten', 'Kontaktflaeche'],
    sections: [
      {
        title: 'Geometrie fuer Elastizitaet',
        content:
          'Wandstaerken, Rippen und Uebergaenge steuern die Funktion. Kleine Geometrieaenderungen haben grosse Wirkung.',
      },
      {
        title: 'Testen vor Serienfreigabe',
        content:
          'Mindestens ein Praxisversuch im echten Takt reduziert Reklamationsrisiko erheblich.',
      },
    ],
  },
  {
    slug: 'fdm-toleranzen-im-industriealltag',
    title: 'FDM-Toleranzen im Industriealltag',
    description:
      'Wie Toleranzen realistisch bewertet werden und welche Masse vor Produktionsstart abgestimmt werden muessen.',
    intro:
      'Toleranzdiskussionen sollten bauteilbezogen gefuehrt werden. Kritische Masse brauchen eine Prioritaetsliste.',
    checklist: ['Funktionsmasse markieren', 'Bezugsflaechen definieren', 'Pruefmittel abstimmen'],
    sections: [
      {
        title: 'Kritische Masse zuerst',
        content:
          'Nicht jede Abweichung ist funktionskritisch. Fokus auf Passflaechen und Anschlaege bringt die beste Wirkung.',
      },
      {
        title: 'Abnahme transparent machen',
        content:
          'Definieren Sie vorab, wie gemessen wird und welche Toleranzklasse fuer den Einsatzzweck ausreichend ist.',
      },
    ],
  },
  {
    slug: 'lieferfenster-statt-unrealistischer-expressversprechen',
    title: 'Lieferfenster statt unrealistischer Expressversprechen',
    description:
      'Planungssichere Lieferaussagen fuer Instandhaltung und Produktion ohne Marketingversprechen.',
    intro:
      'Verlaessliche Lieferfenster sind im Betrieb wertvoller als aggressive Werbeaussagen ohne technische Pruefung.',
    checklist: ['Technische Klardaten', 'Stueckzahl je Abruf', 'Freigabezeitpunkt'],
    sections: [
      {
        title: 'Machbarkeit vor Terminzusage',
        content:
          'Eine Terminzusage ist nur dann belastbar, wenn Material, Druckzeit und Nachbearbeitung realistisch kalkuliert sind.',
      },
      {
        title: 'Statuskommunikation im Ablauf',
        content:
          'Klare Zwischenmeldungen reduzieren Eskalationen und geben dem Team Sicherheit in der Terminplanung.',
      },
    ],
  },
  {
    slug: 'kleinserie-ohne-werkzeug-vorbereiten',
    title: 'Kleinserie ohne Werkzeug sauber vorbereiten',
    description:
      'Anforderungen fuer reproduzierbare Kleinserien mit additiver Fertigung im industriellen Umfeld.',
    intro:
      'Kleinserie funktioniert dann gut, wenn Prozessgrenzen klar sind und die Bauteilgeometrie auf Wiederholbarkeit ausgelegt ist.',
    checklist: ['Mengenbandbreite', 'Nacharbeitsbedarf', 'Qualitaetskriterien'],
    sections: [
      {
        title: 'Serienfaehigkeit frueh pruefen',
        content:
          'Schon ab den ersten Losen sollten Pruefkriterien fuer Funktion und Masse konsequent angewendet werden.',
      },
      {
        title: 'Aenderungsmanagement festlegen',
        content:
          'Bei Varianten oder Revisionen braucht es klare Versionsstaende, damit keine Mischlose entstehen.',
      },
    ],
  },
  {
    slug: 'bauteiloptimierung-fuer-funktionssicherheit',
    title: 'Bauteiloptimierung fuer Funktionssicherheit',
    description:
      'Konstruktive Anpassungen, die Standzeit und Belastbarkeit additiv gefertigter Teile verbessern.',
    intro:
      'Viele Bauteile lassen sich mit kleinen Geometrieanpassungen robuster machen, ohne den Einsatzzweck zu veraendern.',
    checklist: ['Kerbwirkung vermeiden', 'Kraftfluss beruecksichtigen', 'Montagezugang pruefen'],
    sections: [
      {
        title: 'Funktion priorisieren',
        content:
          'Der Fokus liegt auf Standzeit und Montageverhalten. Optik ist nachrangig, wenn das Teil betriebsrelevant ist.',
      },
      {
        title: 'Anpassung dokumentieren',
        content:
          'Jede Geometrieaenderung wird mit Ziel und Nutzen dokumentiert, um spaetere Revisionen nachvollziehbar zu halten.',
      },
    ],
  },
  {
    slug: 'cad-checkliste-fuer-anfrage',
    title: 'CAD-Checkliste fuer belastbare Projektanfragen',
    description:
      'Welche Angaben in einer B2B-Anfrage enthalten sein sollten, damit die technische Bewertung sofort starten kann.',
    intro:
      'Gute Datenqualitaet beschleunigt die Angebotserstellung und reduziert Rueckfragen in kritischen Zeitfenstern.',
    checklist: ['Dateiformat und Revision', 'Einsatzbedingungen', 'Stueckzahl und Termin'],
    sections: [
      {
        title: 'Pflichtangaben fuer den Start',
        content:
          'Mindestens Geometrie, Einsatzfall und Lieferbedarf sind erforderlich, um eine belastbare Aussage zu treffen.',
      },
      {
        title: 'Rueckfragen vermeiden',
        content:
          'Unklare Funktionsbeschreibungen und fehlende Termine sind die haeufigsten Ursachen fuer Verzogerungen.',
      },
    ],
  },
  {
    slug: 'scan-basierte-ersatzteilversorgung',
    title: 'Scan-basierte Ersatzteilversorgung',
    description:
      'Vorgehen bei fehlenden CAD-Daten: von der Bestandsaufnahme bis zur einsatzfaehigen Nachfertigung.',
    intro:
      'Wenn keine Konstruktionsdaten vorliegen, ist ein strukturierter Reverse-Engineering-Prozess entscheidend.',
    checklist: ['Referenzteil verfuegbar', 'Funktionsflaechen bekannt', 'Abgleich im Einbau'],
    sections: [
      {
        title: 'Datenbasis sichern',
        content:
          'Scan, Referenzmasse und Einbaubezug muessen zueinander passen, damit keine systematischen Fehler entstehen.',
      },
      {
        title: 'Funktionspruefung vor Freigabe',
        content:
          'Ein kurzer Praxischeck im echten Einsatzfeld verhindert teure Mehrfachschleifen.',
      },
    ],
  },
  {
    slug: 'wartungsfenster-mit-3d-druck-absichern',
    title: 'Wartungsfenster mit 3D-Druck absichern',
    description:
      'Wie Instandhaltungsteams Wartungsstopps besser planen, wenn Ersatzteile nicht regulaer verfuegbar sind.',
    intro:
      'Wartungsfenster sind eng getaktet. Ein klarer Ersatzteilprozess reduziert Unsicherheit fuer Team und Produktion.',
    checklist: ['Teil priorisieren', 'Abhaengigkeiten erfassen', 'Lieferfenster abstimmen'],
    sections: [
      {
        title: 'Kritikalitaet klassifizieren',
        content:
          'Nicht jedes Teil ist gleich wichtig. Priorisieren Sie nach Ausfallfolge und Wiederanlaufzeit.',
      },
      {
        title: 'Kommunikation synchronisieren',
        content:
          'Betrieb, Technik und Einkauf sollten auf dieselbe Terminlage und denselben Revisionsstand schauen.',
      },
    ],
  },
  {
    slug: 'uv-und-witterungsbestaendigkeit-kunststoffteile',
    title: 'UV- und Witterungsbestaendigkeit bei Kunststoffteilen',
    description:
      'Entscheidungshilfe fuer Bauteile in Aussenanwendungen mit UV- und Temperaturbelastung.',
    intro:
      'Aussenanwendungen brauchen ein anderes Materialprofil als reine Innenanwendungen.',
    checklist: ['UV-Exposition', 'Temperaturschwankung', 'Mechanische Last im Betrieb'],
    sections: [
      {
        title: 'Materialgrenzen kennen',
        content:
          'Werkstoffdaten sollten auf den realen Einsatz bezogen werden, nicht nur auf Katalogwerte.',
      },
      {
        title: 'Einsatzdauer abschaetzen',
        content:
          'Fuer langfristige Anwendungen sollten Wartungs- und Austauschzyklen frueh geplant werden.',
      },
    ],
  },
  {
    slug: 'temperaturbestaendige-bauteile-richtig-auslegen',
    title: 'Temperaturbestaendige Bauteile richtig auslegen',
    description:
      'Leitfaden fuer Anwendungen mit thermischer Dauerlast oder kurzzeitigen Temperaturspitzen.',
    intro:
      'Temperatur ist oft der entscheidende Ausfalltreiber. Schon moderate Dauerlast kann Materialeigenschaften deutlich veraendern.',
    checklist: ['Dauer- und Spitzentemperatur', 'Einwirkdauer', 'Nachbarbauteile und Montage'],
    sections: [
      {
        title: 'Thermisches Lastprofil erfassen',
        content:
          'Die Kombination aus Temperatur und Zeit bestimmt die Eignung deutlich staerker als ein einzelner Grenzwert.',
      },
      {
        title: 'Designreserve einplanen',
        content:
          'Bei kritischen Anwendungen sollten Sicherheitsreserven und Wartungsintervalle dokumentiert werden.',
      },
    ],
  },
  {
    slug: 'chemische-bestaendigkeit-im-praktischen-einsatz',
    title: 'Chemische Bestaendigkeit im praktischen Einsatz',
    description:
      'Bewertung von Medienkontakt fuer 3D-gedruckte Funktionsbauteile im Produktionsumfeld.',
    intro:
      'Chemischer Kontakt fuehrt oft nicht sofort zum Ausfall, kann aber die Standzeit deutlich reduzieren.',
    checklist: ['Welche Medien', 'Kontaktzeit', 'Reinigung und Wartung'],
    sections: [
      {
        title: 'Medienprofil definieren',
        content:
          'Ohne konkrete Angaben zu Medium und Konzentration ist keine belastbare Werkstoffauswahl moeglich.',
      },
      {
        title: 'Pruefstrategie festlegen',
        content:
          'Bei Unsicherheit helfen kleine Vorserien-Tests unter realen Bedingungen mehr als theoretische Annahmen.',
      },
    ],
  },
  {
    slug: 'montagehilfe-ergonomie-und-prozesssicherheit',
    title: 'Montagehilfe: Ergonomie und Prozesssicherheit',
    description:
      'Wie Vorrichtungen gleichzeitig Bedienaufwand reduzieren und Qualitaetsstreuung minimieren.',
    intro:
      'Ergonomie und Qualitaet haengen zusammen. Gute Hilfsmittel reduzieren Fehlhandlungen unter Zeitdruck.',
    checklist: ['Greifwege', 'Sichtbarkeit', 'Fehlerquellen'],
    sections: [
      {
        title: 'Bedienlogik vereinfachen',
        content:
          'Je klarer der Prozess gefuehrt wird, desto stabiler bleibt die Qualitaet auch bei Schichtwechseln.',
      },
      {
        title: 'Rueckmeldung aus der Linie nutzen',
        content:
          'Feedback aus dem Betrieb sollte in kurze Verbesserungszyklen einfliessen.',
      },
    ],
  },
  {
    slug: 'ersatzteil-dokumentation-und-versionierung',
    title: 'Ersatzteil-Dokumentation und Versionierung',
    description:
      'Best Practices fuer wiederholbare Nachfertigung ohne Versionschaos.',
    intro:
      'Nachfertigung skaliert nur mit sauberer Dokumentation von Stand, Material und Einsatzfreigabe.',
    checklist: ['Revisionsstand', 'Materialfreigabe', 'Einsatzhinweis'],
    sections: [
      {
        title: 'Versionen eindeutig halten',
        content:
          'Eindeutige IDs und Aenderungshinweise verhindern Verwechslungen in Beschaffung und Produktion.',
      },
      {
        title: 'Freigabekriterien erfassen',
        content:
          'Dokumentieren Sie, woran die Einsatzfaehigkeit bewertet wurde, damit Folgeauftraege schneller laufen.',
      },
    ],
  },
  {
    slug: 'qualitaetspruefung-von-funktionsbauteilen',
    title: 'Qualitaetspruefung von Funktionsbauteilen',
    description:
      'Pragmatische Qualitaetssicherung fuer industrielle 3D-Druckteile mit funktionskritischen Merkmalen.',
    intro:
      'Pruefung muss zum Risiko passen. Kritische Merkmale sollten priorisiert und wiederholbar gemessen werden.',
    checklist: ['Kritische Merkmale', 'Pruefmethode', 'Abnahmekriterium'],
    sections: [
      {
        title: 'Pruefplan vor Produktionsstart',
        content:
          'Ein kurzer Pruefplan vorab spart Zeit im Abschluss und verhindert Diskussionen bei der Uebergabe.',
      },
      {
        title: 'Abweichungen klar bewerten',
        content:
          'Definieren Sie vorab, welche Abweichung akzeptabel ist und wann nachgearbeitet werden muss.',
      },
    ],
  },
  {
    slug: 'kosten-treiber-im-industrie-3d-druck',
    title: 'Kosten-Treiber im Industrie-3D-Druck',
    description:
      'Welche Faktoren den Preis wirklich beeinflussen und wie Projekte wirtschaftlich gesteuert werden.',
    intro:
      'Preisvergleich ohne technische Daten fuehrt oft zu Fehlentscheidungen. Die wichtigsten Kostentreiber sind klar beeinflussbar.',
    checklist: ['Bauteilvolumen', 'Nachbearbeitung', 'Stueckzahl und Wiederholbedarf'],
    sections: [
      {
        title: 'Kosten transparent machen',
        content:
          'Wenn Druck, Nacharbeit und Lieferfenster getrennt bewertet werden, entstehen belastbare Entscheidungen.',
      },
      {
        title: 'Wirtschaftlichkeit ueber Lebenszyklus',
        content:
          'Nicht nur der Stueckpreis zaehlt, sondern auch Ausfallkosten, Lieferzeit und Prozesssicherheit.',
      },
    ],
  },
  {
    slug: 'express-anfragen-realistisch-bewerten',
    title: 'Express-Anfragen realistisch bewerten',
    description:
      'Wann Express sinnvoll ist und welche technischen Voraussetzungen fuer verlaessliche Zusagen erforderlich sind.',
    intro:
      'Express ist ein Sonderfall, kein Standard. Realistische Zusagen schuetzen vor Folgekosten und Frust.',
    checklist: ['Vollstaendige Datenlage', 'Materialverfuegbarkeit', 'Nachbearbeitungsbedarf'],
    sections: [
      {
        title: 'Express nur mit Machbarkeitscheck',
        content:
          'Ohne technischen Check steigt das Risiko fuer Terminbruch und Funktionsabweichung deutlich.',
      },
      {
        title: 'Priorisierung transparent steuern',
        content:
          'Klar kommunizierte Priorisierung schafft Vertrauen und verhindert unrealistische Erwartungen.',
      },
    ],
  },
  {
    slug: 'risikoanalyse-fuer-funktionskritische-teile',
    title: 'Risikoanalyse fuer funktionskritische Teile',
    description:
      'Strukturierte Bewertung von Ausfallfolgen, Materialrisiken und Prozessgrenzen vor Fertigungsfreigabe.',
    intro:
      'Risikomanagement ist besonders wichtig, wenn ein Teil direkten Einfluss auf Anlagenverfuegbarkeit hat.',
    checklist: ['Ausfallfolge', 'Einsatzgrenzen', 'Fallback-Szenario'],
    sections: [
      {
        title: 'Kritische Risiken priorisieren',
        content:
          'Bewerten Sie zuerst Ausfallwirkung und Eintrittswahrscheinlichkeit, erst dann Detailfragen.',
      },
      {
        title: 'Massnahmen vorab definieren',
        content:
          'Mit klaren Gegenmassnahmen bleiben auch anspruchsvolle Projekte steuerbar.',
      },
    ],
  },
  {
    slug: 'materialwechsel-ohne-qualitaetsverlust',
    title: 'Materialwechsel ohne Qualitaetsverlust',
    description:
      'Vorgehen fuer Materialwechsel bei geaenderten Anforderungen oder Verfuegbarkeitsengpaessen.',
    intro:
      'Materialwechsel braucht eine strukturierte Validierung, damit Funktions- und Prozessqualitaet erhalten bleiben.',
    checklist: ['Aenderungsgrund', 'Vergleichskriterium', 'Validierungsplan'],
    sections: [
      {
        title: 'Gleichwertigkeit pruefen',
        content:
          'Nicht nur Festigkeit, sondern auch Temperatur, Medienkontakt und Montageverhalten muessen bewertet werden.',
      },
      {
        title: 'Umstellung dokumentieren',
        content:
          'Eine saubere Dokumentation verhindert Fehlmischungen und sichert Folgeauftraege.',
      },
    ],
  },
  {
    slug: 'lieferantenwechsel-additive-fertigung',
    title: 'Lieferantenwechsel in der additiven Fertigung',
    description:
      'Wie Unternehmen den Wechsel strukturieren, ohne laufende Produktion zu gefaehrden.',
    intro:
      'Ein Lieferantenwechsel ist ein Prozessprojekt. Klare Kriterien reduzieren Reibung bei Uebergabe und Freigabe.',
    checklist: ['Technische Kriterien', 'Kommunikationsplan', 'Uebergabe von Revisionsstaenden'],
    sections: [
      {
        title: 'Onboarding mit Pflichtkriterien',
        content:
          'Definieren Sie Mindestanforderungen fuer Datenqualitaet, Reaktionszeit und Qualitaetsnachweise.',
      },
      {
        title: 'Parallelphase nutzen',
        content:
          'Eine kurze Parallelphase mit Vergleichsteilen senkt Umstellungsrisiken erheblich.',
      },
    ],
  },
  {
    slug: 'digitales-ersatzteillager-mit-3d-druck',
    title: 'Digitales Ersatzteillager mit 3D-Druck',
    description:
      'Ansatz fuer Unternehmen, die Ersatzteile digital vorhalten und bei Bedarf reproduzierbar fertigen wollen.',
    intro:
      'Digitale Ersatzteillager reduzieren physische Lagerkosten und verkuerzen Reaktionszeiten bei Ausfaellen.',
    checklist: ['Teilportfolio priorisieren', 'Datenqualitaet sichern', 'Freigaberegeln definieren'],
    sections: [
      {
        title: 'Portfolio schrittweise aufbauen',
        content:
          'Starten Sie mit den ausfallkritischen Teilen und erweitern Sie das Portfolio mit jeder abgeschlossenen Nachfertigung.',
      },
      {
        title: 'Betriebsroutine etablieren',
        content:
          'Regelmaessige Reviews fuer Datenstand, Revisionslogik und Lieferfaehigkeit sichern die langfristige Wirkung.',
      },
    ],
  },
  {
    slug: 'industrie-3d-druck-checkliste-fuer-einkauf',
    title: 'Einkaufs-Checkliste fuer Industrie-3D-Druck',
    description:
      'Praxisorientierte Kriterien fuer Einkaufsteams, um Anbieter strukturiert und technisch belastbar zu vergleichen.',
    intro:
      'Ein guter Einkauf vergleicht nicht nur Preis, sondern auch technische Rueckmeldung, Lieferaussage und Prozessreife.',
    checklist: ['Reaktionszeit', 'Technische Pruefung', 'Nachweisbare Prozessqualitaet'],
    sections: [
      {
        title: 'Vergleichskriterien standardisieren',
        content:
          'Definieren Sie einheitliche Kriterien fuer Angebote, damit Entscheidungen reproduzierbar bleiben.',
      },
      {
        title: 'Liefer- und Qualitaetsrisiko bewerten',
        content:
          'Bewerten Sie Risiken vor der Beauftragung, nicht erst nach dem ersten Problem im Betrieb.',
      },
    ],
  },
];

export const knowledgePageBySlug: Record<string, KnowledgePage> = Object.fromEntries(
  knowledgePages.map((page) => [page.slug, page]),
);
