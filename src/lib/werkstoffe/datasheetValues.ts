/*
 * Datasheet values of the FDM-INSPECT material database, resolved for display.
 *
 * The database is filled by a PDF parser (FDM-INSPECT tools/parse_tds.py).
 * Every value is kept exactly as parsed; this module never changes a number.
 * What it does:
 *
 * 1. Maps database property keys to display fields with German labels.
 * 2. Withholds values the database itself marks as suspect/flagged.
 * 3. Applies a manual review (FIELD_REVIEW) of the vendored database against
 *    the quoted datasheet text (`source_text`). A review can
 *    - withhold a value that was demonstrably mis-parsed (e.g. a test
 *      condition instead of the result),
 *    - reclassify a value to the property the datasheet actually names
 *      (e.g. Izod instead of Charpy, HDT load not stated), or
 *    - attach a note.
 *    Every review entry states its reason, which is shown on the page.
 *
 * Ranges (min and max present) are displayed as ranges: the parser's `value`
 * for a range is a computed midpoint and is never shown on its own.
 *
 * Shared by the material library pages and the calculator key facts
 * (quote/materials.ts), so both show the same, reviewed values.
 */

export type LibraryField =
  | 'density'
  | 'mfr'
  | 'tensile_strength'
  | 'tensile_yield'
  | 'tensile_strength_break'
  | 'tensile_modulus'
  | 'elongation_at_break'
  | 'flexural_strength'
  | 'flexural_modulus'
  | 'impact_charpy_notched'
  | 'impact_charpy_unnotched'
  | 'impact_izod_notched'
  | 'hdt_a'
  | 'hdt_b'
  | 'hdt_unspecified'
  | 'vicat'
  | 'glass_transition'
  | 'melting_temperature'
  | 'shrinkage'
  | 'moisture_absorption'
  | 'nozzle_temperature'
  | 'bed_temperature';

export type FieldGroup = 'mechanical' | 'thermal' | 'physical' | 'processing';

export interface FieldDefinition {
  label: string;
  group: FieldGroup;
}

export const FIELD_DEFINITIONS: Readonly<Record<LibraryField, FieldDefinition>> = {
  tensile_strength: { label: 'Zugfestigkeit', group: 'mechanical' },
  tensile_yield: { label: 'Streckspannung (Zugversuch)', group: 'mechanical' },
  tensile_strength_break: { label: 'Bruchspannung (Zugversuch)', group: 'mechanical' },
  tensile_modulus: { label: 'Zug-E-Modul', group: 'mechanical' },
  elongation_at_break: { label: 'Bruchdehnung', group: 'mechanical' },
  flexural_strength: { label: 'Biegefestigkeit', group: 'mechanical' },
  flexural_modulus: { label: 'Biege-E-Modul', group: 'mechanical' },
  impact_charpy_notched: { label: 'Charpy-Kerbschlagzähigkeit', group: 'mechanical' },
  impact_charpy_unnotched: { label: 'Charpy-Schlagzähigkeit (ungekerbt)', group: 'mechanical' },
  impact_izod_notched: { label: 'Izod-Kerbschlagzähigkeit', group: 'mechanical' },
  hdt_a: { label: 'Wärmeformbeständigkeit HDT/A (1,8 MPa)', group: 'thermal' },
  hdt_b: { label: 'Wärmeformbeständigkeit HDT/B (0,45 MPa)', group: 'thermal' },
  hdt_unspecified: { label: 'Wärmeformbeständigkeit HDT (Prüflast nicht angegeben)', group: 'thermal' },
  vicat: { label: 'Vicat-Erweichungstemperatur', group: 'thermal' },
  glass_transition: { label: 'Glasübergangstemperatur', group: 'thermal' },
  melting_temperature: { label: 'Schmelztemperatur', group: 'thermal' },
  density: { label: 'Dichte', group: 'physical' },
  mfr: { label: 'Schmelze-Massefließrate (MFR)', group: 'physical' },
  shrinkage: { label: 'Schwindung', group: 'physical' },
  moisture_absorption: { label: 'Feuchteaufnahme', group: 'physical' },
  nozzle_temperature: { label: 'Düsentemperatur', group: 'processing' },
  bed_temperature: { label: 'Druckbetttemperatur', group: 'processing' },
};

