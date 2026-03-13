import React, { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';

const Home = lazy(() => import('../pages/Home'));
const Services = lazy(() => import('../pages/Services'));
const ProjectStart = lazy(() => import('../pages/ProjectStart'));
const Sustainability = lazy(() => import('../pages/Sustainability'));
const Gallery = lazy(() => import('../pages/Gallery'));
const About = lazy(() => import('../pages/About'));
const Contact = lazy(() => import('../pages/Contact'));
const Impressum = lazy(() => import('../pages/Impressum'));
const Datenschutz = lazy(() => import('../pages/Datenschutz'));
const Ersatzteile3DDrucken = lazy(() => import('../pages/Ersatzteile3DDrucken'));
const Prototypen3DDruck = lazy(() => import('../pages/Prototypen3DDruck'));
const MontagehilfenVorrichtungen = lazy(() => import('../pages/MontagehilfenVorrichtungen'));
const KunststoffteileNachfertigen = lazy(() => import('../pages/KunststoffteileNachfertigen'));
const ThankYouProject = lazy(() => import('../pages/ThankYouProject'));
const ThankYouContact = lazy(() => import('../pages/ThankYouContact'));
const Wissen = lazy(() => import('../pages/Wissen'));
const WissenDetail = lazy(() => import('../pages/WissenDetail'));
const NotFound = lazy(() => import('../pages/NotFound'));

const routeFallback = (
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
    <div className="h-10 w-64 rounded bg-gray-100 animate-pulse mb-4" />
    <div className="h-4 w-full max-w-3xl rounded bg-gray-100 animate-pulse" />
  </div>
);

const AppRoutes = () => {
  return (
    <Suspense fallback={routeFallback}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/leistungen/" element={<Services />} />
        <Route path="/projekt-starten/" element={<ProjectStart />} />
        <Route path="/nachhaltigkeit/" element={<Sustainability />} />
        <Route path="/galerie/" element={<Gallery />} />
        <Route path="/ueber-uns/" element={<About />} />
        <Route path="/kontakt/" element={<Contact />} />
        <Route path="/ersatzteile-3d-drucken/" element={<Ersatzteile3DDrucken />} />
        <Route path="/prototypen-3d-druck/" element={<Prototypen3DDruck />} />
        <Route path="/montagehilfen-vorrichtungen/" element={<MontagehilfenVorrichtungen />} />
        <Route path="/kunststoffteile-nachfertigen/" element={<KunststoffteileNachfertigen />} />
        <Route path="/impressum/" element={<Impressum />} />
        <Route path="/datenschutz/" element={<Datenschutz />} />
        <Route path="/danke-projekt/" element={<ThankYouProject />} />
        <Route path="/danke-kontakt/" element={<ThankYouContact />} />
        <Route path="/wissen/" element={<Wissen />} />
        <Route path="/wissen/:slug/" element={<WissenDetail />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
