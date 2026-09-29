/**
 * Allowlist of fixed-price products that can be bought directly on the site.
 * Shared by the UI (labels, displayed price) and the `create-checkout`
 * Function (price ID lookup + amount cross-check against Stripe). The client
 * only ever sends a product key; the amount is never taken from the request.
 */
export interface FixedPriceProduct {
  key: string;
  name: string;
  /** Net price in euro cents. Must equal the unit_amount of the Stripe price. */
  netAmountCents: number;
  /** Name of the env var holding the Stripe price ID (`price_...`). */
  priceEnvVar: string;
  /** Printed on the Stripe invoice. */
  invoiceDescription: string;
}

export const ERSATZTEIL_CHECK_KEY = 'ersatzteil-check';

export const FIXED_PRICE_PRODUCTS: Readonly<Record<string, FixedPriceProduct>> = {
  [ERSATZTEIL_CHECK_KEY]: {
    key: ERSATZTEIL_CHECK_KEY,
    name: 'Ersatzteil- und Vorrichtungs-Check vor Ort',
    netAmountCents: 49_000,
    priceEnvVar: 'STRIPE_PRICE_ERSATZTEIL_CHECK',
    invoiceDescription:
      'Ersatzteil- und Vorrichtungs-Check vor Ort. Der Nettobetrag wird auf den Folgeauftrag angerechnet.',
  },
};

export function findFixedPriceProduct(key: unknown): FixedPriceProduct | null {
  if (typeof key !== 'string' || !Object.prototype.hasOwnProperty.call(FIXED_PRICE_PRODUCTS, key)) {
    return null;
  }
  return FIXED_PRICE_PRODUCTS[key];
}

export type TaxMode = 'kleinunternehmer' | 'regelbesteuerung';

export const KLEINUNTERNEHMER_NOTICE = 'Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.';
export const VAT_RATE_PERCENT = 19;

const euroFormatter = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });

export function formatEuroCents(cents: number): string {
  return euroFormatter.format(cents / 100);
}

/** 19 % VAT on a net amount in cents, rounded half-up to whole cents like Stripe. */
export function vatForNetCents(netCents: number): number {
  return Math.round((netCents * VAT_RATE_PERCENT) / 100);
}
