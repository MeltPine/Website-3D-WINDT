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
    title: `${BRAND.publicName} | Industrieller 3D-Druck Service für B2B`,
    description:
      'Industrieller 3D-Druck Service für Ersatzteile, Prototypenfertigung und Vorrichtungen. Technisch geprüfte Rückmeldung in der Regel innerhalb von 24 Stunden.',
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
    title: `Leistungen | Industrieller 3D-Druck Service | ${BRAND.publicName}`,
    description:
      '3D-Druck Service für Industriekunden: Ersatzteile 3D-Druck, Prototypenfertigung, CAD-Unterstützung und 3D-Scan für Maschinenbau und Produktion.',
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
  '/ersatzteile-3d-drucken': {
    title: `Ersatzteile 3D-Druck | Industrieller 3D-Druck Service | ${BRAND.publicName}`,
    description:
      'Ersatzteile 3D-Druck für Maschinenbau, Produktion und Werkstätten. Industrieller 3D-Druck Service mit Angebot innerhalb von 24 Stunden.',
    path: '/ersatzteile-3d-drucken',
  },
  '/prototypen-3d-druck': {
    title: `Prototypenfertigung per 3D-Druck | ${BRAND.publicName}`,
    description:
      'Prototypenfertigung und schnelle Iterationen im industriellen 3D-Druck. 3D-Druck Service für Produktentwicklung mit technischer Rückmeldung.',
    path: '/prototypen-3d-druck',
  },
  '/montagehilfen-vorrichtungen': {
    title: `Montagehilfen und Vorrichtungen | Industrieller 3D-Druck`,
    description:
      'Montagehilfen und Vorrichtungen per 3D-Druck Service für stabile Produktionsprozesse, weniger Fehler und schnellere Umsetzung.',
    path: '/montagehilfen-vorrichtungen',
  },
  '/kunststoffteile-nachfertigen': {
    title: `Kunststoffteile nachfertigen | 3D-Druck Service ${BRAND.publicName}`,
    description:
      'Kunststoffteile nachfertigen für Maschinen und Anlagen. Industrieller 3D-Druck bei abgekündigten Bauteilen mit Angebot innerhalb von 24 Stunden.',
    path: '/kunststoffteile-nachfertigen',
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
  '/danke-projekt': {
    title: `Danke für Ihre Projektanfrage | ${BRAND.publicName}`,
    description:
      'Ihre Projektanfrage wurde erfolgreich übermittelt. Wir melden uns innerhalb von 24 Stunden mit technischer Rückmeldung und Angebot.',
    path: '/danke-projekt',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: `Danke Projektanfrage ${BRAND.publicName}`,
      url: `${SITE_URL}/danke-projekt`,
    },
  },
  '/danke-kontakt': {
    title: `Danke für Ihre Kontaktanfrage | ${BRAND.publicName}`,
    description:
      'Ihre Kontaktanfrage wurde erfolgreich übermittelt. Wir melden uns innerhalb von 24 Stunden mit einer qualifizierten Rückmeldung.',
    path: '/danke-kontakt',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: `Danke Kontaktanfrage ${BRAND.publicName}`,
      url: `${SITE_URL}/danke-kontakt`,
    },
  },
  '/ueber-uns': {
    title: `Über Uns | ${BRAND.publicName}`,
    description:
      `Erfahren Sie mehr über Prozesssicherheit, industrielle Projektabwicklung und den Qualitätsanspruch von ${BRAND.publicName}.`,
    path: '/ueber-uns',
  },
  '/nachhaltigkeit': {
    title: `Nachhaltigkeit | ${BRAND.publicName}`,
    description:
      'Nachhaltige 3D-Druckfertigung mit lokaler Produktion, effizienten Prozessen und materialbewusster Planung.',
    path: '/nachhaltigkeit',
  },
  '/galerie': {
    title: `Industrie-Anwendungen (anonymisiert) | ${BRAND.publicName}`,
    description:
      'Anonymisierte B2B-Anwendungsfälle aus Ersatzteilfertigung, Prototyping und Vorrichtungsbau mit technischem Fokus.',
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
