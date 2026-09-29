import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDownIcon, CloseIcon, MenuIcon, PhoneIcon } from './icons';
import BrandLogo from './BrandLogo';
import GlassSurface from './GlassSurface';
import ThemeToggle from './ThemeToggle';
import { CONTACT } from '../lib/brand';
import { normalizePathname } from '../lib/routes';
import { servicePages } from '../lib/servicePages';
import { useTheme } from '../lib/theme';

const SERVICES_OVERVIEW_HREF = '/leistungen/';
const SERVICES_MENU_ID = 'header-services-menu';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isServicesOpen, setIsServicesOpen] = useState(false);
  const servicesRef = useRef<HTMLDivElement>(null);
  const servicesButtonRef = useRef<HTMLButtonElement>(null);
  const location = useLocation();
  const { resolvedTheme } = useTheme();

  const navigation = [
    { name: 'Home', href: '/' },
    { name: 'Leistungen', href: SERVICES_OVERVIEW_HREF },
    { name: 'Projektstart', href: '/projekt-starten/' },
    { name: 'Nachhaltigkeit', href: '/nachhaltigkeit/' },
    { name: 'Galerie', href: '/galerie/' },
    { name: 'Wissen', href: '/wissen/' },
    { name: 'Werkstoffe', href: '/werkstoffe/' },
    { name: 'Über uns', href: '/ueber-uns/' },
    { name: 'Kontakt', href: '/kontakt/' },
  ];
  const phoneHref = `tel:${CONTACT.phone.replace(/[^\d+]/g, '')}`;

  const normalizedCurrentPath = normalizePathname(location.pathname);
  const servicePaths = servicePages.map((service) => normalizePathname(service.href));
  const isActive = (path: string) => {
    const normalizedNavPath = normalizePathname(path);
    if (normalizedNavPath === '/wissen' || normalizedNavPath === '/werkstoffe') {
      return (
        normalizedCurrentPath === normalizedNavPath ||
        normalizedCurrentPath.startsWith(`${normalizedNavPath}/`)
      );
    }
    return normalizedCurrentPath === normalizedNavPath;
  };
  const isServicesSectionActive =
    isActive(SERVICES_OVERVIEW_HREF) || servicePaths.includes(normalizedCurrentPath);

  useEffect(() => {
    setIsMenuOpen(false);
    setIsServicesOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isServicesOpen) {
      return undefined;
    }
    const handlePointerDown = (event: PointerEvent) => {
      if (servicesRef.current && !servicesRef.current.contains(event.target as Node)) {
        setIsServicesOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isServicesOpen]);

  const handleServicesKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && isServicesOpen) {
      event.stopPropagation();
      setIsServicesOpen(false);
      servicesButtonRef.current?.focus();
    }
  };

  const handleServicesBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    const nextFocus = event.relatedTarget as Node | null;
    if (!nextFocus || !event.currentTarget.contains(nextFocus)) {
      setIsServicesOpen(false);
    }
  };

  const desktopLinkClass = (active: boolean) =>
    `shrink-0 whitespace-nowrap px-2.5 py-2 rounded-md text-sm font-semibold transition-all duration-200 ${
      active
        ? 'bg-primary-50 text-primary-700 ring-1 ring-primary-100 shadow-sm'
        : 'text-gray-700 hover:bg-white/70 hover:text-primary-700'
    }`;

  return (
    <header className="sticky top-0 z-50 px-3 pt-3 sm:px-4">
      <div className="max-w-7xl mx-auto">
        <GlassSurface
          variant="nav"
          density="light"
          className="glass-nav-dropdown-host px-4 sm:px-6 lg:px-7"
        >
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

            <nav
              aria-label="Hauptnavigation"
              className="hidden xl:flex min-w-0 flex-1 items-center justify-center gap-1"
            >
              {navigation.map((item) => {
                if (item.href !== SERVICES_OVERVIEW_HREF) {
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={desktopLinkClass(isActive(item.href))}
                      aria-current={isActive(item.href) ? 'page' : undefined}
                    >
                      {item.name}
                    </Link>
                  );
                }

                return (
                  <div
                    key={item.name}
                    ref={servicesRef}
                    className="relative flex shrink-0 items-center"
                    onPointerEnter={(event) => {
                      if (event.pointerType === 'mouse') {
                        setIsServicesOpen(true);
                      }
                    }}
                    onPointerLeave={(event) => {
                      if (event.pointerType === 'mouse') {
                        setIsServicesOpen(false);
                      }
                    }}
                    onKeyDown={handleServicesKeyDown}
                    onBlur={handleServicesBlur}
                  >
                    <Link
                      to={item.href}
                      className={`${desktopLinkClass(isServicesSectionActive)} pr-1.5`}
                      aria-current={isActive(item.href) ? 'page' : undefined}
                    >
                      {item.name}
                    </Link>
                    <button
                      ref={servicesButtonRef}
                      type="button"
                      onClick={() => setIsServicesOpen((open) => !open)}
                      className="rounded-md p-1.5 text-gray-600 hover:bg-white/70 hover:text-primary-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                      aria-expanded={isServicesOpen}
                      aria-controls={SERVICES_MENU_ID}
                      aria-label={
                        isServicesOpen ? 'Leistungsmenü schließen' : 'Leistungsmenü öffnen'
                      }
                    >
                      <ChevronDownIcon
                        className={`h-4 w-4 transition-transform duration-200 ${
                          isServicesOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    <div
                      id={SERVICES_MENU_ID}
                      className={`absolute left-0 top-full z-50 pt-2 ${
                        isServicesOpen ? 'block' : 'hidden'
                      }`}
                    >
                      <ul className="w-80 rounded-xl border border-primary-100 bg-white p-2 shadow-lg">
                        {servicePages.map((service) => (
                          <li key={service.href}>
                            <Link
                              to={service.href}
                              className={`block rounded-lg px-3 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                                isActive(service.href)
                                  ? 'bg-primary-50 text-primary-700'
                                  : 'text-gray-700 hover:bg-primary-50 hover:text-primary-700'
                              }`}
                              aria-current={isActive(service.href) ? 'page' : undefined}
                            >
                              <span className="block text-sm font-semibold">{service.name}</span>
                              <span className="block text-xs text-gray-600">{service.summary}</span>
                            </Link>
                          </li>
                        ))}
                        <li className="mt-1 border-t border-gray-200 pt-1">
                          <Link
                            to={SERVICES_OVERVIEW_HREF}
                            className="block rounded-lg px-3 py-2 text-sm font-semibold text-primary-700 hover:bg-primary-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                          >
                            Alle Leistungen im Überblick
                          </Link>
                        </li>
                      </ul>
                    </div>
                  </div>
                );
              })}
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
              aria-expanded={isMenuOpen}
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
              <nav aria-label="Mobile Navigation" className="flex flex-col space-y-2">
                <Link
                  to="/projekt-starten/"
                  className="mb-2 bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-semibold text-center hover:bg-primary-800 transition-colors"
                >
                  Anfrage senden
                </Link>
                {navigation.map((item) => (
                  <React.Fragment key={item.name}>
                    <Link
                      to={item.href}
                      className={`px-3 py-2 rounded-md text-sm font-semibold transition-colors ${
                        isActive(item.href)
                          ? 'text-primary-700 bg-primary-50 ring-1 ring-primary-100'
                          : 'text-gray-700 hover:text-primary-700 hover:bg-white/75'
                      }`}
                      aria-current={isActive(item.href) ? 'page' : undefined}
                    >
                      {item.name}
                    </Link>
                    {item.href === SERVICES_OVERVIEW_HREF && (
                      <ul className="ml-3 space-y-1 border-l border-primary-100 pl-3">
                        {servicePages.map((service) => (
                          <li key={service.href}>
                            <Link
                              to={service.href}
                              className={`block px-3 py-1.5 rounded-md text-sm transition-colors ${
                                isActive(service.href)
                                  ? 'text-primary-700 bg-primary-50 ring-1 ring-primary-100 font-semibold'
                                  : 'text-gray-700 hover:text-primary-700 hover:bg-white/75'
                              }`}
                              aria-current={isActive(service.href) ? 'page' : undefined}
                            >
                              {service.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </React.Fragment>
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
