import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Boxes, Factory, Phone, Ruler, Wrench } from 'lucide-react';
import { CONTACT } from '../lib/brand';

type IndustryCase = {
  id: number;
  title: string;
  useCase: string;
  partType: string;
  materialClass: string;
  quantityRange: string;
  deliveryWindow: string;
  outcome: string;
  icon: React.ComponentType<{ className?: string }>;
};

const INDUSTRY_CASES: IndustryCase[] = [
  {
    id: 1,
    title: 'Ersatzteil für Sonderanlage',
    useCase: 'Ausfallkritisches Ersatzteil',
    partType: 'Funktionsbauteil mit Passflächen',
    materialClass: 'Technische Thermoplaste (ABS, ASA, PC je nach Lastprofil)',
    quantityRange: '1-20 Stück',
    deliveryWindow: 'Express nach Abstimmung, typischerweise 2-5 Werktage nach Freigabe',
    outcome: 'Stillstandszeiten reduziert und Nachfertigung reproduzierbar abgesichert',
    icon: Wrench,
  },
  {
    id: 2,
    title: 'Montagehilfe für Serienprozess',
    useCase: 'Prozessstabilisierung in der Fertigung',
    partType: 'Vorrichtung, Lehre oder Positionierhilfe',
    materialClass: 'Abrieb- und temperaturstabile Werkstoffe (z. B. ASA, PC, PA-basierte Materialien)',
    quantityRange: '1-50 Stück',
    deliveryWindow: 'Typischerweise 3-7 Werktage nach technischer Klärung',
    outcome: 'Fehlerquote in wiederkehrenden Schritten gesenkt',
    icon: Factory,
  },
  {
    id: 3,
    title: 'Prototyp zur Funktionsprüfung',
    useCase: 'Schnelle Iteration in der Produktentwicklung',
    partType: 'Funktionsnaher Prototyp mit Testgeometrien',
    materialClass: 'Anwendungsbezogene Werkstoffe (ABS, ASA, PC, TPU je nach Funktion)',
    quantityRange: '1-10 Stück pro Iteration',
    deliveryWindow: 'Typischerweise 2-4 Werktage pro Iteration',
    outcome: 'Entscheidungszyklen in Konstruktion und Test verkürzt',
    icon: Ruler,
  },
  {
    id: 4,
    title: 'Nachfertigung von Kunststoffabdeckung',
    useCase: 'Abgekündigtes Bauteil nachfertigen',
    partType: 'Abdeckung und Schutzkomponente',
    materialClass: 'UV- und medienbeständige Werkstoffe (z. B. ASA, PC)',
    quantityRange: '5-100 Stück',
    deliveryWindow: 'Typischerweise 4-8 Werktage nach Freigabe',
    outcome: 'Versorgungslücke geschlossen ohne Neuwerkzeug',
    icon: Boxes,
  },
];

const phoneHref = `tel:${CONTACT.phone.replace(/[^\d+]/g, '')}`;

const Gallery = () => {
  return (
    <div className="py-16 animate-fade-in">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <section className="text-center mb-14">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Typische Industrie-Anwendungen (anonymisiert)
          </h1>
          <p className="text-xl text-gray-600 max-w-4xl mx-auto">
            Diese Galerie zeigt bewusst anonymisierte B2B-Anwendungsfälle als Übergangslösung.
            Echte Projektfotos werden erst nach Kundenfreigabe veröffentlicht.
          </p>
        </section>

        <section className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-12">
          <p className="text-amber-900 leading-relaxed">
            Keine Deko- oder Hobbybeispiele: Alle gezeigten Karten orientieren sich an typischen
            Anforderungen aus Maschinenbau, Produktion, Anlagenbau und Werkstattumfeld.
          </p>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {INDUSTRY_CASES.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.id} className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary-100 text-primary-700 p-3 rounded-lg">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">{item.title}</h2>
                      <p className="text-sm text-gray-500">Anonymisierte Referenzstruktur</p>
                    </div>
                  </div>
                </div>

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
                    <dd className="md:col-span-2 text-sm text-gray-700">{item.outcome}</dd>
                  </div>
                </dl>

                <Link
                  to="/projekt-starten"
                  className="text-primary-600 font-medium hover:text-primary-700 inline-flex items-center gap-2"
                >
                  Datei hochladen & technische Prüfung starten
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </article>
            );
          })}
        </section>

        <section className="mt-16 bg-primary-600 text-white rounded-xl p-8 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ihr Anwendungsfall ist nicht dabei?
          </h2>
          <p className="text-primary-100 mb-6 max-w-3xl mx-auto">
            Senden Sie Datei, Stückzahl und Einsatzbedingungen. Sie erhalten eine technische
            Einschätzung und ein individuelles Angebot.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/projekt-starten"
              className="bg-white text-primary-600 px-6 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors inline-flex items-center justify-center gap-2"
            >
              Datei hochladen & technische Prüfung starten
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href={phoneHref}
              className="border border-white/70 text-white px-6 py-3 rounded-lg font-medium hover:bg-white/10 transition-colors inline-flex items-center justify-center gap-2"
            >
              <Phone className="h-4 w-4" />
              Telefonische Rückfrage
            </a>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Gallery;
