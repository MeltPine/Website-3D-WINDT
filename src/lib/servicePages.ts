export type ServicePageKey =
  | 'ersatzteile'
  | 'kunststoffteile'
  | 'prototypen'
  | 'montagehilfen';

export type ServicePageLink = {
  key: ServicePageKey;
  name: string;
  href: string;
  summary: string;
};

// Single list of the dedicated service landing pages. Header, footer and
// knowledge articles link from here so the targets cannot drift apart.
export const servicePages: ServicePageLink[] = [
  {
    key: 'ersatzteile',
    name: 'Ersatzteile 3D-Druck',
    href: '/ersatzteile-3d-drucken/',
    summary: 'Funktionsrelevante Ersatzteile schnell nachfertigen, auch in kleinen Losgrößen.',
  },
  {
    key: 'kunststoffteile',
    name: 'Kunststoffteile nachfertigen',
    href: '/kunststoffteile-nachfertigen/',
    summary: 'Abgekündigte oder schwer verfügbare Kunststoffteile für Maschinen und Anlagen.',
  },
  {
    key: 'prototypen',
    name: 'Prototypen 3D-Druck',
    href: '/prototypen-3d-druck/',
    summary: 'Schnelle Iterationen für Entwicklungsteams mit technischer Rückmeldung.',
  },
  {
    key: 'montagehilfen',
    name: 'Montagehilfen & Vorrichtungen',
    href: '/montagehilfen-vorrichtungen/',
    summary: 'Passgenaue Produktionshilfen für stabile Abläufe und weniger Fehler.',
  },
];

export const servicePageByKey: Record<ServicePageKey, ServicePageLink> = Object.fromEntries(
  servicePages.map((page) => [page.key, page]),
) as Record<ServicePageKey, ServicePageLink>;
