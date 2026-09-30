import { TRI_FLAG, type TriFlagName } from './flags';
import { POSES } from './pose';
import {
  MATERIAL_TRAITS,
  FIBRE_MIN_WALL_MM,
  FLEXIBLE_MIN_WALL_MM,
  PRINTCHECK_RULES as R,
  PROCESS,
  achievableIsoClass,
  isoTolerance,
  type IsoClass,
} from './standards';
import type { PrintCheckGeometry, PrintCheckStage } from './types';

/*
 * Turns the measurements into the customer-facing report: one finding per
 * check with measured value, threshold, status, plain-German explanation and
 * recommended fix, plus the overall verdict. Pure and main-thread cheap, so a
 * material change re-evaluates instantly.
 *
 * Honesty rules: anything that did not run is "nicht geprüft" (never a pass);
 * heuristics are labelled as such; the verdict never claims more than the
 * checks that ran can support.
 */

export type FindingStatus = 'ok' | 'hint' | 'critical' | 'not-checked';
/** What a finding means for the part as a whole. */
export type Impact = 'none' | 'adjust' | 'redesign' | 'unsuitable';
export type FindingBasis = 'measured' | 'heuristic' | 'norm';
export type CategoryId = 'mesh' | 'size' | 'walls' | 'features' | 'overhang' | 'orientation' | 'holes' | 'stress' | 'material';

export const CATEGORY_LABEL: Readonly<Record<CategoryId, string>> = {
  mesh: 'Netz & Datei',
  size: 'Bauraum',
  walls: 'Wandstärke',
  features: 'Feine Merkmale & Spalte',
  overhang: 'Überhänge & Stützen',
  orientation: 'Drucklage & Festigkeit',
  holes: 'Bohrungen & Toleranzen',
  stress: 'Kerben, Schlankheit & Verzug',
  material: 'Materialeignung',
};

export const CATEGORY_ORDER: readonly CategoryId[] = [
  'mesh',
  'size',
  'walls',
  'features',
  'overhang',
  'orientation',
  'holes',
  'stress',
  'material',
];

export const STATUS_LABEL: Readonly<Record<FindingStatus, string>> = {
  ok: 'OK',
  hint: 'Hinweis',
  critical: 'Kritisch',
  'not-checked': 'Nicht geprüft',
};

export const BASIS_LABEL: Readonly<Record<FindingBasis, string>> = {
  measured: 'Messung',
  heuristic: 'Heuristik',
  norm: 'Norm',
};

/* ------------------------------------------------------------ highlights */

export type HighlightTone = 'critical' | 'hint';
export type HighlightId =
  | 'open'
  | 'flipped'
  | 'splinter'
  | 'overlap'
  | 'thin'
  | 'gap'
  | 'overhang'
  | 'hole-small'
  | 'hole-horizontal'
  | 'sharp'
  | 'slender'
  | 'pose';

export interface HighlightLayer {
  mask: number;
  tone: HighlightTone;
  label: string;
}

export interface HighlightSpec {
  id: HighlightId;
  /** Which orientation the viewer shows while the highlight is active. */
  pose: 'loaded' | 'recommended';
  /** Layers in priority order (first match colours the triangle). */
  layers: readonly HighlightLayer[];
}

export const HIGHLIGHTS: Readonly<Record<HighlightId, HighlightSpec>> = {
  open: {
    id: 'open',
    pose: 'loaded',
    layers: [{ mask: TRI_FLAG.OPEN_EDGE | TRI_FLAG.NON_MANIFOLD, tone: 'critical', label: 'Offene oder mehrdeutige Kanten' }],
  },
  flipped: { id: 'flipped', pose: 'loaded', layers: [{ mask: TRI_FLAG.FLIPPED, tone: 'hint', label: 'Nach innen zeigende Flächen' }] },
  splinter: { id: 'splinter', pose: 'loaded', layers: [{ mask: TRI_FLAG.SPLINTER, tone: 'hint', label: 'Winzige Splitter-Körper' }] },
  overlap: { id: 'overlap', pose: 'loaded', layers: [{ mask: TRI_FLAG.OVERLAP, tone: 'hint', label: 'Überlappende Bereiche' }] },
  thin: {
    id: 'thin',
    pose: 'loaded',
    layers: [
      { mask: TRI_FLAG.THIN_CRITICAL, tone: 'critical', label: `Dünner als ${fmtMm(R.wallCriticalMm.value)} (fällt weg)` },
      { mask: TRI_FLAG.THIN_WALL, tone: 'hint', label: `Dünner als ${fmtMm(R.wallRecommendedMm.value)} (nur eine Bahn)` },
    ],
  },
  gap: { id: 'gap', pose: 'loaded', layers: [{ mask: TRI_FLAG.NARROW_GAP, tone: 'critical', label: `Spalt/Öffnung unter ${fmtMm(R.gapHintMm.value)}` }] },
  overhang: {
    id: 'overhang',
    pose: 'recommended',
    layers: [
      { mask: TRI_FLAG.OVERHANG_CRITICAL, tone: 'critical', label: `Überhang über ${R.overhangCriticalDeg.value}° (Stütze nötig)` },
      { mask: TRI_FLAG.OVERHANG_SUPPORT, tone: 'hint', label: `Überhang ${R.overhangSupportDeg.value}–${R.overhangCriticalDeg.value}° (grenzwertig)` },
    ],
  },
  'hole-small': { id: 'hole-small', pose: 'loaded', layers: [{ mask: TRI_FLAG.SMALL_HOLE, tone: 'hint', label: `Bohrung unter Ø ${fmtMm(R.smallHoleMm.value)}` }] },
  'hole-horizontal': {
    id: 'hole-horizontal',
    pose: 'recommended',
    layers: [{ mask: TRI_FLAG.HORIZONTAL_HOLE, tone: 'hint', label: 'Liegende Bohrung (Oberseite hängt durch)' }],
  },
  sharp: { id: 'sharp', pose: 'loaded', layers: [{ mask: TRI_FLAG.SHARP_INNER, tone: 'hint', label: 'Scharfe Innenkante (Kerbe)' }] },
  slender: { id: 'slender', pose: 'recommended', layers: [{ mask: TRI_FLAG.SLENDER, tone: 'hint', label: 'Schlanker, frei stehender Bereich' }] },
  pose: { id: 'pose', pose: 'recommended', layers: [] },
};

/* --------------------------------------------------------------- report */

export interface Finding {
  id: string;
  category: CategoryId;
  title: string;
  status: FindingStatus;
  impact: Impact;
  measured: string;
  threshold: string;
  explanation: string;
  recommendation: string;
  basis: FindingBasis;
  highlight: HighlightId | null;
  link: { href: string; label: string } | null;
}

export type VerdictLevel = 'direct' | 'adjust' | 'redesign' | 'unsuitable' | 'incomplete';

export const VERDICT_TITLE: Readonly<Record<VerdictLevel, string>> = {
  direct: 'Direkt druckbar',
  adjust: 'Druckbar mit Anpassungen',
  redesign: 'Konstruktive Überarbeitung empfohlen',
  unsuitable: 'Nicht FDM-geeignet',
  incomplete: 'Vorprüfung unvollständig',
};

export interface OrientationRow {
  poseId: number;
  label: string;
  recommended: boolean;
  height: number;
  supportShare: number;
  criticalShare: number;
  bedContact: number;
  supportVolumeUpper: number;
  score: number;
  fits: 'axis' | 'diagonal' | 'no';
}

export interface ToleranceRow {
  axis: 'X' | 'Y' | 'Z';
  nominal: number;
  isoM: number | null;
  isoC: number | null;
  expectedDeviation: number;
  achievable: IsoClass | null;
  withinGeneral: boolean;
}

export interface PrintCheckMaterial {
  id: string;
  name: string;
  polymer: string;
  densityGPerCm3: number;
  familySlug: string | null;
  familyName: string | null;
}

export interface PrintCheckReport {
  verdict: { level: VerdictLevel; title: string; text: string };
  findings: Finding[];
  counts: Record<FindingStatus, number>;
  recommendedPose: { id: number; label: string; reasons: string[] } | null;
  orientationRows: OrientationRow[];
  wallHistogram: { bins: number[]; binWidth: number } | null;
  toleranceRows: ToleranceRow[] | null;
  material: PrintCheckMaterial;
  showRedesignCta: boolean;
  /** Voxel edge used for the volume checks, mm (null if not rasterised). */
  resolutionMm: number | null;
}

/* ------------------------------------------------------------ formatting */

