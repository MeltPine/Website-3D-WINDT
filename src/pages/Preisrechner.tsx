import { ArrowRight, Calculator, CheckCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import GlassSurface from '../components/GlassSurface';
import QuoteWorkbench from '../components/quote/QuoteWorkbench';
import { getQuoteSession } from '../lib/quote/quoteSession';
import { trackEvent } from '../lib/tracking';

const facts = [
  'STL, OBJ, 3MF und STEP direkt im Browser ansehen',
  'Abmessungen, Volumen und Bauraum-Check sofort',
  'Unverbindliche Richtpreis-Spanne nach Material und Stückzahl',
  'Mit einem Klick zur Anfrage – Datei und Parameter sind schon eingetragen',
];

const Preisrechner = () => {
  const navigate = useNavigate();

  const goToRequest = () => {
    const session = getQuoteSession();
    trackEvent('quote_request_cta_clicked', {
      form: 'quote',
      file_count: session.entries.length,
      material: session.selection.materialId,
      quantity: session.selection.quantity,
    });
    navigate('/projekt-starten/');
  };

  return (
    <div className="py-16 animate-fade-in">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <GlassSurface as="section" variant="hero" density="normal" className="p-8 md:p-10 mb-8">
          <div className="bg-primary-100 text-primary-700 p-3 rounded-lg w-fit mb-5">
            <Calculator className="h-7 w-7" aria-hidden="true" />
          </div>
          <h1 className="font-display text-4xl font-bold text-gray-900 mb-3">3D-Druck Preisrechner</h1>
          <p className="text-lg text-gray-700 max-w-3xl">
            Laden Sie Ihr CAD-Modell hoch und erhalten Sie in Sekunden eine unverbindliche Richtpreis-Spanne für
            den industriellen FDM-3D-Druck – inklusive 3D-Vorschau und Maßen. Das verbindliche Angebot folgt nach
            technischer Prüfung.
          </p>
          <ul className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-2">
            {facts.map((fact) => (
              <li key={fact} className="flex items-start gap-2 text-gray-700">
                <CheckCircle className="h-5 w-5 text-primary-600 mt-0.5 shrink-0" aria-hidden="true" />
                <span>{fact}</span>
              </li>
            ))}
          </ul>
        </GlassSurface>

        <QuoteWorkbench
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

        <p className="mt-8 text-sm text-gray-600 text-center">
          Keine Datei zur Hand oder ein komplexes Projekt?{' '}
          <Link to="/projekt-starten/" className="text-primary-700 underline hover:text-primary-800">
            Direkt zur Projektanfrage
          </Link>{' '}
          oder{' '}
          <Link to="/kontakt/" className="text-primary-700 underline hover:text-primary-800">
            Rückruf anfragen
          </Link>
          .
        </p>
      </div>
    </div>
  );
};

export default Preisrechner;
