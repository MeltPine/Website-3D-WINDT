export type CaseProofStatus = 'anonymisiert' | 'freigegeben';
export type CaseCategory = 'ersatzteil' | 'montagehilfe' | 'prototyp';

export type IndustryCaseStudy = {
  id: string;
  title: string;
  category: CaseCategory;
  challenge: string;
  solution: string;
  result: string;
  useCase: string;
  partType: string;
  materialClass: string;
  quantityRange: string;
  deliveryWindow: string;
  proofStatus: CaseProofStatus;
  visualSrc: string;
  visualAlt: string;
};

export const industryCaseStudies: IndustryCaseStudy[] = [
  {
    id: 'case-ersatzteil-sonderanlage',
    title: 'Ersatzteil fuer Sonderanlage',
    category: 'ersatzteil',
    challenge:
      'Ein funktionskritisches Kunststoffteil war nicht mehr kurzfristig beschaffbar und blockierte Wartungsablaeufe.',
    solution:
      'Bauteil wurde technisch analysiert, mit Fokus auf Passflaechen nachkonstruiert und fuer den realen Einsatzfall ausgelegt.',
    result:
      'Die Versorgungsluecke wurde geschlossen und die Nachfertigung reproduzierbar abgesichert.',
    useCase: 'Ausfallkritisches Ersatzteil fuer Instandhaltung',
    partType: 'Funktionsbauteil mit Passflaechen',
    materialClass: 'Technische Thermoplaste (z. B. ABS, ASA, PC je nach Lastprofil)',
    quantityRange: '1-20 Stueck',
    deliveryWindow: 'Express nach Abstimmung, typischerweise 2-5 Werktage nach Freigabe',
    proofStatus: 'anonymisiert',
    visualSrc: '/cases/ersatzteil-cad.svg',
    visualAlt: 'Anonymisierte CAD-Ansicht eines Ersatzteils',
  },
  {
    id: 'case-montagehilfe-linie',
    title: 'Montagehilfe fuer Produktionslinie',
    category: 'montagehilfe',
    challenge:
      'Wiederkehrende Montageabweichungen fuehrten zu Nacharbeit und instabilen Taktzeiten im manuellen Prozess.',
    solution:
      'Eine passgenaue Vorrichtung wurde iterativ auf den Arbeitsplatz abgestimmt und auf reproduzierbare Handhabung ausgelegt.',
    result:
      'Prozessschritte wurden stabiler, Fehlerquellen reduziert und die Wiederholgenauigkeit verbessert.',
    useCase: 'Prozessstabilisierung in Fertigung und Montage',
    partType: 'Vorrichtung, Lehre oder Positionierhilfe',
    materialClass: 'Abrieb- und temperaturstabile Werkstoffe (z. B. ASA, PC, PA-basierte Materialien)',
    quantityRange: '1-50 Stueck',
    deliveryWindow: 'Typischerweise 3-7 Werktage nach technischer Klaerung',
    proofStatus: 'anonymisiert',
    visualSrc: '/cases/montagehilfe-cad.svg',
    visualAlt: 'Anonymisierte CAD-Ansicht einer Montagehilfe',
  },
  {
    id: 'case-prototyp-iteration',
    title: 'Prototyp fuer Funktionspruefung',
    category: 'prototyp',
    challenge:
      'In der Entwicklung mussten mehrere Varianten ohne Werkzeugvorlauf schnell getestet und entschieden werden.',
    solution:
      'Iterativer 3D-Druck-Workflow mit abgestimmter Geometrie und Materialwahl fuer die jeweilige Testphase.',
    result:
      'Entscheidungszyklen wurden verkuerzt und konstruktive Anpassungen schneller validiert.',
    useCase: 'Schnelle Iteration in der Produktentwicklung',
    partType: 'Funktionsnaher Prototyp mit Testgeometrien',
    materialClass: 'Anwendungsbezogene Werkstoffe (z. B. ABS, ASA, PC, TPU je nach Funktion)',
    quantityRange: '1-10 Stueck pro Iteration',
    deliveryWindow: 'Typischerweise 2-4 Werktage pro Iteration',
    proofStatus: 'anonymisiert',
    visualSrc: '/cases/prototyp-cad.svg',
    visualAlt: 'Anonymisierte CAD-Ansicht eines Funktionsprototyps',
  },
];
