import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle } from 'lucide-react';
import GlassSurface from '../components/GlassSurface';
import { CONTACT } from '../lib/brand';

const ZahlungErfolgreich = () => {
  return (
    <div className="py-20 animate-fade-in">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <GlassSurface variant="card" density="light" className="p-8 md:p-10 text-center">
          <CheckCircle className="h-14 w-14 text-green-600 mx-auto mb-4" />
          <h1 className="font-display text-3xl font-bold text-gray-900 mb-4">Vielen Dank für Ihre Bestellung</h1>
          <p className="text-lg text-gray-700 mb-6">
            Ihre Bestellung ist bei uns eingegangen. Zahlungsbeleg und Rechnung sendet Ihnen unser
            Zahlungsdienstleister Stripe an die angegebene E-Mail-Adresse.
          </p>
          <div className="bg-gray-50 rounded-xl p-5 text-left mb-8">
            <p className="text-sm font-semibold text-gray-900 mb-2">So geht es weiter</p>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>1. Wir melden uns innerhalb von 1 Werktag bei Ihnen, beim Ersatzteil-Check zur Terminabstimmung.</li>
              <li>
                2. Bei Zahlung per SEPA-Lastschrift kann die endgültige Zahlungsbestätigung einige
                Werktage dauern.
              </li>
              <li>
                3. Fragen? {CONTACT.email} · {CONTACT.phone}
              </li>
            </ul>
          </div>
          <Link
            to="/"
            className="bg-primary-700 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-800 transition-colors inline-flex items-center justify-center gap-2"
          >
            Zur Startseite <ArrowRight className="h-4 w-4" />
          </Link>
        </GlassSurface>
      </div>
    </div>
  );
};

export default ZahlungErfolgreich;
