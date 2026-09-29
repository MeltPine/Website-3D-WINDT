import { Link } from 'react-router-dom';
import { ArrowRight, XCircle } from 'lucide-react';
import GlassSurface from '../components/GlassSurface';
import { CONTACT } from '../lib/brand';

const ZahlungAbgebrochen = () => {
  return (
    <div className="py-20 animate-fade-in">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <GlassSurface variant="card" density="light" className="p-8 md:p-10 text-center">
          <XCircle className="h-14 w-14 text-gray-500 mx-auto mb-4" />
          <h1 className="font-display text-3xl font-bold text-gray-900 mb-4">Zahlung abgebrochen</h1>
          <p className="text-lg text-gray-700 mb-6">
            Die Zahlung wurde nicht abgeschlossen, es wurde nichts belastet. Sie können es jederzeit
            erneut versuchen, bei einem Angebot über den Link aus unserer E-Mail.
          </p>
          <p className="text-gray-700 mb-8">
            Fragen oder Wunsch nach einer anderen Zahlungsart? Schreiben Sie uns an {CONTACT.email} oder rufen
            Sie an: {CONTACT.phone}.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/ersatzteile-3d-drucken/#check"
              className="bg-primary-700 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-800 transition-colors inline-flex items-center justify-center gap-2"
            >
              Zum Ersatzteil-Check <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/kontakt/"
              className="border border-gray-300 text-gray-800 px-6 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors"
            >
              Kontakt aufnehmen
            </Link>
          </div>
        </GlassSurface>
      </div>
    </div>
  );
};

export default ZahlungAbgebrochen;
