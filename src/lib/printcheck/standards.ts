/*
 * Reference data and thresholds of the printability check.
 *
 * Ported from FDM-INSPECT `standards.js` (Extrutex/FDM-INSPECT). Every value
 * carries a basis, because mixing normative values with shop-floor experience
 * is how inspection reports lose their credibility:
 *
 *   "norm"      verbatim from the cited standard
 *   "derived"   calculated from a standard or process geometry
 *   "practice"  empirical value from FDM practice, no standard behind it
 *
 * All thresholds the report shows to customers live in PRINTCHECK_RULES so the
 * owner can review them in one place.
 */

import { PRICING_CONFIG } from '../quote/pricingConfig';

export type Basis = 'norm' | 'derived' | 'practice';

/* ------------------------------------------------ DIN ISO 2768-1 (linear) */

export type IsoClass = 'f' | 'm' | 'c' | 'v';

interface IsoRange {
  from: number;
  to: number;
  f: number;
  m: number;
  c: number;
  v: number | null;
}

/** DIN ISO 2768-1, general tolerances for linear dimensions, ± mm ("over from, up to and including to"). */
export const ISO2768_LINEAR: { source: string; ranges: readonly IsoRange[]; labels: Readonly<Record<IsoClass, string>> } = {
  source: 'DIN ISO 2768-1',
  ranges: [
    { from: 0.5, to: 3, f: 0.05, m: 0.1, c: 0.2, v: null },
    { from: 3, to: 6, f: 0.05, m: 0.1, c: 0.3, v: 0.5 },
    { from: 6, to: 30, f: 0.1, m: 0.2, c: 0.5, v: 1.0 },
    { from: 30, to: 120, f: 0.15, m: 0.3, c: 0.8, v: 1.5 },
    { from: 120, to: 400, f: 0.2, m: 0.5, c: 1.2, v: 2.5 },
    { from: 400, to: 1000, f: 0.3, m: 0.8, c: 2.0, v: 4.0 },
  ],
  labels: { f: 'f (fein)', m: 'm (mittel)', c: 'c (grob)', v: 'v (sehr grob)' },
};

/** ± tolerance for a nominal size, or null outside the table (then the drawing must state a tolerance). */
export function isoTolerance(nominal: number, cls: IsoClass): number | null {
  for (const range of ISO2768_LINEAR.ranges) {
    if (nominal > range.from && nominal <= range.to) {
      return range[cls];
    }
  }
  return null;
}

/** Finest ISO 2768-1 class whose tolerance covers the expected deviation, or null. */
export function achievableIsoClass(nominal: number, expectedDeviation: number): IsoClass | null {
  const order: IsoClass[] = ['f', 'm', 'c', 'v'];
  for (const cls of order) {
    const tolerance = isoTolerance(nominal, cls);
    if (tolerance !== null && expectedDeviation <= tolerance) {
      return cls;
    }
  }
  return null;
}

/* ------------------------------------------------------ overhang classes */

export type OverhangClassKey = 'upright' | 'safe' | 'marginal' | 'critical' | 'ceiling';

export interface OverhangClass {
  key: OverhangClassKey;
  from: number;
  to: number;
  label: string;
}

/** Angle from the vertical: 0° = upright wall, 90° = horizontal ceiling (FDM-INSPECT convention). */
export const OVERHANG_CLASSES: readonly OverhangClass[] = [
  { key: 'upright', from: 0, to: 30, label: 'Aufrecht / Oberseite' },
  { key: 'safe', from: 30, to: 45, label: 'Selbsttragend' },
  { key: 'marginal', from: 45, to: 60, label: 'Grenzwertig' },
  { key: 'critical', from: 60, to: 80, label: 'Kritisch' },
  { key: 'ceiling', from: 80, to: 90.01, label: 'Decke / Brücke' },
];

export function classifyOverhang(angleDeg: number): OverhangClass {
  for (const cls of OVERHANG_CLASSES) {
    if (angleDeg >= cls.from && angleDeg < cls.to) {
      return cls;
    }
  }
  return OVERHANG_CLASSES[OVERHANG_CLASSES.length - 1];
}

/* ------------------------------------------------------ process + rules */

/** Process the check assumes (3D-WINDT fleet, Voron 2.4 with heated chamber). */
export const PROCESS = {
  nozzleMm: 0.4,
  layerHeightMm: 0.2,
  /** Heated build chamber available. */
  chamber: true,
  buildVolumeMm: PRICING_CONFIG.buildVolumeMm,
} as const;

