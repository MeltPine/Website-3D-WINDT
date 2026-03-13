import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle, ShieldCheck, Users } from 'lucide-react';
import { BRAND, CONTACT } from '../lib/brand';

const phoneHref = `tel:${CONTACT.phone.replace(/[^\d+]/g, '')}`;

const About = () => {
  const processSteps = [
    {
      title: '1. Projektaufnahme',
      detail: 'Datei, Einsatzfall, Stückzahl und Liefertermin werden strukturiert aufgenommen.',
      sla: 'Direkte Eingangsbestätigung',
    },
    {
      title: '2. Technische Risikoprüfung',
      detail: 'Material, Geometrie und Einsatzbedingungen werden vor Fertigungsstart abgestimmt.',
      sla: 'Rückmeldung in der Regel innerhalb von 24 Stunden',
    },
    {
      title: '3. Angebot mit Lieferaussage',
      detail:
        'Sie erhalten ein individuelles Angebot mit transparentem Lieferfenster statt pauschaler Preisversprechen.',
      sla: 'Lieferfenster je Auftrag klar benannt',
    },
    {
      title: '4. Fertigung und Auslieferung',
      detail: 'Produktion erfolgt nach Freigabe mit klarer Kommunikation bis zum Versand.',
      sla: 'Express nur bei bestätigter Machbarkeit',
    },
  ];

  const fitProfiles = [
    'Maschinenbau und Anlagenbau mit funktionsrelevanten Bauteilen',
    'Produktionsumgebungen mit Bedarf an Vorrichtungen und Montagehilfen',
    'Instandhaltungsteams mit abgekündigten oder schwer verfügbaren Ersatzteilen',
    'Entwicklungsteams mit kurzen Iterationszyklen für Funktionsprototypen',
  ];

  const notFitProfiles = [
    'Preisgetriebene Massenaufträge ohne technische Klärung',
    'Deko- und Geschenkartikel ohne industriellen Einsatzfokus',
    'Projekte mit unklaren Anforderungen, aber festen Sofortpreis-Erwartungen',
  ];

  const trustPoints = [
    `Antwortzeit: ${CONTACT.responseTime} (werktags)`,
    'Technische Rückfragen werden vor Produktionsstart aktiv geklärt',
    'Lieferfenster wird pro Auftrag transparent im Angebot ausgewiesen',
    'Direkte Ansprechpartner statt anonymer Ticketkette',
  ];

  return (
    <div className="py-16 animate-fade-in">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <section className="text-center mb-14">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Über {BRAND.publicName}</h1>
          <p className="text-xl text-gray-600 max-w-4xl mx-auto">
            {BRAND.publicName} steht für industriellen 3D-Druck mit Prozesssicherheit,
            technischer Klarheit und verlässlicher Kommunikation.
          </p>
        </section>

        <section className="bg-gradient-to-br from-primary-50 to-white rounded-2xl p-8 md:p-12 mb-14">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">So läuft ein Industrieauftrag ab</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {processSteps.map((step) => (
              <article key={step.title} className="bg-white border border-gray-200 rounded-xl p-5">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-700 mb-3">{step.detail}</p>
                <p className="text-xs font-semibold text-primary-700 bg-primary-50 inline-block px-2 py-1 rounded">
                  Serviceziel: {step.sla}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-14">
          <article className="bg-white border border-gray-200 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Für wen wir arbeiten</h2>
            <ul className="space-y-3">
              {fitProfiles.map((item) => (
                <li key={item} className="flex items-start gap-3 text-gray-700">
                  <Users className="h-5 w-5 text-primary-600 flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>

          <article className="bg-white border border-gray-200 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Wofür wir nicht passend sind</h2>
            <ul className="space-y-3">
              {notFitProfiles.map((item) => (
                <li key={item} className="flex items-start gap-3 text-gray-700">
                  <ShieldCheck className="h-5 w-5 text-gray-500 flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>
        </section>

        <section className="bg-white border border-gray-200 rounded-2xl p-8 mb-14">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Verlässlichkeit und Kommunikation</h2>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {trustPoints.map((item) => (
              <li key={item} className="flex items-start gap-3 text-gray-700">
                <CheckCircle className="h-5 w-5 text-primary-600 flex-shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-primary-600 text-white rounded-2xl p-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Technisches Projekt direkt anfragen</h2>
          <p className="text-primary-100 max-w-3xl mx-auto mb-6">
            Wenn Sie ein belastbares Ergebnis statt Preisroulette wollen, senden Sie Ihre
            Projektinformationen direkt über das Formular.
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
              className="border border-white/70 text-white px-6 py-3 rounded-lg font-medium hover:bg-white/10 transition-colors"
            >
              Telefonische Rückfrage
            </a>
          </div>
        </section>
      </div>
    </div>
  );
};

export default About;
