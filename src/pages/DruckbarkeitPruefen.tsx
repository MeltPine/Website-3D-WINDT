import { ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import PrintCheckExplainer from '../components/printcheck/PrintCheckExplainer';
import QuoteWorkbench from '../components/quote/QuoteWorkbench';
import { getQuoteSession } from '../lib/quote/quoteSession';
import { trackEvent } from '../lib/tracking';
import { WERKSTOFFE_PATH } from '../lib/werkstoffe/families';

/*
 * Landing page /druckbarkeit-pruefen/ ("3D Druck Datei prüfen", "STL prüfen
 * online"). Same workbench and in-memory session as the price calculator, so
 * a file dropped here is already attached when the visitor requests the
 * technical review.
 */

const differentiators = [
  {
    title: 'Gemessen statt geraten',
    text: 'Wandstärken über die Medialachse, Überhänge flächengenau, sechs Drucklagen im Vergleich – mit Messwert und Grenzwert je Befund.',
  },
  {
    title: 'Ihre Datei bleibt bei Ihnen',
    text: 'Die Analyse läuft im Browser. Für die Prüfung wird nichts hochgeladen – ein Argument, wenn Konstruktionsdaten unter NDA stehen.',
  },
  {
    title: 'Vom Befund zur Lösung',
    text: 'Jeder Befund ist erklärt und im 3D-Modell markiert. Was sich nicht automatisch klären lässt, prüfen unsere Techniker kostenlos.',
  },
];

const DruckbarkeitPruefen = () => {
  const navigate = useNavigate();
  const goToRequest = () => {
    const session = getQuoteSession();
    trackEvent('quote_request_cta_clicked', {
      form: 'printcheck_landing',
      file_count: session.entries.length,
      material: session.selection.materialId,
    });
    navigate('/projekt-starten/');
  };

  return (
    <div className="tech pb-16">
      <header className="blueprint border-b border-line">
        <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 md:py-8">
          <p className="label-caps mb-1">Kostenloser Druckbarkeits-Check</p>
          <h1 className="text-[32px] font-semibold leading-[36px] text-ink md:text-[40px] md:leading-[44px]">
            3D-Druck-Datei prüfen: Druckbarkeit online checken
          </h1>
          <p className="mt-2 max-w-3xl text-lg text-ink-soft">
            STL, STEP, 3MF oder OBJ reinziehen – geprüft werden Wandstärken, feine Merkmale, Überhänge, Bohrungen, Bauraum und Drucklage für
            den FDM-Druck. Auf Deutsch, mit Erklärung je Befund und Markierung im 3D-Modell. Die Prüfung läuft in Ihrem Browser.
          </p>
          <p className="mt-2 inline-flex items-center gap-2 text-sm text-ink">
            <span className="inline-block h-2.5 w-2.5 bg-ok" aria-hidden="true" /> Lokal · nichts übertragen
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-[1440px] space-y-10 px-4 pt-6 sm:px-6 lg:px-8">
        <QuoteWorkbench printCheckMode="calculator" onRequest={goToRequest} />

        <section aria-labelledby="printcheck-why" className="tech-panel p-5 md:p-6">
          <h2 id="printcheck-why" className="mb-3 text-2xl font-semibold text-ink">
            Warum dieser Check
          </h2>
          <dl className="divide-y divide-[var(--border-soft)]">
            {differentiators.map(({ title, text }) => (
              <div key={title} className="grid grid-cols-1 gap-1 py-3 md:grid-cols-[16rem_1fr] md:gap-6">
                <dt className="font-medium text-ink">{title}</dt>
                <dd className="text-ink-soft">{text}</dd>
              </div>
            ))}
          </dl>
        </section>

        <PrintCheckExplainer headingId="printcheck-landing-checks" linkToLanding={false} />

        <section className="tech-panel p-5 md:p-6">
          <h2 className="mb-2 text-2xl font-semibold text-ink">Und nach der Vorprüfung?</h2>
          <p className="mb-4 max-w-3xl text-ink-soft">
            Mit einem Klick geht Ihre Datei samt Prüfergebnis an mich. Sie bekommen eine verbindliche Einschätzung zu Drucklage, Werkstoff und
            Toleranzen – und auf Wunsch einen Vorschlag zur Nachkonstruktion.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link to="/projekt-starten/" className="tech-btn tech-btn-primary">
              Technische Prüfung anfragen <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link to="/3d-druck-preisrechner/" className="tech-btn tech-btn-secondary">
              Zum Preisrechner
            </Link>
          </div>
          <p className="mt-4 text-sm text-ink-muted">
            Weiterlesen:{' '}
            <Link to={WERKSTOFFE_PATH} className="text-accent underline">
              Werkstoff-Bibliothek
            </Link>{' '}
            ·{' '}
            <Link to="/wissen/fdm-toleranzen-im-industriealltag/" className="text-accent underline">
              FDM-Toleranzen im Industriealltag
            </Link>{' '}
            ·{' '}
            <Link to="/ersatzteile-3d-drucken/" className="text-accent underline">
              Ersatzteile per 3D-Druck
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
};

export default DruckbarkeitPruefen;
