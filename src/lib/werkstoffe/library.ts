import materialDatabase from '../../data/fdm-inspect-materials.json';
import {
  resolveProperties,
  type LibraryField,
  type ResolvedValue,
  type WithheldValue,
} from './datasheetValues';
import { WERKSTOFF_FAMILIES, type WerkstoffFamilyMeta } from './families';

/*
 * Data layer of the material library pages. Reads the vendored FDM-INSPECT
 * database (src/data/fdm-inspect-materials.json) and exposes, per product,
 * the reviewed datasheet values (datasheetValues.ts) together with the
 * datasheet source (URL, retrieval date, SHA-256).
 *
 * Nothing here estimates or derives numbers. A comparison cell without a
 * database value says so ("keine Herstellerangabe").
 */

export interface LibraryDbProperty {
  value: number | null;
  min: number | null;
  max: number | null;
  unit: string | null;
  standard: string | null;
  source_text: string | null;
  notes: string[] | null;
  suspect?: boolean;
}

export interface LibraryDbMaterial {
  id: string;
  manufacturer: string;
  product: string;
  polymer: string;
  source: {
    url: string;
    origin: string;
    mirror_note: string | null;
    retrieved: string;
    sha256: string;
  };
  properties: Record<string, LibraryDbProperty | undefined>;
  flags: Array<{ field: string; reason?: string }> | null;
}

export interface LibraryDatabase {
  schema_version: string;
  generated: string;
  disclaimer: string;
  materials: LibraryDbMaterial[];
}

export interface LibraryProduct {
  id: string;
  manufacturer: string;
  product: string;
  /** "Manufacturer Product" */
  name: string;
  polymer: string;
  familySlug: string;
  datasheetUrl: string;
  /** Datasheet hosted by a retailer instead of the manufacturer. */
  datasheetIsMirror: boolean;
  mirrorNote: string | null;
  /** ISO date (YYYY-MM-DD) the datasheet was retrieved. */
  retrieved: string;
  sha256: string;
  values: ResolvedValue[];
  withheld: WithheldValue[];
}

export class MaterialLibraryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MaterialLibraryError';
  }
}

export const SUPPORTED_LIBRARY_SCHEMA = '1.0';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function formatGermanDate(isoDate: string): string {
  if (!ISO_DATE.test(isoDate)) {
    throw new MaterialLibraryError(`Invalid ISO date "${isoDate}".`);
  }
  const [year, month, day] = isoDate.split('-');
  return `${day}.${month}.${year}`;
}

export function buildLibraryProducts(
  database: LibraryDatabase,
  families: readonly WerkstoffFamilyMeta[],
): LibraryProduct[] {
  if (database.schema_version !== SUPPORTED_LIBRARY_SCHEMA) {
    throw new MaterialLibraryError(
      `Unsupported material database schema "${database.schema_version}" (expected "${SUPPORTED_LIBRARY_SCHEMA}").`,
    );
  }
  const products: LibraryProduct[] = [];
  for (const family of families) {
    for (const productId of family.productIds) {
      const material = database.materials.find((entry) => entry.id === productId);
      if (!material) {
        throw new MaterialLibraryError(`Family "${family.slug}" references unknown product "${productId}".`);
      }
      if (!material.source.url.startsWith('https://')) {
        throw new MaterialLibraryError(`Product "${material.id}" has no https datasheet URL.`);
      }
      formatGermanDate(material.source.retrieved);
      const resolved = resolveProperties(material);
      products.push({
        id: material.id,
        manufacturer: material.manufacturer,
        product: material.product,
        name: `${material.manufacturer} ${material.product}`,
        polymer: material.polymer,
        familySlug: family.slug,
        datasheetUrl: material.source.url,
        datasheetIsMirror: material.source.origin !== 'official',
        mirrorNote: material.source.mirror_note,
        retrieved: material.source.retrieved,
        sha256: material.source.sha256,
        values: resolved.values,
        withheld: resolved.withheld,
      });
    }
  }
  return products;
}

/* ------------------------------------------------ comparison table */

export interface ComparisonColumn {
  id: string;
  label: string;
  /** Candidate fields; the first is the column's primary property. */
  fields: readonly LibraryField[];
  /** Show every present candidate (e.g. HDT A and B) instead of the first. */
  showAll: boolean;
  /** Short German caption for secondary fields shown in this column. */
  secondaryCaption: Partial<Record<LibraryField, string>>;
}

export const COMPARISON_COLUMNS: readonly ComparisonColumn[] = [
  { id: 'density', label: 'Dichte', fields: ['density'], showAll: false, secondaryCaption: {} },
  {
    id: 'strength',
    label: 'Zugfestigkeit',
    fields: ['tensile_strength', 'tensile_yield', 'tensile_strength_break'],
    showAll: false,
    secondaryCaption: { tensile_yield: 'Streckspannung', tensile_strength_break: 'Bruchspannung' },
  },
  {
    id: 'modulus',
    label: 'E-Modul',
    fields: ['tensile_modulus', 'flexural_modulus'],
    showAll: false,
    secondaryCaption: { flexural_modulus: 'Biege-E-Modul' },
  },
  { id: 'elongation', label: 'Bruchdehnung', fields: ['elongation_at_break'], showAll: false, secondaryCaption: {} },
  {
    id: 'hdt',
    label: 'Wärmeformbeständigkeit HDT',
    fields: ['hdt_a', 'hdt_b', 'hdt_unspecified'],
    showAll: true,
    secondaryCaption: { hdt_a: 'HDT/A', hdt_b: 'HDT/B', hdt_unspecified: 'Prüflast nicht angegeben' },
  },
  { id: 'vicat', label: 'Vicat', fields: ['vicat'], showAll: false, secondaryCaption: {} },
];

export type ComparisonCell =
  | { kind: 'values'; entries: Array<{ value: ResolvedValue; caption: string | null }> }
  | { kind: 'withheld'; labels: string[] }
  | { kind: 'missing' };

export function comparisonCell(product: LibraryProduct, column: ComparisonColumn): ComparisonCell {
  const present = column.fields
    .map((field) => product.values.find((value) => value.field === field))
    .filter((value): value is ResolvedValue => value !== undefined);
  if (present.length > 0) {
    const chosen = column.showAll ? present : present.slice(0, 1);
    return {
      kind: 'values',
      entries: chosen.map((value) => ({
        value,
        caption:
          column.showAll || value.field !== column.fields[0]
            ? (column.secondaryCaption[value.field] ?? null)
            : null,
      })),
    };
  }
  // Withheld entries carry the database key, which equals the base field name.
  const columnFields = new Set<string>(column.fields);
  const withheld = product.withheld.filter((entry) => columnFields.has(entry.sourceField));
  if (withheld.length > 0) {
    return { kind: 'withheld', labels: withheld.map((entry) => entry.label) };
  }
  return { kind: 'missing' };
}

/* ------------------------------------------------ live data */

export const LIBRARY_DATABASE = materialDatabase as unknown as LibraryDatabase;

export const LIBRARY_PRODUCTS: readonly LibraryProduct[] = buildLibraryProducts(LIBRARY_DATABASE, WERKSTOFF_FAMILIES);

/** Disclaimer of the database (German), shown on every library page. */
export const LIBRARY_DISCLAIMER: string = LIBRARY_DATABASE.disclaimer;

export function productsForFamily(slug: string): LibraryProduct[] {
  return LIBRARY_PRODUCTS.filter((product) => product.familySlug === slug);
}
