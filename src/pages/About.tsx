import React from 'react';
import { Link } from 'react-router-dom';
import { Award, Clock, Gauge, MessageSquare, ShieldCheck } from 'lucide-react';
import { BRAND } from '../lib/brand';

const About = () => {
  const principles = [
    {
      icon: <Award className="h-7 w-7" />,
      title: 'Qualitätsfokus',
      description:
        'Wir priorisieren belastbare Ergebnisse und saubere Verarbeitung vor kurzfristigen Billiglösungen.',
    },
    {
      icon: <Clock className="h-7 w-7" />,
      title: 'Verlässlichkeit',
      description:
        'Termine und Rückmeldungen werden transparent kommuniziert, damit Planungssicherheit entsteht.',
    },
    {
      icon: <Gauge className="h-7 w-7" />,
      title: 'Technische Klarheit',
      description:
        'Anforderungen wie Einsatzbereich, Toleranz und Materialwahl werden vor Produktionsstart abgestimmt.',
    },
    {
      icon: <MessageSquare className="h-7 w-7" />,
      title: 'Direkter Austausch',
      description:
        'Sie sprechen mit einem Ansprechpartner, der Ihr Projekt technisch versteht und begleitet.',
    },
  ];

  const workflow = [
    '1. Projektaufnahme mit Datei, Einsatzfall und Zielanforderungen',
    '2. Prüfung auf Material-, Geometrie- und Fertigungsrisiken',
    '3. Strukturierte Angebotserstellung mit Lieferaussage',
    '4. Fertigung, Nachbearbeitung und Qualitätskontrolle',
    '5. Versand mit klarer Kommunikation zum Status',
  ];

  return (
    <div className="py-16 animate-fade-in">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Über {BRAND.publicName}</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {BRAND.publicName} steht für hochwertige, verlässliche Projektabwicklung im
            3D-Druck. Unser Anspruch ist eine Lösung, die technisch passt und im
            Alltag funktioniert.
          </p>
        </div>

        <section className="bg-gradient-to-br from-primary-50 to-white rounded-2xl p-8 md:p-12 mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">
            Positionierung: Qualität + Verlässlichkeit
          </h2>
          <p className="text-lg text-gray-700 max-w-4xl">
            Wir arbeiten mit klarem Qualitätsanspruch. Der Schwerpunkt liegt auf
            nachvollziehbarer Materialwahl, prozesssicherer Umsetzung und klarer
            Kommunikation bei Termin, Funktion und Ergebnis.
          </p>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            {principles.map((item, index) => (
              <article
                key={index}
                className="bg-white border border-gray-200 rounded-xl p-6"
              >
                <div className="bg-primary-100 text-primary-700 p-3 rounded-lg w-fit mb-4">
                  {item.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          <article className="bg-white border border-gray-200 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">So arbeiten wir</h2>
            <ul className="space-y-3">
              {workflow.map((step, index) => (
                <li key={index} className="flex items-start gap-3 text-gray-700">
                  <ShieldCheck className="h-5 w-5 text-primary-600 flex-shrink-0 mt-0.5" />
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </article>

          <article className="bg-white border border-gray-200 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Verantwortung & Ansprechpartner</h2>
            <p className="text-gray-700 mb-3">
              In der {BRAND.legalName} begleiten wir Projekte mit Fokus auf
              Fertigungsqualität, verlässliche Abläufe und praxisnahe Lösungsfindung.
            </p>
            <p className="text-gray-700 mb-6">
              Ziel ist nicht nur ein druckbares Modell, sondern ein Bauteil, das
              im vorgesehenen Einsatz zuverlässig funktioniert.
            </p>
            <Link
              to="/projekt-starten"
              className="bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors inline-block"
            >
              Projekt starten
            </Link>
          </article>
        </section>

        <section className="bg-primary-600 text-white rounded-2xl p-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Anfrage mit technischem Fokus</h2>
          <p className="text-primary-100 max-w-2xl mx-auto mb-6">
            Wenn Sie ein belastbares Ergebnis und verlässliche Abwicklung suchen,
            starten Sie Ihre Projektanfrage direkt über den Konfigurator.
          </p>
          <Link
            to="/projekt-starten"
            className="bg-white text-primary-600 px-6 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors inline-block"
          >
            Zur Projektanfrage
          </Link>
        </section>
      </div>
    </div>
  );
};

export default About;
