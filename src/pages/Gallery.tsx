import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Factory, Phone, Ruler, Wrench } from 'lucide-react';
import GlassSurface from '../components/GlassSurface';
import { CONTACT } from '../lib/brand';
import { industryCaseStudies } from '../lib/caseStudies';

const phoneHref = `tel:${CONTACT.phone.replace(/[^\d+]/g, '')}`;

const iconByCategory = {
  ersatzteil: Wrench,
  montagehilfe: Factory,
  prototyp: Ruler,
} as const;

const Gallery = () => {
  return (
    <div className="py-16 animate-fade-in">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <section className="text-center mb-14 reveal-up">
          <h1 className="font-display text-4xl font-bold text-gray-900 mb-4">
            Industrie-Fallbeispiele (anonymisiert, verifiziert, freigegeben)
          </h1>
          <p className="text-xl text-gray-600 max-w-4xl mx-auto">
            Diese Galerie zeigt anonymisierte B2B-Anwendungsfälle als Übergangslösung.
            Verifizierte oder freigegebene Nachweise werden schrittweise ergänzt.
          </p>
        </section>

        <section className="glass-lite p-6 mb-12 reveal-up stagger-1">
          <p className="text-amber-900 leading-relaxed">
            Keine Deko- oder Hobbybeispiele: Alle gezeigten Karten orientieren sich an typischen
            Anforderungen aus Maschinenbau, Produktion, Anlagenbau und Werkstattumfeld.
          </p>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {industryCaseStudies.map((item) => {
            const Icon = iconByCategory[item.category];
            const primaryAsset = item.assets[0];
            const additionalAssets = item.assets.slice(1);

            return (
              <GlassSurface
                key={item.id}
                as="article"
                variant="card"
                density="light"
                className="p-6 reveal-up"
              >
                <div className="mb-5 overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                  <img
                    src={primaryAsset.src}
                    alt={primaryAsset.alt}
                    width={1200}
                    height={700}
                    loading="lazy"
                    className="w-full h-48 object-cover"
                  />
                </div>

                {additionalAssets.length > 0 && (
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    {additionalAssets.map((asset) => (
                      <div
                        key={asset.src}
                        className="overflow-hidden rounded-lg border border-gray-200 bg-gray-100"
                      >
                        <img
                          src={asset.src}
                          alt={asset.alt}
                          width={1200}
                          height={700}
                          loading="lazy"
                          className="w-full h-24 object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-start justify-between gap-4 mb-5">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary-100 text-primary-700 p-3 rounded-lg ring-1 ring-primary-200/80">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="font-display text-xl font-semibold text-gray-900">{item.title}</h2>
                      <p className="text-sm text-gray-500">
                        {item.proofStatus === 'freigegeben'
                          ? 'Kundenfreigegebener Case'
                          : item.proofStatus === 'verifiziert'
                            ? 'Verifizierter Industrie-Case'
                            : 'Anonymisierte CAD-Ansicht'}
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-gray-500 mb-5">
                  {item.assets.length} Assets hinterlegt | Nachweisart: {item.proofType}
                </p>

                <dl className="space-y-3 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <dt className="text-sm font-semibold text-gray-700">Anwendungsfall</dt>
                    <dd className="md:col-span-2 text-sm text-gray-700">{item.useCase}</dd>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <dt className="text-sm font-semibold text-gray-700">Bauteiltyp</dt>
                    <dd className="md:col-span-2 text-sm text-gray-700">{item.partType}</dd>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <dt className="text-sm font-semibold text-gray-700">Materialklasse</dt>
                    <dd className="md:col-span-2 text-sm text-gray-700">{item.materialClass}</dd>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <dt className="text-sm font-semibold text-gray-700">Stückzahlbereich</dt>
                    <dd className="md:col-span-2 text-sm text-gray-700">{item.quantityRange}</dd>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <dt className="text-sm font-semibold text-gray-700">Lieferfenster</dt>
                    <dd className="md:col-span-2 text-sm text-gray-700">{item.deliveryWindow}</dd>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <dt className="text-sm font-semibold text-gray-700">Ergebnisnutzen</dt>
                    <dd className="md:col-span-2 text-sm text-gray-700">{item.result}</dd>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <dt className="text-sm font-semibold text-gray-700">Messbarer Effekt</dt>
                    <dd className="md:col-span-2 text-sm text-gray-700">{item.measurableOutcome}</dd>
                  </div>
                </dl>

                <Link
                  to="/projekt-starten/"
                  className="text-primary-700 font-medium hover:text-primary-800 inline-flex items-center gap-2"
                >
                  Datei hochladen & technische Prüfung starten
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </GlassSurface>
            );
          })}
        </section>

        <section className="mt-16 text-center">
          <GlassSurface variant="cta" density="normal" className="p-8">
            <h2 className="font-display text-3xl font-bold text-white mb-4">Ihr Anwendungsfall ist nicht dabei?</h2>
            <p className="text-primary-50 mb-6 max-w-3xl mx-auto">
              Senden Sie Datei, Stückzahl und Einsatzbedingungen. Sie erhalten eine technische
              Einschätzung und ein individuelles Angebot.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/projekt-starten/"
                className="bg-primary-800/65 border border-primary-200/45 text-primary-50 px-6 py-3 rounded-lg font-medium hover:bg-primary-800/80 transition-colors inline-flex items-center justify-center gap-2 shadow-sm"
              >
                Datei hochladen & technische Prüfung starten
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href={phoneHref}
                className="bg-primary-900/25 border border-primary-200/40 text-primary-50 px-6 py-3 rounded-lg font-medium hover:bg-primary-900/40 transition-colors inline-flex items-center justify-center gap-2"
              >
                <Phone className="h-4 w-4" />
                Telefonische Rückfrage
              </a>
            </div>
          </GlassSurface>
        </section>
      </div>
    </div>
  );
};

export default Gallery;
