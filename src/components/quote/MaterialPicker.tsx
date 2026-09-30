import { useMemo, useState } from 'react';
import { Check, Pin, PinOff, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MAX_COMPARED, filterMaterials, traitsFor, type MaterialFilter } from '../../lib/quote/materialCompare';
import type { MaterialSpec } from '../../lib/quote/materials';
import { familyForCatalogMaterial, werkstoffPath } from '../../lib/werkstoffe/families';

/*
 * Material choice as a card list grouped by family (not a long dropdown),
 * with search and three filters. Each card can be pinned for the comparison
 * (max. three).
 */

interface MaterialPickerProps {
  materials: readonly MaterialSpec[];
  selectedId: string;
  onSelect: (id: string) => void;
  pinned: readonly string[];
  onTogglePin: (id: string) => void;
}

const FILTERS: ReadonlyArray<{ key: keyof Omit<MaterialFilter, 'query'>; label: string }> = [
  { key: 'chamber', label: 'beheizte Kammer' },
  { key: 'uv', label: 'UV-beständig' },
  { key: 'fibre', label: 'faserverstärkt' },
];

const MaterialPicker = ({ materials, selectedId, onSelect, pinned, onTogglePin }: MaterialPickerProps) => {
  const [filter, setFilter] = useState<MaterialFilter>({ query: '', chamber: false, uv: false, fibre: false });
  const visible = useMemo(() => filterMaterials(materials, filter), [materials, filter]);
  const groups = useMemo(() => {
    const byFamily = new Map<string, { name: string; slug: string | null; items: MaterialSpec[] }>();
    for (const material of visible) {
      const family = familyForCatalogMaterial(material);
      const key = family?.slug ?? `other-${material.polymer}`;
      const group = byFamily.get(key) ?? { name: family?.name ?? material.polymer, slug: family?.slug ?? null, items: [] };
      group.items.push(material);
      byFamily.set(key, group);
    }
    return [...byFamily.values()];
  }, [visible]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-[12rem] flex-1">
          <span className="sr-only">Werkstoff suchen</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
          <input
            type="search"
            value={filter.query}
            onChange={(event) => setFilter((current) => ({ ...current, query: event.target.value }))}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.preventDefault();
            }}
            placeholder="Werkstoff, Hersteller oder Polymer"
            className="tech-field pl-9"
          />
        </label>
        {FILTERS.map((entry) => (
          <label
            key={entry.key}
            className={`tech-btn min-h-[44px] cursor-pointer text-sm ${filter[entry.key] ? 'tech-btn-primary' : 'tech-btn-secondary'}`}
          >
            <input
              type="checkbox"
              checked={filter[entry.key]}
              onChange={(event) => setFilter((current) => ({ ...current, [entry.key]: event.target.checked }))}
              className="sr-only"
            />
            {filter[entry.key] && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
            {entry.label}
          </label>
        ))}
      </div>

      {groups.length === 0 && <p className="text-sm text-ink-soft">Kein Werkstoff passt zu Suche und Filtern.</p>}

      <fieldset>
        <legend className="sr-only">Werkstoff</legend>
        <div className="space-y-3">
          {groups.map((group) => (
            <div key={group.name}>
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <p className="label-caps">{group.name}</p>
                {group.slug && (
                  <Link to={werkstoffPath(group.slug)} className="text-xs text-accent underline">
                    Werkstoff-Bibliothek
                  </Link>
                )}
              </div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {group.items.map((material) => {
                  const selected = material.id === selectedId;
                  const isPinned = pinned.includes(material.id);
                  const traits = traitsFor(material);
                  return (
                    <div
                      key={material.id}
                      className={`flex items-start gap-2 rounded border p-2.5 transition-colors duration-100 ${
                        selected ? 'border-accent bg-accent-soft' : 'border-line bg-panel hover:border-line-strong'
                      }`}
                    >
                      <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2">
                        <input
                          type="radio"
                          name="quote_material"
                          value={material.id}
                          checked={selected}
                          onChange={() => onSelect(material.id)}
                          className="mt-1 accent-[var(--accent)]"
                        />
                        <span className="min-w-0">
                          <span className="block text-sm font-medium text-ink">{material.name}</span>
                          <span className="block text-xs text-ink-muted">
                            {material.polymer} · {material.category}
                            {material.origin === 'price-group' ? ' · Richtwerte der Werkstoffgruppe' : ''}
                            {traits?.chamber ? ' · beheizte Kammer' : ''}
                          </span>
                          {material.keyFacts[0] && <span className="block text-xs text-ink-soft">{material.keyFacts[0]}</span>}
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={() => onTogglePin(material.id)}
                        disabled={!isPinned && pinned.length >= MAX_COMPARED}
                        aria-pressed={isPinned}
                        title={isPinned ? 'Aus dem Vergleich nehmen' : `Vergleichen (max. ${MAX_COMPARED})`}
                        className="tech-btn min-h-[36px] shrink-0 px-2 text-xs text-ink-soft hover:text-ink disabled:opacity-40"
                      >
                        {isPinned ? <PinOff className="h-3.5 w-3.5" aria-hidden="true" /> : <Pin className="h-3.5 w-3.5" aria-hidden="true" />}
                        <span>{isPinned ? 'Vergleich' : 'Vergleichen'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </fieldset>
    </div>
  );
};

export default MaterialPicker;
