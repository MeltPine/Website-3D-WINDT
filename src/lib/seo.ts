import { BRAND, CONTACT, SITE } from './brand';

export const SITE_URL = SITE.url;

export type SeoSchema = Record<string, unknown> | Array<Record<string, unknown>>;

export interface RouteSeoConfig {
  title: string;
  description: string;
  path: string;
  ogType?: 'website' | 'article';
  schema?: SeoSchema;
}

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: BRAND.publicName,
  alternateName: BRAND.shortName,
  legalName: BRAND.legalName,
  url: SITE_URL,
  email: CONTACT.email,
  telephone: CONTACT.phone,
  address: {
    '@type': 'PostalAddress',
    streetAddress: CONTACT.streetAddress,
    postalCode: CONTACT.postalCode,
    addressLocality: CONTACT.city,
    addressCountry: CONTACT.countryCode,
  },
};

export const routeSeo: Record<string, RouteSeoConfig> = {
  '/': {
    title: `${BRAND.publicName} | Industriequalität im 3D-Druck`,
    description:
      '3D-Druck in Industriequalität mit verlässlichen Lieferzeiten. Anfrage starten, Datei hochladen und zeitnah ein belastbares Angebot erhalten.',
    path: '/',
    schema: [
      organizationSchema,
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: BRAND.publicName,
        url: SITE_URL,
      },
    ],
  },
  '/leistungen': {
    title: `Leistungen | 3D-Druck, CAD und 3D-Scan | ${BRAND.publicName}`,
    description:
      'FDM-3D-Druck, CAD-Modellierung und 3D-Scan mit Fokus auf Prozesssicherheit, Materialqualität und verlässliche Abwicklung.',
    path: '/leistungen',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'Service',
      serviceType: '3D-Druck Dienstleistung',
      provider: {
        '@type': 'Organization',
        name: BRAND.publicName,
      },
      areaServed: 'Deutschland',
    },
  },
  '/projekt-starten': {
    title: `Projekt Starten | Datei Hochladen & Angebot | ${BRAND.publicName}`,
    description:
      'Projektdatei hochladen, Anforderungen angeben und ein qualifiziertes Angebot für Ihren 3D-Druckauftrag erhalten.',
    path: '/projekt-starten',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'ContactPage',
      name: `Projektanfrage ${BRAND.publicName}`,
      url: `${SITE_URL}/projekt-starten`,
    },
  },
  '/kontakt': {
    title: `Kontakt | ${BRAND.publicName}`,
    description:
      `Kontakt zu ${BRAND.publicName}: technische Rückfragen, Projektklärung und Angebotserstellung für hochwertige 3D-Druckaufträge.`,
    path: '/kontakt',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'ContactPage',
      name: `Kontakt ${BRAND.publicName}`,
      url: `${SITE_URL}/kontakt`,
    },
  },
  '/ueber-uns': {
    title: `Über Uns | ${BRAND.publicName}`,
    description:
      `Erfahren Sie mehr über den Qualitätsanspruch, die Arbeitsweise und die Projektbegleitung von ${BRAND.publicName}.`,
    path: '/ueber-uns',
  },
  '/nachhaltigkeit': {
    title: `Nachhaltigkeit | ${BRAND.publicName}`,
    description:
      'Nachhaltige 3D-Druckfertigung mit lokaler Produktion, effizienten Prozessen und materialbewusster Planung.',
    path: '/nachhaltigkeit',
  },
  '/galerie': {
    title: `Galerie | ${BRAND.publicName} Projekte`,
    description:
      'Einblicke in ausgewählte 3D-Druckprojekte aus Prototyping, Ersatzteilen und technischen Anwendungen.',
    path: '/galerie',
  },
  '/impressum': {
    title: `Impressum | ${BRAND.publicName}`,
    description: `Rechtliche Informationen und Anbieterkennzeichnung von ${BRAND.publicName}.`,
    path: '/impressum',
  },
  '/datenschutz': {
    title: `Datenschutz | ${BRAND.publicName}`,
    description:
      `Informationen zur Verarbeitung personenbezogener Daten auf der Website von ${BRAND.publicName}.`,
    path: '/datenschutz',
  },
};
