import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Boxes,
  CheckCircle,
  Clock3,
  Factory,
  Phone,
  Ruler,
  UserCheck,
  Wrench,
} from 'lucide-react';
import { BRAND, CONTACT } from '../lib/brand';

const phoneHref = `tel:${CONTACT.phone.replace(/[^\d+]/g, '')}`;

const Home = () => {
  const proofFacts = [
    {
      title: 'Antwortzeit',
      description: `${CONTACT.responseTime} (werktags).`,
      icon: <Clock3 className="h-5 w-5" />,
    },
    {
      title: 'Typische Lieferfenster',
      description:
        'Lieferfenster werden je Bauteil und Stückzahl im Angebot transparent benannt. Express nur nach technischer Abstimmung.',
      icon: <CheckCircle className="h-5 w-5" />,
    },
    {
      title: 'Technische Rückfragen',
      description:
        'Vor Fertigungsstart klären wir Geometrie, Material, Toleranz und Einsatzbedingungen mit Ihrem Team.',
      icon: <Ruler className="h-5 w-5" />,
    },
    {
      title: 'Direkter Ansprechpartner',
      description:
        'Sie erhalten eine feste Kontaktperson für Rückfragen bis zur Auslieferung.',
      icon: <UserCheck className="h-5 w-5" />,
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
      href: '/ersatzteile-3d-drucken',
      icon: <Wrench className="h-6 w-6" />,
    },
    {
      title: 'Prototypen 3D-Druck',
      description:
        'Für Entwicklungsteams, die Iterationen beschleunigen und Entscheidungen früher absichern wollen.',
      href: '/prototypen-3d-druck',
      icon: <Ruler className="h-6 w-6" />,
    },
    {
      title: 'Montagehilfen & Vorrichtungen',
      description:
        'Passgenaue Produktionshilfen für stabile Abläufe, weniger Fehler und höhere Effizienz.',
      href: '/montagehilfen-vorrichtungen',
      icon: <Factory className="h-6 w-6" />,
    },
    {
      title: 'Kunststoffteile nachfertigen',
      description:
        'Nachfertigung abgekündigter oder schwer verfügbarer Bauteile für Maschinen und Anlagen.',
      href: '/kunststoffteile-nachfertigen',
      icon: <Boxes className="h-6 w-6" />,
    },
  ];

  const anonymizedCasePatterns = [
    {
      title: 'Anlagen-Ersatzteil',
      challenge:
        'Nicht mehr lieferbares Kunststoffteil mit hoher Relevanz für den laufenden Betrieb.',
      solution:
        'Digitale Nachkonstruktion mit Fokus auf funktionsrelevante Bereiche und materialgerechte Auslegung.',
      result:
        'Stillstandsrisiko reduziert und künftig reproduzierbar nachfertigbar.',
    },
    {
      title: 'Montagehilfe für Linie',
      challenge:
        'Wiederkehrende Prozessabweichungen und unnötiger Zeitverlust bei manuellen Montageschritten.',
      solution:
        'Schnelle Iterationen einer passgenauen Vorrichtung auf Basis der realen Arbeitsplatzsituation.',
      result:
        'Stabilere Abläufe, geringere Fehlerquote und bessere Wiederholgenauigkeit.',
    },
    {
      title: 'Prototypen-Iteration',
      challenge:
        'Mehrere Varianten mussten innerhalb kurzer Zeit geprüft werden, ohne Werkzeugvorlauf.',
      solution:
        'Strukturierter 3D-Druck-Workflow mit schneller Anpassung von Geometrie und Material.',
      result:
        'Schnellere Entscheidungszyklen in Entwicklung und Test.',
    },
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
      <section className="bg-gradient-to-br from-primary-50 to-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            3D-Druck für Industrie, Ersatzteile & Prototypen
          </h1>
          <p className="text-xl text-gray-700 mb-10 max-w-4xl mx-auto leading-relaxed">
            {BRAND.publicName} unterstützt Maschinenbau, Produktion, Anlagenbau und Werkstätten mit
            professionellen 3D-Druck-Dienstleistungen. Sie erhalten technisch geprüfte Aussagen
            statt Preisversprechen ohne Kontext.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
            <Link
              to="/projekt-starten"
              className="bg-primary-600 text-white px-6 py-4 rounded-lg font-medium hover:bg-primary-700 transition-colors inline-flex items-center justify-center gap-2"
            >
              Datei hochladen
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              to="/kontakt"
              className="border border-primary-600 text-primary-600 px-6 py-4 rounded-lg font-medium hover:bg-primary-50 transition-colors inline-flex items-center justify-center"
            >
              Rückruf anfragen
            </Link>
            <a
              href={phoneHref}
              className="border border-gray-300 text-gray-700 px-6 py-4 rounded-lg font-medium hover:bg-white transition-colors inline-flex items-center justify-center gap-2"
            >
              <Phone className="h-4 w-4" />
              Telefonisch klären
            </a>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
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

      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-10">
            So läuft ein Industrieauftrag ab
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

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-10">
            Lösungen für typische Industrie-Anwendungen
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
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">
            Typische Fallmuster (anonymisiert)
          </h2>
          <p className="text-center text-gray-600 mb-10">
            Bis zur Kundenfreigabe zeigen wir bewusst anonymisierte Fallstrukturen statt
            geschönter Referenzbilder.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {anonymizedCasePatterns.map((study) => (
              <article
                key={study.title}
                className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col"
              >
                <h3 className="text-xl font-semibold text-gray-900 mb-4">{study.title}</h3>
                <p className="text-sm text-gray-900 font-semibold mb-1">Herausforderung</p>
                <p className="text-gray-700 mb-3">{study.challenge}</p>
                <p className="text-sm text-gray-900 font-semibold mb-1">Lösung</p>
                <p className="text-gray-700 mb-3">{study.solution}</p>
                <p className="text-sm text-gray-900 font-semibold mb-1">Ergebnisnutzen</p>
                <p className="text-gray-700 mb-5">{study.result}</p>
                <Link
                  to="/projekt-starten"
                  className="mt-auto text-primary-600 font-medium hover:text-primary-700 inline-flex items-center gap-2"
                >
                  Datei hochladen & technische Prüfung starten
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-10">
            Häufige Fragen aus dem Industrieumfeld
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

      <section className="py-16 bg-primary-600">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Technische Prüfung starten und Rückmeldung innerhalb von 24 Stunden erhalten
          </h2>
          <p className="text-primary-100 mb-8 text-lg">
            Senden Sie Datei und Anforderungen. Wir melden uns mit technischer Einschätzung und
            individuellem Angebot.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/projekt-starten"
              className="bg-white text-primary-600 px-8 py-4 rounded-lg font-medium hover:bg-gray-100 transition-colors inline-flex items-center justify-center gap-2"
            >
              Datei hochladen & technische Prüfung starten
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              to="/kontakt"
              className="border border-white/70 text-white px-8 py-4 rounded-lg font-medium hover:bg-white/10 transition-colors inline-flex items-center justify-center"
            >
              Rückruf anfragen
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