function num(value: number, digits: number): string {
  return new Intl.NumberFormat('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
}

export function fmtMm(value: number): string {
  const digits = Math.abs(value) < 10 ? 2 : Math.abs(value) < 100 ? 1 : 0;
  return `${num(value, digits)} mm`;
}

function fmtPct(value: number): string {
  return `${num(value, value < 10 ? 1 : 0)} %`;
}

function fmtInt(value: number): string {
  return new Intl.NumberFormat('de-DE').format(Math.round(value));
}

function plural(count: number, one: string, many: string): string {
  return `${fmtInt(count)} ${count === 1 ? one : many}`;
}

function stageReason(geometry: PrintCheckGeometry, stage: PrintCheckStage): string {
  const state = geometry.stages[stage];
  if (state.state === 'skipped' || state.state === 'failed') return state.reason;
  if (state.state === 'pending') return 'Prüfung wurde nicht abgeschlossen';
  return 'keine Messwerte';
}

function notChecked(
  base: Pick<Finding, 'id' | 'category' | 'title' | 'threshold'>,
  reason: string,
  explanation = 'Dieser Punkt wird in der technischen Prüfung durch 3D-WINDT bewertet.',
): Finding {
  return {
    ...base,
    status: 'not-checked',
    impact: 'none',
    measured: `nicht geprüft (${reason})`,
    explanation,
    recommendation: '',
    basis: 'measured',
    highlight: null,
    link: null,
  };
}

const AXIS = ['X', 'Y', 'Z'] as const;

/* ------------------------------------------------------------- findings */

function meshFindings(g: PrintCheckGeometry): Finding[] {
  const topo = g.topology;
  const out: Finding[] = [];
  const reason = stageReason(g, 'mesh');

  const closed = { id: 'mesh.closed', category: 'mesh' as const, title: 'Geschlossene Oberfläche', threshold: '0 offene Kanten' };
  if (!topo) {
    out.push(notChecked(closed, reason));
  } else if (topo.boundaryEdges === 0) {
    out.push({
      ...closed,
      status: 'ok',
      impact: 'none',
      measured: 'geschlossen (wasserdicht)',
      explanation: 'Innen und Außen sind eindeutig bestimmt.',
      recommendation: '',
      basis: 'measured',
      highlight: null,
      link: null,
    });
  } else {
    const leaky = g.voxel && g.voxel.leakyRowShare > 5;
    out.push({
      ...closed,
      status: 'critical',
      impact: 'adjust',
      measured: `${plural(topo.boundaryEdges, 'offene Kante', 'offene Kanten')}`,
      explanation:
        'Die Oberfläche hat Löcher. Der Slicer muss sie selbst schließen und entscheidet dabei, was innen und außen ist – ' +
        'dabei können Wände oder ganze Bereiche fehlen. Volumen und Richtpreis sind entsprechend unsicher.' +
        (leaky ? ' Die Volumenprüfungen (Wandstärke, Spalte, Stützen) sind dadurch nur eingeschränkt aussagekräftig.' : ''),
      recommendation:
        'Datei aus dem CAD erneut exportieren (am besten als STEP) oder von uns reparieren lassen – die Netzreparatur ' +
        'übernehmen wir bei der technischen Prüfung.',
      basis: 'measured',
      highlight: 'open',
      link: null,
    });
  }

  const manifold = { id: 'mesh.manifold', category: 'mesh' as const, title: 'Eindeutige Kanten', threshold: 'jede Kante trennt genau zwei Flächen' };
  if (!topo) {
    out.push(notChecked(manifold, reason));
  } else if (topo.nonManifoldEdges === 0) {
    out.push({
      ...manifold,
      status: 'ok',
      impact: 'none',
      measured: 'eindeutig (manifold)',
      explanation: 'An jeder Kante treffen genau zwei Flächen zusammen.',
      recommendation: '',
      basis: 'measured',
      highlight: null,
      link: null,
    });
  } else {
    out.push({
      ...manifold,
      status: 'critical',
      impact: 'adjust',
      measured: `${plural(topo.nonManifoldEdges, 'Kante', 'Kanten')} mit mehr als zwei Flächen`,
      explanation:
        'Hier treffen mehr als zwei Flächen an einer Kante zusammen, z. B. wenn sich zwei Körper nur an einer Kante ' +
        'berühren. Slicer verhalten sich dort unterschiedlich – es entstehen Löcher oder Materialbrücken.',
      recommendation: 'Körper im CAD vereinigen oder minimal überlappen lassen; übernehmen wir auf Wunsch.',
      basis: 'measured',
      highlight: 'open',
      link: null,
    });
  }

  const orient = { id: 'mesh.orientation', category: 'mesh' as const, title: 'Flächenorientierung', threshold: 'alle Flächen nach außen' };
  if (!topo) {
    out.push(notChecked(orient, reason));
  } else if (topo.flippedTriangles === 0) {
    out.push({
      ...orient,
      status: 'ok',
      impact: 'none',
      measured: 'einheitlich nach außen',
      explanation: 'Alle Flächennormalen zeigen konsistent nach außen.',
      recommendation: '',
      basis: 'measured',
      highlight: null,
      link: null,
    });
  } else {
    const share = (topo.flippedTriangles / Math.max(1, topo.triangles)) * 100;
    out.push({
      ...orient,
      status: 'hint',
      impact: 'adjust',
      measured:
        `${plural(topo.flippedTriangles, 'Dreieck', 'Dreiecke')} (${fmtPct(share)}) zeigen nach innen` +
        (topo.invertedComponents > 0 ? `, ${plural(topo.invertedComponents, 'Körper', 'Körper')} komplett invertiert` : ''),
      explanation:
        'Falsch orientierte Flächen kehren lokal Innen und Außen um. Die meisten Slicer korrigieren das automatisch, ' +
        'aber nicht in jedem Fall zuverlässig.',
      recommendation: 'Normalen im CAD- oder Netzprogramm vereinheitlichen – übernehmen wir bei der Prüfung.',
      basis: 'measured',
      highlight: 'flipped',
      link: null,
    });
  }

  const overlap = {
    id: 'mesh.overlap',
    category: 'mesh' as const,
    title: 'Überschneidungen / überlappende Körper',
    threshold: 'kein doppelt umschlossenes Volumen',
  };
  if (!g.voxel) {
    out.push(notChecked(overlap, stageReason(g, 'voxel')));
  } else if (g.voxel.fillMode !== 'nonzero') {
    out.push(notChecked(overlap, 'nur bei einheitlich orientierten Flächen prüfbar'));
  } else {
    const limit = Math.max(g.voxel.h ** 3 * 8, g.volume * 0.001);
    const found = g.voxel.overlapVolume > limit;
    out.push({
      ...overlap,
      status: found ? 'hint' : 'ok',
      impact: found ? 'adjust' : 'none',
      measured: found ? `ca. ${num(g.voxel.overlapVolume, 1)} mm³ doppelt umschlossen` : 'keine gefunden',
      explanation: found
        ? 'Hier liegen Körper ineinander, ohne vereinigt zu sein, oder die Oberfläche durchdringt sich selbst. Die meisten ' +
          'Slicer vereinigen das automatisch, Volumen und Gewicht werden aber doppelt gezählt, und an den Schnittkanten ' +
          'können Artefakte entstehen.'
        : `Keine doppelt umschlossenen Bereiche auf dem Prüfraster (${fmtMm(g.voxel.h)}) gefunden.`,
      recommendation: found ? 'Körper im CAD boolesch vereinigen; übernehmen wir auf Wunsch.' : '',
      basis: 'heuristic',
      highlight: found ? 'overlap' : null,
      link: null,
    });
  }

  const shells = { id: 'mesh.shells', category: 'mesh' as const, title: 'Körper in der Datei', threshold: '1 (oder bewusst mehrteilig)' };
  if (!topo) {
    out.push(notChecked(shells, reason));
  } else if (topo.splinterShells > 0) {
    out.push({
      ...shells,
      status: 'hint',
      impact: 'adjust',
      measured: `${plural(topo.shells, 'Körper', 'Körper')}, davon ${plural(topo.splinterShells, 'winziger Splitter', 'winzige Splitter')} (< ${num(R.splinterVolumeMm3.value, 0)} mm³)`,
      explanation: 'Winzige Splitter sind meist Exportreste. Sie stören beim Slicen und werden nicht sinnvoll gedruckt.',
      recommendation: 'Splitter löschen – übernehmen wir bei der Prüfung.',
      basis: 'measured',
      highlight: 'splinter',
      link: null,
    });
  } else if (topo.shells > 1) {
    out.push({
      ...shells,
      status: 'hint',
      impact: 'none',
      measured: `${plural(topo.shells, 'getrennter Körper', 'getrennte Körper')}`,
      explanation:
        'Die Datei enthält mehrere getrennte Körper. Ist das Absicht (mehrere Teile, Baugruppe), drucken wir sie ' +
        'gemeinsam oder getrennt; sollen sie ein Teil sein, müssen sie im CAD vereinigt werden.',
      recommendation: 'Bitte in der Anfrage angeben, ob es ein Teil oder mehrere sind.',
      basis: 'measured',
      highlight: null,
      link: null,
    });
  } else {
    out.push({
      ...shells,
      status: 'ok',
      impact: 'none',
      measured: '1 zusammenhängender Körper',
      explanation: 'Ein einziger, zusammenhängender Körper.',
      recommendation: '',
      basis: 'measured',
      highlight: null,
      link: null,
    });
  }

  const degenerate = topo ? topo.degenerateTriangles : g.zeroAreaTriangles;
  out.push({
    id: 'mesh.degenerate',
    category: 'mesh',
    title: 'Entartete Dreiecke',
    threshold: '0',
    status: degenerate > 0 ? 'hint' : 'ok',
    impact: 'none',
    measured: degenerate > 0 ? plural(degenerate, 'Dreieck', 'Dreiecke') + ' ohne Fläche' : 'keine',
    explanation:
      degenerate > 0
        ? 'Dreiecke ohne Flächeninhalt. Meist harmlos, sie können aber Reparaturwerkzeuge und Slicer stören.'
        : 'Alle Dreiecke haben eine Fläche.',
    recommendation: degenerate > 0 ? 'Beim Netz-Aufräumen entfernen – übernehmen wir.' : '',
    basis: 'measured',
    highlight: null,
    link: null,
  });

  const longest = Math.max(...g.bbox.size);
  const units = { id: 'mesh.units', category: 'mesh' as const, title: 'Maßeinheit plausibel' };
  if (longest < R.unitTinyMm.value) {
    out.push({
      ...units,
      threshold: `größte Abmessung ≥ ${fmtMm(R.unitTinyMm.value)}`,
      status: 'hint',
      impact: 'adjust',
      measured: `größte Abmessung ${fmtMm(longest)}`,
      explanation:
        'Das Bauteil ist sehr klein. Häufig wurde in Zentimetern, Zoll oder Metern statt in Millimetern exportiert: ' +
        `in cm gemeint wären es ${fmtMm(longest * 10)}, in Zoll ${fmtMm(longest * 25.4)}.`,
      recommendation: 'Einheit prüfen und in mm neu exportieren – oder die gewünschte Größe in der Anfrage nennen.',
      basis: 'heuristic',
      highlight: null,
      link: null,
    });
  } else if (longest > R.unitHugeMm.value) {
    out.push({
      ...units,
      threshold: `größte Abmessung ≤ ${fmtMm(R.unitHugeMm.value)}`,
      status: 'hint',
      impact: 'adjust',
      measured: `größte Abmessung ${fmtMm(longest)}`,
      explanation:
        'Das Bauteil ist ungewöhnlich groß. Möglicherweise wurde in Zehntelmillimetern oder Mikrometern exportiert.',
      recommendation: 'Einheit prüfen und in mm neu exportieren – oder die gewünschte Größe in der Anfrage nennen.',
      basis: 'heuristic',
      highlight: null,
      link: null,
    });
  } else {
    out.push({
      ...units,
      threshold: `${fmtMm(R.unitTinyMm.value)} bis ${fmtMm(R.unitHugeMm.value)}`,
      status: 'ok',
      impact: 'none',
      measured: `plausibel (größte Abmessung ${fmtMm(longest)})`,
      explanation:
        g.tessellationToleranceMm !== null
          ? 'STEP-Dateien enthalten ihre Einheit; das Modell wurde automatisch in Millimeter umgerechnet.'
          : 'Die Abmessungen passen zu einer Datei in Millimetern. STL/OBJ enthalten keine Einheit – bitte prüfen Sie die Maße.',
      recommendation: '',
      basis: 'heuristic',
      highlight: null,
      link: null,
    });
  }
  return out;
}

function sizeFinding(g: PrintCheckGeometry): Finding {
  const [bx, by, bz] = PROCESS.buildVolumeMm;
  const base = {
    id: 'size.buildVolume',
    category: 'size' as const,
    title: 'Bauraum',
    threshold: `${num(bx, 0)} × ${num(by, 0)} × ${num(bz, 0)} mm (größter Drucker)`,
  };
  const fit = g.fit;
  if (!fit) return notChecked(base, stageReason(g, 'orientation'));
  const [sx, sy, sz] = g.bbox.size;
  const dims = `${num(sx, 1)} × ${num(sy, 1)} × ${num(sz, 1)} mm`;
  if (fit.fitsAsLoaded) {
    return {
      ...base,
      status: 'ok',
      impact: 'none',
      measured: `passt (${dims})`,
      explanation: 'Das Bauteil passt in der geladenen Lage in unseren Bauraum.',
      recommendation: '',
      basis: 'measured',
      highlight: null,
      link: null,
    };
  }
  if (fit.fittingPoses.length > 0) {
    return {
      ...base,
      status: 'ok',
      impact: 'none',
      measured: `passt gedreht (${POSES[fit.fittingPoses[0]].label})`,
      explanation: `Mit den Maßen ${dims} passt das Bauteil erst in einer anderen Lage in den Bauraum – das berücksichtigen wir bei der Drucklage.`,
      recommendation: '',
      basis: 'measured',
      highlight: null,
      link: null,
    };
  }
  if (fit.diagonalPoses.length > 0) {
    return {
      ...base,
      status: 'hint',
      impact: 'adjust',
      measured: `passt nur diagonal (≈ ${num(fit.diagonalAngle ?? 0, 0)}° gedreht, ${POSES[fit.diagonalPoses[0]].label})`,
      explanation:
        `Die Hüllmaße (${dims}) sind größer als die Druckplatte. Diagonal platziert passt das Bauteil – geschätzt über ` +
        'den umschließenden Quader. Lange, schmale Teile in dieser Lage brauchen besondere Sorgfalt bei Haftung und Verzug.',
      recommendation: 'Wir prüfen Platzierung und Haftung; alternativ Teilung in zwei Segmente.',
      basis: 'heuristic',
      highlight: null,
      link: null,
    };
  }
  return {
    ...base,
    status: 'critical',
    impact: 'redesign',
    measured: `zu groß (${dims}) – Teilung in mind. ${fit.splitPieces ?? 'mehrere'} Teile nötig`,
    explanation:
      'Das Bauteil passt in keiner Lage in unseren größten Bauraum. Es muss in Segmente geteilt und nach dem Druck ' +
      'gefügt werden (Kleben, Verschrauben, Schwalbenschwanz- oder Stiftverbindung).',
    recommendation: 'Teilungskonzept mit passenden Fügestellen konstruieren – das übernehmen wir (Nachkonstruktion).',
    basis: 'heuristic',
    highlight: null,
    link: null,
  };
}

function tessellationNote(g: PrintCheckGeometry): string {
  const tol = g.tessellationToleranceMm;
  if (tol === null || tol <= 0.1) return '';
  return (
    ` Hinweis: Die STEP-Datei wurde mit einer Sehnentoleranz von ca. ${fmtMm(tol)} in Dreiecke umgerechnet; ` +
    'gekrümmte, dünne Bereiche sind dadurch nur eingeschränkt beurteilbar.'
  );
}

function uncertaintyNote(voxelMm: number): string {
  return ` Prüfraster ${fmtMm(voxelMm)}, Messunsicherheit je Wand ca. ±${fmtMm(voxelMm)}.`;
}

function wallFinding(g: PrintCheckGeometry): Finding {
  const base = {
    id: 'walls.thickness',
    category: 'walls' as const,
    title: 'Wandstärke',
    threshold: `≥ ${fmtMm(R.wallRecommendedMm.value)} empfohlen (2 × Düse ${fmtMm(PROCESS.nozzleMm)}), unter ${fmtMm(
      R.wallCriticalMm.value,
    )} nicht druckbar`,
  };
  if (g.stages.walls.state !== 'done') return notChecked(base, stageReason(g, 'walls'));
  const w = g.walls;
  if (!w) {
    return notChecked(base, 'keine messbare Wand – das Bauteil ist feiner als das Prüfraster');
  }
  if (w.resolvable > w.recommendedLimit) {
    return notChecked(
      base,
      `Prüfraster löst erst ab ${fmtMm(w.resolvable)} auf`,
      `Das Bauteil ist groß, deshalb liegt das Prüfraster bei ${fmtMm(w.resolvable / 2)}. Wände unter ${fmtMm(
        w.resolvable,
      )} lassen sich damit nicht von Rasterrauschen unterscheiden. Dünnste erfasste Stelle: ${fmtMm(w.min)}. ` +
        'Die Wandstärke prüfen wir bei der technischen Prüfung am Originalmodell.',
    );
  }
  const criticalResolved = w.resolvable <= w.criticalLimit;
  const measured =
    `${fmtPct(w.shareBelowRecommended)} des Volumens unter ${fmtMm(w.recommendedLimit)}, ` +
    `${fmtPct(w.shareBelowCritical)} unter ${fmtMm(w.criticalLimit)} · dünnste Stelle ${fmtMm(w.min)} · Mittel ${fmtMm(w.mean)}`;
  const method =
    ` Gemessen über die größte einbeschriebene Kugel (Medialachse) an ${fmtInt(w.ridgePoints)} Stützpunkten; ` +
    `jeder Volumenanteil erhält die Dicke der nächstgelegenen Kugel.` +
    uncertaintyNote(w.resolvable / 2) +
    (criticalResolved ? '' : ` Wände unter ${fmtMm(w.resolvable)} sind bei diesem Raster nicht sicher erkennbar.`) +
    tessellationNote(g);
  if (w.shareBelowCritical >= R.wallUnsuitableSharePct.value) {
    return {
      ...base,
      status: 'critical',
      impact: 'unsuitable',
      measured,
      explanation:
        'Ein großer Teil des Bauteils ist dünner als eine Extrusionsbahn. Diese Bereiche lässt der Slicer weg – das ' +
        'Bauteil würde nicht vollständig gedruckt.' +
        method,
      recommendation:
        'Wände auf mindestens 0,8 mm (Funktionsteile 1,2 mm) aufdicken oder ein feineres Verfahren wählen (z. B. SLA). Wir beraten Sie gern.',
      basis: 'measured',
      highlight: 'thin',
      link: null,
    };
  }
  if (w.shareBelowCritical > R.wallCriticalSharePct.value) {
    return {
      ...base,
      status: 'critical',
      impact: 'redesign',
      measured,
      explanation:
        `Wände dünner als ${fmtMm(w.criticalLimit)} lässt der Slicer weg – diese Stellen fehlen im Bauteil. ` +
        `Zwischen ${fmtMm(w.criticalLimit)} und ${fmtMm(w.recommendedLimit)} entsteht nur eine einzelne Bahn: druckbar, aber kaum belastbar.` +
        method,
      recommendation: 'Betroffene Wände auf mindestens 0,8 mm, für Funktionsteile 1,2 mm, aufdicken – übernehmen wir auf Wunsch.',
      basis: 'measured',
      highlight: 'thin',
      link: null,
    };
  }
  if (w.shareBelowRecommended > R.wallHintSharePct.value) {
    return {
      ...base,
      status: 'hint',
      impact: 'adjust',
      measured,
      explanation:
        `Ein Teil der Wände liegt unter ${fmtMm(w.recommendedLimit)} und wird nur mit einer einzelnen Bahn gedruckt. ` +
        'Das ist druckbar, aber mechanisch schwach und optisch anfällig.' +
        method,
      recommendation: 'Für belastete Bereiche auf 0,8–1,2 mm aufdicken; für Anschauungsteile meist ausreichend.',
      basis: 'measured',
      highlight: 'thin',
      link: null,
    };
  }
  return {
    ...base,
    status: 'ok',
    impact: 'none',
    measured,
    explanation: 'Die Wände sind für den FDM-Druck mit 0,4-mm-Düse ausreichend dick.' + method,
    recommendation: '',
    basis: 'measured',
    highlight: w.pointsBelowRecommended > 0 ? 'thin' : null,
    link: null,
  };
}

function featureFindings(g: PrintCheckGeometry, totalArea: number): Finding[] {
  const out: Finding[] = [];
  const fine = {
    id: 'features.fine',
    category: 'features' as const,
    title: 'Feine Details (Stifte, Stege, Kanten)',
    threshold: `≥ ${fmtMm(R.wallCriticalMm.value)} (eine Extrusionsbahn)`,
  };
  const w = g.walls;
  const slender = g.slender;
  if (g.stages.walls.state !== 'done' || !w) {
    out.push(notChecked(fine, stageReason(g, 'walls')));
  } else if (w.resolvable > R.wallCriticalMm.value) {
    out.push(
      notChecked(
        fine,
        `Prüfraster löst erst ab ${fmtMm(w.resolvable)} auf`,
        'Für so feine Details ist das Bauteil zu groß für das Prüfraster im Browser. Wir prüfen das am Originalmodell.',
      ),
    );
  } else if (slender && slender.featureRatio > 1 && slender.featureDiameter > 0 && slender.featureDiameter < R.wallCriticalMm.value) {
    out.push({
      ...fine,
      status: 'critical',
      impact: 'redesign',
      measured: `Stift/Steg mit ca. Ø ${fmtMm(slender.featureDiameter)}, ${fmtMm(slender.featureHeight)} hoch`,
      explanation:
        'Dieses Merkmal ist dünner als eine Extrusionsbahn. Der Slicer lässt es ganz oder teilweise weg – es fehlt im Bauteil.',
      recommendation: 'Auf mindestens 0,8 mm Durchmesser vergrößern oder nachträglich einsetzen (z. B. Metallstift).',
      basis: 'measured',
      highlight: 'thin',
      link: null,
    });
  } else if (w.pointsBelowCritical >= 3) {
    out.push({
      ...fine,
      status: 'hint',
      impact: 'adjust',
      measured: `Bereiche unter ${fmtMm(R.wallCriticalMm.value)} gefunden (dünnste Stelle ${fmtMm(w.min)})`,
      explanation:
        'Typisch sind spitz auslaufende Kanten, feine Stege oder erhabene Schrift. Diese Bereiche werden beim Slicen ' +
        'gekürzt oder weggelassen. Ob das funktionswichtig ist, sehen Sie in der 3D-Markierung.' +
        uncertaintyNote(w.resolvable / 2),
      recommendation: 'Funktionswichtige Details auf mindestens 0,8 mm verstärken.',
      basis: 'measured',
      highlight: 'thin',
      link: null,
    });
  } else if (w.min < R.wallCriticalMm.value + w.resolvable / 2) {
    out.push({
      ...fine,
      status: 'hint',
      impact: 'adjust',
      measured: `dünnste Stelle ca. ${fmtMm(w.min)} – an der Grenze einer Extrusionsbahn`,
      explanation:
        `Die dünnste Stelle liegt innerhalb der Messunsicherheit (±${fmtMm(w.resolvable / 2)}) an der Grenze von ` +
        `${fmtMm(R.wallCriticalMm.value)}. Ob der Slicer sie druckt, hängt von den Einstellungen ab.`,
      recommendation: 'Funktionswichtige Details auf mindestens 0,8 mm verstärken; wir prüfen das am Originalmodell.',
      basis: 'measured',
      highlight: 'thin',
      link: null,
    });
  } else {
    out.push({
      ...fine,
      status: 'ok',
      impact: 'none',
      measured: `keine Details unter ${fmtMm(R.wallCriticalMm.value)}`,
      explanation: 'Alle erfassten Merkmale sind mindestens eine Extrusionsbahn breit.',
      recommendation: '',
      basis: 'measured',
      highlight: null,
      link: null,
    });
  }

  const gapBase = {
    id: 'features.gaps',
    category: 'features' as const,
    title: 'Spalte, Schlitze und kleine Öffnungen',
    threshold: `≥ ${fmtMm(R.gapHintMm.value)} empfohlen, unter ${fmtMm(R.gapCriticalMm.value)} wächst zu`,
  };
  const gaps = g.gaps;
  if (g.stages.gaps.state !== 'done' || !gaps) {
    out.push(notChecked(gapBase, stageReason(g, 'gaps')));
  } else {
    const narrow = gaps.features.filter((feature) => feature.minWidth < R.gapHintMm.value);
    const resolutionNote =
      gaps.resolvable > R.gapCriticalMm.value
        ? ` Spalte unter ${fmtMm(gaps.resolvable)} sind bei diesem Prüfraster nicht erkennbar.`
        : '';
    if (narrow.length === 0) {
      out.push({
        ...gapBase,
        status: 'ok',
        impact: 'none',
        measured: `keine Spalte unter ${fmtMm(R.gapHintMm.value)}`,
        explanation: 'Alle erfassten Spalte und Öffnungen sind breit genug, um offen zu bleiben.' + resolutionNote,
        recommendation: '',
        basis: 'heuristic',
        highlight: null,
        link: null,
      });
    } else {
      const narrowest = Math.min(...narrow.map((feature) => feature.minWidth));
      const areaShare = ((g.flaggedArea.NARROW_GAP ?? 0) / Math.max(totalArea, 1e-9)) * 100;
      const critical = narrowest < R.gapCriticalMm.value;
      out.push({
        ...gapBase,
        status: critical ? 'critical' : 'hint',
        impact: critical && areaShare >= 2 ? 'redesign' : 'adjust',
        measured: `${plural(narrow.length, 'enge Stelle', 'enge Stellen')}, schmalste ca. ${fmtMm(narrowest)}`,
        explanation: critical
          ? `Spalte und Öffnungen unter ${fmtMm(R.gapCriticalMm.value)} wachsen beim Druck zu: die Bahnen beider Seiten ` +
            'verschmelzen. Bewegliche Teile verkleben, feine Gravuren verschwinden.' +
            resolutionNote
          : `Spalte unter ${fmtMm(R.gapHintMm.value)} bleiben offen, fallen aber deutlich enger aus. ` +
            'Spiel und Passungen müssen nachgearbeitet werden.' +
            resolutionNote,
        recommendation:
          'Für bewegliche oder getrennte Teile mindestens 0,4–0,5 mm Spalt vorsehen, besser 0,6 mm; Gravuren mindestens 0,8 mm breit.',
        basis: 'heuristic',
        highlight: 'gap',
        link: null,
      });
    }
  }

  out.push(
    notChecked(
      {
        id: 'features.text',
        category: 'features',
        title: 'Schrift & Prägungen',
        threshold: 'Tiefe/Höhe ≥ 0,6 mm, Strichbreite ≥ 0,8 mm',
      },
      'nicht automatisch erkennbar',
      'Schrift lässt sich im Netz nicht zuverlässig von anderer Geometrie unterscheiden. Zu feine Striche erscheinen ' +
        'oben unter „Feine Details“ bzw. „Spalte“. Richtwerte: erhabene oder vertiefte Schrift mindestens 0,6 mm hoch/tief ' +
        'und 0,8 mm Strichbreite, Schriftgröße ab ca. 5 mm.',
    ),
  );
  return out;
}

function supportGrams(g: PrintCheckGeometry, material: PrintCheckMaterial): { volumeMm3: number; grams: number; exact: boolean } | null {
  if (g.support) {
    const volume = g.support.grossVolume * R.supportDensity.value;
    return { volumeMm3: volume, grams: (volume / 1000) * material.densityGPerCm3, exact: true };
  }
  if (g.orientation) {
    const volume = g.orientation.poses[g.orientation.recommendedId].supportVolumeUpper * R.supportDensity.value;
    return { volumeMm3: volume, grams: (volume / 1000) * material.densityGPerCm3, exact: false };
  }
  return null;
}

function overhangFinding(g: PrintCheckGeometry, material: PrintCheckMaterial): Finding {
  const base = {
    id: 'overhang.support',
    category: 'overhang' as const,
    title: 'Überhänge & Stützstruktur (empfohlene Lage)',
    threshold: `bis ${R.overhangSupportDeg.value}° selbsttragend, ab ${R.overhangCriticalDeg.value}° Stütze nötig`,
  };
  const o = g.orientation;
  if (!o) return notChecked(base, stageReason(g, 'orientation'));
  const best = o.poses[o.recommendedId];
  const support = supportGrams(g, material);
  const supportText = support
    ? ` · Stützmaterial ${support.exact ? 'ca.' : 'höchstens ca.'} ${num(support.volumeMm3 / 1000, 1)} cm³ (${num(support.grams, 0)} g)`
    : '';
  const measured =
    `${fmtPct(best.supportShare)} der Fläche über ${R.overhangSupportDeg.value}°, ` +
    `${fmtPct(best.criticalShare)} über ${R.overhangCriticalDeg.value}°` +
    supportText;
  const extras: string[] = [];
  if (g.support && g.support.maxUnsupportedDistanceMm > R.bridgeMaxMm.value / 2) {
    extras.push(
      `Ein frei überspannter Bereich reicht bis ca. ${fmtMm(g.support.maxUnsupportedDistanceMm)} von der nächsten Auflage ` +
        `weg (Brücken bis ca. ${fmtMm(R.bridgeMaxMm.value)} Spannweite sind beherrschbar).`,
    );
  }
  if (g.support && g.support.floatingCells > 0) {
    extras.push('Einige Bereiche beginnen frei im Raum, ohne Verbindung nach unten – sie sind nur mit Stützen druckbar.');
  }
  const extraText = extras.length > 0 ? ` ${extras.join(' ')}` : '';
  const plateNote = ' Flächen, die auf der Druckplatte aufliegen, zählen nicht als Überhang.';
  if (best.criticalShare < R.overhangNoneSharePct.value && (!g.support || g.support.floatingCells === 0)) {
    return {
      ...base,
      status: 'ok',
      impact: 'none',
      measured,
      explanation:
        'In der empfohlenen Lage kommt das Bauteil ohne nennenswerte Stützstruktur aus.' +
        (best.supportShare > 1 ? ` Flächen zwischen ${R.overhangSupportDeg.value}° und ${R.overhangCriticalDeg.value}° werden etwas rauer.` : '') +
        plateNote +
        extraText,
      recommendation: '',
      basis: 'measured',
      highlight: best.supportShare > 0 ? 'overhang' : null,
      link: null,
    };
  }
  if (best.criticalShare < R.overhangHighSharePct.value) {
    return {
      ...base,
      status: 'hint',
      impact: 'adjust',
      measured,
      explanation:
        'Das Bauteil braucht an einigen Stellen Stützstruktur. Sie wird nach dem Druck entfernt; die Kontaktflächen ' +
        'bleiben sichtbar rauer.' +
        plateNote +
        extraText,
      recommendation:
        'Sichtflächen in der Anfrage nennen – wir legen Lage und Stützen so, dass diese sauber bleiben. Konstruktiv helfen 45°-Fasen statt waagerechter Unterseiten.',
      basis: 'measured',
      highlight: 'overhang',
      link: null,
    };
  }
  return {
    ...base,
    status: 'critical',
    impact: 'redesign',
    measured,
    explanation:
      'Auch in der günstigsten Lage hängt ein großer Teil der Fläche über. Das Bauteil ist damit nur mit viel ' +
      'Stützmaterial, längerer Druckzeit und rauen Unterseiten fertigbar.' +
      plateNote +
      extraText,
    recommendation:
      'Konstruktiv anpassen (Fasen statt Überhänge, Teilung in zwei gut druckbare Hälften) – wir optimieren das Bauteil auf Wunsch.',
    basis: 'measured',
    highlight: 'overhang',
    link: null,
  };
}

function orientationReasons(g: PrintCheckGeometry): string[] {
  const o = g.orientation;
  if (!o) return [];
  const best = o.poses[o.recommendedId];
  const reasons: string[] = [];
  const minCritical = Math.min(...o.poses.map((pose) => pose.criticalShare));
  const minHeight = Math.min(...o.poses.map((pose) => pose.height));
  const maxContact = Math.max(...o.poses.map((pose) => pose.bedContact));
  if (best.criticalShare <= minCritical + 0.05) {
    reasons.push(`geringster Stützbedarf (${fmtPct(best.criticalShare)} der Fläche über ${R.overhangCriticalDeg.value}°)`);
  }
  if (best.height <= minHeight + 0.01) {
    reasons.push(`niedrigste Bauhöhe (${fmtMm(best.height)}) – kürzere Druckzeit, weniger Schichtgrenzen`);
  }
  if (maxContact > 0 && best.bedContact >= maxContact * 0.98) {
    reasons.push(`größte Auflagefläche (${num(best.bedContact / 100, 1)} cm²) – sichere Haftung`);
  }
  if (best.scoreParts.anisotropy >= 0.99 && Math.max(...g.bbox.size) - Math.min(...g.bbox.size) > 1e-6) {
    reasons.push('längste Abmessung liegt in der Druckebene – Festigkeit entlang der Bauteillänge');
  }
  if (best.scoreParts.stability >= 0.99) {
    reasons.push('standsicher (breiter als hoch)');
  }
  const topRanked = o.ranking[0];
  if (o.recommendedId === 0 && topRanked !== 0) {
    reasons.push('Lage wie geladen beibehalten – andere Lagen wären nur unwesentlich besser');
  }
  if (reasons.length === 0) {
    reasons.push('bester Kompromiss aus Stützbedarf, Bauhöhe, Auflagefläche und Festigkeit');
  }
  return reasons;
}

function orientationFindings(g: PrintCheckGeometry): Finding[] {
  const out: Finding[] = [];
  const base = {
    id: 'orientation.recommended',
    category: 'orientation' as const,
    title: 'Empfohlene Drucklage',
    threshold: 'Vergleich von 6 Lagen',
  };
  const o = g.orientation;
  if (!o) {
    out.push(notChecked(base, stageReason(g, 'orientation')));
    out.push(
      notChecked(
        { id: 'orientation.anisotropy', category: 'orientation', title: 'Festigkeit & Schichtrichtung', threshold: 'Hauptlast nicht quer zu den Schichten' },
        stageReason(g, 'orientation'),
      ),
    );
    return out;
  }
  const best = o.poses[o.recommendedId];
  const loaded = o.poses[0];
  const reasons = orientationReasons(g);
  const comparison =
    o.recommendedId !== 0
      ? ` Gegenüber der Lage wie geladen: Stützbedarf ${fmtPct(loaded.criticalShare)} → ${fmtPct(best.criticalShare)}, ` +
        `Bauhöhe ${fmtMm(loaded.height)} → ${fmtMm(best.height)}.`
      : '';
  out.push({
    ...base,
    status: 'ok',
    impact: 'none',
    measured: best.label,
    explanation: `Gründe: ${reasons.join('; ')}.${comparison}`,
    recommendation:
      'Die endgültige Drucklage legen wir in der Arbeitsvorbereitung fest. Nennen Sie uns Sichtflächen und Belastungsrichtung – beides beeinflusst die Wahl.',
    basis: 'heuristic',
    highlight: 'pose',
    link: null,
  });

  const pose = POSES[o.recommendedId];
  const buildAxis = AXIS[pose.perm[2]];
  const planeAxes = AXIS.filter((_, k) => k !== pose.perm[2]).join('/');
  out.push({
    id: 'orientation.anisotropy',
    category: 'orientation',
    title: 'Festigkeit & Schichtrichtung',
    threshold: 'Hauptlast nicht quer zu den Schichten',
    status: 'hint',
    impact: 'none',
    measured: `Aufbaurichtung = Modellachse ${buildAxis}; Festigkeit quer zu den Schichten ≈ ${num(R.anisotropyZ.value * 100, 0)} %`,
    explanation:
      `In der empfohlenen Lage liegen die Schichten in der Modellebene ${planeAxes}. Zug- und Biegelasten entlang ` +
      `Modellachse ${buildAxis} wirken quer zu den Schichtgrenzen – dort erreicht FDM je nach Material nur etwa ` +
      `40–60 % der Festigkeit in Bahnrichtung (Datenblattwerte gelten für die günstige Richtung). Bei ${fmtInt(
        best.height / PROCESS.layerHeightMm,
      )} Schichten liegen ebenso viele Fügeebenen im Bauteil.`,
    recommendation: 'Nennen Sie uns die Hauptlastrichtung – wir richten das Bauteil danach aus, auch wenn dafür mehr Stützmaterial nötig ist.',
    basis: 'heuristic',
    highlight: 'pose',
    link: null,
  });
  return out;
}

function holeFindings(g: PrintCheckGeometry, material: PrintCheckMaterial): Finding[] {
  const out: Finding[] = [];
  const gaps = g.gaps;
  const horizontalBase = {
    id: 'holes.horizontal',
    category: 'holes' as const,
    title: 'Liegende Bohrungen',
    threshold: `ab Ø ${fmtMm(R.horizontalHoleTeardropMm.value)} Tropfenform oder Nacharbeit`,
  };
  const smallBase = {
    id: 'holes.small',
    category: 'holes' as const,
    title: 'Kleine Bohrungen',
    threshold: `ab Ø ${fmtMm(R.smallHoleMm.value)} ohne Nacharbeit`,
  };
  if (g.stages.gaps.state !== 'done' || !gaps) {
    out.push(notChecked(horizontalBase, stageReason(g, 'gaps')));
    out.push(notChecked(smallBase, stageReason(g, 'gaps')));
  } else {
    const holes = gaps.features.filter((feature) => feature.shape === 'hole');
    const detection = ` Erkannt werden runde Durchbrüche und Kanäle ab ca. Ø ${fmtMm(gaps.resolvable * 1.5)} über die Form des Hohlraums (Heuristik, keine CAD-Features).`;
    const horizontal = holes.filter((hole) => hole.horizontal && hole.width >= R.horizontalHoleTeardropMm.value);
    if (horizontal.length > 0) {
      const largest = Math.max(...horizontal.map((hole) => hole.width));
      out.push({
        ...horizontalBase,
        status: 'hint',
        impact: 'adjust',
        measured: `${plural(horizontal.length, 'liegende Bohrung', 'liegende Bohrungen')} (größte ca. Ø ${fmtMm(largest)})`,
        explanation:
          'Die Oberseite liegender Bohrungen wird ohne Stütze frei überbrückt und hängt leicht durch – die Bohrung wird ' +
          'oben flach bzw. oval.' +
          detection,
        recommendation:
          'Tropfenform (Teardrop, 45°-Spitze oben) konstruieren, Bohrung nachbohren oder eine Lage wählen, in der die Bohrung senkrecht steht.',
        basis: 'heuristic',
        highlight: 'hole-horizontal',
        link: null,
      });
    } else {
      out.push({
        ...horizontalBase,
        status: 'ok',
        impact: 'none',
        measured: 'keine gefunden',
        explanation: 'In der empfohlenen Lage liegen keine größeren Bohrungen waagerecht.' + detection,
        recommendation: '',
        basis: 'heuristic',
        highlight: null,
        link: null,
      });
    }
    const small = holes.filter((hole) => hole.width < R.smallHoleMm.value);
    if (small.length > 0) {
      const smallest = Math.min(...small.map((hole) => hole.width));
      out.push({
        ...smallBase,
        status: 'hint',
        impact: 'adjust',
        measured: `${plural(small.length, 'Bohrung', 'Bohrungen')} unter Ø ${fmtMm(R.smallHoleMm.value)} (kleinste ca. Ø ${fmtMm(smallest)})`,
        explanation:
          `Kleine Bohrungen fallen im FDM-Druck typisch ${fmtMm(0.1)}–${fmtMm(0.3)} zu klein aus und sind nicht exakt rund.` +
          detection,
        recommendation:
          'Für Passungen, Stifte und Gewinde: Bohrung drucken und anschließend auf Maß bohren oder reiben – gern übernehmen wir die Nacharbeit.',
        basis: 'heuristic',
        highlight: 'hole-small',
        link: null,
      });
    } else {
      out.push({
        ...smallBase,
        status: 'ok',
        impact: 'none',
        measured: 'keine gefunden',
        explanation: 'Keine Bohrungen unter dem Grenzwert erkannt.' + detection,
        recommendation: '',
        basis: 'heuristic',
        highlight: null,
        link: null,
      });
    }
  }

  const tolBase = {
    id: 'holes.tolerance',
    category: 'holes' as const,
    title: 'Maßhaltigkeit (ISO 2768-1)',
    threshold: `±${fmtMm(R.generalToleranceMm.value)} (3D-WINDT-Standard), ISO 2768-c FDM-üblich`,
  };
  const traits = MATERIAL_TRAITS[material.polymer];
  if (!traits) {
    out.push(notChecked(tolBase, `für ${material.polymer} liegt kein Schwindungswert vor`));
    return out;
  }
  const rows = toleranceRows(g, material);
  const outside = (rows ?? []).filter((row) => !row.withinGeneral);
  const general =
    'Aus dem 3D-Modell sind keine Toleranzen ablesbar. Erwartete Abweichung = Wiederholgenauigkeit ' +
    `(±${fmtMm(R.repeatabilityMm.value)}) plus nicht kompensierte Schwindung von ${material.polymer} ` +
    `(${num(traits.shrink * 100, 1)} % frei, ein Drittel davon angesetzt). Engere Toleranzen – ISO 2768-f/-m bei ` +
    'kleinen Maßen oder Passungen wie H7 – sind im FDM-Druck nur mit Nachbearbeitung (Bohren, Reiben, Fräsen) und Messung erreichbar.';
  out.push({
    ...tolBase,
    status: outside.length === 0 ? 'ok' : 'hint',
    impact: 'none',
    measured:
      outside.length === 0
        ? `±${fmtMm(R.generalToleranceMm.value)} auf allen Hauptmaßen realistisch`
        : outside
            .map((row) => `Maß ${row.axis} (${fmtMm(row.nominal)}): erwartet ±${fmtMm(row.expectedDeviation)}`)
            .join('; '),
    explanation: general,
    recommendation: 'Kritische Maße und Passungen in der Anfrage nennen oder eine Zeichnung beilegen – wir prüfen und messen.',
    basis: 'norm',
    highlight: null,
    link: null,
  });
  return out;
}

export function toleranceRows(g: PrintCheckGeometry, material: PrintCheckMaterial): ToleranceRow[] | null {
  const traits = MATERIAL_TRAITS[material.polymer];
  if (!traits) return null;
  return AXIS.map((axis, k) => {
    const nominal = g.bbox.size[k];
    const expectedDeviation = R.repeatabilityMm.value + (nominal * traits.shrink) / 3;
    return {
      axis,
      nominal,
      isoM: isoTolerance(nominal, 'm'),
      isoC: isoTolerance(nominal, 'c'),
      expectedDeviation,
      achievable: achievableIsoClass(nominal, expectedDeviation),
      withinGeneral: expectedDeviation <= R.generalToleranceMm.value + 1e-9,
    };
  });
}

function stressFindings(g: PrintCheckGeometry, material: PrintCheckMaterial): Finding[] {
  const out: Finding[] = [];
  const familyLink = material.familySlug
    ? { href: `/werkstoffe/${material.familySlug}/`, label: `${material.familyName ?? material.polymer} in der Werkstoff-Bibliothek` }
    : null;

  const sharpBase = {
    id: 'stress.sharpCorners',
    category: 'stress' as const,
    title: 'Scharfe Innenecken (Kerbstellen)',
    threshold: `Innenradius ≥ ${fmtMm(R.innerRadiusMm.value)} bei belasteten Teilen`,
  };
  const topo = g.topology;
  if (!topo) {
    out.push(notChecked(sharpBase, stageReason(g, 'mesh')));
  } else if (topo.sharpInnerEdges === 0) {
    out.push({
      ...sharpBase,
      status: 'ok',
      impact: 'none',
      measured: 'keine scharfen Innenkanten',
      explanation: `Keine nach innen gerichteten Kanten mit mehr als ${R.sharpInnerEdgeDeg.value}° Knick gefunden.`,
      recommendation: '',
      basis: 'heuristic',
      highlight: null,
      link: null,
    });
  } else {
    out.push({
      ...sharpBase,
      status: 'hint',
      impact: 'none',
      measured: `${plural(topo.sharpInnerEdges, 'Kantenstück', 'Kantenstücke')}, zusammen ${fmtMm(topo.sharpInnerEdgeLengthMm)}`,
      explanation:
        'Scharfe Innenecken sind Kerbstellen: Unter Last konzentriert sich die Spannung dort, Risse beginnen bevorzugt ' +
        `an der Ecke – im FDM-Druck zusätzlich entlang der Schichtgrenzen. Gezählt werden Innenkanten mit mehr als ${R.sharpInnerEdgeDeg.value}° Knick.`,
      recommendation: `Bei belasteten Teilen Innenradien von mindestens ${fmtMm(R.innerRadiusMm.value)} vorsehen. Für Anschauungsteile unkritisch.`,
      basis: 'heuristic',
      highlight: 'sharp',
      link: null,
    });
  }

  const slenderBase = {
    id: 'stress.slender',
    category: 'stress' as const,
    title: 'Schlanke, hohe Bereiche',
    threshold: `Höhe/Durchmesser < ${num(R.slenderFeatureRatio.value, 0)} : 1`,
  };
  const s = g.slender;
  if (g.stages.layers.state !== 'done' || !s) {
    out.push(notChecked(slenderBase, stageReason(g, 'layers')));
  } else {
    const featureHit = s.featureRatio > R.slenderFeatureRatio.value && s.featureDiameter >= R.wallCriticalMm.value;
    const partHit = s.partAspect > R.aspectHint.value;
    if (featureHit || partHit) {
      const parts: string[] = [];
      if (featureHit) {
        parts.push(`frei stehender Bereich ca. Ø ${fmtMm(s.featureDiameter)}, ${fmtMm(s.featureHeight)} hoch (${num(s.featureRatio, 0)} : 1)`);
      }
      if (partHit) parts.push(`Bauteil insgesamt ${num(s.partAspect, 1)} : 1 (Höhe/Breite)`);
      out.push({
        ...slenderBase,
        status: 'hint',
        impact: 'adjust',
        measured: parts.join('; '),
        explanation:
          'Hohe, dünne Bereiche schwingen beim Drucken mit. Das führt zu Riefen (Ringing), Versatz oder im Extremfall zum Abbrechen während des Drucks.',
        recommendation: 'Andere Drucklage, Stützrippe oder Opferstütze; konstruktiv den Querschnitt vergrößern.',
        basis: 'heuristic',
        highlight: featureHit ? 'slender' : null,
        link: null,
      });
    } else {
      out.push({
        ...slenderBase,
        status: 'ok',
        impact: 'none',
        measured: `keine schlanken Bereiche (Bauteil ${num(s.partAspect, 1)} : 1)`,
        explanation: 'Keine hohen, dünnen Bereiche, die beim Drucken schwingen könnten.',
        recommendation: '',
        basis: 'heuristic',
        highlight: null,
        link: null,
      });
    }
  }

  const warpBase = {
    id: 'stress.warping',
    category: 'stress' as const,
    title: `Verzugsrisiko (${material.polymer})`,
    threshold: 'Verzugsindex < 1,5 gering, < 3,5 erhöht',
  };
  const traits = MATERIAL_TRAITS[material.polymer];
  const o = g.orientation;
  if (!traits) {
    out.push(notChecked(warpBase, `für ${material.polymer} liegen keine Prozesswerte vor`));
  } else if (!o) {
    out.push(notChecked(warpBase, stageReason(g, 'orientation')));
  } else {
    const best = o.poses[o.recommendedId];
    const diag = Math.hypot(best.size[0], best.size[1]);
    const chamberHelps = PROCESS.chamber && traits.chamber;
    const index = ((traits.warp * diag) / 100) * (chamberHelps ? 0.4 : 1);
    const contact = g.layers ? g.layers.firstLayerArea : best.bedContact;
    const status: FindingStatus = index < 1.5 ? 'ok' : index < 3.5 ? 'hint' : 'critical';
    out.push({
      ...warpBase,
      status,
      impact: status === 'ok' ? 'none' : 'adjust',
      measured: `Index ${num(index, 1)} (${status === 'ok' ? 'gering' : status === 'hint' ? 'erhöht' : 'hoch'}) – Grundfläche ${fmtMm(best.size[0])} × ${fmtMm(best.size[1])}, Kontaktfläche ${num(contact / 100, 1)} cm²`,
      explanation:
        `${traits.note} Große, flache Auflageflächen ziehen sich beim Abkühlen an den Ecken hoch. Bewertet über die ` +
        `Diagonale der Grundfläche (${fmtMm(diag)}) und die Verzugsneigung des Materials` +
        (chamberHelps ? '; gefertigt wird in beheizter Bauraumkammer, die den Verzug deutlich senkt.' : '.'),
      recommendation:
        status === 'ok'
          ? ''
          : 'Brim oder Haftrand, abgerundete Ecken und Entlastungsschlitze helfen; alternativ ein verzugsärmeres Material (z. B. PETG oder faserverstärkt).',
      basis: 'heuristic',
      highlight: null,
      link: familyLink,
    });
  }

  const contactBase = {
    id: 'stress.bedContact',
    category: 'stress' as const,
    title: 'Haftfläche der ersten Schicht',
    threshold: `≥ ${num(R.firstLayerMinMm2.value, 0)} mm²`,
  };
  if (g.stages.layers.state !== 'done' || !g.layers) {
    out.push(notChecked(contactBase, stageReason(g, 'layers')));
  } else {
    const area = g.layers.firstLayerArea;
    const low = area < R.firstLayerMinMm2.value;
    out.push({
      ...contactBase,
      status: low ? 'hint' : 'ok',
      impact: low ? 'adjust' : 'none',
      measured: `${fmtInt(area)} mm²` + (g.layers.firstLayerIslands > 1 ? ` in ${fmtInt(g.layers.firstLayerIslands)} getrennten Inseln` : ''),
      explanation: low
        ? 'Die Kontaktfläche zur Druckplatte ist klein. Das Bauteil kann sich während des Drucks lösen.'
        : 'Ausreichend Kontaktfläche für sichere Haftung auf der Druckplatte.',
      recommendation: low ? 'Brim/Haftrand oder eine Drucklage mit größerer Auflage; übernehmen wir in der Arbeitsvorbereitung.' : '',
      basis: 'measured',
      highlight: null,
      link: null,
    });
  }

  const voidBase = {
    id: 'stress.voids',
    category: 'stress' as const,
    title: 'Eingeschlossene Hohlräume',
    threshold: 'keine (oder bewusst)',
  };
  if (g.stages.support.state !== 'done' || !g.voids) {
    out.push(notChecked(voidBase, stageReason(g, 'support')));
  } else if (g.voids.count === 0) {
    out.push({
      ...voidBase,
      status: 'ok',
      impact: 'none',
      measured: 'keine',
      explanation: 'Alle Hohlräume sind nach außen offen.',
      recommendation: '',
      basis: 'measured',
      highlight: null,
      link: null,
    });
  } else {
    out.push({
      ...voidBase,
      status: 'hint',
      impact: 'none',
      measured: `${plural(g.voids.count, 'geschlossener Hohlraum', 'geschlossene Hohlräume')}, zusammen ${num(g.voids.volume / 1000, 2)} cm³`,
      explanation:
        'Innen liegende, geschlossene Hohlräume werden mit Decke gedruckt; Stützen darin lassen sich nicht entfernen. Ist das gewollt (z. B. Gewichtsersparnis)?',
      recommendation: 'Falls nicht gewollt: Hohlraum schließen oder eine Entleerungsöffnung vorsehen.',
      basis: 'measured',
      highlight: null,
      link: null,
    });
  }
  return out;
}

function materialFinding(g: PrintCheckGeometry, material: PrintCheckMaterial): Finding {
  const base = {
    id: 'material.fit',
    category: 'material' as const,
    title: `Passt ${material.name} zur Geometrie?`,
    threshold: 'materialspezifische Richtwerte',
  };
  const traits = MATERIAL_TRAITS[material.polymer];
  const link = material.familySlug
    ? { href: `/werkstoffe/${material.familySlug}/`, label: `Eigenschaften von ${material.familyName ?? material.polymer}` }
    : null;
  if (!traits) {
    return { ...notChecked(base, `für ${material.polymer} liegen keine Prozesswerte vor`), link };
  }
  const hints: string[] = [];
  const w = g.walls;
  const best = g.orientation ? g.orientation.poses[g.orientation.recommendedId] : null;
  const smallHoles = g.gaps ? g.gaps.features.filter((f) => f.shape === 'hole' && f.width < R.smallHoleMm.value).length : 0;
  if (traits.flexible) {
    if (w && w.min < FLEXIBLE_MIN_WALL_MM) {
      hints.push(`Wände unter ${fmtMm(FLEXIBLE_MIN_WALL_MM)} (dünnste ${fmtMm(w.min)}) sind in elastischem Material schwer maßhaltig und knicken beim Druck.`);
    }
    if (smallHoles > 0) hints.push('Kleine Bohrungen ziehen sich in TPU stärker zu als in steifen Materialien.');
    if (best && best.criticalShare > R.overhangNoneSharePct.value) {
      hints.push('Überhänge und Brücken gelingen in TPU nur eingeschränkt; Stützen lassen sich schwer entfernen.');
    }
  }
  if (traits.fibre) {
    if (w && w.min < FIBRE_MIN_WALL_MM) {
      hints.push(`Faserverstärkte Werkstoffe brauchen Wände ab ca. ${fmtMm(FIBRE_MIN_WALL_MM)} (dünnste ${fmtMm(w.min)}).`);
    }
    if (w && w.pointsBelowCritical > 0) hints.push('Feine Details werden mit Faserfüllung unscharf.');
  }
  const chamberNote = traits.chamber ? ' Wird in beheizter Bauraumkammer gefertigt.' : '';
  if (hints.length === 0) {
    return {
      ...base,
      status: 'ok',
      impact: 'none',
      measured: `keine Einwände (${material.polymer})`,
      explanation: `${traits.note}${chamberNote} Verzug ist oben separat bewertet.`,
      recommendation: '',
      basis: 'heuristic',
      highlight: null,
      link,
    };
  }
  return {
    ...base,
    status: 'hint',
    impact: 'adjust',
    measured: `${plural(hints.length, 'Hinweis', 'Hinweise')} für ${material.polymer}`,
    explanation: `${hints.join(' ')} ${traits.note}${chamberNote}`,
    recommendation: 'Wir beraten Sie zur Materialwahl – oft gibt es eine Alternative mit ähnlichen Eigenschaften, die sich besser drucken lässt.',
    basis: 'heuristic',
    highlight: null,
    link,
  };
}

/* ---------------------------------------------------------------- verdict */

const IMPACT_RANK: Readonly<Record<Impact, number>> = { none: 0, adjust: 1, redesign: 2, unsuitable: 3 };
/** Checks without which "direkt druckbar" cannot be claimed. */
const CORE_FINDINGS = ['mesh.closed', 'size.buildVolume', 'walls.thickness', 'overhang.support'];

function listTitles(findings: readonly Finding[]): string {
  const titles = findings.slice(0, 3).map((finding) => finding.title);
  return titles.length > 1 ? `${titles.slice(0, -1).join(', ')} und ${titles[titles.length - 1]}` : titles[0] ?? '';
}

function verdict(findings: readonly Finding[]): PrintCheckReport['verdict'] {
  const active = findings.filter((finding) => finding.status === 'hint' || finding.status === 'critical');
  const worst = active.reduce<Impact>((acc, finding) => (IMPACT_RANK[finding.impact] > IMPACT_RANK[acc] ? finding.impact : acc), 'none');
  const byImpact = (impact: Impact) =>
    active
      .filter((finding) => finding.impact === impact)
      .sort((a, b) => (a.status === b.status ? 0 : a.status === 'critical' ? -1 : 1));
  const missingCore = findings.filter((finding) => CORE_FINDINGS.includes(finding.id) && finding.status === 'not-checked');

  let level: VerdictLevel;
  let text: string;
  if (worst === 'unsuitable') {
    level = 'unsuitable';
    text =
      'Große Teile des Bauteils sind feiner, als ein FDM-Drucker mit 0,4-mm-Düse fertigen kann. Für diese Geometrie ist ' +
      'eine Überarbeitung oder ein anderes Verfahren (z. B. SLA/Resin oder Zerspanung) nötig – wir beraten Sie dazu.';
  } else if (worst === 'redesign') {
    level = 'redesign';
    text =
      `${listTitles(byImpact('redesign'))} sprechen gegen einen Druck ohne Änderungen am Modell. Wir empfehlen eine ` +
      'konstruktive Überarbeitung – die übernehmen wir auf Wunsch (Nachkonstruktion/Optimierung).';
  } else if (worst === 'adjust') {
    level = 'adjust';
    text =
      `Das Bauteil ist im FDM-Verfahren fertigbar, braucht aber Anpassungen – betroffen: ${listTitles(byImpact('adjust'))}. ` +
      'Die meisten davon übernehmen wir in der Arbeitsvorbereitung, ohne dass Sie Ihr Modell ändern müssen.';
  } else if (missingCore.length > 0) {
    level = 'incomplete';
    text =
      `Grundlegende Punkte konnten im Browser nicht geprüft werden (${listTitles(missingCore)}). In den übrigen Punkten ` +
      'gab es keine Befunde – die technische Prüfung durch 3D-WINDT schließt die Lücke.';
  } else {
    level = 'direct';
    text =
      'In den automatisch geprüften Punkten spricht nichts gegen einen Druck im FDM-Verfahren. Die Hinweise unten betreffen ' +
      'Details wie Lastrichtung und Toleranzen.';
  }
  if (level !== 'incomplete' && missingCore.length > 0) {
    text += ` Nicht geprüft werden konnten: ${listTitles(missingCore)}.`;
  }
  return { level, title: VERDICT_TITLE[level], text: `${text} Verbindlich wird die Bewertung erst nach technischer Prüfung durch 3D-WINDT.` };
}

/* ---------------------------------------------------------------- entry */

export function evaluatePrintCheck(g: PrintCheckGeometry, material: PrintCheckMaterial): PrintCheckReport {
  const findings: Finding[] = [
    ...meshFindings(g),
    sizeFinding(g),
    wallFinding(g),
    ...featureFindings(g, g.area),
    overhangFinding(g, material),
    ...orientationFindings(g),
    ...holeFindings(g, material),
    ...stressFindings(g, material),
    materialFinding(g, material),
  ];
  const counts: Record<FindingStatus, number> = { ok: 0, hint: 0, critical: 0, 'not-checked': 0 };
  for (const finding of findings) counts[finding.status] += 1;

  const o = g.orientation;
  const fit = g.fit;
  const orientationRows: OrientationRow[] = o
    ? o.poses.map((pose) => ({
        poseId: pose.poseId,
        label: pose.label,
        recommended: pose.poseId === o.recommendedId,
        height: pose.height,
        supportShare: pose.supportShare,
        criticalShare: pose.criticalShare,
        bedContact: pose.bedContact,
        supportVolumeUpper: pose.supportVolumeUpper,
        score: pose.score,
        fits: fit?.fittingPoses.includes(pose.poseId) ? 'axis' : fit?.diagonalPoses.includes(pose.poseId) ? 'diagonal' : 'no',
      }))
    : [];

  return {
    verdict: verdict(findings),
    findings,
    counts,
    recommendedPose: o ? { id: o.recommendedId, label: o.poses[o.recommendedId].label, reasons: orientationReasons(g) } : null,
    orientationRows,
    wallHistogram: g.walls ? { bins: g.walls.bins, binWidth: g.walls.binWidth } : null,
    toleranceRows: toleranceRows(g, material),
    material,
    showRedesignCta: findings.some(
      (finding) => (finding.status === 'critical' || finding.status === 'hint') && IMPACT_RANK[finding.impact] >= IMPACT_RANK.redesign,
    ),
    resolutionMm: g.voxel ? g.voxel.h : null,
  };
}

/** Flag names that a highlight can show (for tests and the legend). */
export function highlightFlagNames(id: HighlightId): TriFlagName[] {
  const mask = HIGHLIGHTS[id].layers.reduce((sum, layer) => sum | layer.mask, 0);
  return (Object.keys(TRI_FLAG) as TriFlagName[]).filter((name) => (TRI_FLAG[name] & mask) !== 0);
}

