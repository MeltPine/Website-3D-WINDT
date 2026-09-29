#!/usr/bin/env node
// Generates a signed "Angebot annehmen & bezahlen" link for one accepted quote.
//
//   PAYMENT_LINK_SECRET=... node scripts/payment-link.mjs \
//     --quote AB-2026-001 --amount 1234.50 --valid-days 14 --base-url https://3d-windt.de
//
// --amount is the NET amount in euros (Regelbesteuerung adds 19 % on top at
// checkout; in Kleinunternehmer mode it is the final amount). The secret must
// be identical to PAYMENT_LINK_SECRET in the Netlify environment.

import { parseArgs } from 'node:util';
import {
  PAYMENT_LINK_PATH,
  createPaymentLinkQuery,
  isValidSecret,
  parseEuroAmountToCents,
} from '../netlify/shared/paymentLink.mjs';

const USAGE =
  'Usage: PAYMENT_LINK_SECRET=... node scripts/payment-link.mjs --quote <AB-2026-001> --amount <1234.50> --valid-days <1-180> --base-url <https://3d-windt.de>';

function fail(message) {
  console.error(`Error: ${message}`);
  console.error(USAGE);
  process.exit(1);
}

let values;
try {
  ({ values } = parseArgs({
    options: {
      quote: { type: 'string' },
      amount: { type: 'string' },
      'valid-days': { type: 'string' },
      'base-url': { type: 'string' },
      help: { type: 'boolean' },
    },
    strict: true,
    allowPositionals: false,
  }));
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}

if (values.help) {
  console.log(USAGE);
  process.exit(0);
}

const secret = process.env.PAYMENT_LINK_SECRET;
if (!isValidSecret(secret)) {
  fail('PAYMENT_LINK_SECRET is not set or shorter than 32 characters.');
}
for (const required of ['quote', 'amount', 'valid-days', 'base-url']) {
  if (typeof values[required] !== 'string' || values[required].trim() === '') {
    fail(`--${required} is required.`);
  }
}

const validDaysRaw = values['valid-days'].trim();
if (!/^\d{1,3}$/.test(validDaysRaw) || Number(validDaysRaw) < 1 || Number(validDaysRaw) > 180) {
  fail('--valid-days must be an integer between 1 and 180.');
}

let baseUrl;
try {
  baseUrl = new URL(values['base-url'].trim());
} catch {
  fail('--base-url is not a valid URL.');
}
const isLocal = baseUrl.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(baseUrl.hostname);
if (baseUrl.protocol !== 'https:' && !isLocal) {
  fail('--base-url must use https (http only for localhost).');
}

try {
  const quoteNumber = values.quote.trim().toUpperCase();
  const amountCents = parseEuroAmountToCents(values.amount);
  const nowSeconds = Math.floor(Date.now() / 1000);
  const expiresAt = nowSeconds + Number(validDaysRaw) * 24 * 60 * 60;
  const query = createPaymentLinkQuery({ quoteNumber, amountCents, expiresAt }, secret, nowSeconds);
  const link = `${baseUrl.origin}${PAYMENT_LINK_PATH}?${query}`;

  const amountLabel = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(
    amountCents / 100,
  );
  console.error(`Quote:      ${quoteNumber}`);
  console.error(`Net amount: ${amountLabel}`);
  console.error(`Valid until: ${new Date(expiresAt * 1000).toISOString()}`);
  // The link itself goes to stdout so it can be piped (e.g. into pbcopy).
  console.log(link);
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
