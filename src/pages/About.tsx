import React from 'react';
import { User, Award, Clock, Target, Heart, Lightbulb } from 'lucide-react';

const About = () => {
  const values = [
    {
      icon: <Award className="h-8 w-8" />,
      title: 'Qualität',
      description: 'Höchste Standards in Material und Verarbeitung für langlebige Ergebnisse.'
    },
    {
      icon: <Clock className="h-8 w-8" />,
      title: 'Zuverlässigkeit',
      description: 'Pünktliche Lieferung und verlässliche Kommunikation in jedem Projekt.'
    },
    {
      icon: <Lightbulb className="h-8 w-8" />,
      title: 'Innovation',
      description: 'Moderne Technologien und kreative Lösungen für Ihre Herausforderungen.'
    },
    {
      icon: <Heart className="h-8 w-8" />,
      title: 'Nachhaltigkeit',
      description: 'Umweltbewusste Produktion und lokale Wertschöpfung made in Germany.'
    }
  ];

  const milestones = [
    {
      year: '2020',
      title: 'Gründung',
      description: 'Start als lokaler 3D-Druck Service mit dem Fokus auf Qualität und Nachhaltigkeit.'
    },
    {
      year: '2021',
      title: 'Expansion',
      description: 'Erweiterung um CAD-Modellierung und 3D-Scanning Services.'
    },
    {
      year: '2022',
      title: 'B2B Focus',
      description: 'Spezialisierung auf industrielle Prototypen und Geschäftskunden.'
    },
    {
      year: '2023',
      title: 'Nachhaltigkeit',
      description: 'Umstellung auf 100% Ökostrom und nachhaltige Materialien.'
    },
    {
      year: '2024',
      title: 'Heute',
      description: 'Führender 3D-Druck Service mit über 1000 zufriedenen Kunden.'
    }
  ];

  const team = [
    {
      name: 'Max Mustermann',
      role: 'Gründer & Geschäftsführer',
      bio: 'Ingenieur mit 10+ Jahren Erfahrung in der additiven Fertigung',
      avatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400'
    },
    {
      name: 'Sarah Schmidt',
      role: 'CAD-Spezialistin',
      bio: 'Expertin für 3D-Modellierung und technische Konstruktion',
      avatar: 'https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg?auto=compress&cs=tinysrgb&w=400'
    },
    {
      name: 'Tom Weber',
      role: 'Produktionsleiter',
      bio: 'Verantwortlich für Qualitätssicherung und optimale Druckparameter',
      avatar: 'https://images.pexels.com/photos/2182970/pexels-photo-2182970.jpeg?auto=compress&cs=tinysrgb&w=400'
    }
  ];

  return (
    <div className="py-16 animate-fade-in">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Über 3D Print Pro
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Ihre Vision, unsere Präzision. Seit 2020 verwirklichen wir Ideen 
            durch professionelle 3D-Druckdienstleistungen made in Germany.
          </p>
        </div>

        {/* Mission Statement */}
        <div className="bg-gradient-to-br from-primary-50 to-white p-8 md:p-12 rounded-2xl mb-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Unsere Mission
              </h2>
              <p className="text-lg text-gray-700 mb-6">
                Wir glauben an die transformative Kraft der 3D-Drucktechnologie. 
                Unser Ziel ist es, innovative Lösungen zu schaffen, die nicht nur 
                funktional und ästhetisch überzeugen, sondern auch nachhaltig und 
                verantwortungsbewusst produziert werden.
              </p>
              <p className="text-lg text-gray-700">
                Durch lokale Produktion, persönlichen Service und höchste Qualitätsstandards 
                möchten wir der bevorzugte Partner für alle Ihre 3D-Druckprojekte sein.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-white p-8 rounded-xl shadow-sm">
                <Target className="h-16 w-16 text-primary-600 mx-auto mb-4" />
                <div className="text-2xl font-bold text-gray-900 mb-2">1000+</div>
                <div className="text-gray-600">Erfolgreich abgeschlossene Projekte</div>
              </div>
            </div>
          </div>
        </div>

        {/* Values */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Unsere Werte
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <div
                key={index}
                className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow text-center"
              >
                <div className="bg-primary-100 text-primary-600 p-4 rounded-full w-fit mx-auto mb-4">
                  {value.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {value.title}
                </h3>
                <p className="text-gray-600">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Unsere Geschichte
          </h2>
          <div className="relative">
            <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-1 bg-primary-200"></div>
            <div className="space-y-8">
              {milestones.map((milestone, index) => (
                <div
                  key={index}
                  className={`flex items-center ${
                    index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'
                  }`}
                >
                  <div className={`w-1/2 ${index % 2 === 0 ? 'pr-8 text-right' : 'pl-8 text-left'}`}>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                      <div className="text-2xl font-bold text-primary-600 mb-2">
                        {milestone.year}
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {milestone.title}
                      </h3>
                      <p className="text-gray-600">
                        {milestone.description}
                      </p>
                    </div>
                  </div>
                  <div className="relative z-10">
                    <div className="w-4 h-4 bg-primary-600 rounded-full border-4 border-white shadow-sm"></div>
                  </div>
                  <div className="w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Team */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Unser Team
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {team.map((member, index) => (
              <div
                key={index}
                className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow text-center"
              >
                <img
                  src={member.avatar}
                  alt={member.name}
                  className="w-24 h-24 rounded-full mx-auto mb-4 object-cover"
                />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {member.name}
                </h3>
                <div className="text-primary-600 font-medium mb-3">
                  {member.role}
                </div>
                <p className="text-gray-600 text-sm">
                  {member.bio}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Statistics */}
        <div className="bg-primary-600 text-white p-8 rounded-2xl mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">
            3D Print Pro in Zahlen
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">1000+</div>
              <div className="text-primary-100">Abgeschlossene Projekte</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">50+</div>
              <div className="text-primary-100">B2B Kunden</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">15</div>
              <div className="text-primary-100">Verschiedene Materialien</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">24h</div>
              <div className="text-primary-100">Durchschnittliche Antwortzeit</div>
            </div>
          </div>
        </div>

        {/* Why Choose Us */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">
            Warum 3D Print Pro wählen?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="bg-primary-100 p-2 rounded-lg flex-shrink-0">
                  <User className="h-6 w-6 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Persönlicher Service</h3>
                  <p className="text-gray-600">Individuelle Beratung und persönlicher Ansprechpartner für jedes Projekt.</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="bg-primary-100 p-2 rounded-lg flex-shrink-0">
                  <Award className="h-6 w-6 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Bewährte Qualität</h3>
                  <p className="text-gray-600">Über 4 Jahre Erfahrung und hunderte zufriedene Kunden sprechen für sich.</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="bg-primary-100 p-2 rounded-lg flex-shrink-0">
                  <Clock className="h-6 w-6 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Schnelle Bearbeitung</h3>
                  <p className="text-gray-600">Kurze Produktionszeiten und express Optionen für eilige Projekte.</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 p-8 rounded-xl">
              <blockquote className="text-lg text-gray-700 mb-4">
                "Die Zusammenarbeit mit 3D Print Pro war von Anfang an professionell und 
                zuverlässig. Die Qualität der Drucke übertrifft unsere Erwartungen."
              </blockquote>
              <cite className="text-primary-600 font-medium">
                — Stammkunde aus der Automobilindustrie
              </cite>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center bg-primary-50 p-8 rounded-2xl">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Bereit für Ihr nächstes Projekt?
          </h2>
          <p className="text-lg text-gray-600 mb-6 max-w-2xl mx-auto">
            Lassen Sie uns gemeinsam Ihre Ideen zum Leben erwecken. 
            Kontaktieren Sie uns für eine kostenlose Beratung.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/projekt-starten"
              className="bg-primary-600 text-white px-8 py-4 rounded-lg font-medium hover:bg-primary-700 transition-colors"
            >
              Projekt starten
            </a>
            <a
              href="/kontakt"
              className="border border-primary-600 text-primary-600 px-8 py-4 rounded-lg font-medium hover:bg-primary-50 transition-colors"
            >
              Kontakt aufnehmen
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;