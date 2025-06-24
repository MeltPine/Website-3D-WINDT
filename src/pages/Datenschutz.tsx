import React from 'react';
import { Shield, Eye, Database, Lock, UserCheck, FileText } from 'lucide-react';

const Datenschutz = () => {
  return (
    <div className="py-16 animate-fade-in">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-8 flex items-center space-x-3">
          <Shield className="h-10 w-10 text-primary-600" />
          <span>Datenschutzerklärung</span>
        </h1>
        
        <div className="bg-white border border-gray-200 rounded-xl p-8 space-y-8">
          {/* Introduction */}
          <section>
            <div className="bg-primary-50 p-6 rounded-lg mb-6">
              <p className="text-gray-700">
                Der Schutz Ihrer persönlichen Daten ist uns ein besonderes Anliegen. Wir verarbeiten 
                Ihre Daten daher ausschließlich auf Grundlage der gesetzlichen Bestimmungen (DSGVO, TKG 2003). 
                In diesen Datenschutzinformationen informieren wir Sie über die wichtigsten Aspekte der 
                Datenverarbeitung im Rahmen unserer Website.
              </p>
            </div>
          </section>

          {/* Responsible Party */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
              <UserCheck className="h-6 w-6 text-primary-600" />
              <span>Verantwortlicher</span>
            </h2>
            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="space-y-2">
                <p className="font-semibold">3D Print Pro</p>
                <p>Sebastian Windt</p>
                <p>Doktor-Weinholz_Straße</p>
                <p>63110 Rodgau</p>
                <p>Deutschland</p>
                <p className="mt-4">
                  <strong>E-Mail:</strong> support@3d-windt.de<br />
                  <strong>Telefon:</strong> +49 (0) 1512 5534623
                </p>
              </div>
            </div>
          </section>

          {/* Data Collection */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
              <Database className="h-6 w-6 text-primary-600" />
              <span>Datenerfassung auf unserer Website</span>
            </h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Wer ist verantwortlich für die Datenerfassung auf dieser Website?</h3>
                <p className="text-gray-700">
                  Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber. 
                  Dessen Kontaktdaten können Sie dem Impressum dieser Website entnehmen.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Wie erfassen wir Ihre Daten?</h3>
                <p className="text-gray-700 mb-3">
                  Ihre Daten werden zum einen dadurch erhoben, dass Sie uns diese mitteilen. 
                  Hierbei kann es sich z.B. um Daten handeln, die Sie in ein Kontaktformular eingeben.
                </p>
                <p className="text-gray-700">
                  Andere Daten werden automatisch beim Besuch der Website durch unsere IT-Systeme erfasst. 
                  Das sind vor allem technische Daten (z.B. Internetbrowser, Betriebssystem oder Uhrzeit des Seitenaufrufs).
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Wofür nutzen wir Ihre Daten?</h3>
                <ul className="list-disc list-inside text-gray-700 space-y-2">
                  <li>Zur Bearbeitung Ihrer Anfragen und Aufträge</li>
                  <li>Zur Bereitstellung unserer Dienstleistungen</li>
                  <li>Zur Kommunikation mit Ihnen</li>
                  <li>Zur Verbesserung unserer Website und Services</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Legal Basis */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
              <FileText className="h-6 w-6 text-primary-600" />
              <span>Rechtsgrundlage</span>
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>
                Die Verarbeitung Ihrer personenbezogenen Daten erfolgt auf Grundlage folgender Rechtsgrundlagen:
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li><strong>Art. 6 Abs. 1 lit. a DSGVO:</strong> Einwilligung</li>
                <li><strong>Art. 6 Abs. 1 lit. b DSGVO:</strong> Vertragserfüllung</li>
                <li><strong>Art. 6 Abs. 1 lit. f DSGVO:</strong> Berechtigte Interessen</li>
              </ul>
            </div>
          </section>

          {/* Contact Forms */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Kontaktformular</h2>
            <div className="space-y-4 text-gray-700">
              <p>
                Wenn Sie uns per Kontaktformular Anfragen zukommen lassen, werden Ihre Angaben aus dem 
                Anfrageformular inklusive der von Ihnen dort angegebenen Kontaktdaten zwecks Bearbeitung 
                der Anfrage und für den Fall von Anschlussfragen bei uns gespeichert.
              </p>
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Zweck:</strong> Bearbeitung Ihrer Anfrage<br />
                  <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO<br />
                  <strong>Speicherdauer:</strong> Bis zur vollständigen Bearbeitung Ihrer Anfrage
                </p>
              </div>
            </div>
          </section>

          {/* File Upload */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Datei-Upload</h2>
            <div className="space-y-4 text-gray-700">
              <p>
                Wenn Sie Dateien über unseren Projekt-Konfigurator hochladen, werden diese ausschließlich 
                zur Bearbeitung Ihres 3D-Druck-Auftrags verwendet. Die Dateien werden sicher gespeichert 
                und nach Abschluss des Projekts gelöscht.
              </p>
              <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                <p className="text-sm text-green-800">
                  <strong>Zweck:</strong> Bearbeitung Ihres 3D-Druck-Auftrags<br />
                  <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO<br />
                  <strong>Speicherdauer:</strong> Bis 30 Tage nach Projektabschluss
                </p>
              </div>
            </div>
          </section>

          {/* Server Log Files */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Server-Log-Dateien</h2>
            <div className="space-y-4 text-gray-700">
              <p>
                Der Provider der Seiten erhebt und speichert automatisch Informationen in so genannten 
                Server-Log-Dateien, die Ihr Browser automatisch an uns übermittelt:
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>Browsertyp und Browserversion</li>
                <li>Verwendetes Betriebssystem</li>
                <li>Referrer URL</li>
                <li>Hostname des zugreifenden Rechners</li>
                <li>Uhrzeit der Serveranfrage</li>
                <li>IP-Adresse</li>
              </ul>
              <p>
                Diese Daten werden nicht mit anderen Datenquellen zusammengeführt und dienen ausschließlich 
                der Sicherstellung eines störungsfreien Betriebs der Website.
              </p>
            </div>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
              <Eye className="h-6 w-6 text-primary-600" />
              <span>Ihre Rechte</span>
            </h2>
            <div className="space-y-4">
              <p className="text-gray-700">
                Sie haben folgende Rechte bezüglich Ihrer personenbezogenen Daten:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Auskunftsrecht</h4>
                  <p className="text-sm text-gray-600">
                    Sie können Auskunft über Ihre gespeicherten personenbezogenen Daten verlangen.
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Berichtigungsrecht</h4>
                  <p className="text-sm text-gray-600">
                    Sie können die Berichtigung unrichtiger Daten verlangen.
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Löschungsrecht</h4>
                  <p className="text-sm text-gray-600">
                    Sie können die Löschung Ihrer Daten verlangen, soweit keine gesetzlichen Aufbewahrungsfristen bestehen.
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Widerspruchsrecht</h4>
                  <p className="text-sm text-gray-600">
                    Sie können der Verarbeitung Ihrer Daten widersprechen.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Data Security */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
              <Lock className="h-6 w-6 text-primary-600" />
              <span>Datensicherheit</span>
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>
                Wir verwenden innerhalb des Website-Besuchs das verbreitete SSL-Verfahren (Secure Socket Layer) 
                in Verbindung mit der jeweils höchsten Verschlüsselungsstufe, die von Ihrem Browser unterstützt wird.
              </p>
              <p>
                Außerdem sichern wir unsere Website und sonstigen Systeme durch technische und organisatorische 
                Maßnahmen gegen Verlust, Zerstörung, Zugriff, Veränderung oder Verbreitung Ihrer Daten durch 
                unbefugte Personen.
              </p>
              <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                <p className="text-sm text-green-800">
                  <strong>Verschlüsselung:</strong> Alle Datenübertragungen erfolgen verschlüsselt über HTTPS<br />
                  <strong>Speicherung:</strong> Sichere Server in Deutschland<br />
                  <strong>Zugriff:</strong> Nur autorisierte Mitarbeiter haben Zugang zu Ihren Daten
                </p>
              </div>
            </div>
          </section>

          {/* Contact for Privacy */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Fragen zum Datenschutz</h2>
            <div className="bg-primary-50 p-6 rounded-lg">
              <p className="text-gray-700 mb-4">
                Wenn Sie Fragen zu dieser Datenschutzerklärung haben oder Ihre Rechte geltend machen möchten, 
                kontaktieren Sie uns gerne:
              </p>
              <div className="space-y-2">
                <p><strong>E-Mail:</strong> datenschutz@3d-windt.de</p>
                <p><strong>Telefon:</strong> +49 (0) 1512 5534623</p>
                <p><strong>Post:</strong> 3D-WINDT, Doktor-Weinholz-Straße 23, 63110 Rodgau</p>
              </div>
            </div>
          </section>

          {/* Last Updated */}
          <section className="border-t border-gray-200 pt-6">
            <p className="text-sm text-gray-500">
              <strong>Stand dieser Datenschutzerklärung:</strong> Januar 2025
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Wir behalten uns vor, diese Datenschutzerklärung anzupassen, damit sie stets den aktuellen 
              rechtlichen Anforderungen entspricht oder um Änderungen unserer Leistungen in der 
              Datenschutzerklärung umzusetzen.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Datenschutz;