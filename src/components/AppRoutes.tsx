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
      <Route path="/impressum" element={<Impressum />} />
      <Route path="/datenschutz" element={<Datenschutz />} />
    </Routes>
  );
};

export default AppRoutes;
