import React from 'react';
import { Link } from 'react-router-dom';
import { Printer, Mail, Phone, MapPin } from 'lucide-react';
import { BRAND, BRAND_SIGNATURE, CONTACT } from '../lib/brand';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="bg-primary-500 p-2 rounded-lg">
                <Printer className="h-6 w-6 text-white" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold">{BRAND.publicName}</span>
                <span className="text-xs font-semibold uppercase tracking-wide px-2 py-1 rounded bg-gray-800 text-gray-200">
                  {BRAND.shortName}
                </span>
              </div>
            </div>
            <p className="text-gray-300 mb-4 max-w-md">
              Ihr professioneller Partner für 3D-Druck, CAD-Modellierung und 3D-Scanning. 
              Nachhaltige und präzise Fertigung made in Germany.
            </p>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-primary-400" />
                <span className="text-gray-300">{CONTACT.email}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-primary-400" />
                <span className="text-gray-300">{CONTACT.phone}</span>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-primary-400" />
                <span className="text-gray-300">{CONTACT.country}</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Schnellzugriff</h3>
            <ul className="space-y-2">
              <li><Link to="/projekt-starten" className="text-gray-300 hover:text-primary-400 transition-colors">Projekt starten</Link></li>
              <li><Link to="/leistungen" className="text-gray-300 hover:text-primary-400 transition-colors">Leistungen</Link></li>
              <li><Link to="/kontakt" className="text-gray-300 hover:text-primary-400 transition-colors">Kontakt</Link></li>
              <li><Link to="/galerie" className="text-gray-300 hover:text-primary-400 transition-colors">Galerie</Link></li>
              <li><Link to="/ueber-uns" className="text-gray-300 hover:text-primary-400 transition-colors">Über uns</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Rechtliches</h3>
            <ul className="space-y-2">
              <li><Link to="/impressum" className="text-gray-300 hover:text-primary-400 transition-colors">Impressum</Link></li>
              <li><Link to="/datenschutz" className="text-gray-300 hover:text-primary-400 transition-colors">Datenschutz</Link></li>
              <li><Link to="/kontakt" className="text-gray-300 hover:text-primary-400 transition-colors">Kontakt</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center">
          <p className="text-gray-400">© {new Date().getFullYear()} {BRAND.publicName}. Alle Rechte vorbehalten.</p>
          <p className="text-gray-500 text-sm mt-2">{BRAND_SIGNATURE}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