export const FIELD_GROUP_LABEL: Readonly<Record<FieldGroup, string>> = {
  mechanical: 'Mechanische Kennwerte',
  thermal: 'Thermische Kennwerte',
  physical: 'Physikalische Kennwerte',
  processing: 'Verarbeitung laut Hersteller',
};

export const FIELD_GROUP_ORDER: readonly FieldGroup[] = ['mechanical', 'thermal', 'physical', 'processing'];

/** Database property key -> display field (before review). */
export const DB_FIELD_MAP: Readonly<Record<string, LibraryField>> = {
  density: 'density',
  mfr: 'mfr',
  tensile_strength: 'tensile_strength',
  tensile_strength_break: 'tensile_strength_break',
  tensile_modulus: 'tensile_modulus',
  elongation_at_break: 'elongation_at_break',
  flexural_strength: 'flexural_strength',
  flexural_modulus: 'flexural_modulus',
  impact_charpy_notched: 'impact_charpy_notched',
  impact_charpy_unnotched: 'impact_charpy_unnotched',
  hdt_a: 'hdt_a',
  hdt_b: 'hdt_b',
  vicat: 'vicat',
  glass_transition: 'glass_transition',
  melting_temperature: 'melting_temperature',
  shrinkage: 'shrinkage',
  moisture_absorption: 'moisture_absorption',
  nozzle_temperature: 'nozzle_temperature',
  bed_temperature: 'bed_temperature',
};

/** Database unit -> displayed unit. Units not listed here are rejected. */
export const UNIT_LABEL: Readonly<Record<string, string>> = {
  MPa: 'MPa',
  degC: '°C',
  'kJ/m2': 'kJ/m²',
  'g/cm3': 'g/cm³',
  '%': '%',
  'g/10min': 'g/10 min',
};

export type ReviewAction =
  | { kind: 'withhold'; reason: string }
  | { kind: 'reclassify'; field: LibraryField; reason: string }
  | { kind: 'note'; note: string };

/** Date of the manual review below against the vendored database. */
export const FIELD_REVIEW_DATE = '2026-09-28';

const YIELD_REASON = 'Das Datenblatt bezeichnet den Wert als Streckspannung („Tensile … at Yield“), nicht als Zugfestigkeit.';
const HDT_LOAD_MISSING =
  'Das Datenblatt nennt die Prüfnorm, aber keine Prüflast; eine Zuordnung zu HDT/A oder HDT/B ist daher nicht belegt.';

/**
 * Manual review of the vendored database (see FIELD_REVIEW_DATE), keyed by
 * database material id and database property key. Re-check after every
 * `npm run materials:sync`; tests fail if an entry points to a missing value.
 */
