import { useEffect, useState } from 'react';
import { ArrowRight, Calculator, CheckCircle } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import GlassSurface from '../components/GlassSurface';
import PrintCheckExplainer from '../components/printcheck/PrintCheckExplainer';
import QuoteWorkbench from '../components/quote/QuoteWorkbench';
import { getQuoteSession, updateQuoteSelection } from '../lib/quote/quoteSession';
import { trackEvent } from '../lib/tracking';
import {
  CALCULATOR_MATERIAL_PARAM,
  WERKSTOFFE_PATH,
  familyForCatalogMaterial,
  werkstoffPath,
} from '../lib/werkstoffe/families';

const facts = [
  'STL, OBJ, 3MF und STEP direkt im Browser ansehen',
  'Druckbarkeits-Check: Wandstärke, Überhänge, Bohrungen, Bauraum – mit 3D-Markierung',
  'Unverbindliche Richtpreis-Spanne nach Material und Stückzahl',
  'Mit einem Klick zur Anfrage – Datei und Parameter sind schon eingetragen',
];

/** Only plain catalog ids are accepted from the URL. */
const MATERIAL_ID_PATTERN = /^[a-z0-9_-]{1,64}$/;

type Preselection =
  | { status: 'applied'; name: string; familySlug: string | null }
  | { status: 'unknown' }
  | { status: 'failed' };

const Preisrechner = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedMaterial = searchParams.get(CALCULATOR_MATERIAL_PARAM);
  const [preselection, setPreselection] = useState<Preselection | null>(null);

  // `?material=<id>` (links from the material library) preselects a material.
  // The catalog lives in the lazy calculator chunk, so it is imported here
  // only when the parameter is present; unknown ids keep the default.
  useEffect(() => {
    if (!requestedMaterial) {
      return;
    }
    if (!MATERIAL_ID_PATTERN.test(requestedMaterial)) {
      setPreselection({ status: 'unknown' });
      return;
    }
    let cancelled = false;
    import('../lib/quote/materials').then(
      ({ MATERIAL_CATALOG }) => {
        if (cancelled) return;
        const material = MATERIAL_CATALOG.find((entry) => entry.id === requestedMaterial);
        if (!material) {
          setPreselection({ status: 'unknown' });
          return;
        }
        updateQuoteSelection({ materialId: material.id });
        setPreselection({
          status: 'applied',
          name: material.name,
          familySlug: familyForCatalogMaterial(material)?.slug ?? null,
        });
        trackEvent('quote_material_preselected', { form: 'quote', material: material.id });
      },
      () => {
        if (!cancelled) setPreselection({ status: 'failed' });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [requestedMaterial]);

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
          <p className="mt-5 text-sm text-gray-600">
            Unsicher beim Material?{' '}
            <Link to={WERKSTOFFE_PATH} className="text-primary-700 underline hover:text-primary-800">
              Werkstoff-Bibliothek mit Datenblattwerten
            </Link>
          </p>
        </GlassSurface>

        {preselection && (
          <p className="mb-6 rounded-lg border border-primary-200 bg-primary-50 px-4 py-3 text-sm text-gray-700" role="status">
            {preselection.status === 'applied' ? (
              <>
                Vorausgewählt: <span className="font-semibold text-gray-900">{preselection.name}</span>. Sie können das
                Material nach dem Hochladen ändern.
                {preselection.familySlug && (
                  <>
                    {' '}
                    <Link
                      to={werkstoffPath(preselection.familySlug)}
                      className="text-primary-700 underline hover:text-primary-800"
                    >
                      Eigenschaften & Datenblatt
                    </Link>
                  </>
                )}
              </>
            ) : preselection.status === 'unknown' ? (
              'Das angefragte Material ist im Rechner nicht verfügbar. Bitte wählen Sie nach dem Hochladen ein Material aus.'
            ) : (
              'Die Materialauswahl konnte nicht geladen werden. Bitte wählen Sie nach dem Hochladen ein Material aus.'
            )}
          </p>
        )}

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

        <div className="mt-10">
          <PrintCheckExplainer headingId="calculator-printcheck" linkToLanding />
        </div>

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
