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
    <section aria-labelledby={headingId} className="tech-panel p-5 md:p-6">
      <h2 id={headingId} className="text-2xl font-semibold text-ink mb-2">
        Was wird geprüft?
      </h2>
      <p className="text-ink-soft mb-5 max-w-3xl">
        Der Druckbarkeits-Check bewertet Ihr Modell in neun Punkten – jeweils mit Messwert, Grenzwert, verständlicher
        Erklärung und Empfehlung. Befunde werden direkt im 3D-Modell markiert, der Bericht lässt sich drucken oder als
        PDF speichern.
      </p>
      <ol className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {PRINTCHECK_CHECKS.map((check, index) => (
          <li key={check.title} className="flex items-start gap-3 rounded border border-line p-3">
            <span className="num flex h-7 w-7 shrink-0 items-center justify-center rounded border border-line text-sm text-ink">
              {index + 1}
            </span>
            <span>
              <span className="block font-medium text-ink">{check.title}</span>
              <span className="block text-sm text-ink-soft">{check.text}</span>
            </span>
          </li>
        ))}
      </ol>
      <ul className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-ink-soft">
        {[
          'Auf Deutsch, jeder Befund erklärt',
          'Läuft lokal – Datei wird nicht hochgeladen',
          'Ehrlich: Heuristiken gekennzeichnet, Ungeprüftes als „nicht geprüft“',
        ].map((item) => (
          <li key={item} className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 mt-0.5 shrink-0 text-ok" aria-hidden="true" />
            {item}
          </li>
        ))}
      </ul>
      {linkToLanding && (
        <p className="mt-4 text-sm text-ink-muted">
          Mehr zur Methode:{' '}
          <Link to={PRINTCHECK_PATH} className="text-accent underline">
            3D-Druck-Datei online prüfen
          </Link>
        </p>
      )}
    </section>

    <section aria-labelledby={`${headingId}-faq`} className="tech-panel p-5 md:p-6">
      <h2 id={`${headingId}-faq`} className="text-2xl font-semibold text-ink mb-4">
        Häufige Fragen zum Druckbarkeits-Check
      </h2>
      <div className="space-y-3">
        {PRINTCHECK_FAQ.map((entry) => (
          <details key={entry.question} className="rounded border border-line p-4">
            <summary className="cursor-pointer font-medium text-ink">{entry.question}</summary>
            <p className="mt-2 text-ink-soft">{entry.answer}</p>
          </details>
        ))}
      </div>
    </section>
  </div>
);

export default PrintCheckExplainer;
