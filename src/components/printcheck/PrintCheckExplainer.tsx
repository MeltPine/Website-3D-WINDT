import { CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PRINTCHECK_CHECKS, PRINTCHECK_FAQ, PRINTCHECK_PATH } from '../../lib/printcheck/content';

/*
 * "Was wird geprüft?" plus FAQ (server-rendered, main bundle). Used on the
 * calculator page and the landing page; the FAQ schema is emitted from the
 * same entries in src/lib/seo.ts.
 */

interface PrintCheckExplainerProps {
  /** Heading level context: the landing page uses it as main content. */
  headingId: string;
  /** Show the link to the dedicated landing page (calculator page only). */
  linkToLanding: boolean;
}

const PrintCheckExplainer = ({ headingId, linkToLanding }: PrintCheckExplainerProps) => (
  <div className="space-y-8">
    <section aria-labelledby={headingId} className="rounded-xl border border-gray-200 bg-white p-6 md:p-8 shadow-sm">
      <h2 id={headingId} className="font-display text-2xl font-semibold text-gray-900 mb-2">
        Was wird geprüft?
      </h2>
      <p className="text-gray-700 mb-5 max-w-3xl">
        Der Druckbarkeits-Check bewertet Ihr Modell in neun Punkten – jeweils mit Messwert, Grenzwert, verständlicher
        Erklärung und Empfehlung. Befunde werden direkt im 3D-Modell markiert, der Bericht lässt sich drucken oder als
        PDF speichern.
      </p>
      <ol className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {PRINTCHECK_CHECKS.map((check, index) => (
          <li key={check.title} className="flex items-start gap-3 rounded-lg border border-gray-200 p-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
              {index + 1}
            </span>
            <span>
              <span className="block font-semibold text-gray-900">{check.title}</span>
              <span className="block text-sm text-gray-700">{check.text}</span>
            </span>
          </li>
        ))}
      </ol>
      <ul className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-700">
        {[
          'Auf Deutsch, jeder Befund erklärt',
          'Läuft lokal – Datei wird nicht hochgeladen',
          'Ehrlich: Heuristiken gekennzeichnet, Ungeprüftes als „nicht geprüft“',
        ].map((item) => (
          <li key={item} className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 mt-0.5 shrink-0 text-primary-600" aria-hidden="true" />
            {item}
          </li>
        ))}
      </ul>
      {linkToLanding && (
        <p className="mt-4 text-sm text-gray-600">
          Mehr zur Methode:{' '}
          <Link to={PRINTCHECK_PATH} className="text-primary-700 underline hover:text-primary-800">
            3D-Druck-Datei online prüfen
          </Link>
        </p>
      )}
    </section>

    <section aria-labelledby={`${headingId}-faq`} className="rounded-xl border border-gray-200 bg-white p-6 md:p-8 shadow-sm">
      <h2 id={`${headingId}-faq`} className="font-display text-2xl font-semibold text-gray-900 mb-4">
        Häufige Fragen zum Druckbarkeits-Check
      </h2>
      <div className="space-y-3">
        {PRINTCHECK_FAQ.map((entry) => (
          <details key={entry.question} className="rounded-lg border border-gray-200 p-4">
            <summary className="cursor-pointer font-semibold text-gray-900">{entry.question}</summary>
            <p className="mt-2 text-gray-700">{entry.answer}</p>
          </details>
        ))}
      </div>
    </section>
  </div>
);

export default PrintCheckExplainer;
