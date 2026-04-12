import React from 'react';
import { Link } from 'react-router-dom';
import { Printer, PenTool, Scan as Scan3D, Package, Clock, Shield, ArrowRight } from 'lucide-react';
import GlassSurface from '../components/GlassSurface';

const Services = () => {
  const serviceHighlights = [
    'Technische Prüfung vor Produktionsstart',
    'Lieferfenster je Auftrag klar benannt',
    'Direkte Ansprechpartner statt Ticket-Pingpong',
  ];

  const services = [
    {
      icon: <Printer className="h-8 w-8" />,
      title: 'Industrieller 3D-Druck',
      description:
        'Fertigung von Funktionsbauteilen, Ersatzteilen und Kleinserien mit Fokus auf Einsatzfähigkeit, Wiederholbarkeit und technische Sauberkeit.',
      features: [
        'Material- und Einsatzprüfung vor Produktionsstart',
        'Belastbare Bauteile für Werkstatt und Produktion',
        'Einzelteil bis Kleinserie mit reproduzierbarer Qualität',
      ],
    },
    {
      icon: <PenTool className="h-8 w-8" />,
      title: 'CAD-Unterstützung',
      description:
        'Konstruktive Anpassung und Aufbereitung Ihrer Daten für stabile, druckgerechte Ergebnisse im industriellen Einsatz.',
      features: [
        'Anpassung bestehender CAD-Daten',
        'Rekonstruktion von Bauteilen nach Muster',
        'Optimierung für Funktion, Montage und Fertigung',
      ],
    },
    {
      icon: <Scan3D className="h-8 w-8" />,
      title: '3D-Scan & Nachfertigung',
      description:
        'Digitalisierung physischer Teile als Basis für Nachfertigung, Ersatzteilversorgung und technische Weiterentwicklung.',
      features: [
        'Scan-basierte Datenerstellung für Bestandsbauteile',
        'Nachfertigung abgekündigter Kunststoffteile',
        'Schnelle technische Rückmeldung zum Machbarkeitsstatus',
      ],
    },
  ];

  const additionalServices = [
    {
      icon: <Package className="h-6 w-6" />,
      title: 'Express-Bearbeitung',
      description: 'Priorisierte Projektbearbeitung bei kritischen Terminlagen.',
    },
    {
      icon: <Clock className="h-6 w-6" />,
      title: 'Nachbearbeitung',
      description: 'Bauteilfinish, Anpassungen und montagegerechte Vorbereitung.',
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: 'Qualitätsprüfung',
      description: 'Kontrolle relevanter Maße und technischer Anforderungen vor Auslieferung.',
    },
  ];

  return (
    <div className="py-16 animate-fade-in">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <section className="mb-14 reveal-up">
          <GlassSurface variant="hero" density="normal" className="p-8 md:p-10">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start">
              <div className="text-left">
                <p className="inline-flex items-center rounded-full bg-primary-50 text-primary-800 ring-1 ring-primary-200 px-3 py-1 text-xs font-semibold tracking-wide uppercase">
                  Leistungsübersicht
                </p>
                <h1 className="font-display text-4xl font-bold text-gray-900 mt-4 mb-4">
                  3D-Druck Dienstleistungen für Industriekunden
                </h1>
                <p className="text-lg text-gray-700 max-w-3xl">
                  Von der technischen Klärung bis zur Auslieferung: Wir unterstützen Produktion,
                  Instandhaltung und Entwicklung mit professionellem 3D-Druck Service.
                </p>
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-sm text-amber-900">
                    Diese Leistungen sind für Industrie- und B2B-Anfragen gedacht. Bewerbungen oder
                    Jobanfragen werden über diese Formulare nicht bearbeitet.
                  </p>
                </div>
                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                  <Link
                    to="/projekt-starten/"
                    className="bg-primary-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-800 transition-colors inline-flex items-center justify-center gap-2"
                  >
                    Projekt starten
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                  <Link
                    to="/kontakt/"
                    className="border border-primary-300 text-primary-800 px-6 py-3 rounded-lg font-semibold hover:bg-primary-50 transition-colors inline-flex items-center justify-center"
                  >
                    Rückruf anfragen
                  </Link>
                </div>
              </div>
              <div className="space-y-3">
                {serviceHighlights.map((item) => (
                  <div key={item} className="glass-lite rounded-lg px-4 py-3 text-sm text-gray-700">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </GlassSurface>
        </section>

        <section className="mb-16">
          <h2 className="font-display text-3xl font-bold text-gray-900 text-center mb-8">
            Kernleistungen
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {services.map((service) => (
            <GlassSurface
              key={service.title}
              as="article"
              variant="card"
              density="light"
              className="p-8 reveal-up h-full"
            >
              <div className="bg-primary-100 text-primary-700 p-3 rounded-lg w-fit mb-5 ring-1 ring-primary-200/80">
                {service.icon}
              </div>
              <h2 className="font-display text-2xl font-semibold text-gray-900 mb-3">{service.title}</h2>
              <p className="text-gray-700 mb-5">{service.description}</p>
              <ul className="space-y-3">
                {service.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-gray-700">
                    <div className="w-2 h-2 bg-primary-500 rounded-full mt-2"></div>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </GlassSurface>
          ))}
          </div>
        </section>

        <section className="mb-16 reveal-up">
          <GlassSurface as="section" variant="card" density="light" className="p-8 md:p-9">
            <h2 className="font-display text-2xl font-semibold text-gray-900 mb-2 text-center">
              Ergänzende Leistungen
            </h2>
            <p className="text-gray-600 text-center mb-6 max-w-3xl mx-auto">
              Diese Leistungen ergänzen den Fertigungsprozess bei Termin- oder Qualitätsanforderungen.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {additionalServices.map((service) => (
                <GlassSurface
                  key={service.title}
                  as="article"
                  variant="card"
                  density="light"
                  className="p-5"
                >
                  <div className="bg-primary-100 text-primary-700 p-2 rounded-lg w-fit mb-3 ring-1 ring-primary-200/80">
                    {service.icon}
                  </div>
                  <h3 className="font-display text-lg font-semibold text-gray-900 mb-2">
                    {service.title}
                  </h3>
                  <p className="text-gray-700">{service.description}</p>
                </GlassSurface>
              ))}
            </div>
          </GlassSurface>
        </section>

        <section className="reveal-up">
          <GlassSurface variant="cta" density="normal" className="p-8 text-center">
            <h2 className="font-display text-3xl font-bold text-white mb-4">
              Individuelles Angebot statt Pauschallösungen
            </h2>
            <p className="text-primary-50 mb-6 max-w-3xl mx-auto">
              Senden Sie uns Datei, Einsatzfall und Stückzahl. Sie erhalten innerhalb von 24 Stunden
              eine qualifizierte Rückmeldung mit individuellem Angebot.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/projekt-starten/"
                className="bg-primary-800/65 border border-primary-200/45 text-primary-50 px-6 py-3 rounded-lg font-medium hover:bg-primary-800/80 transition-colors inline-flex items-center justify-center gap-2 shadow-sm"
              >
                Projekt starten
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                to="/kontakt/"
                className="bg-primary-900/25 border border-primary-200/40 text-primary-50 px-6 py-3 rounded-lg font-medium hover:bg-primary-900/40 transition-colors inline-flex items-center justify-center"
              >
                Rückruf anfragen
              </Link>
            </div>
          </GlassSurface>
        </section>
      </div>
    </div>
  );
};

export default Services;
