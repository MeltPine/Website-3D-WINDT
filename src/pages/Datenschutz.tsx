import React from 'react';
import { Shield, Database, Lock, UserCheck, FileText, Eye } from 'lucide-react';
import { BRAND, CONTACT, FULL_ADDRESS, LEGAL_REPRESENTATION } from '../lib/brand';

const Datenschutz = () => {
  return (
    <div className="py-16 animate-fade-in">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-8 flex items-center space-x-3">
          <Shield className="h-10 w-10 text-primary-600" />
          <span>Datenschutzerklärung</span>
        </h1>

        <div className="bg-white border border-gray-200 rounded-xl p-8 space-y-8">
          <section>
            <div className="bg-primary-50 p-6 rounded-lg">
              <p className="text-gray-700">
                Der Schutz Ihrer personenbezogenen Daten ist uns wichtig. Wir verarbeiten Daten
                ausschließlich im Rahmen der gesetzlichen Vorgaben, insbesondere DSGVO und BDSG.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
              <UserCheck className="h-6 w-6 text-primary-600" />
              <span>Verantwortlicher</span>
            </h2>
            <div className="bg-gray-50 p-6 rounded-lg space-y-2 text-gray-700">
              <p className="font-semibold">{BRAND.legalName}</p>
              <p>{LEGAL_REPRESENTATION}</p>
              <p>{FULL_ADDRESS}</p>
              <p>{CONTACT.country}</p>
              <p className="pt-2">
                <strong>E-Mail:</strong> {CONTACT.email}
                <br />
                <strong>Telefon:</strong> {CONTACT.phone}
              </p>
              <p className="text-sm text-gray-600">Marke: {BRAND.publicName}</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
              <Database className="h-6 w-6 text-primary-600" />
              <span>Art und Zweck der Verarbeitung</span>
            </h2>
            <div className="space-y-6 text-gray-700">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Kontakt- und Projektanfragen</h3>
                <p>
                  Wenn Sie uns über Formulare kontaktieren oder eine Projektanfrage senden,
                  verarbeiten wir Ihre Angaben zur Bearbeitung Ihrer Anfrage und zur
                  Angebotserstellung.
                </p>
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mt-3 text-sm text-blue-800">
                  <p>
                    <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO
                    <br />
                    <strong>Zweck:</strong> Anfragebearbeitung, technische Klärung, Angebot
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Datei-Uploads</h3>
                <p>
                  Hochgeladene Dateien (z. B. STL, OBJ, 3MF, SVG) werden ausschließlich zur
                  technischen Prüfung und zur Bearbeitung Ihres Projekts genutzt.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Server-Log-Dateien</h3>
                <p>
                  Beim Besuch der Website werden technisch notwendige Zugriffsdaten durch den
                  Hosting-Anbieter verarbeitet (z. B. IP-Adresse, Zeitstempel, aufgerufene Seite,
                  Browserinformationen), um Betrieb und Sicherheit der Website zu gewährleisten.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
              <FileText className="h-6 w-6 text-primary-600" />
              <span>Speicherdauer</span>
            </h2>
            <div className="space-y-3 text-gray-700">
              <p>Wir speichern personenbezogene Daten nur so lange, wie es für den jeweiligen Zweck erforderlich ist oder gesetzliche Aufbewahrungspflichten bestehen.</p>
              <p>Anfrage- und Projektdaten werden nach Abschluss der Bearbeitung regelmäßig überprüft und nicht mehr benötigte Daten gelöscht.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
              <Eye className="h-6 w-6 text-primary-600" />
              <span>Ihre Rechte</span>
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>Sie haben im Rahmen der gesetzlichen Voraussetzungen insbesondere folgende Rechte:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Auskunft über gespeicherte personenbezogene Daten</li>
                <li>Berichtigung unrichtiger Daten</li>
                <li>Löschung oder Einschränkung der Verarbeitung</li>
                <li>Widerspruch gegen die Verarbeitung</li>
                <li>Datenübertragbarkeit</li>
                <li>Beschwerde bei einer Datenschutz-Aufsichtsbehörde</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
              <Lock className="h-6 w-6 text-primary-600" />
              <span>Datensicherheit</span>
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>
                Wir setzen geeignete technische und organisatorische Maßnahmen ein, um Ihre Daten
                gegen unbefugten Zugriff, Verlust oder Manipulation zu schützen.
              </p>
              <div className="bg-green-50 border border-green-200 p-4 rounded-lg text-sm text-green-800">
                <p>
                  <strong>Übertragung:</strong> verschlüsselt via HTTPS
                  <br />
                  <strong>Zugriff:</strong> nur für autorisierte Personen
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Kontakt zum Datenschutz</h2>
            <div className="bg-primary-50 p-6 rounded-lg space-y-2 text-gray-700">
              <p>Für Fragen zum Datenschutz oder zur Ausübung Ihrer Rechte kontaktieren Sie uns:</p>
              <p><strong>E-Mail:</strong> {CONTACT.email}</p>
              <p><strong>Telefon:</strong> {CONTACT.phone}</p>
              <p><strong>Post:</strong> {BRAND.legalName}, {FULL_ADDRESS}</p>
            </div>
          </section>

          <section className="border-t border-gray-200 pt-6 space-y-2">
            <p className="text-sm text-gray-500">
              <strong>Stand dieser Datenschutzerklärung:</strong> März 2026
            </p>
            <p className="text-sm text-gray-500">
              Wir passen diese Datenschutzerklärung an, sobald sich rechtliche Anforderungen oder
              unsere Datenverarbeitungsprozesse ändern.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Datenschutz;
