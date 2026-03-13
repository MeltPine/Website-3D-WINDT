import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CloseIcon, MenuIcon, PhoneIcon } from './icons';
import BrandLogo from './BrandLogo';
import GlassSurface from './GlassSurface';
import ThemeToggle from './ThemeToggle';
import { CONTACT } from '../lib/brand';
import { normalizePathname } from '../lib/routes';
import { useTheme } from '../lib/theme';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const { resolvedTheme } = useTheme();

  const navigation = [
    { name: 'Home', href: '/' },
    { name: 'Leistungen', href: '/leistungen/' },
    { name: 'Projektstart', href: '/projekt-starten/' },
    { name: 'Nachhaltigkeit', href: '/nachhaltigkeit/' },
    { name: 'Galerie', href: '/galerie/' },
    { name: 'Wissen', href: '/wissen/' },
    { name: 'Über uns', href: '/ueber-uns/' },
    { name: 'Kontakt', href: '/kontakt/' },
  ];
  const phoneHref = `tel:${CONTACT.phone.replace(/[^\d+]/g, '')}`;

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

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  return (
    <header className="sticky top-0 z-50 px-3 pt-3 sm:px-4">
      <div className="max-w-7xl mx-auto">
        <GlassSurface variant="nav" density="light" className="px-4 sm:px-6 lg:px-7">
          <div className="hidden 2xl:flex items-center justify-between border-b border-primary-100/70 py-2 text-xs text-gray-600">
            <p className="font-medium text-gray-700">
              Technische Rückmeldung in der Regel innerhalb von 24h (werktags)
            </p>
            <a
              href={phoneHref}
              className="inline-flex items-center gap-2 text-gray-700 hover:text-primary-700 transition-colors"
            >
              <PhoneIcon className="h-3.5 w-3.5" />
              {CONTACT.phone}
            </a>
          </div>

          <div className="flex items-center justify-between gap-3 py-3">
            <Link to="/" className="group shrink-0">
              <BrandLogo theme={resolvedTheme === 'dark' ? 'dark' : 'light'} size="sm" />
            </Link>

            <nav className="hidden xl:flex min-w-0 flex-1 items-center justify-center gap-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`shrink-0 whitespace-nowrap px-2.5 py-2 rounded-md text-sm font-semibold transition-all duration-200 ${
                    isActive(item.href)
                      ? 'bg-primary-50 text-primary-700 ring-1 ring-primary-100 shadow-sm'
                      : 'text-gray-700 hover:bg-white/70 hover:text-primary-700'
                  }`}
                  aria-current={isActive(item.href) ? 'page' : undefined}
                >
                  {item.name}
                </Link>
              ))}
            </nav>

            <div className="hidden md:flex shrink-0">
              <ThemeToggle compact />
            </div>

            <div className="hidden 2xl:block shrink-0">
              <Link
                to="/projekt-starten/"
                className="inline-flex items-center justify-center whitespace-nowrap bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-800 transition-colors shadow-sm ring-1 ring-primary-500/50"
              >
                Anfrage senden
              </Link>
            </div>

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="xl:hidden p-2 rounded-md text-gray-700 hover:text-primary-600 hover:bg-white/80 transition-colors"
              aria-label={isMenuOpen ? 'Menü schließen' : 'Menü öffnen'}
            >
              {isMenuOpen ? <CloseIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
            </button>
          </div>

          {isMenuOpen && (
            <div className="xl:hidden border-t border-primary-100/70 py-4 animate-fade-in">
              <div className="mb-3 md:hidden">
                <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Darstellung
                </p>
                <ThemeToggle className="w-full justify-between" />
              </div>
              <nav className="flex flex-col space-y-2">
                <Link
                  to="/projekt-starten/"
                  className="mb-2 bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-semibold text-center hover:bg-primary-800 transition-colors"
                >
                  Anfrage senden
                </Link>
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`px-3 py-2 rounded-md text-sm font-semibold transition-colors ${
                      isActive(item.href)
                        ? 'text-primary-700 bg-primary-50 ring-1 ring-primary-100'
                        : 'text-gray-700 hover:text-primary-700 hover:bg-white/75'
                    }`}
                  >
                    {item.name}
                  </Link>
                ))}
              </nav>
            </div>
          )}
        </GlassSurface>
      </div>
    </header>
  );
};

export default Header;
