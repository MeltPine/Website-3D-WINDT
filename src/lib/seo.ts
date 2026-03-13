import { BRAND, CONTACT, SITE } from './brand';
import { knowledgePages, knowledgePath, knowledgeRouteKey } from './knowledgePages';

export const SITE_URL = SITE.url;

export type SeoSchema = Record<string, unknown> | Array<Record<string, unknown>>;
export type RobotsValue = 'index,follow' | 'noindex,nofollow';

export interface RouteSeoConfig {
  title: string;
  description: string;
  path: string;
  robots?: RobotsValue;
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

const baseRouteSeo: Record<string, RouteSeoConfig> = {
  '/': {
    title: `${BRAND.publicName} | Industrieller 3D-Druck Service fuer B2B`,
    description:
      'Industrieller 3D-Druck Service fuer Maschinenbau, Produktion und Werkstaetten: Ersatzteile, Prototypenfertigung und Vorrichtungen mit technischer Pruefung, klaren Lieferfenstern und Rueckmeldung in der Regel innerhalb von 24 Stunden.',
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
      '3D-Druck Service fuer Industriekunden: Ersatzteile 3D-Druck, Prototypenfertigung, CAD-Unterstuetzung und 3D-Scan fuer Maschinenbau und Produktion.',
    path: '/leistungen/',
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
      'Ersatzteile 3D-Druck fuer Maschinenbau, Produktion und Werkstaetten. Industrieller 3D-Druck Service mit Angebot innerhalb von 24 Stunden.',
    path: '/ersatzteile-3d-drucken/',
  },
  '/prototypen-3d-druck': {
    title: `Prototypenfertigung per 3D-Druck | ${BRAND.publicName}`,
    description:
      'Prototypenfertigung und schnelle Iterationen im industriellen 3D-Druck. 3D-Druck Service fuer Produktentwicklung mit technischer Rueckmeldung.',
    path: '/prototypen-3d-druck/',
  },
  '/montagehilfen-vorrichtungen': {
    title: 'Montagehilfen und Vorrichtungen | Industrieller 3D-Druck',
    description:
      'Montagehilfen und Vorrichtungen per 3D-Druck Service fuer stabile Produktionsprozesse, weniger Fehler und schnellere Umsetzung.',
    path: '/montagehilfen-vorrichtungen/',
  },
  '/kunststoffteile-nachfertigen': {
    title: `Kunststoffteile nachfertigen | 3D-Druck Service ${BRAND.publicName}`,
    description:
      'Kunststoffteile nachfertigen fuer Maschinen und Anlagen. Industrieller 3D-Druck bei abgekuendigten Bauteilen mit Angebot innerhalb von 24 Stunden.',
    path: '/kunststoffteile-nachfertigen/',
  },
  '/projekt-starten': {
    title: `Projekt Starten | Datei Hochladen & Angebot | ${BRAND.publicName}`,
    description:
      'Projektdatei hochladen, Anforderungen angeben und ein qualifiziertes Angebot fuer Ihren 3D-Druckauftrag erhalten.',
    path: '/projekt-starten/',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'ContactPage',
      name: `Projektanfrage ${BRAND.publicName}`,
      url: `${SITE_URL}/projekt-starten/`,
    },
  },
  '/kontakt': {
    title: `Kontakt | ${BRAND.publicName}`,
    description:
      `Kontakt zu ${BRAND.publicName}: technische Rueckfragen, Projektklaerung und Angebotserstellung fuer hochwertige 3D-Druckauftraege.`,
    path: '/kontakt/',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'ContactPage',
      name: `Kontakt ${BRAND.publicName}`,
      url: `${SITE_URL}/kontakt/`,
    },
  },
  '/danke-projekt': {
    title: `Danke fuer Ihre Projektanfrage | ${BRAND.publicName}`,
    description:
      'Ihre Projektanfrage wurde erfolgreich uebermittelt. Wir melden uns innerhalb von 24 Stunden mit technischer Rueckmeldung und Angebot.',
    path: '/danke-projekt/',
    robots: 'noindex,nofollow',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: `Danke Projektanfrage ${BRAND.publicName}`,
      url: `${SITE_URL}/danke-projekt/`,
    },
  },
  '/danke-kontakt': {
    title: `Danke fuer Ihre Kontaktanfrage | ${BRAND.publicName}`,
    description:
      'Ihre Kontaktanfrage wurde erfolgreich uebermittelt. Wir melden uns innerhalb von 24 Stunden mit einer qualifizierten Rueckmeldung.',
    path: '/danke-kontakt/',
    robots: 'noindex,nofollow',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: `Danke Kontaktanfrage ${BRAND.publicName}`,
      url: `${SITE_URL}/danke-kontakt/`,
    },
  },
  '/ueber-uns': {
    title: `Ueber Uns | ${BRAND.publicName}`,
    description:
      `Erfahren Sie mehr ueber Prozesssicherheit, industrielle Projektabwicklung und den Qualitaetsanspruch von ${BRAND.publicName}.`,
    path: '/ueber-uns/',
  },
  '/nachhaltigkeit': {
    title: `Nachhaltigkeit | ${BRAND.publicName}`,
    description:
      'Nachhaltige 3D-Druckfertigung mit lokaler Produktion, effizienten Prozessen und materialbewusster Planung.',
    path: '/nachhaltigkeit/',
  },
  '/galerie': {
    title: `Industrie-Fallbeispiele (anonymisiert, verifiziert, freigegeben) | ${BRAND.publicName}`,
    description:
      'Anonymisierte, verifizierte und schrittweise freigegebene B2B-Fallbeispiele aus Ersatzteilfertigung, Prototyping und Vorrichtungsbau.',
    path: '/galerie/',
  },
  '/impressum': {
    title: `Impressum | ${BRAND.publicName}`,
    description: `Rechtliche Informationen und Anbieterkennzeichnung von ${BRAND.publicName}.`,
    path: '/impressum/',
  },
  '/datenschutz': {
    title: `Datenschutz | ${BRAND.publicName}`,
    description:
      `Informationen zur Verarbeitung personenbezogener Daten auf der Website von ${BRAND.publicName}.`,
    path: '/datenschutz/',
  },
  '/404': {
    title: `Seite nicht gefunden | ${BRAND.publicName}`,
    description:
      'Die angeforderte Seite konnte nicht gefunden werden. Starten Sie eine neue Anfrage oder wechseln Sie zur Startseite.',
    path: '/404/',
    robots: 'noindex,nofollow',
  },
  '/wissen': {
    title: `Wissenscenter | Industrieller 3D-Druck Leitfaeden | ${BRAND.publicName}`,
    description:
      'Technische Leitfaeden fuer Ersatzteile, Prototyping, Materialwahl, Toleranzen und Lieferfenster im industriellen 3D-Druck.',
    path: '/wissen/',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: `Wissenscenter ${BRAND.publicName}`,
      url: `${SITE_URL}/wissen/`,
    },
  },
};

const knowledgeRouteSeo: Record<string, RouteSeoConfig> = Object.fromEntries(
  knowledgePages.map((page) => {
    const routeKey = knowledgeRouteKey(page.slug);
    return [
      routeKey,
      {
        title: `${page.title} | Wissen | ${BRAND.publicName}`,
        description: page.description,
        path: knowledgePath(page.slug),
        ogType: 'article' as const,
        schema: {
          '@context': 'https://schema.org',
          '@type': 'TechArticle',
          headline: page.title,
          description: page.description,
          inLanguage: 'de',
          url: `${SITE_URL}${knowledgePath(page.slug)}`,
          publisher: {
            '@type': 'Organization',
            name: BRAND.publicName,
          },
        },
      },
    ];
  }),
);

export const routeSeo: Record<string, RouteSeoConfig> = {
  ...baseRouteSeo,
  ...knowledgeRouteSeo,
};
