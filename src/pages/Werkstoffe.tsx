import { Link } from 'react-router-dom';
import { PRINTCHECK_PATH } from '../lib/printcheck/content';
import { ArrowRight, Calculator, FlaskConical } from 'lucide-react';
import GlassSurface from '../components/GlassSurface';
import Breadcrumbs from '../components/werkstoffe/Breadcrumbs';
import ComparisonTable from '../components/werkstoffe/ComparisonTable';
import { LibraryDisclaimer } from '../components/werkstoffe/DatasheetBits';
import UseCaseGuide from '../components/werkstoffe/UseCaseGuide';
import { WERKSTOFF_FAMILIES, CALCULATOR_PATH, werkstoffPath } from '../lib/werkstoffe/families';
import { LIBRARY_PRODUCTS, productsForFamily } from '../lib/werkstoffe/library';

const audiences = [
  {
    title: 'Einkauf',
    text: 'Nachvollziehbare Werkstoffangaben mit Hersteller, Datenblatt und Abrufdatum – als Grundlage für Anfrage und Lieferantenvergleich.',
  },
  {
    title: 'Instandhaltung',
    text: 'Schnelle Einordnung, welcher Werkstoff für ein Ersatzteil in Frage kommt und wo seine Grenzen liegen.',
  },
  {
    title: 'Konstruktion',
    text: 'Kennwerte mit Einheit und Prüfnorm, Originaldatenblatt als Quelle und klare Hinweise, was Datenblattwerte nicht aussagen.',
  },
];

