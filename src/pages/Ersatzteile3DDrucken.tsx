import React from 'react';
import IndustryLandingPage from '../components/IndustryLandingPage';

const Ersatzteile3DDrucken = () => {
  return (
    <IndustryLandingPage
      headline="Ersatzteile 3D-Druck für Maschinenbau, Produktion und Werkstätten"
      summary="Wenn ein Teil ausfällt, zählt jede Stunde. Mit unserem industriellen 3D-Druck Service fertigen wir funktionsrelevante Ersatzteile schnell nach, auch bei kleinen Losgrößen. So reduzieren Sie Anlagenstillstände, umgehen lange Lieferketten und sichern Ihre Produktion. Besonders bei abgekündigten Komponenten oder kurzfristigem Bedarf ist der Ersatzteile 3D-Druck eine wirtschaftliche Lösung."
      problem="Originalteile sind oft nicht kurzfristig verfügbar, haben lange Lieferzeiten oder sind nicht mehr im Sortiment. Für Instandhaltung und Produktion bedeutet das Ausfallzeit, unnötigen Koordinationsaufwand und erhöhten Termindruck im Betrieb."
      solution="Wir prüfen Ihre Datei oder das Musterteil technisch, wählen geeignete Materialien für den realen Einsatz und fertigen präzise Bauteile im industriellen 3D-Druck. Auf Wunsch unterstützen wir auch bei der Konstruktion, damit das Ersatzteil funktional und reproduzierbar gefertigt werden kann."
      benefits={[
        'Schnelle Verfügbarkeit kritischer Ersatzteile',
        'Industrieller 3D-Druck für Einzelteile und Kleinserien',
        'Technische Prüfung vor Fertigungsstart',
        'Individuelles Angebot innerhalb von 24 Stunden',
      ]}
    />
  );
};

export default Ersatzteile3DDrucken;
