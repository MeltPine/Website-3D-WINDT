import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRightIcon,
  BoxesIcon,
  CheckCircleIcon,
  ClockIcon,
  FactoryIcon,
  PhoneIcon,
  RulerIcon,
  UserCheckIcon,
  WrenchIcon,
} from '../components/icons';
import { BRAND, CONTACT } from '../lib/brand';
import { industryCaseStudies } from '../lib/caseStudies';

const phoneHref = `tel:${CONTACT.phone.replace(/[^\d+]/g, '')}`;

const Home = () => {
  const proofFacts = [
    {
      title: 'Antwortzeit',
      description: `${CONTACT.responseTime} (werktags).`,
      icon: <ClockIcon className="h-5 w-5" />,
    },
    {
      title: 'Typische Lieferfenster',
      description:
        'Lieferfenster werden je Bauteil und Stueckzahl im Angebot transparent benannt. Express nur nach technischer Abstimmung.',
      icon: <CheckCircleIcon className="h-5 w-5" />,
    },
    {
      title: 'Technische Rueckfragen',
      description:
        'Vor Fertigungsstart klaeren wir Geometrie, Material, Toleranz und Einsatzbedingungen mit Ihrem Team.',
      icon: <RulerIcon className="h-5 w-5" />,
    },
    {
      title: 'Direkter Ansprechpartner',
      description: 'Sie erhalten eine feste Kontaktperson fuer Rueckfragen bis zur Auslieferung.',
      icon: <UserCheckIcon className="h-5 w-5" />,
    },
  ];

  const processSteps = [
    {
      title: '1. Projektaufnahme',
      detail: 'Datei, Einsatzfall, Stueckzahl und Termin werden strukturiert aufgenommen.',
      sla: 'Eingangsbestaetigung direkt nach Anfrage',
    },
    {
      title: '2. Technische Pruefung',
      detail: 'Material-, Geometrie- und Fertigungsrisiken werden bewertet und rueckgekoppelt.',
      sla: 'Rueckmeldung in der Regel innerhalb von 24 Stunden',
    },
    {
      title: '3. Angebot mit Lieferaussage',
      detail: 'Sie erhalten ein individuelles, technisch geprueftes Angebot ohne Pauschalversprechen.',
      sla: 'Lieferfenster wird pro Auftrag benannt',
    },
    {
      title: '4. Fertigung und Auslieferung',
      detail: 'Produktion nach Freigabe mit transparentem Status bis zum Versand.',
      sla: 'Express nur bei bestaetigter Machbarkeit',
    },
  ];

  const industrySolutions = [
    {
      title: 'Ersatzteile 3D-Druck',
      description:
        'Wenn Teile ausfallen, zaehlen kurze Wege. Wir fertigen Ersatzteile schnell und belastbar nach.',
      href: '/ersatzteile-3d-drucken',
      icon: <WrenchIcon className="h-6 w-6" />,
    },
    {
      title: 'Prototypen 3D-Druck',
      description:
        'Fuer Entwicklungsteams, die Iterationen beschleunigen und Entscheidungen frueher absichern wollen.',
      href: '/prototypen-3d-druck',
      icon: <RulerIcon className="h-6 w-6" />,
    },
    {
      title: 'Montagehilfen & Vorrichtungen',
      description:
        'Passgenaue Produktionshilfen fuer stabile Ablaeufe, weniger Fehler und hoehere Effizienz.',
      href: '/montagehilfen-vorrichtungen',
      icon: <FactoryIcon className="h-6 w-6" />,
    },
    {
      title: 'Kunststoffteile nachfertigen',
      description:
        'Nachfertigung abgekuendigter oder schwer verfuegbarer Bauteile fuer Maschinen und Anlagen.',
      href: '/kunststoffteile-nachfertigen',
      icon: <BoxesIcon className="h-6 w-6" />,
    },
  ];

  const fitProfile = [
    'Maschinenbau, Produktion, Anlagenbau und Werkstattumfeld',
    'Funktionsbauteile, Vorrichtungen und Prototypen mit klarer technischer Anforderung',
    'Kunden mit Bedarf an technischer Pruefung statt Sofortpreis-Klick',
  ];

  const notFitProfile = [
    'Reine Preisvergleichsanfragen ohne technische Angaben',
    'Unkritische Deko- oder Hobbydrucke ohne Industriebezug',
    'Anfragen mit unklarer Datei-/Materiallage und unrealistischem Expresswunsch',
  ];

  const faqItems = [
    {
      question: 'Wie schnell erhalten wir eine Rueckmeldung?',
      answer:
        'In der Regel erhalten Sie innerhalb von 24 Stunden eine qualifizierte technische Einschaetzung.',
    },
    {
      question: 'Welche Materialien sind fuer industrielle Anwendungen verfuegbar?',
      answer:
        'Je nach Einsatzfall arbeiten wir unter anderem mit ABS, ASA, PC, PA-basierten Werkstoffen und TPU sowie weiteren technischen Materialien auf Anfrage.',
    },
    {
      question: 'Welche Genauigkeit ist beim 3D-Druck realistisch?',
      answer:
        'Die erreichbare Genauigkeit haengt von Geometrie, Material und Funktion ab. Relevante Toleranzen werden vor Produktionsstart abgestimmt.',
    },
  ];

  return (
    <div className="animate-fade-in">
      <section className="bg-gradient-to-br from-primary-50 to-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <img
            src="/logo/3dw-logo-full.webp"
            alt="3DW Additive Manufacturing Logo"
            className="h-36 md:h-44 w-auto mx-auto mb-6"
            loading="eager"
            decoding="async"
          />
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            3D-Druck fuer Industrie, Ersatzteile & Prototypen
          </h1>
          <p className="text-xl text-gray-700 mb-10 max-w-4xl mx-auto leading-relaxed">
            {BRAND.publicName} unterstuetzt Maschinenbau, Produktion, Anlagenbau und Werkstaetten mit
            professionellen 3D-Druck-Dienstleistungen. Sie erhalten technisch gepruefte Aussagen
            statt Preisversprechen ohne Kontext.
          </p>
          <p className="text-base text-gray-600 mb-10 max-w-4xl mx-auto leading-relaxed">
            Von funktionskritischen Ersatzteilen ueber belastbare Prototypen bis zu Montagehilfen
            erhalten Sie bei uns einen strukturierten Industrieprozess mit technischer Rueckmeldung,
            klarer Machbarkeitspruefung und transparentem Lieferfenster.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
            <Link
              to="/projekt-starten"
              className="bg-primary-600 text-white px-6 py-4 rounded-lg font-medium hover:bg-primary-700 transition-colors inline-flex items-center justify-center gap-2"
            >
              Datei hochladen
              <ArrowRightIcon className="h-5 w-5" />
            </Link>
            <Link
              to="/kontakt"
              className="border border-primary-600 text-primary-600 px-6 py-4 rounded-lg font-medium hover:bg-primary-50 transition-colors inline-flex items-center justify-center"
            >
              Rueckruf anfragen
            </Link>
            <a
              href={phoneHref}
              className="border border-gray-300 text-gray-700 px-6 py-4 rounded-lg font-medium hover:bg-white transition-colors inline-flex items-center justify-center gap-2"
            >
              <PhoneIcon className="h-4 w-4" />
              Telefonisch klaeren
            </a>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white cv-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-10">
            Belegbare Zusammenarbeit statt Werbeversprechen
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {proofFacts.map((fact) => (
              <article
                key={fact.title}
                className="bg-gray-50 border border-gray-200 rounded-xl p-5 flex items-start gap-3"
              >
                <div className="text-primary-600 mt-0.5">{fact.icon}</div>
                <div>
                  <h3 className="font-semibold text-gray-900">{fact.title}</h3>
                  <p className="text-gray-700">{fact.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-gray-50 cv-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-10">
            So laeuft ein Industrieauftrag ab
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {processSteps.map((step) => (
              <article key={step.title} className="bg-white border border-gray-200 rounded-xl p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-700 mb-4">{step.detail}</p>
                <p className="text-sm font-medium text-primary-700 bg-primary-50 inline-block px-3 py-1 rounded-full">
                  SLA: {step.sla}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-white cv-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-10">
            Loesungen fuer typische Industrie-Anwendungen
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {industrySolutions.map((item) => (
              <article key={item.title} className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                <div className="bg-primary-100 text-primary-700 p-3 rounded-lg w-fit mb-4">
                  {item.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-700 mb-4">{item.description}</p>
                <Link
                  to={item.href}
                  className="text-primary-600 font-medium hover:text-primary-700 inline-flex items-center gap-2"
                >
                  Zur Landingpage
                  <ArrowRightIcon className="h-4 w-4" />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-gray-50 cv-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">
            Fallbeispiele aus Industrieprojekten
          </h2>
          <p className="text-center text-gray-600 mb-10 max-w-3xl mx-auto">
            Aktuell zeigen wir anonymisierte CAD-Ansichten. Sobald Kundenfreigaben vorliegen,
            ersetzen wir diese schrittweise durch echte Projektbilder.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {industryCaseStudies.map((study) => (
              <article
                key={study.id}
                className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col"
              >
                <div className="mb-4 overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                  <img
                    src={study.visualSrc}
                    alt={study.visualAlt}
                    loading="lazy"
                    className="w-full h-44 object-cover"
                  />
                </div>
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">
                  {study.proofStatus === 'freigegeben'
                    ? 'Kundenfreigegebener Case'
                    : 'Anonymisierte CAD-Ansicht'}
                </p>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">{study.title}</h3>
                <p className="text-sm text-gray-900 font-semibold mb-1">Herausforderung</p>
                <p className="text-gray-700 mb-3">{study.challenge}</p>
                <p className="text-sm text-gray-900 font-semibold mb-1">Loesung</p>
                <p className="text-gray-700 mb-3">{study.solution}</p>
                <p className="text-sm text-gray-900 font-semibold mb-1">Ergebnisnutzen</p>
                <p className="text-gray-700 mb-5">{study.result}</p>
                <Link
                  to="/projekt-starten"
                  className="mt-auto text-primary-600 font-medium hover:text-primary-700 inline-flex items-center gap-2"
                >
                  Datei hochladen & technische Pruefung starten
                  <ArrowRightIcon className="h-4 w-4" />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-white cv-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-10">
            Fuer wen wir passen und wofuer nicht
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <article className="bg-gray-50 border border-gray-200 rounded-xl p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Passend fuer</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                {fitProfile.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
            <article className="bg-gray-50 border border-gray-200 rounded-xl p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Nicht passend fuer</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                {notFitProfile.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white cv-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-10">
            Haeufige Fragen aus dem Industrieumfeld
          </h2>
          <div className="space-y-4">
            {faqItems.map((faq) => (
              <article key={faq.question} className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{faq.question}</h3>
                <p className="text-gray-700">{faq.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-primary-600 cv-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Technische Pruefung starten und Rueckmeldung innerhalb von 24 Stunden erhalten
          </h2>
          <p className="text-primary-100 mb-8 text-lg">
            Senden Sie Datei und Anforderungen. Wir melden uns mit technischer Einschaetzung und
            individuellem Angebot.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/projekt-starten"
              className="bg-white text-primary-600 px-8 py-4 rounded-lg font-medium hover:bg-gray-100 transition-colors inline-flex items-center justify-center gap-2"
            >
              Datei hochladen & technische Pruefung starten
              <ArrowRightIcon className="h-5 w-5" />
            </Link>
            <Link
              to="/kontakt"
              className="border border-white/70 text-white px-8 py-4 rounded-lg font-medium hover:bg-white/10 transition-colors inline-flex items-center justify-center"
            >
              Rueckruf anfragen
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