interface Rule {
  value: number;
  basis: Basis;
}

/**
 * Customer-facing thresholds. Review these with the owner before changing
 * wording; tests pin the behaviour on synthetic parts.
 */
export const PRINTCHECK_RULES = {
  /** One extrusion width: thinner regions are dropped by the slicer. */
  wallCriticalMm: { value: PROCESS.nozzleMm * 1, basis: 'derived' } as Rule,
  /** Two extrusion widths: closed, load-bearing wall. */
  wallRecommendedMm: { value: PROCESS.nozzleMm * 2, basis: 'derived' } as Rule,
  /** Share of wall volume below the critical limit that makes the finding critical (FDM-INSPECT). */
  wallCriticalSharePct: { value: 1, basis: 'practice' } as Rule,
  /** Share of wall volume below the recommended limit that makes it a hint (FDM-INSPECT). */
  wallHintSharePct: { value: 3, basis: 'practice' } as Rule,
  /** Share below one extrusion width from which FDM is the wrong process. */
  wallUnsuitableSharePct: { value: 20, basis: 'practice' } as Rule,
  /** Gaps/slots narrower than this fuse during printing. */
  gapCriticalMm: { value: 0.4, basis: 'practice' } as Rule,
  /** Gaps narrower than this shrink noticeably (clearance fits need rework). */
  gapHintMm: { value: 0.8, basis: 'practice' } as Rule,
  /** Holes below this diameter: print undersized, drill/ream afterwards. */
  smallHoleMm: { value: 3, basis: 'practice' } as Rule,
  /** Horizontal holes from this diameter sag at the top without teardrop shape or support. */
  horizontalHoleTeardropMm: { value: 6, basis: 'practice' } as Rule,
  /** Self-supporting overhang limit (support threshold). */
  overhangSupportDeg: { value: 45, basis: 'practice' } as Rule,
  /** Surface defects expected beyond this overhang angle. */
  overhangCriticalDeg: { value: 60, basis: 'practice' } as Rule,
  /** Critical overhang share (> 60°, best pose) below which no support is needed. */
  overhangNoneSharePct: { value: 0.5, basis: 'practice' } as Rule,
  /** Critical overhang share from which the part is uneconomic in its best pose (FDM-INSPECT). */
  overhangHighSharePct: { value: 20, basis: 'practice' } as Rule,
  /** Free spans above this length sag visibly (bridging). */
  bridgeMaxMm: { value: 50, basis: 'practice' } as Rule,
  /** Bed contact below this area raises the risk of detachment. */
  firstLayerMinMm2: { value: 300, basis: 'practice' } as Rule,
  /** Height / base width of the whole part from which ringing and wobble start. */
  aspectHint: { value: 8, basis: 'practice' } as Rule,
  /** Free-standing features thinner than this (equivalent diameter) are checked for slenderness. */
  slenderFeatureMaxDiameterMm: { value: 3, basis: 'practice' } as Rule,
  /** Height / diameter of a free-standing feature from which it wobbles. */
  slenderFeatureRatio: { value: 8, basis: 'practice' } as Rule,
  /** Concave edges turning more than this are reported as sharp inner corners. */
  sharpInnerEdgeDeg: { value: 60, basis: 'practice' } as Rule,
  /** Recommended inner radius instead of a sharp inner corner. */
  innerRadiusMm: { value: 1, basis: 'practice' } as Rule,
  /** Process capability stated by 3D-WINDT for general dimensions (owner value). */
  generalToleranceMm: { value: 0.2, basis: 'practice' } as Rule,
  /** Machine repeatability used for the expected deviation (FDM-INSPECT). */
  repeatabilityMm: { value: 0.1, basis: 'practice' } as Rule,
  /** Vertical holes print this much undersized (FDM-INSPECT holeShrink). */
  holeShrinkMm: { value: 0.2, basis: 'practice' } as Rule,
  /** Z strength relative to the strength along the extrusion path. */
  anisotropyZ: { value: 0.45, basis: 'practice' } as Rule,
  /** Parts whose largest dimension is below this are probably exported in the wrong unit. */
  unitTinyMm: { value: 3, basis: 'practice' } as Rule,
  /** Parts whose largest dimension exceeds this are probably exported in the wrong unit. */
  unitHugeMm: { value: 2000, basis: 'practice' } as Rule,
  /** Shells smaller than this volume are export splinters. */
  splinterVolumeMm3: { value: 1, basis: 'practice' } as Rule,
  /** Typical support density: gross support space × this = printed support volume. */
  supportDensity: { value: 0.15, basis: 'practice' } as Rule,
} as const;

