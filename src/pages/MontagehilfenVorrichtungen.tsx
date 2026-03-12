import React from 'react';
import IndustryLandingPage from '../components/IndustryLandingPage';

const MontagehilfenVorrichtungen = () => {
  return (
    <IndustryLandingPage
      headline="Montagehilfen und Vorrichtungen per industriellem 3D-Druck"
      summary="Effiziente Produktion braucht ergonomische und wiederholgenaue Prozesse. Wir fertigen Montagehilfen, Aufnahmen und Vorrichtungen im 3D-Druck, abgestimmt auf Ihre Linie und Ihre Mitarbeiter. So verkürzen Sie Rüstzeiten, reduzieren Fehler in der Montage und verbessern die Prozessstabilität. Unser 3D-Druck Service ist besonders für schnelle Anpassungen und kontinuierliche Optimierung in der Fertigung geeignet."
      problem="Standardlösungen passen in der Praxis oft nicht exakt zur realen Arbeitsplatzsituation. Das führt zu unnötigen Handgriffen, Qualitätsstreuung und höheren Belastungen im Team, besonders bei variantenreichen Produkten."
      solution="Wir entwickeln mit Ihnen passgenaue Montagehilfen und Vorrichtungen auf Basis Ihrer Arbeitsabläufe. Durch 3D-Druck können Anpassungen kurzfristig umgesetzt und direkt in der Produktion getestet werden, ohne lange Beschaffungszeiten."
      benefits={[
        'Schnelle Umsetzung individueller Produktionshilfen',
        'Weniger Fehler in wiederkehrenden Montageschritten',
        'Ergonomische Lösungen für Werkstatt und Linie',
        'Technisch belastbares Angebot innerhalb von 24 Stunden',
      ]}
    />
  );
};

export default MontagehilfenVorrichtungen;
