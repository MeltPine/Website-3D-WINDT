/*
 * Viewer appearance per material family (MeshPhysicalMaterial parameters).
 * Explicit table keyed by polymer - nothing is derived from product names.
 *
 * Colours are the natural (uncoloured) tone of each family, chosen by eye as
 * a placeholder. They are to be replaced by values measured from photographed
 * filament samples under a grey card (spec 3.3 / 5.6) and, once the owner has
 * listed the stocked colours, by those colours (OWNER_DECISIONS.filamentColours).
 */

export type LookKey = 'pla' | 'petg' | 'abs' | 'asa' | 'pc' | 'pa' | 'cf' | 'tpu' | 'unknown';

export interface MaterialLook {
  key: LookKey;
  /** Label for the viewer legend. */
  label: string;
  roughness: number;
  clearcoat: number;
  clearcoatRoughness: number;
  /** sRGB hex of the natural tone. */
  color: string;
  /** Fine noise normal map to suggest the fibre surface. */
  fibreNoise: boolean;
}

export const MATERIAL_LOOKS: Readonly<Record<LookKey, MaterialLook>> = {
  pla: { key: 'pla', label: 'PLA, Naturton', roughness: 0.45, clearcoat: 0.1, clearcoatRoughness: 0.4, color: '#e6e2d6', fibreNoise: false },
  petg: { key: 'petg', label: 'PETG/PCTG, Naturton', roughness: 0.28, clearcoat: 0.35, clearcoatRoughness: 0.2, color: '#d5dedc', fibreNoise: false },
  abs: { key: 'abs', label: 'ABS/HIPS, Naturton', roughness: 0.62, clearcoat: 0, clearcoatRoughness: 0, color: '#e8e1cd', fibreNoise: false },
  asa: { key: 'asa', label: 'ASA, Naturton', roughness: 0.58, clearcoat: 0, clearcoatRoughness: 0, color: '#e2ddcd', fibreNoise: false },
  pc: { key: 'pc', label: 'PC, Naturton', roughness: 0.3, clearcoat: 0.3, clearcoatRoughness: 0.2, color: '#d9dfe3', fibreNoise: false },
  pa: { key: 'pa', label: 'PA, Naturton', roughness: 0.7, clearcoat: 0, clearcoatRoughness: 0, color: '#ebe6d6', fibreNoise: false },
  cf: { key: 'cf', label: 'Carbonfaser-gefüllt', roughness: 0.85, clearcoat: 0, clearcoatRoughness: 0, color: '#2b2d30', fibreNoise: true },
  tpu: { key: 'tpu', label: 'TPU, Naturton', roughness: 0.55, clearcoat: 0, clearcoatRoughness: 0, color: '#e1dfd6', fibreNoise: false },
  unknown: { key: 'unknown', label: 'Werkstoff ohne Vorschau-Look', roughness: 0.5, clearcoat: 0, clearcoatRoughness: 0, color: '#c9cdd2', fibreNoise: false },
};

/** Polymer (material database / price group) -> look. */
export const POLYMER_LOOK: Readonly<Record<string, LookKey>> = {
  PLA: 'pla',
  PETG: 'petg',
  PCTG: 'petg',
  ABS: 'abs',
  HIPS: 'abs',
  ASA: 'asa',
  PC: 'pc',
  'PC-ABS': 'pc',
  PA: 'pa',
  'PA6-CF': 'cf',
  'PET-CF': 'cf',
  TPU: 'tpu',
};

export function lookForPolymer(polymer: string | null): MaterialLook {
  const key = polymer ? POLYMER_LOOK[polymer] : undefined;
  return MATERIAL_LOOKS[key ?? 'unknown'];
}
