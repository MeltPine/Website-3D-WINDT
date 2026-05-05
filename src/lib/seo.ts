import { BRAND, CONTACT, SITE } from './brand';
import { knowledgePages, knowledgePath, knowledgeRouteKey } from './knowledgePages';

export const SITE_URL = SITE.url;
export const DEFAULT_OG_IMAGE = `${SITE_URL}/logo/3dw-logo-full.webp`;
export const DEFAULT_OG_IMAGE_ALT = `${BRAND.publicName} Logo - industrieller 3D-Druck Service`;

export type SeoSchema = Record<string, unknown> | Array<Record<string, unknown>>;
export type RobotsValue = 'index,follow' | 'noindex,nofollow';

export interface RouteSeoConfig {
  title: string;
  description: string;
  path: string;
  robots?: RobotsValue;
  ogType?: 'website' | 'article';
  schema?: SeoSchema;
  image?: string;
  imageAlt?: string;
}

const offerCatalogSchema = {
  '@type': 'OfferCatalog',
  name: 'Industrieller 3D-Druck Service',
  itemListElement: [
    {
      '@type': 'Offer',
      itemOffered: {
        '@type': 'Service',
        name: 'Ersatzteile 3D-Druck',
        serviceType: 'Additive Fertigung von Ersatzteilen',
      },
    },
    {
      '@type': 'Offer',
      itemOffered: {
        '@type': 'Service',
        name: 'Prototypenfertigung per 3D-Druck',
        serviceType: 'Prototypenbau und Iterationsfertigung',
      },
    },
    {
      '@type': 'Offer',
      itemOffered: {
        '@type': 'Service',
        name: 'Montagehilfen und Vorrichtungen',
        serviceType: 'Fertigung produktionsnaher Hilfsmittel',
      },
    },
  ],
};

const businessSchema = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  '@id': `${SITE_URL}/#business`,
  name: BRAND.publicName,
  alternateName: BRAND.shortName,
  legalName: BRAND.legalName,
  description:
    'Industrieller 3D-Druck Service fuer Maschinenbau, Produktion, Anlagenbau und Werkstaetten.',
  url: SITE_URL,
  image: DEFAULT_OG_IMAGE,
  email: CONTACT.email,
  telephone: CONTACT.phone,
  priceRange: 'Nach Angebot',
  areaServed: [
    {
      '@type': 'Country',
      name: 'Deutschland',
    },
    {
      '@type': 'AdministrativeArea',
      name: 'Rhein-Main-Gebiet',
    },
  ],
  address: {
    '@type': 'PostalAddress',
    streetAddress: CONTACT.streetAddress,
    postalCode: CONTACT.postalCode,
    addressLocality: CONTACT.city,
    addressCountry: CONTACT.countryCode,
  },
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      opens: '08:00',
      closes: '17:00',
    },
  ],
  hasOfferCatalog: offerCatalogSchema,
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Wie schnell erhalten wir eine Rueckmeldung?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'In der Regel erhalten Sie innerhalb von 24 Stunden eine qualifizierte technische Einschaetzung.',
      },
    },
    {
      '@type': 'Question',
      name: 'Welche Materialien sind fuer industrielle Anwendungen verfuegbar?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Je nach Einsatzfall arbeitet 3D-WINDT unter anderem mit ABS, ASA, PC, PA-basierten Werkstoffen und TPU sowie weiteren technischen Materialien auf Anfrage.',
      },
    },
    {
      '@type': 'Question',
      name: 'Welche Genauigkeit ist beim 3D-Druck realistisch?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Die erreichbare Genauigkeit haengt von Geometrie, Material und Funktion ab. Relevante Toleranzen werden vor Produktionsstart abgestimmt.',
      },
    },
  ],
};

const baseRouteSeo: Record<string, RouteSeoConfig> = {
  '/': {
    title: `${BRAND.publicName} | Industrieller 3D-Druck Service fuer B2B`,
    description:
      'Industrieller 3D-Druck Service fuer Maschinenbau, Produktion und Werkstaetten: Ersatzteile, Prototypenfertigung und Vorrichtungen mit technischer Pruefung, klaren Lieferfenstern und Rueckmeldung in der Regel innerhalb von 24 Stunden.',
    path: '/',
    schema: [
      businessSchema,
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: BRAND.publicName,
        url: SITE_URL,
      },
      faqSchema,
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
        '@type': 'LocalBusiness',
        name: BRAND.publicName,
        url: SITE_URL,
      },
      areaServed: 'Deutschland',
      hasOfferCatalog: offerCatalogSchema,
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
