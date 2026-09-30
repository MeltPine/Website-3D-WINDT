import { ArrowRight, ClipboardCheck, Lock, ScanSearch } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import GlassSurface from '../components/GlassSurface';
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
    icon: ScanSearch,
    title: 'Gemessen statt geraten',
    text: 'Wandstärken über die Medialachse, Überhänge flächengenau, sechs Drucklagen im Vergleich – mit Messwert und Grenzwert je Befund.',
  },
  {
    icon: Lock,
    title: 'Ihre Datei bleibt bei Ihnen',
    text: 'Die Analyse läuft im Browser. Für die Prüfung wird nichts hochgeladen – ein Argument, wenn Konstruktionsdaten unter NDA stehen.',
  },
  {
    icon: ClipboardCheck,
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
    <div className="py-16 animate-fade-in">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <GlassSurface as="section" variant="hero" density="normal" className="p-8 md:p-10">
          <p className="text-xs uppercase tracking-wide text-primary-700 font-semibold mb-2">Kostenloser Druckbarkeits-Check</p>
          <h1 className="font-display text-4xl font-bold text-gray-900 mb-3">3D-Druck-Datei prüfen: Druckbarkeit online checken</h1>
          <p className="text-lg text-gray-700 max-w-3xl">
            STL, STEP, 3MF oder OBJ hineinziehen – wir prüfen Wandstärken, feine Merkmale, Überhänge, Bohrungen, Bauraum
            und Drucklage für den FDM-3D-Druck. Auf Deutsch, mit Erklärung je Befund und Markierung im 3D-Modell. Die
            Prüfung läuft direkt in Ihrem Browser.
          </p>
        </GlassSurface>

        <QuoteWorkbench
          printCheckMode="calculator"
          footer={
            <button
              type="button"
              onClick={goToRequest}
              className="w-full bg-primary-700 text-white px-5 py-3 rounded-lg font-semibold hover:bg-primary-800 transition-colors inline-flex items-center justify-center gap-2"
            >
              Verbindliches Angebot anfragen
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </button>
          }
        />

        <section aria-labelledby="printcheck-why" className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <h2 id="printcheck-why" className="sr-only">
            Warum dieser Druckbarkeits-Check
          </h2>
          {differentiators.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <Icon className="h-7 w-7 text-primary-700 mb-3" aria-hidden="true" />
              <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
              <p className="text-sm text-gray-700">{text}</p>
            </div>
          ))}
        </section>

        <PrintCheckExplainer headingId="printcheck-landing-checks" linkToLanding={false} />

        <section className="rounded-xl border border-primary-200 bg-primary-50 p-6 md:p-8">
          <h2 className="font-display text-2xl font-semibold text-gray-900 mb-2">Und nach der Vorprüfung?</h2>
          <p className="text-gray-700 mb-4 max-w-3xl">
            Mit einem Klick geht Ihre Datei samt Prüfergebnis an unsere Techniker. Sie erhalten eine verbindliche
            Einschätzung zu Drucklage, Material und Toleranzen – und auf Wunsch einen Vorschlag zur Nachkonstruktion.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              to="/projekt-starten/"
              className="inline-flex items-center justify-center gap-2 bg-primary-700 text-white px-5 py-3 rounded-lg font-semibold hover:bg-primary-800"
            >
              Technische Prüfung anfragen <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              to="/3d-druck-preisrechner/"
              className="inline-flex items-center justify-center gap-2 border border-primary-700 text-primary-700 px-5 py-3 rounded-lg font-semibold hover:bg-white"
            >
              Zum Preisrechner
            </Link>
          </div>
          <p className="mt-4 text-sm text-gray-600">
            Weiterlesen:{' '}
            <Link to={WERKSTOFFE_PATH} className="text-primary-700 underline hover:text-primary-800">
              Werkstoff-Bibliothek
            </Link>{' '}
            ·{' '}
            <Link to="/wissen/fdm-toleranzen-im-industriealltag/" className="text-primary-700 underline hover:text-primary-800">
              FDM-Toleranzen im Industriealltag
            </Link>{' '}
            ·{' '}
            <Link to="/ersatzteile-3d-drucken/" className="text-primary-700 underline hover:text-primary-800">
              Ersatzteile per 3D-Druck
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
};

export default DruckbarkeitPruefen;
