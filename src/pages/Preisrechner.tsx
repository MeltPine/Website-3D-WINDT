import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import PrintCheckExplainer from '../components/printcheck/PrintCheckExplainer';
import QuoteWorkbench from '../components/quote/QuoteWorkbench';
import { PRICING_CONFIG } from '../lib/quote/pricingConfig';
import { getQuoteSession, updateQuoteSelection } from '../lib/quote/quoteSession';
import { trackEvent } from '../lib/tracking';
import {
  CALCULATOR_MATERIAL_PARAM,
  WERKSTOFFE_PATH,
  familyForCatalogMaterial,
  werkstoffPath,
} from '../lib/werkstoffe/families';

const PRICING_BUILD_VOLUME = PRICING_CONFIG.buildVolumeMm.join(' × ');

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
    <div className="tech pb-16">
      <header className="blueprint border-b border-line">
        <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 md:py-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-[32px] font-semibold leading-[36px] text-ink md:text-[40px] md:leading-[44px]">3D-Druck Preisrechner</h1>
              <p className="mt-1 text-lg text-ink-soft">Modell rein, Richtpreis mit Rechenweg raus. Verbindlich wird&apos;s nach meiner Prüfung.</p>
            </div>
            <p className="inline-flex items-center gap-2 text-sm text-ink" aria-label="Status: Lokal, nichts übertragen">
              <span className="inline-block h-2.5 w-2.5 bg-ok" aria-hidden="true" /> Lokal · nichts übertragen
            </p>
          </div>
          <p className="mt-2 text-sm text-ink-muted">
            FDM auf Voron-Maschinen, Bauraum {PRICING_BUILD_VOLUME} mm · Werkstoffe mit geprüften Datenblattwerten in der{' '}
            <Link to={WERKSTOFFE_PATH} className="text-accent underline">
              Werkstoff-Bibliothek
            </Link>
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-[1440px] px-4 pt-6 sm:px-6 lg:px-8">
        {preselection && (
          <p className="mb-4 rounded border border-line bg-panel px-4 py-3 text-sm text-ink-soft" role="status">
            {preselection.status === 'applied' ? (
              <>
                Vorausgewählt: <span className="font-medium text-ink">{preselection.name}</span>. Den Werkstoff können Sie nach dem Laden ändern.
                {preselection.familySlug && (
                  <>
                    {' '}
                    <Link to={werkstoffPath(preselection.familySlug)} className="text-accent underline">
                      Eigenschaften & Datenblatt
                    </Link>
                  </>
                )}
              </>
            ) : preselection.status === 'unknown' ? (
              'Den angefragten Werkstoff gibt es im Rechner nicht. Bitte wählen Sie nach dem Laden einen aus.'
            ) : (
              'Die Werkstoffauswahl konnte nicht geladen werden. Bitte wählen Sie nach dem Laden einen aus.'
            )}
          </p>
        )}

        <QuoteWorkbench printCheckMode="calculator" onRequest={goToRequest} />

        <div className="mt-12">
          <PrintCheckExplainer headingId="calculator-printcheck" linkToLanding />
        </div>

        <p className="mt-8 text-center text-sm text-ink-muted">
          Keine Datei zur Hand oder ein komplexes Projekt?{' '}
          <Link to="/projekt-starten/" className="text-accent underline">
            Direkt zur Projektanfrage
          </Link>{' '}
          oder{' '}
          <Link to="/kontakt/" className="text-accent underline">
            Rückruf anfragen
          </Link>
          .
        </p>
      </div>
    </div>
  );
};

export default Preisrechner;
