import React from 'react';
import IndustryLandingPage from '../components/IndustryLandingPage';

const Prototypen3DDruck = () => {
  return (
    <IndustryLandingPage
      headline="Prototypen 3D-Druck für schnelle Produktentwicklung und Iteration"
      summary="In der Entwicklung entscheidet Geschwindigkeit über Time-to-Market. Mit unserem 3D-Druck Service erhalten Sie funktionsnahe Prototypen früh im Prozess, testen Geometrien schneller und treffen belastbare Entscheidungen. So reduzieren Sie Abstimmungsschleifen zwischen Konstruktion, Einkauf und Fertigung. Die Prototypenfertigung per industriellem 3D-Druck ermöglicht schnelle Anpassungen ohne lange Werkzeugvorlaufzeiten."
      problem="Klassische Fertigungswege sind für frühe Entwicklungsphasen oft zu langsam oder zu unflexibel. Änderungen an Bauteilen verzögern Tests, erhöhen Kosten in der Abstimmung und bremsen den gesamten Entwicklungsprozess."
      solution="Wir unterstützen Ihre Teams mit schneller Prototypenfertigung, klarer technischer Rückmeldung und reproduzierbaren Druckprozessen. Änderungen an Geometrie, Material oder Wandstärken können kurzfristig umgesetzt werden, damit Sie mehrere Iterationen in kurzer Zeit prüfen können."
      benefits={[
        'Schnelle Iterationen für Entwicklungs- und Konstruktionsabteilungen',
        'Frühe Funktionsprüfung statt späte Überraschungen',
        'Industrieller 3D-Druck Service mit technischer Beratung',
        'Angebot innerhalb von 24 Stunden',
      ]}
    />
  );
};

export default Prototypen3DDruck;
