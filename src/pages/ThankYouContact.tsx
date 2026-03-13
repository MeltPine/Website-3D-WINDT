import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle } from 'lucide-react';

const ThankYouContact = () => {
  return (
    <div className="py-20 bg-gray-50 animate-fade-in">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white border border-green-200 rounded-2xl p-10 text-center shadow-sm">
          <CheckCircle className="h-14 w-14 text-green-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Kontaktanfrage erfolgreich gesendet</h1>
          <p className="text-lg text-gray-700 mb-6">
            Vielen Dank für Ihre Nachricht. Wir melden uns in der Regel innerhalb von 24 Stunden
            mit einer qualifizierten Rückmeldung.
          </p>

          <div className="bg-gray-50 rounded-xl p-5 text-left mb-8">
            <p className="text-sm font-semibold text-gray-900 mb-2">Wie es weitergeht</p>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>1. Eingang wird intern priorisiert</li>
              <li>2. Kurze Rückfrage bei offenen technischen Punkten</li>
              <li>3. Angebot und nächster Umsetzungsschritt</li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/kontakt/"
              className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors inline-flex items-center justify-center gap-2"
            >
              Weitere Anfrage senden <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/projekt-starten/"
              className="border border-gray-300 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Projekt starten
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThankYouContact;
