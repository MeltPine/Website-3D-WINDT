import { CalendarClock, ClipboardCheck } from 'lucide-react';
import GlassSurface from './GlassSurface';
import B2BCheckoutButton from './B2BCheckoutButton';
import { ERSATZTEIL_CHECK_KEY, FIXED_PRICE_PRODUCTS, formatEuroCents } from '../lib/payment/catalog';

const product = FIXED_PRICE_PRODUCTS[ERSATZTEIL_CHECK_KEY];
const priceLabel = formatEuroCents(product.netAmountCents).replace(/,00\s?€$/, ' €');

const ErsatzteilCheckOffer = () => {
  return (
    <GlassSurface
      as="section"
      variant="card"
      density="light"
      className="p-8 mb-10"
      id="check"
      aria-labelledby="ersatzteil-check-title"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-primary-100 text-primary-700 p-3 rounded-lg">
          <ClipboardCheck className="h-6 w-6" />
        </div>
        <h2 id="ersatzteil-check-title" className="font-display text-2xl font-semibold text-gray-900">
          {product.name}
        </h2>
      </div>
      <p className="text-gray-700 mb-2">
        <strong className="text-gray-900">{priceLabel} netto</strong>, wird vollständig auf Ihren
        Folgeauftrag angerechnet.
      </p>
      <p className="text-gray-700 mb-6">
        Wir sichten bei Ihnen vor Ort kritische Ersatzteile und Vorrichtungen und zeigen, welche
        sich per 3D-Druck zuverlässig nachfertigen lassen.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <p className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-primary-700" />
            So geht es weiter
          </p>
          <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
            <li>Check buchen und sicher über Stripe bezahlen (z. B. Karte oder SEPA-Lastschrift).</li>
            <li>Rechnung und Zahlungsbeleg kommen automatisch per E-Mail.</li>
            <li>Wir melden uns innerhalb von 1 Werktag zur Terminabstimmung.</li>
          </ol>
          <p className="text-xs text-gray-600 mt-3">
            Standort außerhalb des Rhein-Main-Gebiets? Bitte sprechen Sie uns vor der Buchung kurz
            an.
          </p>
        </div>
        <B2BCheckoutButton
          selection={{ product: ERSATZTEIL_CHECK_KEY }}
          label={`Check direkt buchen (${priceLabel} netto)`}
        />
      </div>
    </GlassSurface>
  );
};

export default ErsatzteilCheckOffer;
