import { UPLOAD_POLICY } from '../upload/policy';
import { PRINTCHECK_RULES as R, PROCESS } from './standards';

/*
 * Customer-facing copy about the printability check for the calculator page,
 * the landing page /druckbarkeit-pruefen/ and the FAQ schema. Thresholds are
 * read from PRINTCHECK_RULES so the explanation cannot drift from the check.
 * Light module (main bundle): no analysis code imported here.
 */

export const PRINTCHECK_PATH = '/druckbarkeit-pruefen/';
export const PRINTCHECK_ROUTE_KEY = '/druckbarkeit-pruefen';

function mm(value: number): string {
  return `${new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 }).format(value)} mm`;
}

export interface CheckDescription {
  title: string;
  text: string;
}

export const PRINTCHECK_CHECKS: readonly CheckDescription[] = [
  {
    title: 'Netz & Datei',
    text:
      'Geschlossene Oberfläche, eindeutige Kanten, Flächenorientierung, überlappende Körper, Splitter und Maßeinheit ' +
      '(mm, cm oder Zoll?).',
  },
  {
    title: 'Bauraum',
    text: `Passt das Teil in ${PROCESS.buildVolumeMm.join(' × ')} mm – auch gedreht oder diagonal? Sonst: Teilung in wie viele Segmente.`,
  },
  {
    title: 'Wandstärke',
    text:
      `Messung über die größte einbeschriebene Kugel (Medialachse) mit Histogramm. Unter ${mm(R.wallCriticalMm.value)} ` +
      `fehlt die Wand im Druck, ab ${mm(R.wallRecommendedMm.value)} ist sie belastbar.`,
  },
  {
    title: 'Feine Merkmale & Spalte',
    text:
      `Stifte und Stege unter ${mm(R.wallCriticalMm.value)}, Spalte unter ${mm(R.gapCriticalMm.value)}, die beim Druck ` +
      'zuwachsen – mit Markierung im 3D-Modell.',
  },
  {
    title: 'Überhänge & Stützen',
    text:
      `Flächenanteile über ${R.overhangSupportDeg.value}° und ${R.overhangCriticalDeg.value}°, geschätztes Stützvolumen ` +
      'und freitragende Bereiche.',
  },
  {
    title: 'Drucklage & Festigkeit',
    text:
      'Vergleich von sechs Lagen nach Stützbedarf, Bauhöhe, Auflagefläche, Standsicherheit und Schichtrichtung – mit Begründung.',
  },
  {
    title: 'Bohrungen & Toleranzen',
    text:
      `Liegende Bohrungen (Tropfenform), Bohrungen unter Ø ${mm(R.smallHoleMm.value)} (Nachbohren) und die erreichbare ` +
      `Toleranzklasse nach DIN ISO 2768-1 je Hauptmaß.`,
  },
  {
    title: 'Kerben, Schlankheit & Verzug',
    text:
      'Scharfe Innenecken als Kerbstellen, hohe dünne Bereiche, Haftfläche und Verzugsrisiko großer Grundflächen je Material.',
  },
  {
    title: 'Materialeignung',
    text: 'Passt der gewählte Werkstoff zur Geometrie – etwa feine Details in TPU oder dünne Wände in faserverstärktem Material?',
  },
];

export interface FaqEntry {
  question: string;
  answer: string;
}

export const PRINTCHECK_FAQ: readonly FaqEntry[] = [
  {
    question: 'Wird meine Datei für den Druckbarkeits-Check hochgeladen?',
    answer:
      'Nein. Die Prüfung läuft vollständig in Ihrem Browser. Die Datei verlässt Ihren Rechner erst, wenn Sie eine ' +
      `Anfrage absenden – dann verschlüsselt, gespeichert in der EU und nach ${UPLOAD_POLICY.retentionDays} Tagen gelöscht.`,
  },
  {
    question: 'Welche Dateiformate kann ich prüfen?',
    answer:
      `STEP/STP, STL, 3MF und OBJ bis ${UPLOAD_POLICY.maxFileBytes / 1024 / 1024} MB. STEP-Dateien werden im Browser in ein Dreiecksnetz umgerechnet; ` +
      'STL und OBJ enthalten keine Einheit, deshalb prüfen wir die Maße auf Plausibilität.',
  },
  {
    question: 'Wie wird die Wandstärke gemessen?',
    answer:
      'Das Modell wird fein gerastert. Für jede Stelle wird die größte Kugel bestimmt, die noch in das Bauteil passt; ' +
      'ihr Durchmesser ist die lokale Wandstärke. Diese Methode meldet – anders als ein einfacher Abstand zur ' +
      'Oberfläche – keine Scheinbefunde an Kanten massiver Teile.',
  },
  {
    question: 'Ist das Ergebnis verbindlich?',
    answer:
      'Nein. Es ist eine automatische Vorprüfung. Heuristiken sind gekennzeichnet, und was im Browser nicht geprüft ' +
      'werden konnte, steht als „nicht geprüft“ im Bericht. Verbindlich wird es nach der kostenlosen technischen ' +
      'Prüfung durch 3D-WINDT.',
  },
  {
    question: 'Was passiert, wenn mein Bauteil nicht druckbar ist?',
    answer:
      'Wir zeigen jeden Befund im 3D-Modell und erklären die Ursache. Auf Wunsch übernehmen wir die Nachkonstruktion ' +
      'oder Optimierung – etwa Wände aufdicken, Bohrungen anpassen oder ein zu großes Teil sinnvoll teilen.',
  },
  {
    question: 'Welche Toleranzen schafft FDM-3D-Druck?',
    answer:
      `Für allgemeine Maße rechnen wir mit ±${mm(R.generalToleranceMm.value)}; große Teile können durch Schwindung ` +
      'mehr abweichen. Engere Toleranzen und Passungen erreichen wir mit Nachbearbeitung und Messung.',
  },
];

export function faqSchema(entries: readonly FaqEntry[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: entries.map((entry) => ({
      '@type': 'Question',
      name: entry.question,
      acceptedAnswer: { '@type': 'Answer', text: entry.answer },
    })),
  };
}
