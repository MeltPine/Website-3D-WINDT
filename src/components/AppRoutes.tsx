import React from 'react';
import { Route, Routes } from 'react-router-dom';
import Home from '../pages/Home';
import Services from '../pages/Services';
import ProjectStart from '../pages/ProjectStart';
import Sustainability from '../pages/Sustainability';
import Gallery from '../pages/Gallery';
import About from '../pages/About';
import Contact from '../pages/Contact';
import Impressum from '../pages/Impressum';
import Datenschutz from '../pages/Datenschutz';
import Ersatzteile3DDrucken from '../pages/Ersatzteile3DDrucken';
import Prototypen3DDruck from '../pages/Prototypen3DDruck';
import MontagehilfenVorrichtungen from '../pages/MontagehilfenVorrichtungen';
import KunststoffteileNachfertigen from '../pages/KunststoffteileNachfertigen';
import ThankYouProject from '../pages/ThankYouProject';
import ThankYouContact from '../pages/ThankYouContact';

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/leistungen" element={<Services />} />
      <Route path="/projekt-starten" element={<ProjectStart />} />
      <Route path="/nachhaltigkeit" element={<Sustainability />} />
      <Route path="/galerie" element={<Gallery />} />
      <Route path="/ueber-uns" element={<About />} />
      <Route path="/kontakt" element={<Contact />} />
      <Route path="/ersatzteile-3d-drucken" element={<Ersatzteile3DDrucken />} />
      <Route path="/prototypen-3d-druck" element={<Prototypen3DDruck />} />
      <Route path="/montagehilfen-vorrichtungen" element={<MontagehilfenVorrichtungen />} />
      <Route path="/kunststoffteile-nachfertigen" element={<KunststoffteileNachfertigen />} />
      <Route path="/impressum" element={<Impressum />} />
      <Route path="/datenschutz" element={<Datenschutz />} />
      <Route path="/danke-projekt" element={<ThankYouProject />} />
      <Route path="/danke-kontakt" element={<ThankYouContact />} />
    </Routes>
  );
};

export default AppRoutes;
