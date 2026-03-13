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
import GlassSurface from '../components/GlassSurface';
import { BRAND, CONTACT } from '../lib/brand';
import { industryCaseStudies } from '../lib/caseStudies';

const phoneHref = `tel:${CONTACT.phone.replace(/[^\d+]/g, '')}`;

const Home = () => {
  const verifiedCaseCount = industryCaseStudies.filter(
    (item) => item.proofStatus === 'verifiziert' || item.proofStatus === 'freigegeben',
  ).length;

  const heroControlPanel = [
    {
      label: 'Reaktionszeit',
      value: 'In der Regel unter 24h (werktags)',
    },
    {
      label: 'Verifizierte Cases',
      value: `${verifiedCaseCount} dokumentierte Industrie-Cases im Live-Bereich`,
    },
    {
      label: 'Datei-Upload',
      value: '4 Formate (STL, OBJ, 3MF, SVG) bis 50 MB je Datei',
    },
  ];

  const proofFacts = [
    {
      title: 'Antwortzeit',
      description: `${CONTACT.responseTime} (werktags).`,
      icon: <ClockIcon className="h-5 w-5" />,
    },
    {
      title: 'Typische Lieferfenster',
      description:
        'Lieferfenster werden je Bauteil und Stückzahl im Angebot transparent benannt. Express nur nach technischer Abstimmung.',
      icon: <CheckCircleIcon className="h-5 w-5" />,
    },
    {
      title: 'Technische Rückfragen',
      description:
        'Vor Fertigungsstart klären wir Geometrie, Material, Toleranz und Einsatzbedingungen mit Ihrem Team.',
      icon: <RulerIcon className="h-5 w-5" />,
    },
    {
      title: 'Direkter Ansprechpartner',
      description: 'Sie erhalten eine feste Kontaktperson für Rückfragen bis zur Auslieferung.',
      icon: <UserCheckIcon className="h-5 w-5" />,
    },
  ];

  const processSteps = [
    {
      title: '1. Projektaufnahme',
      detail: 'Datei, Einsatzfall, Stückzahl und Termin werden strukturiert aufgenommen.',
      sla: 'Eingangsbestätigung direkt nach Anfrage',
    },
    {
      title: '2. Technische Prüfung',
      detail: 'Material-, Geometrie- und Fertigungsrisiken werden bewertet und rückgekoppelt.',
      sla: 'Rückmeldung in der Regel innerhalb von 24 Stunden',
    },
    {
      title: '3. Angebot mit Lieferaussage',
      detail: 'Sie erhalten ein individuelles, technisch geprüftes Angebot ohne Pauschalversprechen.',
      sla: 'Lieferfenster wird pro Auftrag benannt',
    },
    {
      title: '4. Fertigung und Auslieferung',
      detail: 'Produktion nach Freigabe mit transparentem Status bis zum Versand.',
      sla: 'Express nur bei bestätigter Machbarkeit',
    },
  ];

  const industrySolutions = [
    {
      title: 'Ersatzteile 3D-Druck',
      description:
        'Wenn Teile ausfallen, zählen kurze Wege. Wir fertigen Ersatzteile schnell und belastbar nach.',
      href: '/ersatzteile-3d-drucken/',
      icon: <WrenchIcon className="h-6 w-6" />,
    },
    {
      title: 'Prototypen 3D-Druck',
      description:
        'Für Entwicklungsteams, die Iterationen beschleunigen und Entscheidungen früher absichern wollen.',
      href: '/prototypen-3d-druck/',
      icon: <RulerIcon className="h-6 w-6" />,
    },
    {
      title: 'Montagehilfen & Vorrichtungen',
      description:
        'Passgenaue Produktionshilfen für stabile Abläufe, weniger Fehler und höhere Effizienz.',
      href: '/montagehilfen-vorrichtungen/',
      icon: <FactoryIcon className="h-6 w-6" />,
    },
    {
      title: 'Kunststoffteile nachfertigen',
      description:
        'Nachfertigung abgekündigter oder schwer verfügbarer Bauteile für Maschinen und Anlagen.',
      href: '/kunststoffteile-nachfertigen/',
      icon: <BoxesIcon className="h-6 w-6" />,
    },
  ];

  const fitProfile = [
    'Maschinenbau, Produktion, Anlagenbau und Werkstattumfeld',
    'Funktionsbauteile, Vorrichtungen und Prototypen mit klarer technischer Anforderung',
    'Kunden mit Bedarf an technischer Prüfung statt Sofortpreis-Klick',
  ];

  const notFitProfile = [
    'Reine Preisvergleichsanfragen ohne technische Angaben',
    'Unkritische Deko- oder Hobbydrucke ohne Industriebezug',
    'Anfragen mit unklarer Datei-/Materiallage und unrealistischem Expresswunsch',
  ];

  const faqItems = [
    {
      question: 'Wie schnell erhalten wir eine Rückmeldung?',
      answer:
        'In der Regel erhalten Sie innerhalb von 24 Stunden eine qualifizierte technische Einschätzung.',
    },
    {
      question: 'Welche Materialien sind für industrielle Anwendungen verfügbar?',
      answer:
        'Je nach Einsatzfall arbeiten wir unter anderem mit ABS, ASA, PC, PA-basierten Werkstoffen und TPU sowie weiteren technischen Materialien auf Anfrage.',
    },
    {
      question: 'Welche Genauigkeit ist beim 3D-Druck realistisch?',
      answer:
        'Die erreichbare Genauigkeit hängt von Geometrie, Material und Funktion ab. Relevante Toleranzen werden vor Produktionsstart abgestimmt.',
    },
  ];

  return (
    <div className="animate-fade-in">
      <section className="relative overflow-hidden py-20">
        <div className="absolute -top-44 left-0 h-96 w-96 rounded-full bg-primary-100/70 blur-3xl" />
        <div className="absolute -right-12 top-8 h-72 w-72 rounded-full bg-primary-50 blur-3xl" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <img
            src="/logo/3dw-logo-full.webp"
            alt="3DW Additive Manufacturing Logo"
            width={700}
            height={654}
            className="h-36 md:h-44 w-auto mx-auto mb-6 reveal-up"
            loading="eager"
            decoding="async"
          />
          <h1 className="font-display text-4xl md:text-6xl font-bold text-gray-900 mb-6 reveal-up stagger-1">
            3D-Druck für Industrie, Ersatzteile & Prototypen
          </h1>
          <p className="text-xl text-gray-700 mb-8 max-w-4xl mx-auto leading-relaxed reveal-up stagger-2">
            {BRAND.publicName} unterstützt Maschinenbau, Produktion, Anlagenbau und Werkstätten mit
            professionellen 3D-Druck-Dienstleistungen. Sie erhalten technisch geprüfte Aussagen
            statt Preisversprechen ohne Kontext.
          </p>
          <p className="text-base text-gray-600 mb-10 max-w-4xl mx-auto leading-relaxed reveal-up stagger-3">
            Von funktionskritischen Ersatzteilen über belastbare Prototypen bis zu Montagehilfen
            erhalten Sie bei uns einen strukturierten Industrieprozess mit technischer Rückmeldung,
            klarer Machbarkeitsprüfung und transparentem Lieferfenster.
          </p>

          <div className="max-w-3xl mx-auto reveal-up stagger-4">
            <Link
              to="/projekt-starten/"
              className="bg-primary-700 text-white px-6 py-4 rounded-lg font-medium hover:bg-primary-800 transition-colors inline-flex items-center justify-center gap-2 shadow-sm w-full sm:w-auto"
            >
              Datei hochladen & technische Prüfung starten
              <ArrowRightIcon className="h-5 w-5" />
            </Link>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-sm">
              <Link
                to="/kontakt/"
                className="text-primary-700 font-medium hover:text-primary-800 hover:underline underline-offset-4"
              >
                Rückruf anfragen
              </Link>
              <span className="text-gray-400" aria-hidden>
                •
              </span>
              <a
                href={phoneHref}
                className="text-gray-700 hover:text-primary-700 inline-flex items-center justify-center gap-2"
              >
                <PhoneIcon className="h-4 w-4" />
                Telefonisch klären
              </a>
            </div>
          </div>

          <GlassSurface
            variant="hero"
            density="normal"
            className="mt-10 p-5 md:p-6 max-w-5xl mx-auto text-left reveal-up"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {heroControlPanel.map((item) => (
                <article
                  key={item.label}
                  className="rounded-lg border border-primary-100/80 bg-white/65 p-4"
                >
                  <p className="text-xs uppercase tracking-wide text-primary-700 font-semibold mb-2">
                    {item.label}
                  </p>
                  <p className="text-sm text-gray-700 leading-relaxed">{item.value}</p>
                </article>
              ))}
            </div>
          </GlassSurface>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-bold text-gray-900 text-center mb-10">
            Belegbare Zusammenarbeit statt Werbeversprechen
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {proofFacts.map((fact) => (
              <article key={fact.title} className="glass-lite p-5 flex items-start gap-3 reveal-up">
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

      <section className="py-16 bg-gray-50/65">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-bold text-gray-900 text-center mb-10">
            So läuft ein Industrieauftrag ab
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {processSteps.map((step) => (
              <GlassSurface key={step.title} as="article" variant="card" density="light" className="p-6">
                <h3 className="font-display text-xl font-semibold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-700 mb-4">{step.detail}</p>
                <p className="text-sm font-medium text-primary-700 bg-primary-50 inline-block px-3 py-1 rounded-full">
                  Serviceziel: {step.sla}
                </p>
              </GlassSurface>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-bold text-gray-900 text-center mb-10">
            Lösungen für typische Industrie-Anwendungen
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {industrySolutions.map((item) => (
              <GlassSurface key={item.title} as="article" variant="card" density="light" className="p-6">
                <div className="bg-primary-100/85 text-primary-700 p-3 rounded-lg w-fit mb-4 ring-1 ring-primary-200/70">
                  {item.icon}
                </div>
                <h3 className="font-display text-xl font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-700 mb-4">{item.description}</p>
                <Link
                  to={item.href}
                  className="text-primary-700 font-medium hover:text-primary-800 inline-flex items-center gap-2"
                >
                  Zur Landingpage
                  <ArrowRightIcon className="h-4 w-4" />
                </Link>
              </GlassSurface>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-gray-50/65">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-bold text-gray-900 text-center mb-4">
            Anonymisierte Fallbeispiele aus Industrieaufträgen
          </h2>
          <p className="text-center text-gray-600 mb-10 max-w-3xl mx-auto">
            Aktuell zeigen wir anonymisierte Ansichten plus verifizierte Ergebnisnachweise. Bei
            Kundenfreigabe werden diese Cases schrittweise um reale Projektbilder ergaenzt.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {industryCaseStudies.map((study) => (
              <GlassSurface
                key={study.id}
                as="article"
                variant="card"
                density="light"
                className="p-6 flex flex-col"
              >
                <div className="mb-4 overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                  <img
                    src={study.assets[0].src}
                    alt={study.assets[0].alt}
                    width={1200}
                    height={700}
                    loading="lazy"
                    className="w-full h-44 object-cover"
                  />
                </div>
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">
                  {study.proofStatus === 'freigegeben'
                    ? 'Kundenfreigegebener Case'
                    : study.proofStatus === 'verifiziert'
                      ? 'Verifizierter Industrie-Case'
                      : 'Anonymisierte CAD-Ansicht'}
                </p>
                <p className="text-xs text-gray-500 mb-4">
                  {study.assets.length} Ansichten hinterlegt | Nachweisart: {study.proofType}
                </p>
                <h3 className="font-display text-xl font-semibold text-gray-900 mb-4">{study.title}</h3>
                <p className="text-sm text-gray-900 font-semibold mb-1">Herausforderung</p>
                <p className="text-gray-700 mb-3">{study.challenge}</p>
                <p className="text-sm text-gray-900 font-semibold mb-1">Lösung</p>
                <p className="text-gray-700 mb-3">{study.solution}</p>
                <p className="text-sm text-gray-900 font-semibold mb-1">Ergebnisnutzen</p>
                <p className="text-gray-700 mb-5">{study.result}</p>
                <p className="text-sm text-gray-900 font-semibold mb-1">Messbarer Effekt</p>
                <p className="text-gray-700 mb-5">{study.measurableOutcome}</p>
                <Link
                  to="/projekt-starten/"
                  className="mt-auto text-primary-700 font-medium hover:text-primary-800 inline-flex items-center gap-2"
                >
                  Datei hochladen & technische Prüfung starten
                  <ArrowRightIcon className="h-4 w-4" />
                </Link>
              </GlassSurface>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-bold text-gray-900 text-center mb-10">
            Für wen wir passen und wofür nicht
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <article className="glass-lite p-6">
              <h3 className="font-display text-xl font-semibold text-gray-900 mb-3">Passend für</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                {fitProfile.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
            <article className="glass-lite p-6">
              <h3 className="font-display text-xl font-semibold text-gray-900 mb-3">Nicht passend für</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                {notFitProfile.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-bold text-gray-900 text-center mb-10">
            Häufige Fragen aus dem Industrieumfeld
          </h2>
          <div className="space-y-4">
            {faqItems.map((faq) => (
              <article key={faq.question} className="glass-lite p-6">
                <h3 className="font-display text-lg font-semibold text-gray-900 mb-2">{faq.question}</h3>
                <p className="text-gray-700">{faq.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-primary-600/95">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <GlassSurface variant="cta" density="normal" className="p-8 md:p-10">
            <h2 className="font-display text-3xl font-bold text-white mb-4">
              Technische Prüfung starten und Rückmeldung innerhalb von 24 Stunden erhalten
            </h2>
            <p className="text-primary-50 mb-8 text-lg">
              Senden Sie Datei und Anforderungen. Wir melden uns mit technischer Einschätzung und
              individuellem Angebot.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/projekt-starten/"
                className="bg-white text-primary-700 px-8 py-4 rounded-lg font-medium hover:bg-gray-100 transition-colors inline-flex items-center justify-center gap-2"
              >
                Datei hochladen & technische Prüfung starten
                <ArrowRightIcon className="h-5 w-5" />
              </Link>
              <Link
                to="/kontakt/"
                className="border border-white/75 text-white px-8 py-4 rounded-lg font-medium hover:bg-white/10 transition-colors inline-flex items-center justify-center"
              >
                Rückruf anfragen
              </Link>
            </div>
          </GlassSurface>
        </div>
      </section>
    </div>
  );
};

export default Home;
