import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CloseIcon, MenuIcon } from './icons';
import BrandLogo from './BrandLogo';
import GlassSurface from './GlassSurface';
import { normalizePathname } from '../lib/routes';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const navigation = [
    { name: 'Home', href: '/' },
    { name: 'Leistungen', href: '/leistungen/' },
    { name: 'Projekt starten', href: '/projekt-starten/' },
    { name: 'Nachhaltigkeit', href: '/nachhaltigkeit/' },
    { name: 'Galerie', href: '/galerie/' },
    { name: 'Wissen', href: '/wissen/' },
    { name: 'Über uns', href: '/ueber-uns/' },
    { name: 'Kontakt', href: '/kontakt/' },
  ];

  const normalizedCurrentPath = normalizePathname(location.pathname);
  const isActive = (path: string) => {
    const normalizedNavPath = normalizePathname(path);
    if (normalizedNavPath === '/wissen') {
      return (
        normalizedCurrentPath === normalizedNavPath ||
        normalizedCurrentPath.startsWith('/wissen/')
      );
    }
    return normalizedCurrentPath === normalizedNavPath;
  };

  return (
    <header className="sticky top-0 z-50 px-3 pt-3 sm:px-4">
      <div className="max-w-7xl mx-auto">
        <GlassSurface variant="nav" density="light" className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="group">
              <BrandLogo theme="light" size="sm" />
            </Link>

            <nav className="hidden md:flex items-center gap-2">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`px-3 py-2 rounded-md text-sm font-semibold transition-all duration-200 ${
                    isActive(item.href)
                      ? 'bg-primary-50 text-primary-700 ring-1 ring-primary-100 shadow-sm'
                      : 'text-gray-700 hover:bg-white/70 hover:text-primary-700'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </nav>

            <div className="hidden md:block">
              <Link
                to="/projekt-starten/"
                className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors shadow-sm"
              >
                Anfrage starten
              </Link>
            </div>

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-md text-gray-700 hover:text-primary-600 hover:bg-white/80 transition-colors"
              aria-label={isMenuOpen ? 'Menü schließen' : 'Menü öffnen'}
            >
              {isMenuOpen ? <CloseIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
            </button>
          </div>

          {isMenuOpen && (
            <div className="md:hidden border-t border-primary-100/70 py-4 animate-fade-in">
              <nav className="flex flex-col space-y-2">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setIsMenuOpen(false)}
                    className={`px-3 py-2 rounded-md text-sm font-semibold transition-colors ${
                      isActive(item.href)
                        ? 'text-primary-700 bg-primary-50 ring-1 ring-primary-100'
                        : 'text-gray-700 hover:text-primary-700 hover:bg-white/75'
                    }`}
                  >
                    {item.name}
                  </Link>
                ))}
                <Link
                  to="/projekt-starten/"
                  onClick={() => setIsMenuOpen(false)}
                  className="mt-2 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium text-center hover:bg-primary-700 transition-colors"
                >
                  Anfrage starten
                </Link>
              </nav>
            </div>
          )}
        </GlassSurface>
      </div>
    </header>
  );
};

export default Header;
