/*
 * Material library ("Werkstoff-Bibliothek"): polymer families and routing.
 *
 * This module is deliberately light (no material database import) because it
 * is used by the route SEO table, the header/footer and the calculator link,
 * which all live in the main bundle. Datasheet values are resolved in
 * `library.ts`, which is only loaded with the library pages.
 *
 * Family membership is explicit:
 * - `productIds` lists the FDM-INSPECT database products shown on the page.
 * - `genericPolymers` maps calculator price-group entries (no datasheet) and
 *   is the fallback for database products not yet assigned to a family.
 * Tests assert that every database product belongs to exactly one family and
 * that every calculator material resolves to a family page.
 */

export interface WerkstoffFamilyMeta {
  slug: string;
  /** Display name, e.g. "PETG / PCTG". */
  name: string;
  /** One-line German summary for cards and the calculator link. */
  teaser: string;
  seoTitle: string;
  seoDescription: string;
  /** FDM-INSPECT database product ids shown on the family page. */
  productIds: readonly string[];
  /** Calculator polymers (price-group entries) that resolve to this family. */
  genericPolymers: readonly string[];
  /** Calculator material preselected by the family CTA (`?material=`). */
  calculatorMaterialId: string;
}

export const WERKSTOFFE_ROUTE_KEY = '/werkstoffe';
export const WERKSTOFFE_PATH = `${WERKSTOFFE_ROUTE_KEY}/`;

/** Query parameter the price calculator reads to preselect a material. */
export const CALCULATOR_MATERIAL_PARAM = 'material';
export const CALCULATOR_PATH = '/3d-druck-preisrechner/';

export function werkstoffRouteKey(slug: string): string {
  return `${WERKSTOFFE_ROUTE_KEY}/${slug}`;
}

export function werkstoffPath(slug: string): string {
  return `${werkstoffRouteKey(slug)}/`;
}

export function calculatorPathForMaterial(materialId: string): string {
  return `${CALCULATOR_PATH}?${CALCULATOR_MATERIAL_PARAM}=${encodeURIComponent(materialId)}`;
}