/* -------------------------------------------------- material process traits */

export interface MaterialProcessTraits {
  /** Free linear shrinkage (fraction). */
  shrink: number;
  /** Relative warp tendency (1 = PLA). */
  warp: number;
  /** Needs a heated chamber for large parts. */
  chamber: boolean;
  /** Flexible material (fine features, bridges and holes are harder). */
  flexible: boolean;
  /** Fibre-filled (hardened nozzle, rougher surface, lower detail). */
  fibre: boolean;
  /** Short German process note. */
  note: string;
  basis: Basis;
}

/*
 * Keyed by polymer as used in the material database / price groups. Values
 * for PLA, PETG, ABS, ASA, PC, TPU and PA12-CF (used here for PA6-CF) are
 * FDM-INSPECT's practice values; the others are practice values added here
 * and must be reviewed by the owner (see report). A polymer missing from this
 * table is reported as "nicht bewertet", never judged with a default.
 */
export const MATERIAL_TRAITS: Readonly<Record<string, MaterialProcessTraits>> = {
  PLA: { shrink: 0.003, warp: 1, chamber: false, flexible: false, fibre: false, basis: 'practice',
    note: 'Geringster Verzug, höchste Maßtreue, aber niedrige Wärmeformbeständigkeit.' },
  PETG: { shrink: 0.004, warp: 2, chamber: false, flexible: false, fibre: false, basis: 'practice',
    note: 'Zäh mit guter Schichthaftung, neigt zu Fädenbildung an feinen Details.' },
  PCTG: { shrink: 0.004, warp: 2, chamber: false, flexible: false, fibre: false, basis: 'practice',
    note: 'Copolyester wie PETG, zäher; ähnliches Verzugsverhalten.' },
  ABS: { shrink: 0.008, warp: 4, chamber: true, flexible: false, fibre: false, basis: 'practice',
    note: 'Verzugskritisch; große Grundflächen nur mit beheizter Kammer prozesssicher.' },
  ASA: { shrink: 0.007, warp: 4, chamber: true, flexible: false, fibre: false, basis: 'practice',
    note: 'Wie ABS, zusätzlich UV-beständig; beheizte Kammer erforderlich.' },
  HIPS: { shrink: 0.006, warp: 3, chamber: true, flexible: false, fibre: false, basis: 'practice',
    note: 'Styrolbasiert wie ABS, etwas geringerer Verzug.' },
  PC: { shrink: 0.007, warp: 5, chamber: true, flexible: false, fibre: false, basis: 'practice',
    note: 'Hohe Festigkeit und Wärmeformbeständigkeit, stark verzugsanfällig.' },
  'PC-ABS': { shrink: 0.006, warp: 4, chamber: true, flexible: false, fibre: false, basis: 'practice',
    note: 'Blend aus PC und ABS, verzugsanfällig; beheizte Kammer erforderlich.' },
  PA: { shrink: 0.012, warp: 4, chamber: true, flexible: false, fibre: false, basis: 'practice',
    note: 'Ungefülltes Polyamid schwindet stark und ist hygroskopisch; vor dem Druck trocknen.' },
  'PA6-CF': { shrink: 0.004, warp: 2, chamber: true, flexible: false, fibre: true, basis: 'practice',
    note: 'Faserverstärkt und hygroskopisch; feine Details und dünne Wände sind begrenzt.' },
  'PET-CF': { shrink: 0.003, warp: 1.5, chamber: false, flexible: false, fibre: true, basis: 'practice',
    note: 'Faserverstärkt, sehr maßhaltig; feine Details und dünne Wände sind begrenzt.' },
  TPU: { shrink: 0.006, warp: 1, chamber: false, flexible: true, fibre: false, basis: 'practice',
    note: 'Elastisch; feine Details, Brücken und kleine Bohrungen sind deutlich schwieriger.' },
};

/** Minimum wall recommended for flexible materials (thin TPU walls buckle and string). */
export const FLEXIBLE_MIN_WALL_MM = 1.2;
/** Minimum wall recommended for fibre-filled materials (fibres need room across the bead). */
export const FIBRE_MIN_WALL_MM = 1.2;
