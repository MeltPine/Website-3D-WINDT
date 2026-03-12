export const SITE_URL = 'https://3d-windt.de';

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
  name: '3D-WINDT',
  url: SITE_URL,
  email: 'support@3d-windt.de',
  telephone: '+49 (0) 1512 5534623',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Doktor-Weinholz-Straße 23',
    postalCode: '63110',
    addressLocality: 'Rodgau',
    addressCountry: 'DE',
  },
};

export const routeSeo: Record<string, RouteSeoConfig> = {
  '/': {
    title: '3D-WINDT | Industriequalität im 3D-Druck',
    description:
      '3D-Druck in Industriequalität mit verlässlichen Lieferzeiten. Anfrage starten, Datei hochladen und zeitnah ein belastbares Angebot erhalten.',
    path: '/',
    schema: [
      organizationSchema,
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: '3D-WINDT',
        url: SITE_URL,
      },
    ],
  },
  '/leistungen': {
    title: 'Leistungen | 3D-Druck, CAD und 3D-Scan',
    description:
      'FDM-3D-Druck, CAD-Modellierung und 3D-Scan mit Fokus auf Prozesssicherheit, Materialqualität und verlässliche Abwicklung.',
    path: '/leistungen',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'Service',
      serviceType: '3D-Druck Dienstleistung',
      provider: {
        '@type': 'Organization',
        name: '3D-WINDT',
      },
      areaServed: 'Deutschland',
    },
  },
  '/projekt-starten': {
    title: 'Projekt Starten | Datei Hochladen & Angebot',
    description:
      'Projektdatei hochladen, Anforderungen angeben und ein qualifiziertes Angebot für Ihren 3D-Druckauftrag erhalten.',
    path: '/projekt-starten',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'ContactPage',
      name: 'Projektanfrage 3D-WINDT',
      url: `${SITE_URL}/projekt-starten`,
    },
  },
  '/kontakt': {
    title: 'Kontakt | 3D-WINDT',
    description:
      'Kontakt zu 3D-WINDT: technische Rückfragen, Projektklärung und Angebotserstellung für hochwertige 3D-Druckaufträge.',
    path: '/kontakt',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'ContactPage',
      name: 'Kontakt 3D-WINDT',
      url: `${SITE_URL}/kontakt`,
    },
  },
  '/ueber-uns': {
    title: 'Über Uns | 3D-WINDT',
    description:
      'Erfahren Sie mehr über den Qualitätsanspruch, die Arbeitsweise und die Projektbegleitung von 3D-WINDT.',
    path: '/ueber-uns',
  },
  '/nachhaltigkeit': {
    title: 'Nachhaltigkeit | 3D-WINDT',
    description:
      'Nachhaltige 3D-Druckfertigung mit lokaler Produktion, effizienten Prozessen und materialbewusster Planung.',
    path: '/nachhaltigkeit',
  },
  '/galerie': {
    title: 'Galerie | 3D-WINDT Projekte',
    description:
      'Einblicke in ausgewählte 3D-Druckprojekte aus Prototyping, Ersatzteilen und technischen Anwendungen.',
    path: '/galerie',
  },
  '/impressum': {
    title: 'Impressum | 3D-WINDT',
    description: 'Rechtliche Informationen und Anbieterkennzeichnung von 3D-WINDT.',
    path: '/impressum',
  },
  '/datenschutz': {
    title: 'Datenschutz | 3D-WINDT',
    description:
      'Informationen zur Verarbeitung personenbezogener Daten auf der Website von 3D-WINDT.',
    path: '/datenschutz',
  },
};
