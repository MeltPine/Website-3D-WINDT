import React from 'react';
import IndustryLandingPage from '../components/IndustryLandingPage';

const KunststoffteileNachfertigen = () => {
  return (
    <IndustryLandingPage
      headline="Kunststoffteile nachfertigen mit professionellem 3D-Druck Service"
      summary="Viele Kunststoffteile sind nach Jahren nicht mehr lieferbar oder nur mit langen Vorlaufzeiten verfügbar. Mit unserem industriellen 3D-Druck können wir Bauteile schnell nachfertigen und bei Bedarf konstruktiv optimieren. Das ist besonders relevant für Maschinenparks, Sonderanlagen und ältere Produktionssysteme. So bleibt Ihre Anlage einsatzfähig, ohne auf unzuverlässige Restbestände angewiesen zu sein."
      problem="Bei abgekündigten oder schwer beschaffbaren Kunststoffteilen entstehen im Alltag erhebliche Risiken: ungeplante Stillstände, hohe Suchaufwände und unsichere Notlösungen ohne reproduzierbare Qualität."
      solution="Wir prüfen Musterteil oder CAD-Daten, wählen geeignete Werkstoffe und fertigen das Teil passgenau nach. Für bessere Haltbarkeit können Geometrien gezielt angepasst werden. Dadurch erhalten Sie eine langfristig nutzbare Lösung statt kurzfristiger Improvisation."
      benefits={[
        'Nachfertigung nicht mehr verfügbarer Kunststoffteile',
        'Industrieller 3D-Druck für Instandhaltung und Serienumfeld',
        'Technische Optimierung für längere Standzeit möglich',
        'Angebot innerhalb von 24 Stunden',
      ]}
    />
  );
};

export default KunststoffteileNachfertigen;
