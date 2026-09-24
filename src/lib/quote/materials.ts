import materialDatabase from '../../data/fdm-inspect-materials.json';

/*
 * Material catalog for the price estimator.
 *
 * Two sources, deliberately kept apart:
 *
 * 1. FDM-INSPECT material database (src/data/fdm-inspect-materials.json,
 *    vendored via `npm run materials:sync`). Manufacturer products with
 *    datasheet values (density, tensile strength, HDT, ...), each with test
 *    standard and source URL. Missing values are null and are never estimated
 *    here. The database contains no prices.
 *
 * 2. 3D-WINDT price groups (PRICE_GROUPS): charged €/kg per polymer group and
 *    a generic group density. Copied from the druckwerk price calculator, SSoT
 *    repo `Extrutex/3DW-3dprint-preisrechner-`, `assets/quote.js` (MATERIALS,
 *    verified identical on 2026-09-24), which mirrors
 *    `Materialtabelle_3DWindt.xlsx`. Charged €/kg include handling and waste.
 *
 * A database product is priced via the explicit POLYMER_PRICE_GROUP mapping.
 * Its density comes from the datasheet; only where the datasheet has none (or
 * the value is flagged as implausible) the group density is used, and the
 * entry says so (densitySource = 'price-group'). Polymers without a mapping
 * are excluded rather than priced with a guess.
 *
 * The catalog is injected into the pricing functions, so another source can
 * replace MATERIAL_CATALOG without touching the pricing code.
 */

export interface PriceGroup {
  id: string;
  /** Polymer name as used in the FDM-INSPECT database. */
  polymer: string;
  name: string;
  category: string;
  densityGPerCm3: number;
  pricePerKgEur: number;
  properties: string;
}

export const PRICE_GROUPS: readonly PriceGroup[] = [
  { id: 'pla', polymer: 'PLA', name: 'PLA', category: 'Standard', densityGPerCm3: 1.24, pricePerKgEur: 39, properties: 'Steif, maßhaltig – ideal für Anschauungsmodelle und Lehren' },
  { id: 'petg', polymer: 'PETG', name: 'PETG', category: 'Standard-Tech', densityGPerCm3: 1.27, pricePerKgEur: 42, properties: 'Zäher Allrounder, witterungsbeständig' },
  { id: 'abs', polymer: 'ABS', name: 'ABS', category: 'Technisch', densityGPerCm3: 1.04, pricePerKgEur: 49, properties: 'Schlagfest, hitzebeständig, gut nachbearbeitbar' },
  { id: 'asa', polymer: 'ASA', name: 'ASA', category: 'Technisch', densityGPerCm3: 1.07, pricePerKgEur: 55, properties: 'Wie ABS, zusätzlich UV- und witterungsbeständig' },
  { id: 'tpu', polymer: 'TPU', name: 'TPU', category: 'Spezial', densityGPerCm3: 1.21, pricePerKgEur: 69, properties: 'Elastisch, gummiartig, abriebfest' },
  { id: 'pa', polymer: 'PA', name: 'PA (Nylon)', category: 'Engineering', densityGPerCm3: 1.14, pricePerKgEur: 89, properties: 'Sehr zäh, abriebfest, geringe Reibung' },
  { id: 'pc', polymer: 'PC', name: 'PC (Polycarbonat)', category: 'Engineering', densityGPerCm3: 1.2, pricePerKgEur: 89, properties: 'Sehr schlagfest, hohe Temperaturbeständigkeit' },
  { id: 'petcf', polymer: 'PET-CF', name: 'PET-CF', category: 'Faserverstärkt', densityGPerCm3: 1.29, pricePerKgEur: 119, properties: 'Carbonfaserverstärkt: sehr steif, leicht, maßhaltig' },
];

/**
 * Database polymer -> price group. Entries that are not the identical polymer
 * are a pricing decision (same price tier), not a material equivalence.
 */
export const POLYMER_PRICE_GROUP: Readonly<Record<string, string>> = {
  PLA: 'pla',
  PETG: 'petg',
  PCTG: 'petg', // copolyester, PETG price tier
  ABS: 'abs',
  HIPS: 'abs', // styrenic, ABS price tier
  ASA: 'asa',
  TPU: 'tpu',
  PA: 'pa',
  PC: 'pc',
  'PC-ABS': 'pc',
  'PA6-CF': 'petcf', // fibre-reinforced price tier
  'PET-CF': 'petcf',
};

