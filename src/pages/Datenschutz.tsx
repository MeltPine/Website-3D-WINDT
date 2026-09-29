import { Shield, Database, Lock, UserCheck, FileText, Eye } from 'lucide-react';
import { BRAND, CONTACT, FULL_ADDRESS, LEGAL_REPRESENTATION } from '../lib/brand';
import { UPLOAD_POLICY } from '../lib/upload/policy';

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
                <p className="mt-2">
                  Die Angaben werden verschlüsselt (HTTPS) an unseren Hosting-Anbieter Cloudflare
                  übertragen, als Datensatz im Speicherdienst Cloudflare R2 mit Speicherort in der EU
                  abgelegt und per E-Mail (Versanddienst Resend) an unser Vertriebspostfach
                  weitergeleitet. Sie erhalten eine automatische Eingangsbestätigung an die
                  angegebene E-Mail-Adresse. Zur Abwehr massenhafter Formular-Einsendungen wird für
                  höchstens 15 Minuten ein gekürzter Hashwert Ihrer IP-Adresse gespeichert, um
                  Anfragen pro Absender zu zählen (Art. 6 Abs. 1 lit. f DSGVO); die IP-Adresse selbst
                  wird dabei nicht gespeichert.
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
                  Hochgeladene Dateien (z. B. STEP, STL, OBJ, 3MF, SVG) werden ausschließlich zur
                  technischen Prüfung und zur Bearbeitung Ihres Projekts genutzt.
                </p>
                <p className="mt-2">
                  3D-Vorschau, Maße und Richtpreis im Preisrechner und im Projektformular werden
                  vollständig in Ihrem Browser berechnet; dabei werden keine Dateien übertragen. Erst
                  wenn Sie die Projektanfrage absenden, werden die Dateien verschlüsselt (HTTPS) an
                  unseren Hosting-Anbieter Cloudflare übertragen und im Speicherdienst Cloudflare R2
                  mit Speicherort in der EU abgelegt. Zugriff erhält nur 3D-WINDT über
                  signierte, zeitlich begrenzte Links. Die Dateien werden{' '}
                  {UPLOAD_POLICY.retentionDays} Tage nach dem Hochladen automatisch gelöscht, nicht
                  abgeschlossene Uploads nach {UPLOAD_POLICY.incompleteRetentionDays} Tagen. Wird aus
                  der Anfrage ein Auftrag, übernehmen wir die für die Fertigung erforderlichen Daten
                  in unsere Auftragsunterlagen.
                </p>
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mt-3 text-sm text-blue-800">
                  <p>
                    <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO
                    <br />
                    <strong>Speicherdauer:</strong> {UPLOAD_POLICY.retentionDays} Tage, danach
                    automatische Löschung
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Online-Zahlungen über Stripe
                </h3>
                <p>
                  Für Online-Zahlungen (z. B. Buchung des Ersatzteil-Checks oder Bezahlung eines
                  angenommenen Angebots) nutzen wir den Zahlungsdienst Stripe. Anbieter für Kunden
                  im Europäischen Wirtschaftsraum ist die Stripe Payments Europe, Limited, 1 Grand
                  Canal Street Lower, Grand Canal Dock, Dublin, D02 H210, Irland.
                </p>
                <p className="mt-3">
                  Nach Klick auf die Zahlungsschaltfläche werden Sie auf eine Zahlungsseite von
                  Stripe weitergeleitet. Dort geben Sie Zahlungsdaten, Firmenname, Name,
                  Rechnungsadresse, E-Mail-Adresse und optional Ihre USt-IdNr. direkt bei Stripe
                  ein. Vollständige Karten- oder Kontodaten erhalten wir nicht. Wir erhalten die
                  für Auftragsabwicklung und Buchhaltung erforderlichen Angaben (Firma, Name,
                  Anschrift, E-Mail-Adresse, USt-IdNr., Betrag, Zahlungsart und -status). Stripe
                  erstellt Rechnung und Zahlungsbeleg und sendet diese an Ihre E-Mail-Adresse.
                  Stripe verarbeitet Daten teilweise auch in eigener Verantwortung, etwa zur
                  Betrugsprävention und zur Erfüllung gesetzlicher Pflichten.
                </p>
                <p className="mt-3">
                  Stripe kann Daten an die Stripe, Inc. in den USA übermitteln. Die Stripe, Inc.
                  ist nach dem EU-US Data Privacy Framework zertifiziert (Angemessenheitsbeschluss
                  der EU-Kommission, Art. 45 DSGVO); ergänzend setzt Stripe
                  EU-Standardvertragsklauseln ein. Weitere Informationen:{' '}
                  <a
                    href="https://stripe.com/de/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-700 underline"
                  >
                    Datenschutzerklärung von Stripe
                  </a>
                  .
                </p>
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mt-3 text-sm text-blue-800">
                  <p>
                    <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO
                    (Vertragserfüllung); Aufbewahrung von Rechnungs- und Zahlungsdaten: Art. 6
                    Abs. 1 lit. c DSGVO i. V. m. § 147 AO und § 257 HGB
                    <br />
                    <strong>Zweck:</strong> Zahlungsabwicklung, Rechnungsstellung, Buchhaltung
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Server-Log-Dateien</h3>
                <p>
                  Beim Besuch der Website werden technisch notwendige Zugriffsdaten durch den
                  Hosting-Anbieter Cloudflare verarbeitet (z. B. IP-Adresse, Zeitstempel, aufgerufene
                  Seite, Browserinformationen), um Betrieb und Sicherheit der Website zu
                  gewährleisten (Art. 6 Abs. 1 lit. f DSGVO). Cloudflare stellt die Website über ein
                  weltweites Servernetz bereit; Anfragen werden in der Regel an einem Standort in
                  Ihrer Nähe bearbeitet.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Analyse und Reichweitenmessung (GA4)
                </h3>
                <p>
                  Sofern Sie zustimmen, nutzen wir Google Analytics 4 (GA4), um Seitenaufrufe und
                  Formularprozesse auszuwerten. Ohne Einwilligung werden keine Statistik-Cookies gesetzt.
                </p>
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mt-3 text-sm text-blue-800">
                  <p>
                    <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. a DSGVO (Einwilligung)
                    <br />
                    <strong>Widerruf:</strong> jederzeit über Cookie-Einstellungen im Footer
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
              <Database className="h-6 w-6 text-primary-600" />
              <span>Empfänger und Auftragsverarbeiter</span>
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>
                Wir arbeiten mit technisch erforderlichen Dienstleistern zusammen, insbesondere:
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  Cloudflare (Hosting und Auslieferung der Website, Verarbeitung von Formularen und
                  Datei-Uploads, Speicher Cloudflare R2 mit Speicherort in der EU, technische Logs);
                  Cloudflare, Inc., 101 Townsend St., San Francisco, CA 94107, USA, ist nach dem
                  EU-US Data Privacy Framework zertifiziert (Art. 45 DSGVO), ergänzend gelten
                  EU-Standardvertragsklauseln
                </li>
                <li>Resend (Versand von Eingangs-, Alert- und internen Zahlungsbenachrichtigungen)</li>
                <li>Stripe (Zahlungsabwicklung, Rechnungs- und Belegversand)</li>
                <li>Google (GA4, Statistik-Cookies nur nach Einwilligung)</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
              <FileText className="h-6 w-6 text-primary-600" />
              <span>Speicherdauer</span>
            </h2>
            <div className="space-y-3 text-gray-700">
              <p>
                Wir speichern personenbezogene Daten nur so lange, wie es für den jeweiligen Zweck
                erforderlich ist oder gesetzliche Aufbewahrungspflichten bestehen.
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>Projekt- und Kontaktdaten: in der Regel bis zu 24 Monate nach Abschluss</li>
                <li>Technische Server-Logs: in der Regel bis zu 30 Tage</li>
                <li>
                  Rechnungs- und Zahlungsdaten: gemäß den handels- und steuerrechtlichen
                  Aufbewahrungspflichten (§ 147 AO, § 257 HGB)
                </li>
                <li>Analytics-Daten (GA4): gemäß Google-Konfiguration, Statistik-Cookies nur nach Einwilligung</li>
              </ul>
              <p>
                Anfrage- und Projektdaten werden regelmäßig überprüft und bei Wegfall des
                Verarbeitungszwecks gelöscht.
              </p>
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
              <strong>Stand dieser Datenschutzerklärung:</strong> September 2026
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
