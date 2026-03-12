import React from 'react';
import { Building, Mail, Phone, Users } from 'lucide-react';
import { BRAND, CONTACT, FULL_ADDRESS, LEGAL, LEGAL_REPRESENTATION } from '../lib/brand';

const Impressum = () => {
  return (
    <div className="py-16 animate-fade-in">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Impressum</h1>

        <div className="bg-white border border-gray-200 rounded-xl p-8 space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
              <Building className="h-6 w-6 text-primary-600" />
              <span>Angaben gemäß § 5 DDG</span>
            </h2>
            <div className="bg-gray-50 p-6 rounded-lg space-y-2">
              <p className="font-semibold text-lg">{BRAND.legalName}</p>
              <p>{FULL_ADDRESS}</p>
              <p>{CONTACT.country}</p>
              <p className="text-sm text-gray-600 pt-2">Marke: {BRAND.publicName}</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
              <Users className="h-6 w-6 text-primary-600" />
              <span>Vertretungsberechtigte Gesellschafter</span>
            </h2>
            <div className="bg-gray-50 p-6 rounded-lg space-y-3">
              <p className="text-gray-700">{LEGAL_REPRESENTATION}</p>
              <ul className="list-disc list-inside text-gray-700">
                {LEGAL.legalRepresentatives.map((representative) => (
                  <li key={representative}>{representative}</li>
                ))}
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Kontakt</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-primary-600" />
                <div>
                  <div className="font-medium text-gray-900">E-Mail</div>
                  <div className="text-gray-600">{CONTACT.email}</div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="h-5 w-5 text-primary-600" />
                <div>
                  <div className="font-medium text-gray-900">Telefon</div>
                  <div className="text-gray-600">{CONTACT.phone}</div>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Verantwortlich für den Inhalt</h2>
            <div className="bg-gray-50 p-6 rounded-lg space-y-2 text-gray-700">
              <p>Verantwortlich nach § 18 Abs. 2 MStV:</p>
              <p>{LEGAL.legalRepresentatives[0]}</p>
              <p>{FULL_ADDRESS}</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Streitschlichtung</h2>
            <div className="space-y-4 text-gray-700">
              <p>
                Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS)
                bereit:
                <a
                  href="https://ec.europa.eu/consumers/odr/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:text-primary-700 underline ml-1"
                >
                  https://ec.europa.eu/consumers/odr/
                </a>
              </p>
              <p>Wir sind nicht verpflichtet und nicht bereit, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
            </div>
          </section>

          <section className="border-t border-gray-200 pt-6 space-y-2">
            <p className="text-sm text-gray-500">
              <strong>Stand:</strong> März 2026
            </p>
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
              Hinweis: Bitte den Namen des zweiten Gesellschafters vor dem finalen Go-Live ergänzen.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Impressum;
