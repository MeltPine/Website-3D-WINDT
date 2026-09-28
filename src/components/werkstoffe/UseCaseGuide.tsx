import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { USE_CASES, type UseCase } from '../../lib/werkstoffe/content';
import { WERKSTOFF_FAMILY_BY_SLUG, werkstoffPath } from '../../lib/werkstoffe/families';
import { trackEvent } from '../../lib/tracking';

const FamilyList = ({ entries, tone }: { entries: UseCase['recommended']; tone: 'recommended' | 'avoid' }) => (
  <ul className="space-y-2">
    {entries.map((entry) => {
      const family = WERKSTOFF_FAMILY_BY_SLUG[entry.slug];
      return (
        <li key={entry.slug} className="flex items-start gap-2">
          {tone === 'recommended' ? (
            <CheckCircle className="h-5 w-5 text-primary-600 mt-0.5 shrink-0" aria-hidden="true" />
          ) : (
            <XCircle className="h-5 w-5 text-gray-400 mt-0.5 shrink-0" aria-hidden="true" />
          )}
          <span className="text-gray-700">
            <Link
              to={werkstoffPath(entry.slug)}
              className="font-semibold text-primary-700 hover:text-primary-800 underline-offset-2 hover:underline"
            >
              {family?.name ?? entry.slug}
            </Link>
            {' – '}
            {entry.note}
          </span>
        </li>
      );
    })}
  </ul>
);

const UseCaseGuide = () => {
  const [selectedId, setSelectedId] = useState<string>(USE_CASES[0].id);
  const selected = USE_CASES.find((useCase) => useCase.id === selectedId) ?? USE_CASES[0];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <p id="use-case-label" className="text-sm font-medium text-gray-700 mb-3">
        Wählen Sie den Einsatzfall, der Ihr Bauteil am stärksten prägt:
      </p>
      <div role="group" aria-labelledby="use-case-label" className="flex flex-wrap gap-2 mb-6">
        {USE_CASES.map((useCase) => (
          <button
            key={useCase.id}
            type="button"
            aria-pressed={useCase.id === selected.id}
            aria-controls={`use-case-panel-${useCase.id}`}
            onClick={() => {
              setSelectedId(useCase.id);
              trackEvent('material_guide_use_case_selected', { use_case: useCase.id });
            }}
            className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
              useCase.id === selected.id
                ? 'border-primary-500 bg-primary-50 text-primary-800'
                : 'border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {useCase.label}
          </button>
        ))}
      </div>

      {/* All panels are rendered (inactive ones hidden) so the prerendered HTML contains every recommendation. */}
      {USE_CASES.map((useCase) => (
        <div key={useCase.id} id={`use-case-panel-${useCase.id}`} hidden={useCase.id !== selected.id}>
          <p className="text-gray-900 font-medium mb-4">{useCase.question}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-display text-lg font-semibold text-gray-900 mb-2">Gut geeignet</h3>
              {useCase.recommended.length > 0 ? (
                <FamilyList entries={useCase.recommended} tone="recommended" />
              ) : (
                <p className="text-gray-700">Keine pauschale Empfehlung – siehe Hinweis.</p>
              )}
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold text-gray-900 mb-2">Eher nicht</h3>
              {useCase.avoid.length > 0 ? (
                <FamilyList entries={useCase.avoid} tone="avoid" />
              ) : (
                <p className="text-gray-700">Abhängig vom konkreten Produkt – siehe Hinweis.</p>
              )}
            </div>
          </div>
          <p className="mt-5 flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
            <AlertTriangle className="h-4 w-4 text-primary-700 mt-0.5 shrink-0" aria-hidden="true" />
            <span>{useCase.caveat}</span>
          </p>
        </div>
      ))}
    </div>
  );
};

export default UseCaseGuide;