export const WERKSTOFF_FAMILIES: readonly WerkstoffFamilyMeta[] = [
  {
    slug: 'pla',
    name: 'PLA',
    teaser: 'Steif und maßhaltig für Anschauungsmodelle, Passproben und Lehren ohne Wärmelast.',
    seoTitle: 'PLA im 3D-Druck: Eigenschaften, Grenzen & Datenblattwerte | 3D-WINDT',
    seoDescription:
      'PLA im industriellen FDM-3D-Druck: wofür es sich eignet, wann nicht, und Kennwerte aus Herstellerdatenblättern mit Prüfnorm und Quelle.',
    productIds: ['spectrum_pla_premium', 'extrudr_pla_nx2'],
    genericPolymers: ['PLA'],
    calculatorMaterialId: 'spectrum_pla_premium',
  },
  {
    slug: 'pla-tough',
    name: 'PLA Tough',
    teaser: 'Schlagzäh modifiziertes PLA für Funktionsmuster und Vorrichtungen bei Raumtemperatur.',
    seoTitle: 'PLA Tough (schlagzähes PLA) im 3D-Druck: Kennwerte & Einsatz | 3D-WINDT',
    seoDescription:
      'Schlagzäh modifiziertes PLA: Unterschiede zu Standard-PLA, typische Anwendungen, Grenzen und Kennwerte aus dem Herstellerdatenblatt.',
    productIds: ['spectrum_pla_tough'],
    genericPolymers: [],
    calculatorMaterialId: 'spectrum_pla_tough',
  },
  {
    slug: 'petg-pctg',
    name: 'PETG / PCTG',
    teaser: 'Zähe Copolyester-Allrounder für Funktionsteile, Abdeckungen und Halter.',
    seoTitle: 'PETG & PCTG im 3D-Druck: Eigenschaften, Grenzen, Kennwerte | 3D-WINDT',
    seoDescription:
      'PETG und PCTG für Funktionsbauteile: Stärken, Grenzen und Kennwerte aus dem Herstellerdatenblatt mit Prüfnorm, Quelle und Abrufdatum.',
    productIds: ['spectrum_pctg'],
    genericPolymers: ['PETG', 'PCTG'],
    calculatorMaterialId: 'group-petg',
  },
  {
    slug: 'abs',
    name: 'ABS',
    teaser: 'Schlagzäher technischer Standardkunststoff für Gehäuse, Halter und Innenteile.',
    seoTitle: 'ABS im 3D-Druck: Eigenschaften, Grenzen & Datenblattwerte | 3D-WINDT',
    seoDescription:
      'ABS im industriellen 3D-Druck: typische Anwendungen, Grenzen bei UV und Lösemitteln sowie Kennwerte aus dem Herstellerdatenblatt.',
    productIds: ['spectrum_abs_gp450'],
    genericPolymers: ['ABS'],
    calculatorMaterialId: 'spectrum_abs_gp450',
  },
  {
    slug: 'asa',
    name: 'ASA',
    teaser: 'Wie ABS, zusätzlich UV- und witterungsbeständig – für Teile im Außeneinsatz.',
    seoTitle: 'ASA im 3D-Druck: UV-beständig für den Außeneinsatz | 3D-WINDT',
    seoDescription:
      'ASA für bewitterte Bauteile: Eigenschaften, Grenzen und Kennwerte aus dem Herstellerdatenblatt mit Prüfnorm, Quelle und Abrufdatum.',
    productIds: ['spectrum_asa_275'],
    genericPolymers: ['ASA'],
    calculatorMaterialId: 'spectrum_asa_275',
  },
  {
    slug: 'hips',
    name: 'HIPS',
    teaser: 'Schlagzähes Polystyrol, im FDM-Druck vor allem als lösliches Stützmaterial für ABS.',
    seoTitle: 'HIPS im 3D-Druck: Stützmaterial & leichte Teile | 3D-WINDT',
    seoDescription:
      'HIPS (schlagzähes Polystyrol) im FDM-Druck: Einsatz als Stützmaterial, Grenzen und Kennwerte aus dem Herstellerdatenblatt.',
    productIds: ['spectrum_hips_x'],
    genericPolymers: ['HIPS'],
    calculatorMaterialId: 'spectrum_hips_x',
  },
  {
    slug: 'pc',
    name: 'PC (Polycarbonat)',
    teaser: 'Sehr schlagzäh und wärmebeständig – für hoch beanspruchte Funktionsteile.',
    seoTitle: 'Polycarbonat (PC) im 3D-Druck: Eigenschaften & Grenzen | 3D-WINDT',
    seoDescription:
      'Polycarbonat im FDM-3D-Druck: wofür PC sich eignet, wo seine Grenzen liegen und warum wir Kennwerte nur mit Herstellerdatenblatt nennen.',
    productIds: [],
    genericPolymers: ['PC', 'PC-ABS'],
    calculatorMaterialId: 'group-pc',
  },
  {
    slug: 'pa',
    name: 'PA (Polyamid / Nylon)',
    teaser: 'Zäh, abriebfest und gleitfähig – für Zahnräder, Buchsen, Clips und Scharniere.',
    seoTitle: 'Polyamid (PA, Nylon) im 3D-Druck: Kennwerte & Einsatz | 3D-WINDT',
    seoDescription:
      'Polyamid im FDM-3D-Druck: Verschleiß- und Gleitteile, Feuchteempfindlichkeit, Grenzen und Kennwerte aus dem Herstellerdatenblatt.',
    productIds: ['basf_pa'],
    genericPolymers: ['PA'],
    calculatorMaterialId: 'basf_pa',
  },
  {
    slug: 'pa6-cf',
    name: 'PA6-CF (carbonfaserverstärkt)',
    teaser: 'Carbonfaserverstärktes Polyamid: sehr steif und maßhaltig für Vorrichtungen und Halter.',
    seoTitle: 'PA6-CF (Carbonfaser-Polyamid) im 3D-Druck: Kennwerte | 3D-WINDT',
    seoDescription:
      'Carbonfaserverstärktes PA6 im FDM-Druck: Steifigkeit, Anisotropie, Grenzen und Kennwerte aus dem Herstellerdatenblatt mit Quelle.',
    productIds: ['spectrum_pa6_lowwarp_cf15'],
    genericPolymers: ['PA6-CF'],
    calculatorMaterialId: 'spectrum_pa6_lowwarp_cf15',
  },
  {
    slug: 'pet-cf',
    name: 'PET-CF (carbonfaserverstärkt)',
    teaser: 'Carbonfaserverstärkter Polyester: steif und maßhaltig, weniger feuchteempfindlich als PA-CF.',
    seoTitle: 'PET-CF (Carbonfaser-PET) im 3D-Druck: Eigenschaften | 3D-WINDT',
    seoDescription:
      'Carbonfaserverstärktes PET im FDM-3D-Druck: typische Anwendungen, Grenzen und warum wir ohne Herstellerdatenblatt keine Kennwerte nennen.',
    productIds: [],
    genericPolymers: ['PET-CF'],
    calculatorMaterialId: 'group-petcf',
  },
  {
    slug: 'tpu',
    name: 'TPU',
    teaser: 'Elastisch, dämpfend und abriebfest – für Puffer, Griffe, Schutz- und Dämpfungsteile.',
    seoTitle: 'TPU im 3D-Druck: flexible Funktionsteile & Kennwerte | 3D-WINDT',
    seoDescription:
      'Thermoplastisches Polyurethan (TPU) im FDM-Druck: Anwendungen, Grenzen und Kennwerte aus dem Herstellerdatenblatt mit Prüfnorm.',
    productIds: ['basf_tpu95a'],
    genericPolymers: ['TPU'],
    calculatorMaterialId: 'basf_tpu95a',
  },
];

export const WERKSTOFF_FAMILY_BY_SLUG: Readonly<Record<string, WerkstoffFamilyMeta>> = Object.fromEntries(
  WERKSTOFF_FAMILIES.map((family) => [family.slug, family]),
);

export class WerkstoffFamilyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WerkstoffFamilyError';
  }
}

export function findWerkstoffFamily(slug: string): WerkstoffFamilyMeta {
  const family = WERKSTOFF_FAMILY_BY_SLUG[slug];
  if (!family) {
    throw new WerkstoffFamilyError(`Unknown material family: "${slug}".`);
  }
  return family;
}

/** Minimal shape of a calculator material (see `MaterialSpec` in quote/materials.ts). */
export interface CatalogMaterialRef {
  id: string;
  polymer: string;
}

/**
 * Library family for a calculator material: explicit product assignment
 * first, then the polymer of price-group entries. Returns null only for
 * polymers no family covers (tests keep this at zero for the live catalog).
 */
export function familyForCatalogMaterial(material: CatalogMaterialRef): WerkstoffFamilyMeta | null {
  const byProduct = WERKSTOFF_FAMILIES.find((family) => family.productIds.includes(material.id));
  if (byProduct) return byProduct;
  return WERKSTOFF_FAMILIES.find((family) => family.genericPolymers.includes(material.polymer)) ?? null;
}
