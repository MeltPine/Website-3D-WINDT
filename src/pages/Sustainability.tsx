import React from 'react';
import { Leaf, Recycle, MapPin, Factory, Truck, Heart } from 'lucide-react';

const Sustainability = () => {
  const sustainabilityPillars = [
    {
      icon: <MapPin className="h-8 w-8" />,
      title: 'Lokale Produktion',
      description: 'Alle unsere 3D-Drucke werden direkt in Deutschland hergestellt, wodurch lange Transportwege vermieden und die lokale Wirtschaft gestärkt wird.',
      benefits: [
        'Kurze Lieferwege reduzieren CO₂-Emissionen',
        'Unterstützung der deutschen Wirtschaft',
        'Schnellere Lieferzeiten',
        'Persönlicher Kontakt und Service'
      ]
    },
    {
      icon: <Recycle className="h-8 w-8" />,
      title: 'Nachhaltige Materialien',
      description: 'Wir verwenden bevorzugt umweltfreundliche und recycelbare Materialien für unsere 3D-Drucke.',
      benefits: [
        'Langlebige technische Werkstoffe wie PETG, ABS, ASA und PA',
        'Rezyklat-Anteile bei geeigneten Materialtypen',
        'Materialwahl nach Einsatzdauer und Funktion',
        'Minimaler Materialabfall durch präzise Produktion'
      ]
    },
    {
      icon: <Factory className="h-8 w-8" />,
      title: 'Effiziente Fertigung',
      description: 'Moderne 3D-Drucktechnologie ermöglicht eine ressourcenschonende Produktion ohne Materialverschwendung.',
      benefits: [
        'Nur benötigtes Material wird verwendet',
        'Keine Werkzeuge oder Formen erforderlich',
        'Energieeffiziente Druckprozesse',
        'Reduzierte Produktionsabfälle'
      ]
    }
  ];

  const environmentalImpact = [
    {
      icon: <Leaf className="h-6 w-6" />,
      title: 'CO₂-Reduktion',
      value: '75%',
      description: 'weniger CO₂-Emissionen durch lokale Produktion'
    },
    {
      icon: <Recycle className="h-6 w-6" />,
      title: 'Materialeffizienz',
      value: '90%',
      description: 'des Materials wird tatsächlich verwendet'
    },
    {
      icon: <Truck className="h-6 w-6" />,
      title: 'Transportwege',
      value: '80%',
      description: 'kürzere Wege durch deutsche Produktion'
    }
  ];

  const initiatives = [
    {
      title: 'Grüne Energie',
      description: 'Unsere Produktion wird mit 100% Ökostrom betrieben',
      status: 'Aktiv'
    },
    {
      title: 'Verpackungsoptimierung',
      description: 'Verwendung recycelbarer und minimaler Verpackungsmaterialien',
      status: 'Aktiv'
    },
    {
      title: 'Kreislaufwirtschaft',
      description: 'Rücknahme und Recycling von gebrauchten 3D-Drucken',
      status: 'In Planung'
    },
    {
      title: 'Carbon Neutral',
      description: 'Vollständig klimaneutrale Produktion bis 2026',
      status: 'Ziel 2026'
    }
  ];

  return (
    <div className="py-16 animate-fade-in">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Nachhaltigkeit & Umweltschutz
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Verantwortungsvolle Produktion für eine bessere Zukunft. 
            Unser Beitrag zum Klimaschutz durch nachhaltige 3D-Drucktechnologie.
          </p>
        </div>

        {/* Hero Section */}
        <div className="bg-gradient-to-br from-green-50 to-primary-50 p-8 md:p-12 rounded-2xl mb-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Made in Germany
              </h2>
              <p className="text-lg text-gray-700 mb-6">
                Als lokaler 3D-Druckservice produzieren wir alle Ihre Projekte direkt in Deutschland. 
                Das bedeutet kurze Wege, schnelle Lieferung und ein deutlich reduzierter ökologischer Fußabdruck.
              </p>
              <div className="flex items-center space-x-2">
                <Heart className="h-6 w-6 text-red-500" />
                <span className="text-gray-700 font-medium">Mit Liebe für die Umwelt produziert</span>
              </div>
            </div>
            <div className="text-center">
              <div className="bg-white p-8 rounded-xl shadow-sm inline-block">
                <MapPin className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <div className="text-3xl font-bold text-green-600 mb-2">🇩🇪</div>
                <div className="text-lg font-semibold text-gray-900">100% Deutsche Produktion</div>
              </div>
            </div>
          </div>
        </div>

        {/* Sustainability Pillars */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Unsere Nachhaltigkeitssäulen
          </h2>
          <div className="space-y-12">
            {sustainabilityPillars.map((pillar, index) => (
              <div
                key={index}
                className={`grid grid-cols-1 lg:grid-cols-2 gap-8 items-center ${
                  index % 2 === 1 ? 'lg:grid-flow-col-dense' : ''
                }`}
              >
                <div className={index % 2 === 1 ? 'lg:col-start-2' : ''}>
                  <div className="bg-green-500 text-white p-4 rounded-xl w-fit mb-4">
                    {pillar.icon}
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">
                    {pillar.title}
                  </h3>
                  <p className="text-lg text-gray-600 mb-6">
                    {pillar.description}
                  </p>
                  <ul className="space-y-3">
                    {pillar.benefits.map((benefit, bIndex) => (
                      <li key={bIndex} className="flex items-start space-x-3">
                        <div className="bg-green-100 p-1 rounded-full mt-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        </div>
                        <span className="text-gray-700">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={`${index % 2 === 1 ? 'lg:col-start-1' : ''} bg-gray-50 p-8 rounded-2xl`}>
                  <div className="text-center">
                    <div className="text-6xl mb-4">
                      {index === 0 ? '🌍' : index === 1 ? '♻️' : '⚡'}
                    </div>
                    <div className="text-lg font-semibold text-gray-900">
                      {index === 0 ? 'Lokale Wertschöpfung' : index === 1 ? 'Kreislaufwirtschaft' : 'Ressourceneffizienz'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Environmental Impact */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Unser Umweltbeitrag
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {environmentalImpact.map((impact, index) => (
              <div
                key={index}
                className="bg-white border border-gray-200 p-6 rounded-xl text-center hover:shadow-lg transition-shadow"
              >
                <div className="bg-green-100 text-green-600 p-3 rounded-full w-fit mx-auto mb-4">
                  {impact.icon}
                </div>
                <div className="text-4xl font-bold text-green-600 mb-2">
                  {impact.value}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {impact.title}
                </h3>
                <p className="text-gray-600">
                  {impact.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Initiatives */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Unsere Nachhaltigkeitsinitiativen
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {initiatives.map((initiative, index) => (
              <div
                key={index}
                className="bg-white border border-gray-200 p-6 rounded-xl hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {initiative.title}
                  </h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    initiative.status === 'Aktiv' 
                      ? 'bg-green-100 text-green-800'
                      : initiative.status === 'In Planung'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {initiative.status}
                  </span>
                </div>
                <p className="text-gray-600">
                  {initiative.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Materials Section */}
        <div className="bg-green-50 p-8 rounded-2xl mb-16">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">
            Nachhaltige Materialien
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">PETG, ABS, ASA</h3>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• Robuste technische Standardmaterialien</li>
                <li>• Gute Balance aus Stabilität und Verfügbarkeit</li>
                <li>• Geeignet für viele Industrie- und Werkstattanwendungen</li>
                <li>• Lange Nutzungsdauer reduziert Ersatzbedarf</li>
              </ul>
            </div>
            <div className="bg-white p-6 rounded-xl">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">PA/PA-CF und PC</h3>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• Für höhere mechanische und thermische Anforderungen</li>
                <li>• Materialeinsatz gezielt nach Lastprofil</li>
                <li>• Technische Auslegung für längere Standzeiten</li>
                <li>• Reproduzierbare Qualität durch stabile Prozessführung</li>
              </ul>
            </div>
            <div className="bg-white p-6 rounded-xl">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">TPU und Supportkonzepte</h3>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• Flexible Bauteile für Dämpfung und Schutzfunktionen</li>
                <li>• Angepasste Support-Strategien je Geometrie</li>
                <li>• Saubere Nachbearbeitung für funktionale Oberflächen</li>
                <li>• Materialeinsatz wird auf den Bedarf abgestimmt</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center bg-primary-600 text-white p-8 rounded-2xl">
          <h2 className="text-3xl font-bold mb-4">
            Gemeinsam für eine nachhaltige Zukunft
          </h2>
          <p className="text-xl text-primary-100 mb-6 max-w-2xl mx-auto">
            Werden Sie Teil unserer Mission für umweltfreundliche Produktion. 
            Jeder 3D-Druck bei uns ist ein Schritt in Richtung Nachhaltigkeit.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/projekt-starten/"
              className="bg-primary-800/65 border border-primary-200/45 text-primary-50 px-6 py-3 rounded-lg font-medium hover:bg-primary-800/80 transition-colors inline-flex items-center justify-center shadow-sm"
            >
              Nachhaltiges Projekt starten
            </a>
            <a
              href="/kontakt/"
              className="bg-primary-900/25 border border-primary-200/40 text-primary-50 px-6 py-3 rounded-lg font-medium hover:bg-primary-900/40 transition-colors inline-flex items-center justify-center"
            >
              Mehr erfahren
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sustainability;
