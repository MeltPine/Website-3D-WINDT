import React from 'react';
import { Building, Mail, Phone, Globe } from 'lucide-react';

const Impressum = () => {
  return (
    <div className="py-16 animate-fade-in">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Impressum</h1>
        
        <div className="bg-white border border-gray-200 rounded-xl p-8 space-y-8">
          {/* Company Information */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
              <Building className="h-6 w-6 text-primary-600" />
              <span>Angaben gemäß § 5 TMG</span>
            </h2>
            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="space-y-2">
                <p className="font-semibold text-lg">3D-WINDT</p>
                <p>Sebastian Windt</p>
                <p>Doktor-Weinholz-Straße 23</p>
                <p>63110 Rodgau</p>
                <p>Deutschland</p>
              </div>
            </div>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Kontakt</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-primary-600" />
                <div>
                  <div className="font-medium text-gray-900">E-Mail</div>
                  <div className="text-gray-600">info@3dprintpro.de</div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="h-5 w-5 text-primary-600" />
                <div>
                  <div className="font-medium text-gray-900">Telefon</div>
                  <div className="text-gray-600">+49 (0) 1512 5534623</div>
                </div>
              </div>
            </div>
          </section>

          {/* Business Registration */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Registereintrag</h2>
            <div className="bg-gray-50 p-6 rounded-lg space-y-2">
              <p><span className="font-medium">Handelsregister:</span> HRB 12345</p>
              <p><span className="font-medium">Registergericht:</span> Amtsgericht Musterstadt</p>
              <p><span className="font-medium">Geschäftsführer:</span> Max Mustermann</p>
            </div>
          </section>

          {/* Tax Information */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Umsatzsteuer-Identifikationsnummer</h2>
            <div className="bg-gray-50 p-6 rounded-lg">
              <p><span className="font-medium">USt-IdNr.:</span> DE wird noch eingetragen</p>
              <p className="text-sm text-gray-600 mt-2">
                Gemäß § 27 a Umsatzsteuergesetz
              </p>
            </div>
          </section>

      
            </div>
          </section>

          {/* Dispute Resolution */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Streitschlichtung</h2>
            <div className="space-y-4">
              <p className="text-gray-700">
                Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: 
                <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer" 
                   className="text-primary-600 hover:text-primary-700 underline ml-1">
                  https://ec.europa.eu/consumers/odr/
                </a>
              </p>
              <p className="text-gray-700">
                Unsere E-Mail-Adresse finden Sie oben im Impressum.
              </p>
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Hinweis:</strong> Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren 
                  vor einer Verbraucherschlichtungsstelle teilzunehmen.
                </p>
              </div>
            </div>
          </section>

          {/* Liability */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Haftung für Inhalte</h2>
            <div className="space-y-4 text-gray-700">
              <p>
                Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten 
                nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als 
                Diensteanbieter jedoch nicht unter der Verpflichtung, übermittelte oder gespeicherte 
                fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine 
                rechtswidrige Tätigkeit hinweisen.
              </p>
              <p>
                Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den 
                allgemeinen Gesetzen bleiben hiervon unberührt. Eine diesbezügliche Haftung ist jedoch 
                erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich. Bei 
                Bekanntwerden von entsprechenden Rechtsverletzungen werden wir diese Inhalte umgehend entfernen.
              </p>
            </div>
          </section>

          {/* Links */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Haftung für Links</h2>
            <div className="space-y-4 text-gray-700">
              <p>
                Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen 
                Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. 
                Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der 
                Seiten verantwortlich.
              </p>
              <p>
                Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße 
                überprüft. Rechtswidrige Inhalte waren zum Zeitpunkt der Verlinkung nicht erkennbar. 
                Eine permanente inhaltliche Kontrolle der verlinkten Seiten ist jedoch ohne konkrete 
                Anhaltspunkte einer Rechtsverletzung nicht zumutbar.
              </p>
            </div>
          </section>

          {/* Copyright */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Urheberrecht</h2>
            <div className="space-y-4 text-gray-700">
              <p>
                Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen 
                dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art 
                der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen 
                Zustimmung des jeweiligen Autors bzw. Erstellers.
              </p>
              <p>
                Downloads und Kopien dieser Seite sind nur für den privaten, nicht kommerziellen Gebrauch gestattet. 
                Soweit die Inhalte auf dieser Seite nicht vom Betreiber erstellt wurden, werden die 
                Urheberrechte Dritter beachtet. Insbesondere werden Inhalte Dritter als solche gekennzeichnet.
              </p>
            </div>
          </section>

          {/* Last Updated */}
          <section className="border-t border-gray-200 pt-6">
            <p className="text-sm text-gray-500">
              <strong>Stand:</strong> Januar 2025
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Impressum;