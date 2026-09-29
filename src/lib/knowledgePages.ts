import type { ServicePageKey } from './servicePages';

export type KnowledgeSection = {
  title: string;
  content: string;
};

export type KnowledgeTopic =
  | 'ersatzteile'
  | 'vorrichtungen'
  | 'prototyping'
  | 'material'
  | 'qualitaet'
  | 'planung';

export type KnowledgePage = {
  slug: string;
  topic: KnowledgeTopic;
  service?: ServicePageKey;
  title: string;
  description: string;
  intro: string;
  checklist: string[];
  sections: KnowledgeSection[];
  /** Material library families (slugs, see src/lib/werkstoffe/families.ts) linked from this guide. */
  relatedMaterials?: string[];
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
    topic: 'ersatzteile',
    service: 'ersatzteile',
    title: 'Ersatzteil-Nachfertigung bei Maschinenstillstand',
    description:
      'Leitfaden für Instandhaltungsteams, wenn Originalteile fehlen und ein belastbares Lieferfenster benötigt wird.',
    intro:
      'Wenn eine Anlage steht, sind klare Entscheidungen wichtiger als ein Schnellpreis ohne Kontext. Dieser Leitfaden zeigt, welche Daten für eine sichere Nachfertigung notwendig sind.',
    checklist: ['Bauteilfunktion und Lastfall', 'Stückzahl und Wiederholbedarf', 'Terminfenster der Anlage'],
    sections: [
      {
        title: 'Technische Startdaten',
        content:
          'Übergeben Sie Geometrie, Einsatzbedingungen und kritische Maße. Ohne diese drei Punkte steigt das Risiko für Nacharbeit.',
      },
      {
        title: 'Material- und Freigabeentscheidung',
        content:
          'Das Material wird nicht nach Name, sondern nach Temperatur, Medienkontakt und mechanischer Belastung gewählt.',
      },
    ],
  },
  {
    slug: 'vorrichtungen-fuer-montagequalitaet',
    topic: 'vorrichtungen',
    service: 'montagehilfen',
    title: 'Vorrichtungen für stabile Montagequalität',
    description:
      'Wie passgenaue Montagehilfen Nacharbeit reduzieren und Taktstabilität in der Linie verbessern.',
    intro:
      'Vorrichtungen sind dann wirtschaftlich, wenn sie wiederkehrende Fehlerquellen eliminieren und Bedienung vereinfachen.',
    checklist: ['Ist-Zustand am Arbeitsplatz', 'Fehlerbild pro Schicht', 'Gewünschtes Zielbild'],
    sections: [
      {
        title: 'Arbeitsplatznah entwickeln',
        content:
          'Die Geometrie wird auf den realen Arbeitsablauf abgestimmt, nicht auf ein theoretisches CAD-Szenario.',
      },
      {
        title: 'Iterationen kurz halten',
        content:
          'Schnelle Testschleifen mit kleinen Anpassungen sind meist wirksamer als ein einmaliger Großwurf.',
      },
    ],
    relatedMaterials: ['pa6-cf', 'pla', 'pet-cf'],
  },
  {
    slug: 'prototyping-iterationen-in-5-tagen',
    topic: 'prototyping',
    service: 'prototypen',
    title: 'Prototyping-Iterationen in kurzen Testfenstern',
    description:
      'Praxismodell für Entwicklungsteams, die Varianten schnell prüfen und Entscheidungen früher absichern wollen.',
    intro:
      'Kurze Iterationen reduzieren Unsicherheit in Konstruktion, Einkauf und Fertigung. Entscheidend ist eine klare Priorisierung der Prüfkriterien.',
    checklist: ['Welche Funktion wird getestet', 'Welche Toleranz ist relevant', 'Welche Variante ist Entscheidungstreiber'],
    sections: [
      {
        title: 'Variante vor Perfektion',
        content:
          'In frühen Phasen sollte die Testfrage zuerst beantwortet werden. Oberflächenfinish kommt später.',
      },
      {
        title: 'Rückkopplung dokumentieren',
        content:
          'Jede Iteration braucht eine kurze Ergebnisnotiz, damit Folgeschritte reproduzierbar bleiben.',
      },
    ],
    relatedMaterials: ['pla', 'pla-tough', 'petg-pctg'],
  },
  {
    slug: 'materialwahl-abs-asa-pc-pa',
    topic: 'material',
    title: 'Materialwahl: ABS, ASA, PC, PA im Industrieeinsatz',
    description:
      'Vergleich typischer Werkstoffklassen für funktionale 3D-Druckbauteile in Produktion und Instandhaltung.',
    intro:
      'Materialauswahl ist ein Risikohebel. Ohne Lastprofil, Temperaturbereich und Umgebungsdaten bleibt jede Empfehlung unscharf.',
    checklist: ['Temperaturbereich', 'UV- und Medienkontakt', 'Mechanische Lastspitzen'],
    sections: [
      {
        title: 'Werkstoffvergleich nach Einsatzprofil',
        content:
          'Bewerten Sie zuerst den realen Einsatz, danach den Werkstoff. So vermeiden Sie Über- und Unterdimensionierung.',
      },
      {
        title: 'Freigabe mit Einsatzkriterien',
        content:
          'Eine belastbare Freigabe dokumentiert Grenzbedingungen und Ausschlusskriterien für den Betrieb.',
      },
    ],
    relatedMaterials: ['abs', 'asa', 'pc', 'pa'],
  },
  {
    slug: 'tpu-funktionsbauteile-belastbar-auslegen',
    topic: 'material',
    title: 'TPU-Funktionsbauteile belastbar auslegen',
    description:
      'Wann flexible Werkstoffe sinnvoll sind und welche Grenzen bei Geometrie und Dauerlast zu beachten sind.',
    intro:
      'TPU ist stark bei Dämpfung, Griff und Verformung, aber nicht für jeden Lastfall geeignet.',
    checklist: ['Verformungsweg', 'Rückstellverhalten', 'Kontaktfläche'],
    sections: [
      {
        title: 'Geometrie für Elastizität',
        content:
          'Wandstärken, Rippen und Übergänge steuern die Funktion. Kleine Geometrieänderungen haben große Wirkung.',
      },
      {
        title: 'Testen vor Serienfreigabe',
        content:
          'Mindestens ein Praxisversuch im echten Takt reduziert Reklamationsrisiko erheblich.',
      },
    ],
    relatedMaterials: ['tpu'],
  },
  {
    slug: 'fdm-toleranzen-im-industriealltag',
    topic: 'qualitaet',
    title: 'FDM-Toleranzen im Industriealltag',
    description:
      'Wie Toleranzen realistisch bewertet werden und welche Maße vor Produktionsstart abgestimmt werden müssen.',
    intro:
      'Toleranzdiskussionen sollten bauteilbezogen geführt werden. Kritische Maße brauchen eine Prioritätsliste.',
    checklist: ['Funktionsmaße markieren', 'Bezugsflächen definieren', 'Prüfmittel abstimmen'],
    sections: [
      {
        title: 'Kritische Maße zuerst',
        content:
          'Nicht jede Abweichung ist funktionskritisch. Fokus auf Passflächen und Anschläge bringt die beste Wirkung.',
      },
      {
        title: 'Abnahme transparent machen',
        content:
          'Definieren Sie vorab, wie gemessen wird und welche Toleranzklasse für den Einsatzzweck ausreichend ist.',
      },
    ],
  },
  {
    slug: 'lieferfenster-statt-unrealistischer-expressversprechen',
    topic: 'planung',
    title: 'Lieferfenster statt unrealistischer Expressversprechen',
    description:
      'Planungssichere Lieferaussagen für Instandhaltung und Produktion ohne Marketingversprechen.',
    intro:
      'Verlässliche Lieferfenster sind im Betrieb wertvoller als aggressive Werbeaussagen ohne technische Prüfung.',
    checklist: ['Technische Klardaten', 'Stückzahl je Abruf', 'Freigabezeitpunkt'],
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
    topic: 'prototyping',
    title: 'Kleinserie ohne Werkzeug sauber vorbereiten',
    description:
      'Anforderungen für reproduzierbare Kleinserien mit additiver Fertigung im industriellen Umfeld.',
    intro:
      'Kleinserie funktioniert dann gut, wenn Prozessgrenzen klar sind und die Bauteilgeometrie auf Wiederholbarkeit ausgelegt ist.',
    checklist: ['Mengenbandbreite', 'Nacharbeitsbedarf', 'Qualitätskriterien'],
    sections: [
      {
        title: 'Serienfähigkeit früh prüfen',
        content:
          'Schon ab den ersten Losen sollten Prüfkriterien für Funktion und Maße konsequent angewendet werden.',
      },
      {
        title: 'Änderungsmanagement festlegen',
        content:
          'Bei Varianten oder Revisionen braucht es klare Versionsstände, damit keine Mischlose entstehen.',
      },
    ],
  },
  {
    slug: 'bauteiloptimierung-fuer-funktionssicherheit',
    topic: 'qualitaet',
    title: 'Bauteiloptimierung für Funktionssicherheit',
    description:
      'Konstruktive Anpassungen, die Standzeit und Belastbarkeit additiv gefertigter Teile verbessern.',
    intro:
      'Viele Bauteile lassen sich mit kleinen Geometrieanpassungen robuster machen, ohne den Einsatzzweck zu verändern.',
    checklist: ['Kerbwirkung vermeiden', 'Kraftfluss berücksichtigen', 'Montagezugang prüfen'],
    sections: [
      {
        title: 'Funktion priorisieren',
        content:
          'Der Fokus liegt auf Standzeit und Montageverhalten. Optik ist nachrangig, wenn das Teil betriebsrelevant ist.',
      },
      {
        title: 'Anpassung dokumentieren',
        content:
          'Jede Geometrieänderung wird mit Ziel und Nutzen dokumentiert, um spätere Revisionen nachvollziehbar zu halten.',
      },
    ],
  },
  {
    slug: 'cad-checkliste-fuer-anfrage',
    topic: 'planung',
    title: 'CAD-Checkliste für belastbare Projektanfragen',
    description:
      'Welche Angaben in einer B2B-Anfrage enthalten sein sollten, damit die technische Bewertung sofort starten kann.',
    intro:
      'Gute Datenqualität beschleunigt die Angebotserstellung und reduziert Rückfragen in kritischen Zeitfenstern.',
    checklist: ['Dateiformat und Revision', 'Einsatzbedingungen', 'Stückzahl und Termin'],
    sections: [
      {
        title: 'Pflichtangaben für den Start',
        content:
          'Mindestens Geometrie, Einsatzfall und Lieferbedarf sind erforderlich, um eine belastbare Aussage zu treffen.',
      },
      {
        title: 'Rückfragen vermeiden',
        content:
          'Unklare Funktionsbeschreibungen und fehlende Termine sind die häufigsten Ursachen für Verzögerungen.',
      },
    ],
  },
  {
    slug: 'scan-basierte-ersatzteilversorgung',
    topic: 'ersatzteile',
    service: 'kunststoffteile',
    title: 'Scan-basierte Ersatzteilversorgung',
    description:
      'Vorgehen bei fehlenden CAD-Daten: von der Bestandsaufnahme bis zur einsatzfähigen Nachfertigung.',
    intro:
      'Wenn keine Konstruktionsdaten vorliegen, ist ein strukturierter Reverse-Engineering-Prozess entscheidend.',
    checklist: ['Referenzteil verfügbar', 'Funktionsflächen bekannt', 'Abgleich im Einbau'],
    sections: [
      {
        title: 'Datenbasis sichern',
        content:
          'Scan, Referenzmaße und Einbaubezug müssen zueinander passen, damit keine systematischen Fehler entstehen.',
      },
      {
        title: 'Funktionsprüfung vor Freigabe',
        content:
          'Ein kurzer Praxischeck im echten Einsatzfeld verhindert teure Mehrfachschleifen.',
      },
    ],
  },
  {
    slug: 'wartungsfenster-mit-3d-druck-absichern',
    topic: 'ersatzteile',
    service: 'ersatzteile',
    title: 'Wartungsfenster mit 3D-Druck absichern',
    description:
      'Wie Instandhaltungsteams Wartungsstopps besser planen, wenn Ersatzteile nicht regulär verfügbar sind.',
    intro:
      'Wartungsfenster sind eng getaktet. Ein klarer Ersatzteilprozess reduziert Unsicherheit für Team und Produktion.',
    checklist: ['Teil priorisieren', 'Abhängigkeiten erfassen', 'Lieferfenster abstimmen'],
    sections: [
      {
        title: 'Kritikalität klassifizieren',
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
    topic: 'material',
    title: 'UV- und Witterungsbeständigkeit bei Kunststoffteilen',
    description:
      'Entscheidungshilfe für Bauteile in Außenanwendungen mit UV- und Temperaturbelastung.',
    intro:
      'Außenanwendungen brauchen ein anderes Materialprofil als reine Innenanwendungen.',
    checklist: ['UV-Exposition', 'Temperaturschwankung', 'Mechanische Last im Betrieb'],
    sections: [
      {
        title: 'Materialgrenzen kennen',
        content:
          'Werkstoffdaten sollten auf den realen Einsatz bezogen werden, nicht nur auf Katalogwerte.',
      },
      {
        title: 'Einsatzdauer abschätzen',
        content:
          'Für langfristige Anwendungen sollten Wartungs- und Austauschzyklen früh geplant werden.',
      },
    ],
    relatedMaterials: ['asa', 'petg-pctg'],
  },
  {
    slug: 'temperaturbestaendige-bauteile-richtig-auslegen',
    topic: 'material',
    title: 'Temperaturbeständige Bauteile richtig auslegen',
    description:
      'Leitfaden für Anwendungen mit thermischer Dauerlast oder kurzzeitigen Temperaturspitzen.',
    intro:
      'Temperatur ist oft der entscheidende Ausfalltreiber. Schon moderate Dauerlast kann Materialeigenschaften deutlich verändern.',
    checklist: ['Dauer- und Spitzentemperatur', 'Einwirkdauer', 'Nachbarbauteile und Montage'],
    sections: [
      {
        title: 'Thermisches Lastprofil erfassen',
        content:
          'Die Kombination aus Temperatur und Zeit bestimmt die Eignung deutlich stärker als ein einzelner Grenzwert.',
      },
      {
        title: 'Designreserve einplanen',
        content:
          'Bei kritischen Anwendungen sollten Sicherheitsreserven und Wartungsintervalle dokumentiert werden.',
      },
    ],
    relatedMaterials: ['pa6-cf', 'pc', 'asa', 'abs'],
  },
  {
    slug: 'chemische-bestaendigkeit-im-praktischen-einsatz',
    topic: 'material',
    title: 'Chemische Beständigkeit im praktischen Einsatz',
    description:
      'Bewertung von Medienkontakt für 3D-gedruckte Funktionsbauteile im Produktionsumfeld.',
    intro:
      'Chemischer Kontakt führt oft nicht sofort zum Ausfall, kann aber die Standzeit deutlich reduzieren.',
    checklist: ['Welche Medien', 'Kontaktzeit', 'Reinigung und Wartung'],
    sections: [
      {
        title: 'Medienprofil definieren',
        content:
          'Ohne konkrete Angaben zu Medium und Konzentration ist keine belastbare Werkstoffauswahl möglich.',
      },
      {
        title: 'Prüfstrategie festlegen',
        content:
          'Bei Unsicherheit helfen kleine Vorserien-Tests unter realen Bedingungen mehr als theoretische Annahmen.',
      },
    ],
    relatedMaterials: ['pa', 'petg-pctg'],
  },
  {
    slug: 'montagehilfe-ergonomie-und-prozesssicherheit',
    topic: 'vorrichtungen',
    service: 'montagehilfen',
    title: 'Montagehilfe: Ergonomie und Prozesssicherheit',
    description:
      'Wie Vorrichtungen gleichzeitig Bedienaufwand reduzieren und Qualitätsstreuung minimieren.',
    intro:
      'Ergonomie und Qualität hängen zusammen. Gute Hilfsmittel reduzieren Fehlhandlungen unter Zeitdruck.',
    checklist: ['Greifwege', 'Sichtbarkeit', 'Fehlerquellen'],
    sections: [
      {
        title: 'Bedienlogik vereinfachen',
        content:
          'Je klarer der Prozess geführt wird, desto stabiler bleibt die Qualität auch bei Schichtwechseln.',
      },
      {
        title: 'Rückmeldung aus der Linie nutzen',
        content:
          'Feedback aus dem Betrieb sollte in kurze Verbesserungszyklen einfließen.',
      },
    ],
  },
  {
    slug: 'ersatzteil-dokumentation-und-versionierung',
    topic: 'ersatzteile',
    service: 'ersatzteile',
    title: 'Ersatzteil-Dokumentation und Versionierung',
    description:
      'Best Practices für wiederholbare Nachfertigung ohne Versionschaos.',
    intro:
      'Nachfertigung skaliert nur mit sauberer Dokumentation von Stand, Material und Einsatzfreigabe.',
    checklist: ['Revisionsstand', 'Materialfreigabe', 'Einsatzhinweis'],
    sections: [
      {
        title: 'Versionen eindeutig halten',
        content:
          'Eindeutige IDs und Änderungshinweise verhindern Verwechslungen in Beschaffung und Produktion.',
      },
      {
        title: 'Freigabekriterien erfassen',
        content:
          'Dokumentieren Sie, woran die Einsatzfähigkeit bewertet wurde, damit Folgeaufträge schneller laufen.',
      },
    ],
  },
  {
    slug: 'qualitaetspruefung-von-funktionsbauteilen',
    topic: 'qualitaet',
    title: 'Qualitätsprüfung von Funktionsbauteilen',
    description:
      'Pragmatische Qualitätssicherung für industrielle 3D-Druckteile mit funktionskritischen Merkmalen.',
    intro:
      'Prüfung muss zum Risiko passen. Kritische Merkmale sollten priorisiert und wiederholbar gemessen werden.',
    checklist: ['Kritische Merkmale', 'Prüfmethode', 'Abnahmekriterium'],
    sections: [
      {
        title: 'Prüfplan vor Produktionsstart',
        content:
          'Ein kurzer Prüfplan vorab spart Zeit im Abschluss und verhindert Diskussionen bei der Übergabe.',
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
    topic: 'planung',
    title: 'Kosten-Treiber im Industrie-3D-Druck',
    description:
      'Welche Faktoren den Preis wirklich beeinflussen und wie Projekte wirtschaftlich gesteuert werden.',
    intro:
      'Preisvergleich ohne technische Daten führt oft zu Fehlentscheidungen. Die wichtigsten Kostentreiber sind klar beeinflussbar.',
    checklist: ['Bauteilvolumen', 'Nachbearbeitung', 'Stückzahl und Wiederholbedarf'],
    sections: [
      {
        title: 'Kosten transparent machen',
        content:
          'Wenn Druck, Nacharbeit und Lieferfenster getrennt bewertet werden, entstehen belastbare Entscheidungen.',
      },
      {
        title: 'Wirtschaftlichkeit über Lebenszyklus',
        content:
          'Nicht nur der Stückpreis zählt, sondern auch Ausfallkosten, Lieferzeit und Prozesssicherheit.',
      },
    ],
  },
  {
    slug: 'express-anfragen-realistisch-bewerten',
    topic: 'planung',
    title: 'Express-Anfragen realistisch bewerten',
    description:
      'Wann Express sinnvoll ist und welche technischen Voraussetzungen für verlässliche Zusagen erforderlich sind.',
    intro:
      'Express ist ein Sonderfall, kein Standard. Realistische Zusagen schützen vor Folgekosten und Frust.',
    checklist: ['Vollständige Datenlage', 'Materialverfügbarkeit', 'Nachbearbeitungsbedarf'],
    sections: [
      {
        title: 'Express nur mit Machbarkeitscheck',
        content:
          'Ohne technischen Check steigt das Risiko für Terminbruch und Funktionsabweichung deutlich.',
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
    topic: 'qualitaet',
    title: 'Risikoanalyse für funktionskritische Teile',
    description:
      'Strukturierte Bewertung von Ausfallfolgen, Materialrisiken und Prozessgrenzen vor Fertigungsfreigabe.',
    intro:
      'Risikomanagement ist besonders wichtig, wenn ein Teil direkten Einfluss auf Anlagenverfügbarkeit hat.',
    checklist: ['Ausfallfolge', 'Einsatzgrenzen', 'Fallback-Szenario'],
    sections: [
      {
        title: 'Kritische Risiken priorisieren',
        content:
          'Bewerten Sie zuerst Ausfallwirkung und Eintrittswahrscheinlichkeit, erst dann Detailfragen.',
      },
      {
        title: 'Maßnahmen vorab definieren',
        content:
          'Mit klaren Gegenmaßnahmen bleiben auch anspruchsvolle Projekte steuerbar.',
      },
    ],
  },
  {
    slug: 'materialwechsel-ohne-qualitaetsverlust',
    topic: 'material',
    title: 'Materialwechsel ohne Qualitätsverlust',
    description:
      'Vorgehen für Materialwechsel bei geänderten Anforderungen oder Verfügbarkeitsengpässen.',
    intro:
      'Materialwechsel braucht eine strukturierte Validierung, damit Funktions- und Prozessqualität erhalten bleiben.',
    checklist: ['Änderungsgrund', 'Vergleichskriterium', 'Validierungsplan'],
    sections: [
      {
        title: 'Gleichwertigkeit prüfen',
        content:
          'Nicht nur Festigkeit, sondern auch Temperatur, Medienkontakt und Montageverhalten müssen bewertet werden.',
      },
      {
        title: 'Umstellung dokumentieren',
        content:
          'Eine saubere Dokumentation verhindert Fehlmischungen und sichert Folgeaufträge.',
      },
    ],
    relatedMaterials: ['petg-pctg', 'abs', 'asa', 'pa'],
  },
  {
    slug: 'lieferantenwechsel-additive-fertigung',
    topic: 'planung',
    title: 'Lieferantenwechsel in der additiven Fertigung',
    description:
      'Wie Unternehmen den Wechsel strukturieren, ohne laufende Produktion zu gefährden.',
    intro:
      'Ein Lieferantenwechsel ist ein Prozessprojekt. Klare Kriterien reduzieren Reibung bei Übergabe und Freigabe.',
    checklist: ['Technische Kriterien', 'Kommunikationsplan', 'Übergabe von Revisionsständen'],
    sections: [
      {
        title: 'Onboarding mit Pflichtkriterien',
        content:
          'Definieren Sie Mindestanforderungen für Datenqualität, Reaktionszeit und Qualitätsnachweise.',
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
    topic: 'ersatzteile',
    service: 'ersatzteile',
    title: 'Digitales Ersatzteillager mit 3D-Druck',
    description:
      'Ansatz für Unternehmen, die Ersatzteile digital vorhalten und bei Bedarf reproduzierbar fertigen wollen.',
    intro:
      'Digitale Ersatzteillager reduzieren physische Lagerkosten und verkürzen Reaktionszeiten bei Ausfällen.',
    checklist: ['Teilportfolio priorisieren', 'Datenqualität sichern', 'Freigaberegeln definieren'],
    sections: [
      {
        title: 'Portfolio schrittweise aufbauen',
        content:
          'Starten Sie mit den ausfallkritischen Teilen und erweitern Sie das Portfolio mit jeder abgeschlossenen Nachfertigung.',
      },
      {
        title: 'Betriebsroutine etablieren',
        content:
          'Regelmäßige Reviews für Datenstand, Revisionslogik und Lieferfähigkeit sichern die langfristige Wirkung.',
      },
    ],
  },
  {
    slug: 'industrie-3d-druck-checkliste-fuer-einkauf',
    topic: 'planung',
    title: 'Einkaufs-Checkliste für Industrie-3D-Druck',
    description:
      'Praxisorientierte Kriterien für Einkaufsteams, um Anbieter strukturiert und technisch belastbar zu vergleichen.',
    intro:
      'Ein guter Einkauf vergleicht nicht nur Preis, sondern auch technische Rückmeldung, Lieferaussage und Prozessreife.',
    checklist: ['Reaktionszeit', 'Technische Prüfung', 'Nachweisbare Prozessqualität'],
    sections: [
      {
        title: 'Vergleichskriterien standardisieren',
        content:
          'Definieren Sie einheitliche Kriterien für Angebote, damit Entscheidungen reproduzierbar bleiben.',
      },
      {
        title: 'Liefer- und Qualitätsrisiko bewerten',
        content:
          'Bewerten Sie Risiken vor der Beauftragung, nicht erst nach dem ersten Problem im Betrieb.',
      },
    ],
  },
];

export const knowledgePageBySlug: Record<string, KnowledgePage> = Object.fromEntries(
  knowledgePages.map((page) => [page.slug, page]),
);

/**
 * Deterministic "related articles" selection: pages sharing the topic come first,
 * ordered by their position after the current page (wrapping around the list);
 * remaining slots are filled with the nearest list neighbours.
 */
export function relatedKnowledgePages(slug: string, limit = 3): KnowledgePage[] {
  const index = knowledgePages.findIndex((page) => page.slug === slug);
  if (index === -1) {
    return [];
  }
  const current = knowledgePages[index];
  const total = knowledgePages.length;
  const byCircularOrder = Array.from(
    { length: total - 1 },
    (_, offset) => knowledgePages[(index + offset + 1) % total],
  );

  const selected = byCircularOrder
    .filter((page) => page.topic === current.topic)
    .slice(0, limit);

  for (let distance = 1; selected.length < limit && distance < total; distance += 1) {
    for (const candidateIndex of [index + distance, index - distance]) {
      if (selected.length >= limit || candidateIndex < 0 || candidateIndex >= total) {
        continue;
      }
      const candidate = knowledgePages[candidateIndex];
      if (!selected.includes(candidate)) {
        selected.push(candidate);
      }
    }
  }

  return selected;
}
