import { X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PRINTCHECK_RULES } from '../../lib/printcheck/standards';
import { formatWeight } from '../../lib/quote/breakdownDisplay';
import { compareRows, traitsFor } from '../../lib/quote/materialCompare';
import type { MaterialCatalog, MaterialSpec } from '../../lib/quote/materials';
import { breakdownProject, type PartGeometry, type QuoteSelection } from '../../lib/quote/pricing';
import { PRICING_CONFIG } from '../../lib/quote/pricingConfig';
import { formatEur } from '../../lib/quote/summary';
import { familyForCatalogMaterial, werkstoffPath } from '../../lib/werkstoffe/families';

/*
 * Up to three materials side by side: estimate for THIS part, weight,
 * reviewed datasheet values with test standard, process traits. Missing
 * values are "k. A.". Different test methods are different rows.
 */

interface MaterialCompareProps {
  materials: readonly MaterialSpec[];
  catalog: MaterialCatalog;
  parts: readonly PartGeometry[];
  selection: QuoteSelection;
  onUnpin: (id: string) => void;
  onSelect: (id: string) => void;
}

const NA = 'k. A.';

const MaterialCompare = ({ materials, catalog, parts, selection, onUnpin, onSelect }: MaterialCompareProps) => {
  if (materials.length === 0) {
    return <p className="text-sm text-ink-muted">Mit „Vergleichen“ an einer Karte bis zu drei Werkstoffe nebeneinanderstellen.</p>;
  }
  const estimates = materials.map((material) =>
    parts.length > 0 ? breakdownProject(parts, { ...selection, materialId: material.id }, catalog, PRICING_CONFIG) : null,
  );
  const rows = compareRows(materials);
  const traits = materials.map(traitsFor);
  const anisotropyPercent = Math.round(PRINTCHECK_RULES.anisotropyZ.value * 100);
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded border border-line">
        <table className="w-full min-w-[520px] text-sm">
          <caption className="sr-only">Werkstoffvergleich für dieses Teil</caption>
          <thead>
            <tr className="border-b border-line bg-panel-2">
              <th scope="col" className="label-caps w-44 px-2 py-2 text-left">
                Kennwert
              </th>
              {materials.map((material) => (
                <th key={material.id} scope="col" className="px-2 py-2 text-left align-top font-medium text-ink">
                  <span className="flex items-start justify-between gap-1">
                    <span>{material.name}</span>
                    <button type="button" onClick={() => onUnpin(material.id)} aria-label={`${material.name} aus dem Vergleich nehmen`} className="p-1 text-ink-muted hover:text-ink">
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </span>
                  {material.id !== selection.materialId && (
                    <button type="button" onClick={() => onSelect(material.id)} className="mt-0.5 text-xs font-medium text-accent underline">
                      auswählen
                    </button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-line">
              <th scope="row" className="px-2 py-1.5 text-left font-normal text-ink-soft">
                Richtpreis für dieses Teil
              </th>
              {estimates.map((estimate, index) => (
                <td key={materials[index].id} className="num px-2 py-1.5 text-ink">
                  {estimate ? `${formatEur(estimate.estimate.lowEur)} – ${formatEur(estimate.estimate.highEur)}` : NA}
                </td>
              ))}
            </tr>
            <tr className="border-b border-line">
              <th scope="row" className="px-2 py-1.5 text-left font-normal text-ink-soft">
                Gewicht ({selection.quantity} × Satz)
              </th>
              {estimates.map((estimate, index) => (
                <td key={materials[index].id} className="num px-2 py-1.5 text-ink">
                  {estimate ? formatWeight(estimate.weightG) : NA}
                </td>
              ))}
            </tr>
            {rows.map((row) => (
              <tr key={row.field} className="border-b border-line">
                <th scope="row" className="px-2 py-1.5 text-left font-normal text-ink-soft">
                  {row.label}
                </th>
                {row.cells.map((cell, index) => (
                  <td key={materials[index].id} className="px-2 py-1.5 text-ink">
                    {cell ? (
                      <>
                        <span className="num">{cell.display}</span>
                        {cell.standard && <span className="block text-xs text-ink-muted">{cell.standard}</span>}
                      </>
                    ) : (
                      <span className="text-ink-muted">{NA}</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="border-b border-line">
              <th scope="row" className="px-2 py-1.5 text-left font-normal text-ink-soft">
                Beheizte Kammer nötig
              </th>
              {traits.map((trait, index) => (
                <td key={materials[index].id} className="px-2 py-1.5 text-ink">
                  {trait ? (trait.chamber ? 'ja' : 'nein') : NA}
                </td>
              ))}
            </tr>
            <tr className="border-b border-line">
              <th scope="row" className="px-2 py-1.5 text-left font-normal text-ink-soft">
                Verzugsneigung (PLA = 1)
              </th>
              {traits.map((trait, index) => (
                <td key={materials[index].id} className="num px-2 py-1.5 text-ink">
                  {trait ? String(trait.warp).replace('.', ',') : NA}
                </td>
              ))}
            </tr>
            <tr className="border-b border-line">
              <th scope="row" className="px-2 py-1.5 text-left font-normal text-ink-soft">
                Faserverstärkt
              </th>
              {traits.map((trait, index) => (
                <td key={materials[index].id} className="px-2 py-1.5 text-ink">
                  {trait ? (trait.fibre ? 'ja' : 'nein') : NA}
                </td>
              ))}
            </tr>
            <tr className="border-b border-line">
              <th scope="row" className="px-2 py-1.5 text-left font-normal text-ink-soft">
                Prozesshinweis
              </th>
              {traits.map((trait, index) => (
                <td key={materials[index].id} className="px-2 py-1.5 text-xs text-ink-soft">
                  {trait?.note ?? NA}
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row" className="px-2 py-1.5 text-left font-normal text-ink-soft">
                Datenblatt
              </th>
              {materials.map((material) => {
                const family = familyForCatalogMaterial(material);
                return (
                  <td key={material.id} className="px-2 py-1.5 text-xs">
                    {family ? (
                      <Link
                        to={`${werkstoffPath(family.slug)}${material.origin === 'datasheet' ? `#${material.id}` : ''}`}
                        className="text-accent underline"
                      >
                        {family.name} in der Werkstoff-Bibliothek
                      </Link>
                    ) : (
                      NA
                    )}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-xs text-ink-muted">
        Kennwerte des Rohmaterials laut Hersteller, nicht des gedruckten Bauteils. In Z-Richtung rechne ich mit ca. {anisotropyPercent} % der
        Festigkeit. Werte aus verschiedenen Prüfverfahren (z. B. Izod und Charpy) stehen in getrennten Zeilen.
      </p>
    </div>
  );
};

export default MaterialCompare;
