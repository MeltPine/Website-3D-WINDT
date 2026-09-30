import type { MaterialSpec } from '../quote/materials';
import { familyForCatalogMaterial } from '../werkstoffe/families';
import type { PrintCheckMaterial } from './evaluate';

/** Calculator material -> the material context of the printability report. */
export function toPrintCheckMaterial(material: MaterialSpec): PrintCheckMaterial {
  const family = familyForCatalogMaterial(material);
  return {
    id: material.id,
    name: material.name,
    polymer: material.polymer,
    densityGPerCm3: material.densityGPerCm3,
    familySlug: family?.slug ?? null,
    familyName: family?.name ?? null,
  };
}
