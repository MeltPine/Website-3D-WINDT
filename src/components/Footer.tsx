import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin } from 'lucide-react';
import { BRAND, BRAND_SIGNATURE, CONTACT } from '../lib/brand';
import BrandLogo from './BrandLogo';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="mb-4">
              <BrandLogo theme="dark" size="md" showTagline />
            </div>
            <p className="text-gray-300 mb-4 max-w-md">
              {BRAND.publicName} unterstützt Maschinenbau, Produktion, Anlagenbau und Werkstätten
              mit industriellem 3D-Druck, technischer Prüfung und verlässlichen Lieferfenstern.
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

          <div>
            <h3 className="text-lg font-semibold mb-4">Schnellzugriff</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/projekt-starten" className="text-gray-300 hover:text-primary-400 transition-colors">
                  Projekt starten
                </Link>
              </li>
              <li>
                <Link to="/leistungen" className="text-gray-300 hover:text-primary-400 transition-colors">
                  Leistungen
                </Link>
              </li>
              <li>
                <Link to="/kontakt" className="text-gray-300 hover:text-primary-400 transition-colors">
                  Kontakt
                </Link>
              </li>
              <li>
                <Link to="/galerie" className="text-gray-300 hover:text-primary-400 transition-colors">
                  Galerie
                </Link>
              </li>
              <li>
                <Link to="/ueber-uns" className="text-gray-300 hover:text-primary-400 transition-colors">
                  Über uns
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Rechtliches</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/impressum" className="text-gray-300 hover:text-primary-400 transition-colors">
                  Impressum
                </Link>
              </li>
              <li>
                <Link to="/datenschutz" className="text-gray-300 hover:text-primary-400 transition-colors">
                  Datenschutz
                </Link>
              </li>
              <li>
                <Link to="/kontakt" className="text-gray-300 hover:text-primary-400 transition-colors">
                  Kontakt
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center">
          <p className="text-gray-400">
            © {new Date().getFullYear()} {BRAND.publicName}. Alle Rechte vorbehalten.
          </p>
          <p className="text-gray-500 text-sm mt-2">{BRAND_SIGNATURE}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
