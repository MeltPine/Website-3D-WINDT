import materialDatabase from '../../data/fdm-inspect-materials.json';
import { MATERIAL_TRAITS, type MaterialProcessTraits } from '../printcheck/standards';
import { resolveProperties, type DbMaterialCore, type LibraryField, type ResolvedValue } from '../werkstoffe/datasheetValues';
import type { MaterialSpec } from './materials';

/*
 * Side-by-side comparison of up to three materials for the current part.
 * Datasheet values are the reviewed values of the material library
 * (resolveProperties); a missing value is "k. A.", never estimated. Values
 * measured with different methods (Izod vs Charpy, tensile strength vs
 * yield stress, HDT/A vs HDT/B) are separate rows, never one row.
 */

export const MAX_COMPARED = 3;

export const COMPARE_FIELDS: ReadonlyArray<{ field: LibraryField; label: string }> = [
  { field: 'tensile_strength', label: 'Zugfestigkeit' },
  { field: 'tensile_yield', label: 'Streckspannung' },
  { field: 'hdt_a', label: 'HDT/A (1,8 MPa)' },
  { field: 'hdt_b', label: 'HDT/B (0,45 MPa)' },
  { field: 'hdt_unspecified', label: 'HDT (Prüflast nicht angegeben)' },
  { field: 'vicat', label: 'Vicat-Erweichungstemperatur' },
  { field: 'impact_charpy_notched', label: 'Charpy-Kerbschlagzähigkeit' },
  { field: 'impact_izod_notched', label: 'Izod-Kerbschlagzähigkeit' },
];

/** Polymers whose library text states UV resistance (filter "UV-beständig"). */
export const UV_RESISTANT_POLYMERS: readonly string[] = ['ASA'];

const DATABASE = (materialDatabase as unknown as { materials: DbMaterialCore[] }).materials;

export interface CompareCell {
  display: string;
  standard: string | null;
}

export function datasheetValuesFor(material: MaterialSpec): Partial<Record<LibraryField, CompareCell>> {
  if (material.origin !== 'datasheet') return {};
  const db = DATABASE.find((entry) => entry.id === material.id);
  if (!db) return {};
  const cells: Partial<Record<LibraryField, CompareCell>> = {};
  for (const value of resolveProperties(db).values as ResolvedValue[]) {
    if (COMPARE_FIELDS.some((entry) => entry.field === value.field) && !cells[value.field]) {
      cells[value.field] = { display: value.display, standard: value.standard };
    }
  }
  return cells;
}

/** Rows that have a value for at least one compared material. */
export function compareRows(materials: readonly MaterialSpec[]): Array<{ field: LibraryField; label: string; cells: Array<CompareCell | null> }> {
  const values = materials.map(datasheetValuesFor);
  return COMPARE_FIELDS.map(({ field, label }) => ({ field, label, cells: values.map((entry) => entry[field] ?? null) })).filter(
    (row) => row.cells.some((cell) => cell !== null),
  );
}

export function traitsFor(material: MaterialSpec): MaterialProcessTraits | null {
  return MATERIAL_TRAITS[material.polymer] ?? null;
}

export interface MaterialFilter {
  query: string;
  chamber: boolean;
  uv: boolean;
  fibre: boolean;
}

export function filterMaterials(materials: readonly MaterialSpec[], filter: MaterialFilter): MaterialSpec[] {
  const query = filter.query.trim().toLowerCase();
  return materials.filter((material) => {
    const traits = traitsFor(material);
    if (filter.chamber && !traits?.chamber) return false;
    if (filter.fibre && !traits?.fibre) return false;
    if (filter.uv && !UV_RESISTANT_POLYMERS.includes(material.polymer)) return false;
    if (!query) return true;
    return [material.name, material.polymer, material.category, material.manufacturer ?? ''].some((text) =>
      text.toLowerCase().includes(query),
    );
  });
}