export interface MaterialSpec {
  id: string;
  /** Display name, e.g. "Spectrum Filaments PLA Premium" or "PETG". */
  name: string;
  origin: 'datasheet' | 'price-group';
  polymer: string;
  manufacturer: string | null;
  category: string;
  /** g/cm³ */
  densityGPerCm3: number;
  densitySource: 'datasheet' | 'price-group';
  /** Charged price per kg, EUR net. */
  pricePerKgEur: number;
  priceGroupId: string;
  priceGroupName: string;
  datasheetUrl: string | null;
  /** Retailer-hosted copy of the manufacturer datasheet. */
  datasheetIsMirror: boolean;
  /** Formatted, sourced key values (German), never estimated. */
  keyFacts: string[];
  /** Short German description (price groups only). */
  description: string | null;
}

export type MaterialCatalog = readonly MaterialSpec[];

export class MaterialCatalogError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MaterialCatalogError';
  }
}

/* ------------------------------------------------ database adapter */

interface DbProperty {
  value: number | null;
  min: number | null;
  max: number | null;
  unit: string | null;
  standard: string | null;
  suspect?: boolean;
}

interface DbMaterial {
  id: string;
  manufacturer: string;
  product: string;
  polymer: string;
  source: { url: string; origin: string };
  properties: Record<string, DbProperty | undefined>;
  flags: Array<{ field: string }> | null;
}

export interface MaterialDatabase {
  schema_version: string;
  materials: DbMaterial[];
}

export const SUPPORTED_MATERIAL_SCHEMA = '1.0';

const UNIT_LABEL: Readonly<Record<string, string>> = {
  MPa: 'MPa',
  degC: '°C',
  'kJ/m2': 'kJ/m²',
  'g/cm3': 'g/cm³',
};

const KEY_FACT_FIELDS: ReadonlyArray<{ field: string; label: string }> = [
  { field: 'tensile_strength', label: 'Zugfestigkeit' },
  { field: 'hdt_b', label: 'Wärmeformbeständigkeit HDT/B' },
  { field: 'hdt_a', label: 'Wärmeformbeständigkeit HDT/A' },
  { field: 'vicat', label: 'Vicat-Erweichungstemperatur' },
  { field: 'impact_charpy_notched', label: 'Kerbschlagzähigkeit' },
];
const MAX_KEY_FACTS = 3;

const decimal = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 });

function isFlagged(material: DbMaterial, field: string): boolean {
  return (material.flags ?? []).some((flag) => flag.field === field);
}

/** Returns the property only if it is present, unflagged and not suspect. */
function trustedProperty(material: DbMaterial, field: string): DbProperty | null {
  const property = material.properties[field];
  if (!property || property.suspect || isFlagged(material, field)) {
    return null;
  }
  if (property.value === null && (property.min === null || property.max === null)) {
    return null;
  }
  return property;
}

function formatProperty(property: DbProperty): string {
  const unit = property.unit ? ` ${UNIT_LABEL[property.unit] ?? property.unit}` : '';
  const value =
    property.value !== null
      ? decimal.format(property.value)
      : `${decimal.format(property.min as number)}–${decimal.format(property.max as number)}`;
  const standard = property.standard ? ` (${property.standard})` : '';
  return `${value}${unit}${standard}`;
}

function keyFactsFor(material: DbMaterial): string[] {
  const facts: string[] = [];
  let hdtShown = false;
  for (const { field, label } of KEY_FACT_FIELDS) {
    if (facts.length >= MAX_KEY_FACTS) break;
    if ((field === 'hdt_a' && hdtShown) || (field === 'vicat' && hdtShown)) continue;
    const property = trustedProperty(material, field);
    if (!property) continue;
    if (field === 'hdt_a' || field === 'hdt_b') hdtShown = true;
    facts.push(`${label} ${formatProperty(property)}`);
  }
  return facts;
}

function datasheetDensity(material: DbMaterial): number | null {
  const property = trustedProperty(material, 'density');
  if (!property || property.value === null || property.unit !== 'g/cm3' || property.value <= 0) {
    return null;
  }
  return property.value;
}

