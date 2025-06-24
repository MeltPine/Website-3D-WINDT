import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Printer,
  Scan as Scan3D,
  PenTool,
  Leaf,
  CheckCircle,
  Star,
} from 'lucide-react';

const Home = () => {
  const features = [
    {
      icon: <Printer className="h-6 w-6" />,
      title: '3D-Druck',
      description:
        'Präzise Fertigung mit hochwertigen Materialien wie PLA, PETG, ABS und ASA.',
    },
    {
      icon: <PenTool className="h-6 w-6" />,
      title: 'CAD-Modellierung',
      description: 'Professionelle 3D-Modellierung und Anpassung Ihrer Ideen.',
    },
    {
      icon: <Scan3D className="h-6 w-6" />,
      title: '3D-Scanning',
      description:
        'Digitalisierung physischer Objekte für weitere Bearbeitung.',
    },
    {
      icon: <Leaf className="h-6 w-6" />,
      title: 'Nachhaltig',
      description:
        'Lokale Produktion in Deutschland für kurze Wege und Umweltschutz.',
    },
  ];

  const benefits = [
    'Schnelle Bearbeitung und Lieferung',
    'Faire und transparente Preisgestaltung',
    'Höchste Qualitätsstandards',
    'Persönliche Beratung und Support',
    'Nachhaltige Produktion made in Germany',
    'Flexibilität für Einzel- und Serienfertigung',
  ];

  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-50 to-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Professioneller{' '}
              <span className="text-primary-600">
                3D-Druck Service
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Von der Idee zum fertigen Produkt. Wir bieten professionelle
              3D-Druckdienstleistungen, CAD-Modellierung und 3D-Scanning für
              Privat- und Geschäftskunden in ganz Deutschland.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/projekt-starten"
                className="bg-primary-600 text-white px-8 py-4 rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center justify-center space-x-2 group"
              >
                <span>Projekt jetzt starten</span>
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/leistungen"
                className="border border-primary-600 text-primary-600 px-8 py-4 rounded-lg font-medium hover:bg-primary-50 transition-colors"
              >
                Unsere Leistungen
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Unsere Kernleistungen
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Umfassende 3D-Druckdienstleistungen für alle Ihre Projekte
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-gray-50 p-6 rounded-xl hover:shadow-lg transition-shadow group"
              >
                <div className="bg-primary-500 text-white p-3 rounded-lg w-fit mb-4 group-hover:bg-primary-600 transition-colors">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Overview */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Transparente Preisgestaltung
            </h2>
            <p className="text-lg text-gray-600">
              Faire Preise ohne versteckte Kosten
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="text-center">
                <Printer className="h-12 w-12 text-primary-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  3D-Druck
                </h3>
                <div className="text-3xl font-bold text-primary-600 mb-2">
                  0,35€
                </div>
                <div className="text-gray-600 mb-4">pro Gramm</div>
                <p className="text-sm text-gray-500">
                  Alle gängigen Materialien inklusive
                </p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="text-center">
                <PenTool className="h-12 w-12 text-primary-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  CAD-Modellierung
                </h3>
                <div className="text-3xl font-bold text-primary-600 mb-2">
                  60€
                </div>
                <div className="text-gray-600 mb-4">pro Stunde</div>
                <p className="text-sm text-gray-500">
                  Professionelle 3D-Modellierung
                </p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="text-center">
                <Scan3D className="h-12 w-12 text-primary-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  3D-Scanning
                </h3>
                <div className="text-3xl font-bold text-primary-600 mb-2">
                  30€
                </div>
                <div className="text-gray-600 mb-4">Pauschalpreis</div>
                <p className="text-sm text-gray-500">Objektdigitalisierung</p>
              </div>
            </div>
          </div>

          <div className="text-center mt-8">
            <p className="text-sm text-gray-600 mb-4">
              Mindestbestellwert: 10€ | Kostenlose Beratung inklusive
            </p>
            <Link
              to="/projekt-starten"
              className="bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors inline-flex items-center space-x-2"
            >
              <span>Kostenlos kalkulieren</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Warum 3D-WINDT?
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Wir kombinieren modernste Technologie mit handwerklicher
                Präzision und nachhaltigen Produktionsmethoden.
              </p>
              <ul className="space-y-4">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <CheckCircle className="h-6 w-6 text-primary-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-gradient-to-br from-primary-50 to-primary-100 p-8 rounded-2xl">
              <div className="text-center">
                <div className="flex justify-center space-x-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="h-6 w-6 text-yellow-400 fill-current"
                    />
                  ))}
                </div>
                <blockquote className="text-lg text-gray-700 mb-4">
                  "Hervorragende Qualität und schnelle Lieferung. Die Beratung
                  war sehr professionell und das Ergebnis übertraf unsere
                  Erwartungen."
                </blockquote>
                <cite className="text-primary-600 font-medium">
                  — Zufriedener Kunde
                </cite>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Bereit für Ihr nächstes Projekt?
          </h2>
          <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
            Starten Sie noch heute mit unserem einfachen Konfigurator und
            erhalten Sie ein kostenloses Angebot.
          </p>
          <Link
            to="/projekt-starten"
            className="bg-white text-primary-600 px-8 py-4 rounded-lg font-medium hover:bg-gray-50 transition-colors inline-flex items-center space-x-2 group"
          >
            <span>Projekt jetzt starten</span>
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;
