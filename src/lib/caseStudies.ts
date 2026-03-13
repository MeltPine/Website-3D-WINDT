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
  assets: Array<{
    src: string;
    alt: string;
  }>;
};

export const industryCaseStudies: IndustryCaseStudy[] = [
  {
    id: 'case-ersatzteil-sonderanlage',
    title: 'Ersatzteil für Sonderanlage',
    category: 'ersatzteil',
    challenge:
      'Ein funktionskritisches Kunststoffteil war kurzfristig nicht verfügbar und setzte ein Wartungsfenster unter Zeitdruck.',
    solution:
      'Geometrie und Passflächen wurden aus Bestandsdaten nachkonstruiert und für den Einsatz in der Sonderanlage materialgerecht ausgelegt.',
    result:
      'Das Ersatzteil wurde reproduzierbar verfügbar gemacht und der geplante Wartungstermin konnte ohne Beschaffungsrisiko umgesetzt werden.',
    useCase: 'Ausfallkritisches Ersatzteil für Instandhaltung',
    partType: 'Funktionsbauteil mit Passflächen',
    materialClass: 'Technische Thermoplaste (z. B. ABS, ASA, PC je nach Lastprofil)',
    quantityRange: '1-20 Stück',
    deliveryWindow: 'Express nach Abstimmung, typischerweise 2-5 Werktage nach Freigabe',
    proofStatus: 'anonymisiert',
    assets: [
      {
        src: '/cases/ersatzteil-cad.svg',
        alt: 'Anonymisierte CAD-Übersicht eines Ersatzteils',
      },
      {
        src: '/cases/ersatzteil-cad-detail.svg',
        alt: 'Anonymisierte CAD-Detailansicht mit Passflächen',
      },
      {
        src: '/cases/ersatzteil-cad-einbau.svg',
        alt: 'Anonymisierte CAD-Einbausituation in einer Sonderanlage',
      },
    ],
  },
  {
    id: 'case-montagehilfe-linie',
    title: 'Montagehilfe für Produktionslinie',
    category: 'montagehilfe',
    challenge:
      'Wiederkehrende Montageabweichungen führten zu Nacharbeit und instabilen Taktzeiten im manuellen Prozess.',
    solution:
      'Eine passgenaue Vorrichtung wurde iterativ auf den Arbeitsplatz abgestimmt und auf reproduzierbare Handhabung ausgelegt.',
    result:
      'Prozessschritte wurden stabiler, Fehlerquellen reduziert und die Wiederholgenauigkeit verbessert.',
    useCase: 'Prozessstabilisierung in Fertigung und Montage',
    partType: 'Vorrichtung, Lehre oder Positionierhilfe',
    materialClass: 'Abrieb- und temperaturstabile Werkstoffe (z. B. ASA, PC, PA-basierte Materialien)',
    quantityRange: '1-50 Stück',
    deliveryWindow: 'Typischerweise 3-7 Werktage nach technischer Klärung',
    proofStatus: 'anonymisiert',
    assets: [
      {
        src: '/cases/montagehilfe-cad.svg',
        alt: 'Anonymisierte CAD-Übersicht einer Montagehilfe',
      },
      {
        src: '/cases/montagehilfe-cad-detail.svg',
        alt: 'Anonymisierte CAD-Detailansicht einer Positionierfläche',
      },
      {
        src: '/cases/montagehilfe-cad-arbeitsplatz.svg',
        alt: 'Anonymisierte CAD-Skizze einer Montagehilfe am Arbeitsplatz',
      },
    ],
  },
  {
    id: 'case-prototyp-iteration',
    title: 'Prototyp für Funktionsprüfung',
    category: 'prototyp',
    challenge:
      'In der Entwicklung mussten mehrere Varianten ohne Werkzeugvorlauf schnell getestet und entschieden werden.',
    solution:
      'Iterativer 3D-Druck-Workflow mit abgestimmter Geometrie und Materialwahl für die jeweilige Testphase.',
    result:
      'Entscheidungszyklen wurden verkürzt und konstruktive Anpassungen konnten in kurzen Testfenstern validiert werden.',
    useCase: 'Schnelle Iteration in der Produktentwicklung',
    partType: 'Funktionsnaher Prototyp mit Testgeometrien',
    materialClass: 'Anwendungsbezogene Werkstoffe (z. B. ABS, ASA, PC, TPU je nach Funktion)',
    quantityRange: '1-10 Stück pro Iteration',
    deliveryWindow: 'Typischerweise 2-4 Werktage pro Iteration',
    proofStatus: 'anonymisiert',
    assets: [
      {
        src: '/cases/prototyp-cad.svg',
        alt: 'Anonymisierte CAD-Übersicht eines Funktionsprototyps',
      },
      {
        src: '/cases/prototyp-cad-variante-a.svg',
        alt: 'Anonymisierte CAD-Variante A für Funktionsprüfung',
      },
      {
        src: '/cases/prototyp-cad-variante-b.svg',
        alt: 'Anonymisierte CAD-Variante B für Funktionsprüfung',
      },
    ],
  },
];