const Werkstoffe = () => {
  const familiesWithoutDatasheet = WERKSTOFF_FAMILIES.filter((family) => family.productIds.length === 0);
  const manufacturers = Array.from(new Set(LIBRARY_PRODUCTS.map((product) => product.manufacturer)));

  return (
    <div className="py-16 animate-fade-in">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Breadcrumbs items={[{ name: 'Start', path: '/' }, { name: 'Werkstoffe' }]} />

        <GlassSurface as="section" variant="hero" density="normal" className="p-8 md:p-10 mb-10">
          <div className="bg-primary-100 text-primary-700 p-3 rounded-lg w-fit mb-5">
            <FlaskConical className="h-7 w-7" aria-hidden="true" />
          </div>
          <h1 className="font-display text-4xl font-bold text-gray-900 mb-4">
            Werkstoff-Bibliothek für den industriellen 3D-Druck
          </h1>
          <p className="text-lg text-gray-700 max-w-4xl">
            Welcher Kunststoff passt zu Ihrem Bauteil? Hier finden Sie die Werkstoffe, die wir im FDM-Verfahren
            verarbeiten – mit Stärken, Grenzen und Kennwerten direkt aus den Herstellerdatenblättern. Jeder Wert
            mit Einheit, Prüfnorm und Link zum Originaldokument. Was im Datenblatt fehlt, schätzen wir nicht.
          </p>
          <p className="mt-3 text-sm text-gray-600">
            Referenzierte Hersteller: {manufacturers.join(', ')} · {LIBRARY_PRODUCTS.length} Produkte mit
            Datenblatt
          </p>
          <div className="flex flex-col sm:flex-row gap-4 mt-8">
            <a
              href="#einsatzfall"
              className="bg-primary-700 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-800 transition-colors inline-flex items-center justify-center gap-2"
            >
              Material nach Einsatzfall finden
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </a>
            <Link
              to={CALCULATOR_PATH}
              className="border border-primary-700 text-primary-700 px-6 py-3 rounded-lg font-medium hover:bg-primary-50 transition-colors inline-flex items-center justify-center gap-2"
            >
              <Calculator className="h-5 w-5" aria-hidden="true" />
              Zum Preisrechner
            </Link>
            <Link
              to={PRINTCHECK_PATH}
              className="border border-primary-700 text-primary-700 px-6 py-3 rounded-lg font-medium hover:bg-primary-50 transition-colors inline-flex items-center justify-center gap-2"
            >
              Druckbarkeit prüfen
            </Link>
          </div>
        </GlassSurface>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12" aria-label="Für wen diese Bibliothek gedacht ist">
          {audiences.map((audience) => (
            <GlassSurface key={audience.title} as="article" variant="card" density="light" className="p-6">
              <h2 className="font-display text-xl font-semibold text-gray-900 mb-2">{audience.title}</h2>
              <p className="text-gray-700">{audience.text}</p>
            </GlassSurface>
          ))}
        </section>

        <section id="einsatzfall" className="mb-14 scroll-mt-28">
          <h2 className="font-display text-3xl font-bold text-gray-900 mb-2">Welches Material für meinen Einsatz?</h2>
          <p className="text-gray-700 mb-6 max-w-4xl">
            Eine erste Orientierung nach dem wichtigsten Einsatzkriterium. Die endgültige Werkstoffwahl treffen wir
            gemeinsam mit Ihnen in der technischen Prüfung – nach Last, Temperatur, Medien und Stückzahl.
          </p>
          <UseCaseGuide />
        </section>

        <section className="mb-14">
          <h2 className="font-display text-3xl font-bold text-gray-900 mb-6">Werkstoffe im Überblick</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {WERKSTOFF_FAMILIES.map((family) => {
              const count = productsForFamily(family.slug).length;
              return (
                <article key={family.slug} className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col">
                  <h3 className="font-display text-2xl font-semibold text-gray-900 mb-2">{family.name}</h3>
                  <p className="text-gray-700 mb-4">{family.teaser}</p>
                  <p className="text-sm text-gray-600 mb-5">
                    {count === 0
                      ? 'Noch kein Herstellerdatenblatt hinterlegt'
                      : count === 1
                        ? '1 Herstellerprodukt mit Datenblatt'
                        : `${count} Herstellerprodukte mit Datenblatt`}
                  </p>
                  <Link
                    to={werkstoffPath(family.slug)}
                    className="mt-auto text-primary-700 font-medium hover:text-primary-800 inline-flex items-center gap-2"
                  >
                    Eigenschaften & Kennwerte
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mb-14" aria-labelledby="vergleich">
          <h2 id="vergleich" className="font-display text-3xl font-bold text-gray-900 mb-2">
            Kennwerte im Vergleich
          </h2>
          <p className="text-gray-700 mb-6 max-w-4xl">
            Alle Werte stammen aus dem jeweils verlinkten Herstellerdatenblatt, mit Einheit und Prüfnorm. Zeigt
            eine Spalte einen verwandten Kennwert (z. B. Streckspannung statt Zugfestigkeit), ist das unter dem
            Wert vermerkt.
          </p>
          <ComparisonTable
            products={LIBRARY_PRODUCTS}
            caption="Kennwerte der Herstellerprodukte laut Datenblatt"
            linkFamilies
          />
          {familiesWithoutDatasheet.length > 0 && (
            <p className="mt-4 text-sm text-gray-600">
              Für {familiesWithoutDatasheet.map((family) => family.name).join(', ')} ist noch kein
              Herstellerdatenblatt hinterlegt. Kennwerte nennen wir dort projektbezogen mit dem konkret
              eingesetzten Filament.
            </p>
          )}
          <p className="mt-2 text-sm text-gray-600">
            HDT/A und HDT/B unterscheiden sich in der Prüflast, Vicat-Werte im Verfahren (A oder B) – Werte
            unterschiedlicher Verfahren sind nicht direkt vergleichbar.
          </p>
          <div className="mt-6">
            <LibraryDisclaimer />
          </div>
        </section>

        <section className="bg-primary-600 rounded-xl p-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Werkstoff unklar? Wir prüfen Ihren Einsatzfall.</h2>
          <p className="text-primary-100 mb-6 max-w-3xl mx-auto">
            Nennen Sie uns Last, Temperatur, Medienkontakt und Stückzahl – wir schlagen den passenden Werkstoff
            vor und begründen die Wahl im Angebot.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/projekt-starten/"
              className="bg-primary-800/65 border border-primary-200/45 text-primary-50 px-6 py-3 rounded-lg font-medium hover:bg-primary-800/80 transition-colors inline-flex items-center justify-center gap-2 shadow-sm"
            >
              Projekt starten
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              to={CALCULATOR_PATH}
              className="bg-primary-900/25 border border-primary-200/40 text-primary-50 px-6 py-3 rounded-lg font-medium hover:bg-primary-900/40 transition-colors inline-flex items-center justify-center"
            >
              Richtpreis berechnen
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Werkstoffe;
