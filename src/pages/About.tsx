import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle, ShieldCheck, Users } from 'lucide-react';
import GlassSurface from '../components/GlassSurface';
import { BRAND, CONTACT } from '../lib/brand';

const phoneHref = `tel:${CONTACT.phone.replace(/[^\d+]/g, '')}`;

const About = () => {
  const aboutHighlights = [
    'Technische Klarheit statt Marketing-Sprech',
    'Reale Lieferfenster statt pauschaler Expressversprechen',
    'B2B-Fokus auf Maschinenbau, Produktion und Instandhaltung',
  ];

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
        <section className="mb-14">
          <GlassSurface variant="hero" density="normal" className="p-8 md:p-10">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start">
              <div className="text-left">
                <p className="inline-flex items-center rounded-full bg-primary-50 text-primary-800 ring-1 ring-primary-200 px-3 py-1 text-xs font-semibold tracking-wide uppercase">
                  Über uns
                </p>
                <h1 className="font-display text-4xl font-bold text-gray-900 mt-4 mb-4">
                  Über {BRAND.publicName}
                </h1>
                <p className="text-xl text-gray-700 max-w-4xl">
                  {BRAND.publicName} steht für industriellen 3D-Druck mit Prozesssicherheit,
                  technischer Klarheit und verlässlicher Kommunikation.
                </p>
              </div>
              <div className="space-y-3">
                {aboutHighlights.map((item) => (
                  <div key={item} className="glass-lite rounded-lg px-4 py-3 text-sm text-gray-700">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </GlassSurface>
        </section>

        <section className="mb-14">
          <GlassSurface as="section" variant="card" density="light" className="p-8 md:p-10">
            <h2 className="font-display text-3xl font-bold text-gray-900 mb-6 text-center">
              So läuft ein Industrieauftrag ab
            </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {processSteps.map((step) => (
              <article key={step.title} className="glass-lite rounded-xl p-5">
                <h3 className="font-display text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-700 mb-3">{step.detail}</p>
                <p className="text-xs font-semibold text-primary-700 bg-primary-50 inline-block px-2 py-1 rounded">
                  Serviceziel: {step.sla}
                </p>
              </article>
            ))}
          </div>
          </GlassSurface>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-14">
          <GlassSurface as="article" variant="card" density="light" className="p-8">
            <h2 className="font-display text-2xl font-bold text-gray-900 mb-4">Für wen wir arbeiten</h2>
            <ul className="space-y-3">
              {fitProfiles.map((item) => (
                <li key={item} className="flex items-start gap-3 text-gray-700">
                  <Users className="h-5 w-5 text-primary-600 flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </GlassSurface>

          <GlassSurface as="article" variant="card" density="light" className="p-8">
            <h2 className="font-display text-2xl font-bold text-gray-900 mb-4">
              Wofür wir nicht passend sind
            </h2>
            <ul className="space-y-3">
              {notFitProfiles.map((item) => (
                <li key={item} className="flex items-start gap-3 text-gray-700">
                  <ShieldCheck className="h-5 w-5 text-gray-500 flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </GlassSurface>
        </section>

        <section className="mb-14">
          <GlassSurface as="section" variant="card" density="light" className="p-8">
            <h2 className="font-display text-2xl font-bold text-gray-900 mb-4">
              Verlässlichkeit und Kommunikation
            </h2>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {trustPoints.map((item) => (
              <li key={item} className="flex items-start gap-3 text-gray-700">
                <CheckCircle className="h-5 w-5 text-primary-600 flex-shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          </GlassSurface>
        </section>

        <section>
          <GlassSurface variant="cta" density="normal" className="p-8 text-center">
            <h2 className="font-display text-3xl font-bold text-white mb-4">
              Technisches Projekt direkt anfragen
            </h2>
            <p className="text-primary-50 max-w-3xl mx-auto mb-6">
              Wenn Sie ein belastbares Ergebnis statt Preisroulette wollen, senden Sie Ihre
              Projektinformationen direkt über das Formular.
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
                className="bg-primary-900/25 border border-primary-200/40 text-primary-50 px-6 py-3 rounded-lg font-medium hover:bg-primary-900/40 transition-colors inline-flex items-center justify-center"
              >
                Telefonische Rückfrage
              </a>
            </div>
          </GlassSurface>
        </section>
      </div>
    </div>
  );
};

export default About;