export interface CatalogBuildResult {
  catalog: MaterialSpec[];
  /** Database entries that could not be priced, with reason. */
  excluded: Array<{ id: string; reason: string }>;
}

export function buildMaterialCatalog(
  database: MaterialDatabase,
  groups: readonly PriceGroup[],
  polymerToGroup: Readonly<Record<string, string>>,
): CatalogBuildResult {
  if (database.schema_version !== SUPPORTED_MATERIAL_SCHEMA) {
    throw new MaterialCatalogError(
      `Unsupported material database schema "${database.schema_version}" (expected "${SUPPORTED_MATERIAL_SCHEMA}").`,
    );
  }
  const groupById = new Map(groups.map((group) => [group.id, group]));
  const catalog: MaterialSpec[] = [];
  const excluded: CatalogBuildResult['excluded'] = [];

  for (const material of database.materials) {
    const groupId = polymerToGroup[material.polymer];
    const group = groupId ? groupById.get(groupId) : undefined;
    if (!group) {
      excluded.push({ id: material.id, reason: `no price group for polymer "${material.polymer}"` });
      continue;
    }
    const density = datasheetDensity(material);
    catalog.push({
      id: material.id,
      name: `${material.manufacturer} ${material.product}`,
      origin: 'datasheet',
      polymer: material.polymer,
      manufacturer: material.manufacturer,
      category: group.category,
      densityGPerCm3: density ?? group.densityGPerCm3,
      densitySource: density === null ? 'price-group' : 'datasheet',
      pricePerKgEur: group.pricePerKgEur,
      priceGroupId: group.id,
      priceGroupName: group.name,
      datasheetUrl: material.source.url,
      datasheetIsMirror: material.source.origin !== 'official',
      keyFacts: keyFactsFor(material),
      description: null,
    });
  }

  // Groups whose polymer no database product covers stay selectable as
  // clearly labelled generic entries (price table values only).
  const coveredPolymers = new Set(database.materials.map((material) => material.polymer));
  for (const group of groups) {
    if (coveredPolymers.has(group.polymer)) continue;
    catalog.push({
      id: `group-${group.id}`,
      name: group.name,
      origin: 'price-group',
      polymer: group.polymer,
      manufacturer: null,
      category: group.category,
      densityGPerCm3: group.densityGPerCm3,
      densitySource: 'price-group',
      pricePerKgEur: group.pricePerKgEur,
      priceGroupId: group.id,
      priceGroupName: group.name,
      datasheetUrl: null,
      datasheetIsMirror: false,
      keyFacts: [],
      description: group.properties,
    });
  }

  return { catalog: validateMaterialCatalog(catalog) as MaterialSpec[], excluded };
}

/** Throws MaterialCatalogError if the catalog cannot be used for pricing. */
export function validateMaterialCatalog(catalog: MaterialCatalog): MaterialCatalog {
  if (catalog.length === 0) {
    throw new MaterialCatalogError('Material catalog is empty.');
  }
  const ids = new Set<string>();
  for (const material of catalog) {
    if (!material.id || ids.has(material.id)) {
      throw new MaterialCatalogError(`Duplicate or empty material id: "${material.id}".`);
    }
    ids.add(material.id);
    if (!material.name) {
      throw new MaterialCatalogError(`Material "${material.id}" has no name.`);
    }
    if (!Number.isFinite(material.densityGPerCm3) || material.densityGPerCm3 <= 0) {
      throw new MaterialCatalogError(`Material "${material.id}" has an invalid density.`);
    }
    if (!Number.isFinite(material.pricePerKgEur) || material.pricePerKgEur <= 0) {
      throw new MaterialCatalogError(`Material "${material.id}" has an invalid price per kg.`);
    }
  }
  return catalog;
}

export function findMaterial(catalog: MaterialCatalog, id: string): MaterialSpec {
  const material = catalog.find((entry) => entry.id === id);
  if (!material) {
    throw new MaterialCatalogError(`Unknown material id: "${id}".`);
  }
  return material;
}

/** Catalog used by the website: FDM-INSPECT products + uncovered price groups. */
export const MATERIAL_CATALOG: MaterialCatalog = buildMaterialCatalog(
  materialDatabase as unknown as MaterialDatabase,
  PRICE_GROUPS,
  POLYMER_PRICE_GROUP,
).catalog;
