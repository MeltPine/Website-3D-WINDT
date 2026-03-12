export const BRAND = {
  publicName: '3D-WINDT',
  legalName: '3D-Windt GbR',
  shortName: '3DW',
} as const;

export const CONTACT = {
  email: 'support@3d-windt.de',
  phone: '+49 (0) 1512 5534623',
  streetAddress: 'Doktor-Weinholz-Straße 23',
  postalCode: '63110',
  city: 'Rodgau',
  country: 'Deutschland',
  countryCode: 'DE',
  officeHours: 'Mo-Fr: 8:00 - 17:00 Uhr',
  responseTime: 'In der Regel innerhalb von 24 Stunden',
  serviceArea: 'Versand innerhalb Deutschlands',
} as const;

export const LEGAL = {
  legalRepresentatives: [
    'Sebastian Windt',
    'Name des zweiten Gesellschafters (bitte ergänzen)',
  ],
} as const;

export const SITE = {
  url: 'https://3d-windt.de',
} as const;

export const BRAND_SIGNATURE = `Marke: ${BRAND.publicName} | Rechtsträger: ${BRAND.legalName}`;
export const FULL_ADDRESS = `${CONTACT.streetAddress}, ${CONTACT.postalCode} ${CONTACT.city}`;
export const LEGAL_REPRESENTATION = `Vertreten durch die Gesellschafter: ${LEGAL.legalRepresentatives.join(
  ' und ',
)}`;