export const FIELD_REVIEW: Readonly<Record<string, Readonly<Record<string, ReviewAction>>>> = {
  spectrum_pla_premium: {
    tensile_strength: { kind: 'reclassify', field: 'tensile_yield', reason: YIELD_REASON },
    hdt_a: { kind: 'reclassify', field: 'hdt_unspecified', reason: HDT_LOAD_MISSING },
  },
  spectrum_pla_tough: {
    hdt_a: { kind: 'reclassify', field: 'hdt_unspecified', reason: HDT_LOAD_MISSING },
  },
  spectrum_asa_275: {
    tensile_strength: { kind: 'reclassify', field: 'tensile_yield', reason: YIELD_REASON },
    hdt_a: { kind: 'reclassify', field: 'hdt_unspecified', reason: HDT_LOAD_MISSING },
    vicat: {
      kind: 'withhold',
      reason:
        'Die maschinelle Auslesung hat eine Zahl aus der Prüfbedingung (Heizrate) statt des Messwerts übernommen. Den Messwert entnehmen Sie bitte dem Datenblatt-Auszug.',
    },
    elongation_at_break: { kind: 'note', note: 'Das Datenblatt kennzeichnet den Wert als Mindestwert („Min“).' },
  },
  spectrum_abs_gp450: {
    impact_charpy_notched: {
      kind: 'reclassify',
      field: 'impact_izod_notched',
      reason: 'Das Datenblatt nennt eine Izod-Prüfung (ISO 180), keine Charpy-Prüfung.',
    },
  },
  spectrum_pctg: {
    tensile_strength: { kind: 'reclassify', field: 'tensile_yield', reason: YIELD_REASON },
    vicat: { kind: 'note', note: 'Das Datenblatt nennt als Methode „DSC“, keine Vicat-Prüfnorm.' },
  },
  spectrum_pa6_lowwarp_cf15: {
    moisture_absorption: {
      kind: 'withhold',
      reason:
        'Die maschinelle Auslesung hat die relative Luftfeuchte der Prüfbedingung statt der Feuchteaufnahme übernommen. Den Messwert entnehmen Sie bitte dem Datenblatt-Auszug.',
    },
    impact_charpy_notched: {
      kind: 'note',
      note: 'Das Datenblatt nennt für den gekerbten Wert dieselbe Norm-Kurzbezeichnung wie für den ungekerbten (ISO 179/1eU); übernommen wie angegeben.',
    },
  },
  spectrum_hips_x: {
    hdt_a: {
      kind: 'reclassify',
      field: 'hdt_b',
      reason: 'Das Datenblatt nennt das Verfahren ISO 75-2/B, also die Prüflast von HDT/B.',
    },
  },
  basf_pa: {
    flexural_strength: {
      kind: 'note',
      note: 'Das Datenblatt sieht mehrere Spalten (Prüfrichtungen) vor, belegt ist nur eine. Zuordnung siehe Originaldatenblatt.',
    },
    flexural_modulus: {
      kind: 'note',
      note: 'Das Datenblatt sieht mehrere Spalten (Prüfrichtungen) vor, belegt ist nur eine. Zuordnung siehe Originaldatenblatt.',
    },
    vicat: { kind: 'note', note: 'Das Datenblatt nennt eine Prüfkraft von 50 N (Verfahren B).' },
  },
  basf_tpu95a: {
    vicat: {
      kind: 'withhold',
      reason:
        'Das Datenblatt nennt eine Obergrenze („kleiner als“), keinen Messwert. Ein Einzelwert wäre irreführend.',
    },
    impact_charpy_notched: {
      kind: 'withhold',
      reason:
        'Das Datenblatt nennt je Prüfrichtung „No break“ (kein Bruch) bzw. einen Zahlenwert. Ein Einzelwert wäre irreführend.',
    },
  },
  extrudr_pla_nx2: {
    vicat: {
      kind: 'note',
      note: 'Das Datenblatt nennt das Verfahren VICAT A und versieht den Wert mit einer Fußnote (*).',
    },
  },
};

/** Minimal database shapes this module needs (see library.ts for the full schema). */
export interface DbPropertyCore {
  value: number | null;
  min: number | null;
  max: number | null;
  unit: string | null;
  standard: string | null;
  suspect?: boolean;
  source_text?: string | null;
  notes?: readonly string[] | null;
}

export interface DbMaterialCore {
  id: string;
  properties: Readonly<Record<string, DbPropertyCore | undefined>>;
  flags: ReadonlyArray<{ field: string }> | null;
}

export interface ValueNote {
  text: string;
  /** 'database': note text from the database; 'review': written in FIELD_REVIEW or this module. */
  origin: 'database' | 'review';
}

export interface ResolvedValue {
  /** Display field after review. */
  field: LibraryField;
  /** Original database property key. */
  sourceField: string;
  label: string;
  group: FieldGroup;
  /** Formatted value incl. unit, e.g. "1,24 g/cm³" or "185–215 °C". */
  display: string;
  unitLabel: string;
  standard: string | null;
  sourceText: string | null;
  /** Review notes/reasons and database notes (e.g. unit conversions). */
  notes: ValueNote[];
  property: DbPropertyCore;
}

export interface WithheldValue {
  sourceField: string;
  label: string;
  reason: string;
  sourceText: string | null;
}

export interface ResolvedProperties {
  values: ResolvedValue[];
  withheld: WithheldValue[];
  /** Database keys without a display mapping (tests keep this empty). */
  unmapped: string[];
}

export class DatasheetValueError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DatasheetValueError';
  }
}

const numberFormat = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 3 });

export function formatNumber(value: number): string {
  return numberFormat.format(value);
}

