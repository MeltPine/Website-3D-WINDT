import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle, Factory, Wrench, Boxes, Ruler } from 'lucide-react';
import { BRAND } from '../lib/brand';

const Home = () => {
  const trustPoints = [
    'Industrieller 3D-Druck Service mit technischer Prüfung vor Fertigungsstart',
    'Klare Kommunikation zu Machbarkeit, Material und Lieferfenster',
    'Schnelle Reaktion: qualifizierte Rückmeldung und Angebot innerhalb von 24 Stunden',
    'Zuverlässige Umsetzung für Ersatzteile, Prototypen und Produktionshilfen',
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

  const caseStudies = [
    {
      title: 'Industrieteil nachfertigen',
      challenge:
        'Bei einer Sonderanlage fiel ein nicht mehr lieferbares Kunststoffteil aus. Das Bauteil war für den laufenden Betrieb kritisch und die übliche Ersatzteilbeschaffung hätte mehrere Wochen gedauert.',
      solution:
        'Auf Basis eines Musterteils und der Einbausituation haben wir die Geometrie digitalisiert, funktionsrelevante Flächen konstruktiv überarbeitet und das Ersatzteil im industriellen 3D-Druck gefertigt. Vor Auslieferung erfolgte eine technische Plausibilitätsprüfung für den vorgesehenen Einsatz.',
      result:
        'Die Anlage konnte kurzfristig wieder in Betrieb genommen werden. Der Kunde gewann Planungssicherheit, vermied längere Stillstandszeiten und erhielt zusätzlich eine reproduzierbare Datengrundlage für zukünftige Nachfertigungen.',
    },
    {
      title: 'Montagehilfe für Produktionslinie',
      challenge:
        'In einer Montagelinie kam es bei wiederkehrenden Arbeitsschritten zu Qualitätsstreuung und unnötigem Zeitverlust. Standardvorrichtungen passten nicht sauber zum tatsächlichen Ablauf am Arbeitsplatz.',
      solution:
        'Gemeinsam mit dem Team vor Ort wurde eine passgenaue Montagehilfe für den konkreten Prozess entwickelt. Durch den 3D-Druck Service konnten wir mehrere Iterationen in kurzer Zeit testen und die finale Vorrichtung auf Ergonomie und Wiederholgenauigkeit optimieren.',
      result:
        'Die Montageabläufe wurden stabiler, Fehlerquoten sanken und die Einarbeitung neuer Mitarbeiter wurde einfacher. Das Unternehmen konnte den Prozess ohne aufwendige Werkzeugbeschaffung spürbar verbessern.',
    },
    {
      title: 'Prototyp für Produktentwicklung',
      challenge:
        'Ein Entwicklungsteam musste innerhalb kurzer Frist mehrere Funktionsvarianten prüfen. Klassische Fertigungsverfahren hätten den Iterationszyklus deutlich verlangsamt und die Abstimmung zwischen Konstruktion und Test blockiert.',
      solution:
        'Wir haben die Prototypenfertigung über einen strukturierten 3D-Druck Workflow begleitet: Datenprüfung, materialgerechte Auslegung und schnelle Umsetzung mehrerer Varianten. Nach jedem Testdurchlauf wurden die Erkenntnisse direkt in die nächste Iteration überführt.',
      result:
        'Der Kunde konnte Entwicklungsentscheidungen früher absichern und die Time-to-Market verkürzen. Statt langer Wartezeiten entstand ein schneller, planbarer Prozess mit klarer technischer Rückmeldung.',
    },
  ];

  const faqItems = [
    {
      question: 'Wie schnell erhalten wir eine Rückmeldung?',
      answer:
        'In der Regel erhalten Sie innerhalb von 24 Stunden eine qualifizierte Einschätzung und ein individuelles Angebot.',
    },
    {
      question: 'Welche Materialien sind für industrielle Anwendungen verfügbar?',
      answer:
        'Je nach Einsatzfall arbeiten wir unter anderem mit PETG, ABS, ASA, PA/PA-CF, PC und TPU sowie weiteren technischen Werkstoffen auf Anfrage.',
    },
    {
      question: 'Welche Genauigkeit ist beim 3D-Druck realistisch?',
      answer:
        'Die erreichbare Genauigkeit hängt von Geometrie, Material und Funktion ab. Relevante Toleranzen werden vor Produktionsstart mit Ihnen abgestimmt.',
    },
  ];

  return (
    <div className="animate-fade-in">
      <section className="bg-gradient-to-br from-primary-50 to-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            3D-Druck für Industrie, Ersatzteile & Prototypen
          </h1>
          <p className="text-xl text-gray-700 mb-8 max-w-4xl mx-auto leading-relaxed">
            {BRAND.publicName} unterstützt Maschinenbau, Produktion, Anlagenbau und Werkstätten mit
            professionellen 3D-Druck-Dienstleistungen. Wir liefern keine Bastellösungen, sondern
            technische Bauteile für reale Einsatzbedingungen. Von der ersten Prüfung bis zur
            termintreuen Lieferung erhalten Sie klare Kommunikation, belastbare Aussagen und
            individuelle Angebote statt pauschaler Standardlösungen.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/projekt-starten"
              className="bg-primary-600 text-white px-8 py-4 rounded-lg font-medium hover:bg-primary-700 transition-colors inline-flex items-center justify-center gap-2"
            >
              Datei hochladen & Angebot erhalten
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              to="/kontakt"
              className="border border-primary-600 text-primary-600 px-8 py-4 rounded-lg font-medium hover:bg-primary-50 transition-colors"
            >
              Prototyp prüfen & Angebot innerhalb 24 h erhalten
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-10">Warum mit {BRAND.publicName} arbeiten?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {trustPoints.map((point) => (
              <div key={point} className="bg-gray-50 border border-gray-200 rounded-xl p-5 flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-primary-600 mt-0.5 flex-shrink-0" />
                <p className="text-gray-700">{point}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-10">Lösungen für typische Industrie-Anwendungen</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {industrySolutions.map((item) => (
              <article key={item.title} className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="bg-primary-100 text-primary-700 p-3 rounded-lg w-fit mb-4">{item.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-700 mb-4">{item.description}</p>
                <Link to={item.href} className="text-primary-600 font-medium hover:text-primary-700 inline-flex items-center gap-2">
                  Zur Landingpage
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-10">Case Studies aus der Praxis</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {caseStudies.map((study) => (
              <article key={study.title} className="bg-gray-50 border border-gray-200 rounded-xl p-6 flex flex-col">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">{study.title}</h3>
                <p className="text-sm text-gray-900 font-semibold mb-1">Herausforderung</p>
                <p className="text-gray-700 mb-3">{study.challenge}</p>
                <p className="text-sm text-gray-900 font-semibold mb-1">Unsere Lösung</p>
                <p className="text-gray-700 mb-3">{study.solution}</p>
                <p className="text-sm text-gray-900 font-semibold mb-1">Ergebnis</p>
                <p className="text-gray-700 mb-5">{study.result}</p>
                <Link to="/projekt-starten" className="mt-auto text-primary-600 font-medium hover:text-primary-700 inline-flex items-center gap-2">
                  Jetzt Datei hochladen & Angebot erhalten
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-10">Häufige Fragen aus dem Industrieumfeld</h2>
          <div className="space-y-4">
            {faqItems.map((faq) => (
              <article key={faq.question} className="bg-white border border-gray-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{faq.question}</h3>
                <p className="text-gray-700">{faq.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-primary-600">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Projekt starten und innerhalb von 24 Stunden Rückmeldung erhalten</h2>
          <p className="text-primary-100 mb-8 text-lg">
            Laden Sie Ihre Datei hoch oder senden Sie Ihre Anforderungen. Wir melden uns mit
            technischer Einschätzung und individuellem Angebot.
          </p>
          <Link
            to="/projekt-starten"
            className="bg-white text-primary-600 px-8 py-4 rounded-lg font-medium hover:bg-gray-100 transition-colors inline-flex items-center gap-2"
          >
            Jetzt Anfrage senden
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;
