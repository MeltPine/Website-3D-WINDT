import React from 'react';
import { Printer, PenTool, Scan as Scan3D, Package, Clock, Shield } from 'lucide-react';

const Services = () => {
  const services = [
    {
      icon: <Printer className="h-8 w-8" />,
      title: '3D-Druck',
      price: '0,35€/g',
      description: 'Professioneller 3D-Druck mit modernster FDM-Technologie',
      features: [
        'Hochwertige Materialien: PLA, PETG, ABS, ASA',
        'Alle Industrie-Materialien verfügbar',
        'Präzise Schichtauflösung bis 0,1mm',
        'Große Druckvolumen bis 300x300x400mm',
        'Nachbearbeitung und Finishing',
        'Qualitätskontrolle jedes Drucks'
      ],
      materials: [
        { name: 'PLA', properties: 'Umweltfreundlich, einfach zu drucken' },
        { name: 'PETG', properties: 'Stark, chemikalienbeständig' },
        { name: 'ABS', properties: 'Hitzebeständig, schlagfest' },
        { name: 'ASA', properties: 'UV-beständig, für Außenanwendungen' },
      ]
    },
    {
      icon: <PenTool className="h-8 w-8" />,
      title: 'CAD-Modellierung',
      price: '60€/h',
      description: 'Professionelle 3D-Modellierung und Konstruktion',
      features: [
        'Erstellung neuer 3D-Modelle',
        'Anpassung bestehender Designs',
        'Technische Zeichnungen',
        'Reverse Engineering',
        'Optimierung für 3D-Druck',
        'Verschiedene Dateiformate'
      ],
      software: [
        'Fusion 360',
        'SolidWorks',
        'Blender',
        'KeyShot Rendering'
      ]
    },
    {
      icon: <Scan3D className="h-8 w-8" />,
      title: '3D-Scan Service',
      price: '30€ pauschal',
      description: 'Digitalisierung physischer Objekte für weitere Bearbeitung',
      features: [
        'Hochauflösende 3D-Scans',
        'Nachbearbeitung der Scan-Daten',
        'Mesh-Optimierung',
        'STL/OBJ Export',
        'Reverse Engineering',
        'Qualitätssicherung'
      ],
      specs: [
        'Genauigkeit: ±0,1mm',
        'Objektgröße: 5cm - 50cm',
        'Verschiedene Oberflächentypen',
        'Farberfassung möglich'
      ]
    }
  ];

  const additionalServices = [
    {
      icon: <Package className="h-6 w-6" />,
      title: 'Express-Fertigung',
      description: 'Schnellere Bearbeitung in 1-2 Werktagen',
      note: 'Aufpreis nach Vereinbarung'
    },
    {
      icon: <Clock className="h-6 w-6" />,
      title: 'Nachbearbeitung',
      description: 'Schleifen, Lackieren, Montage',
      note: 'Individuelle Preisgestaltung'
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: 'Qualitätsprüfung',
      description: 'Dimensionale Kontrolle und Dokumentation',
      note: 'Bei kritischen Anwendungen'
    }
  ];

  return (
    <div className="py-16 animate-fade-in">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Unsere Leistungen
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Comprehensive 3D-Druckdienstleistungen für alle Ihre Anforderungen - 
            von der ersten Idee bis zum fertigen Produkt.
          </p>
        </div>

        {/* Main Services */}
        <div className="space-y-16">
          {services.map((service, index) => (
            <div
              key={index}
              className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-center ${
                index % 2 === 1 ? 'lg:grid-flow-col-dense' : ''
              }`}
            >
              <div className={index % 2 === 1 ? 'lg:col-start-2' : ''}>
                <div className="bg-primary-500 text-white p-4 rounded-xl w-fit mb-6">
                  {service.icon}
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  {service.title}
                </h2>
                <div className="text-2xl font-bold text-primary-600 mb-4">
                  {service.price}
                </div>
                <p className="text-lg text-gray-600 mb-6">
                  {service.description}
                </p>
                <ul className="space-y-3">
                  {service.features.map((feature, fIndex) => (
                    <li key={fIndex} className="flex items-start space-x-3">
                      <div className="bg-primary-100 p-1 rounded-full mt-1">
                        <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                      </div>
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className={index % 2 === 1 ? 'lg:col-start-1' : ''}>
                <div className="bg-gray-50 p-8 rounded-2xl">
                  {service.materials && (
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-4">
                        Verfügbare Materialien
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {service.materials.map((material, mIndex) => (
                          <div key={mIndex} className="bg-white p-4 rounded-lg">
                            <div className="font-semibold text-primary-600 mb-1">
                              {material.name}
                            </div>
                            <div className="text-sm text-gray-600">
                              {material.properties}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {service.software && (
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-4">
                        Verwendete Software
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        {service.software.map((software, sIndex) => (
                          <div key={sIndex} className="bg-white p-3 rounded-lg text-center">
                            <div className="font-medium text-gray-900">{software}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {service.specs && (
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-4">
                        Technische Spezifikationen
                      </h3>
                      <ul className="space-y-2">
                        {service.specs.map((spec, sIndex) => (
                          <li key={sIndex} className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                            <span className="text-gray-700">{spec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Additional Services */}
        <div className="mt-20">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Zusätzliche Services
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {additionalServices.map((service, index) => (
              <div
                key={index}
                className="bg-white border border-gray-200 p-6 rounded-xl hover:shadow-lg transition-shadow"
              >
                <div className="bg-primary-100 text-primary-600 p-3 rounded-lg w-fit mb-4">
                  {service.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {service.title}
                </h3>
                <p className="text-gray-600 mb-3">
                  {service.description}
                </p>
                <p className="text-sm text-primary-600 font-medium">
                  {service.note}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing Note */}
        <div className="mt-16 bg-primary-50 p-8 rounded-2xl text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Preishinweise
          </h3>
          <div className="text-gray-700 space-y-2 max-w-3xl mx-auto">
            <p className="mb-4">
              <strong>Mindestbestellwert:</strong> 10€
            </p>
            <p className="mb-4">
              Alle Preise verstehen sich zzgl. Versandkosten. 
              Kostenlose Lieferung ab 50€ Bestellwert innerhalb Deutschlands.
            </p>
            <p>
              Individuelle Preise für Großprojekte und Serienfertigungen auf Anfrage.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Services;