export function unitLabelFor(unit: string | null): string {
  if (!unit) {
    throw new DatasheetValueError('Datasheet value without unit.');
  }
  const label = UNIT_LABEL[unit];
  if (!label) {
    throw new DatasheetValueError(`Unsupported datasheet unit "${unit}".`);
  }
  return label;
}

export function hasDisplayableValue(property: DbPropertyCore): boolean {
  return property.value !== null || (property.min !== null && property.max !== null);
}

/** Formats a database value with unit; ranges are shown as ranges. */
export function formatDatasheetValue(property: DbPropertyCore): string {
  const unit = unitLabelFor(property.unit);
  if (property.min !== null && property.max !== null) {
    return `${formatNumber(property.min)}–${formatNumber(property.max)} ${unit}`;
  }
  if (property.value === null) {
    throw new DatasheetValueError('Datasheet value is empty.');
  }
  return `${formatNumber(property.value)} ${unit}`;
}

const MULTI_VALUE_NOTE_PREFIX = 'weitere Angaben in derselben Zeile';
const MULTI_VALUE_HINT =
  'Das Datenblatt nennt in derselben Zeile weitere Angaben (z. B. andere Prüfrichtung). Siehe Datenblatt-Auszug.';
const FLAGGED_REASON =
  'Die Plausibilitätsprüfung der Materialdatenbank hat den Wert als unplausibel markiert (vermutlich Einheitenfehler im Datenblatt). Er wird nicht angezeigt und nicht korrigiert.';

/*
 * Parser notes "weitere Angaben in derselben Zeile: ..." list numbers from
 * neighbouring columns, which are sometimes unrelated (storage temperature,
 * norm part numbers). They are replaced by a neutral hint; the full line is
 * available as datasheet quote (source_text).
 */
function databaseNotes(property: DbPropertyCore): ValueNote[] {
  const notes: ValueNote[] = [];
  let multiValue = false;
  for (const note of property.notes ?? []) {
    if (note.startsWith(MULTI_VALUE_NOTE_PREFIX)) {
      multiValue = true;
    } else {
      notes.push({ text: note, origin: 'database' });
    }
  }
  if (multiValue) notes.push({ text: MULTI_VALUE_HINT, origin: 'review' });
  return notes;
}

export function reviewFor(materialId: string, sourceField: string): ReviewAction | null {
  return FIELD_REVIEW[materialId]?.[sourceField] ?? null;
}

/** Applies database flags and the manual review to one material. */
export function resolveProperties(material: DbMaterialCore): ResolvedProperties {
  const values: ResolvedValue[] = [];
  const withheld: WithheldValue[] = [];
  const unmapped: string[] = [];
  const flagged = new Set((material.flags ?? []).map((flag) => flag.field));

  for (const [sourceField, property] of Object.entries(material.properties)) {
    if (!property) continue;
    const baseField = DB_FIELD_MAP[sourceField];
    if (!baseField) {
      unmapped.push(sourceField);
      continue;
    }
    if (!hasDisplayableValue(property)) continue;

    const review = reviewFor(material.id, sourceField);
    const sourceText = property.source_text ?? null;
    if (property.suspect || flagged.has(sourceField)) {
      withheld.push({ sourceField, label: FIELD_DEFINITIONS[baseField].label, reason: FLAGGED_REASON, sourceText });
      continue;
    }
    if (review?.kind === 'withhold') {
      withheld.push({ sourceField, label: FIELD_DEFINITIONS[baseField].label, reason: review.reason, sourceText });
      continue;
    }

    const field = review?.kind === 'reclassify' ? review.field : baseField;
    const notes = databaseNotes(property);
    if (review?.kind === 'reclassify') notes.unshift({ text: review.reason, origin: 'review' });
    if (review?.kind === 'note') notes.unshift({ text: review.note, origin: 'review' });

    values.push({
      field,
      sourceField,
      label: FIELD_DEFINITIONS[field].label,
      group: FIELD_DEFINITIONS[field].group,
      display: formatDatasheetValue(property),
      unitLabel: unitLabelFor(property.unit),
      standard: property.standard,
      sourceText,
      notes,
      property,
    });
  }

  const fieldOrder = Object.keys(FIELD_DEFINITIONS) as LibraryField[];
  values.sort((a, b) => fieldOrder.indexOf(a.field) - fieldOrder.indexOf(b.field));
  return { values, withheld, unmapped };
}
