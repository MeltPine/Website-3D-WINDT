# Stripe-Zahlungen einrichten (3D-WINDT)

Stand: September 2026. Gilt für die Functions `create-checkout`, `payment-link` und
`stripe-webhook` sowie die Seiten `/ersatzteile-3d-drucken/#check`, `/bezahlen/`,
`/zahlung-erfolgreich/` und `/zahlung-abgebrochen/`.

## Was gebaut ist

- **Hosted Checkout:** Der Kunde wird auf `checkout.stripe.com` weitergeleitet.
  Karten- und Kontodaten berühren unsere Seite nie; Stripe.js wird nicht geladen.
- **Festpreis-Produkt** `ersatzteil-check` (490,00 € netto). Der Browser schickt nur
  den Produktschlüssel; der Preis kommt aus `STRIPE_PRICE_ERSATZTEIL_CHECK`. Vor jeder
  Session prüft die Function, ob dieser Stripe-Preis aktiv, einmalig, in EUR und
  genau 490,00 € ist. Weicht er ab, wird nicht verkauft.
- **Angebots-Zahlungslinks:** `/bezahlen/?q=AB-2026-001&a=123450&e=<Ablauf>&s=<Signatur>`.
  `a` ist der **Nettobetrag in Cent**. Die Signatur (HMAC-SHA256 mit
  `PAYMENT_LINK_SECRET`) wird serverseitig geprüft; Änderungen an Nummer, Betrag
  oder Ablaufdatum machen den Link ungültig. Maximale Gültigkeit: 180 Tage.
- **Checkout sammelt:** Firmenname (Pflicht), Name, Rechnungsadresse (Pflicht),
  E-Mail, optional USt-IdNr. Stripe erstellt Rechnung und Zahlungsbeleg (PDF) und
  schickt beides an den Kunden.
- **B2B-Erklärung:** Vor der Weiterleitung muss der Kunde „Ich bestelle als
  Unternehmer (§ 14 BGB)“ anhaken. Die Function lehnt Anfragen ohne diese Erklärung
  ab und speichert sie als `b2b_declared=true` in den Metadaten der Zahlung.
- **Webhook:** Signatur geprüft, jedes Stripe-Event wird genau einmal verarbeitet
  (Ledger in Netlify Blobs, Store `stripe-events`, nur Event-ID/Typ/Zeitstempel).
  Ergebnis: eine interne Mail an `LEAD_SALES_EMAIL` mit Firma, Kontakt, Produkt bzw.
  Angebotsnummer, Betrag und Link ins Stripe-Dashboard. Der Kunde bekommt von uns
  **keine** zusätzliche Mail, nur Stripes Beleg und Rechnung.
- **Steuermodus** über `TAX_MODE` (siehe unten). Ist er nicht gesetzt, zeigt die
  Seite „Online-Zahlung derzeit nicht verfügbar“ und es wird nichts verkauft.

## 0. Vorher mit dem Steuerberater klären (Pflicht vor Live-Betrieb)

1. **Kleinunternehmer (§ 19 UStG) oder Regelbesteuerung?** Davon hängt `TAX_MODE` ab.
   - `kleinunternehmer`: keine Umsatzsteuer; Rechnung trägt „Gemäß § 19 UStG wird
     keine Umsatzsteuer berechnet.“ (Fußzeile und Rechnungsfeld).
   - `regelbesteuerung`: 19 % USt. **zusätzlich** zum Nettopreis über den Stripe-Steuersatz
     `STRIPE_TAX_RATE_19`. 490 € netto werden dann zu 583,10 € brutto.
2. **Genügt die Stripe-Rechnung § 14 UStG?** Zu klären: Steuernummer bzw. USt-IdNr.
   auf der Rechnung, Leistungsdatum (der Check findet erst nach der Zahlung statt,
   also Vorauszahlungsrechnung), fortlaufende Nummerierung. **Wichtig:** Stripe
   vergibt eigene Rechnungsnummern. Wenn Rechnungen auch aus dem `ab-generator`
   kommen, gibt es zwei Nummernkreise. Entscheiden: entweder Stripe-Präfix
   (z. B. `3DW-S-`) als eigener Nummernkreis oder Stripe-Rechnung nur als
   Zahlungsbeleg und die eigentliche Rechnung aus dem eigenen System.
3. **Anrechnung auf den Folgeauftrag:** Wie wird die bezahlte Check-Pauschale auf
   der Folgerechnung ausgewiesen (Abzug einer Vorauszahlung)?

## 1. Stripe-Konto aktivieren

1. Auf <https://dashboard.stripe.com/register> registrieren (Firmen-E-Mail).
2. **Konto aktivieren**: Rechtsform GbR, Rechtsträger „3D-Windt GbR“, Anschrift,
   Branche, Website `https://3d-windt.de`, Produktbeschreibung („Industrieller
   3D-Druck, Vor-Ort-Check und Fertigungsaufträge für Unternehmen“), Angaben und
   Ausweisprüfung der Gesellschafter, Geschäftskonto (IBAN) für Auszahlungen.
3. **Einstellungen → Öffentliche Unternehmensangaben:** Name „3D-WINDT“,
   Support-E-Mail `support@3d-windt.de`, Telefon, Website; Abrechnungs-
   bezeichnung (Kontoauszug) z. B. `3D-WINDT`.
4. **Einstellungen → Branding:** Logo und Akzentfarbe hochladen (erscheint auf
   Checkout, Beleg und Rechnung).

Alles Weitere zuerst im **Testmodus** einrichten (Schalter „Testmodus“ oben rechts
bzw. Sandbox). Produkte, Steuersätze, Webhooks und Schlüssel existieren in Test
und Live **getrennt** und müssen für Live erneut angelegt werden.

## 2. Produkt „Ersatzteil-Check“ anlegen

1. **Produktkatalog → Produkt hinzufügen.**
2. Name: `Ersatzteil- und Vorrichtungs-Check vor Ort`
   Beschreibung: `Wird vollständig auf den Folgeauftrag angerechnet.`
3. Preis: **Einmalig**, `490,00 EUR`. Steuerverhalten „exklusive Steuer“ bzw. nicht
   in den Preis eingeschlossen (490 € sind der Nettopreis).
4. Speichern, dann beim Preis die **Preis-ID** (`price_...`) kopieren →
   Netlify-Variable `STRIPE_PRICE_ERSATZTEIL_CHECK`.

Soll der Preis sich ändern, muss auch `netAmountCents` in
`src/lib/payment/catalog.ts` angepasst werden, sonst verweigert die Function den
Checkout (gewollt: Website-Anzeige und Stripe-Preis können nicht auseinanderlaufen).

## 3. Steuersatz 19 % (nur bei Regelbesteuerung)

1. **Produktkatalog → Steuersätze** (je nach Dashboard-Version auch unter
   Einstellungen → Steuern → Steuersätze) → **Neu**.
2. Typ/Anzeigename `USt.`, Prozentsatz `19`, **Exklusiv** (nicht inklusive),
   Land Deutschland, Beschreibung `Umsatzsteuer 19 %`.
3. **Steuersatz-ID** (`txr_...`) kopieren → `STRIPE_TAX_RATE_19`.

Die Function prüft vor jedem Checkout, dass dieser Satz aktiv, exklusiv und
genau 19 % ist. Stripe Tax (automatische Steuerberechnung, kostenpflichtig) wird
**nicht** verwendet.

## 4. Rechnungen und Belege

1. **Einstellungen → Billing → Rechnungen (Invoice template):** Rechnungsnummern-
   Präfix festlegen (siehe Abschnitt 0), eigene Steuernummer bzw. USt-IdNr. als
   Konto-Steuer-ID hinterlegen, Standard-Fußzeile ggf. mit Bankverbindung und
   Registerangaben.
2. **Einstellungen → Kunden-E-Mails:** „Erfolgreiche Zahlungen“ und
   „Erstattungen“ aktivieren; unter Billing „Abgeschlossene Rechnungen an Kunden
   senden“ aktivieren. Dann erhält der Kunde Beleg und Rechnungs-PDF automatisch.

Die Function setzt pro Zahlung: Rechnungsbeschreibung, Angebotsnummer als
Rechnungsfeld und im Kleinunternehmer-Modus den § 19-Hinweis als Fußzeile und Feld.

## 5. Zahlungsmethoden

**Einstellungen → Zahlungen → Zahlungsmethoden:**

- **Karten**: aktiv lassen.
- **SEPA-Lastschrift**: aktivieren. Achtung: Die Zahlung ist erst nach einigen
  Werktagen bestätigt. Die interne Mail kommt dann zweimal: „Bestellung
  eingegangen, Zahlung ausstehend“ und später „Zahlung bestätigt“ oder „Zahlung
  fehlgeschlagen“. Leistung erst nach „Zahlung bestätigt“ erbringen.
- **Klarna, PayPal** (optional): nur per Schalter im Dashboard; PayPal verlangt die
  Verknüpfung eines PayPal-Geschäftskontos. Im Code ist nichts zu ändern, Checkout
  zeigt automatisch alle aktivierten, passenden Methoden.

## 6. API-Schlüssel

**Entwickler → API-Schlüssel:** Den **Geheimschlüssel** (`sk_test_...`, später
`sk_live_...`) kopieren → `STRIPE_SECRET_KEY`. Sicherer ist ein **eingeschränkter
Schlüssel** (`rk_...`) mit Schreibrecht auf Checkout Sessions und Products sowie
Leserecht auf Prices und Tax Rates; im Testmodus einmal durchspielen, bevor er live
geht. Den Schlüssel nie ins Repo oder in Chats kopieren.

## 7. Webhook-Endpunkt

1. **Entwickler → Webhooks → Endpunkt hinzufügen.**
2. URL: `https://3d-windt.de/api/stripe/webhook`
3. Ereignisse (genau diese drei):
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
4. Nach dem Anlegen das **Signaturgeheimnis** (`whsec_...`) kopieren →
   `STRIPE_WEBHOOK_SECRET`. Test- und Live-Endpunkt haben verschiedene Geheimnisse.

Ist Resend oder die Konfiguration kaputt, antwortet der Webhook mit 5xx. Stripe
wiederholt die Zustellung dann bis zu drei Tage lang; es geht kein Zahlungseingang
verloren. Fehlgeschlagene Zustellungen zeigt Stripe unter Webhooks → Endpunkt.

## 8. Netlify-Umgebungsvariablen

**Netlify → Site configuration → Environment variables** (Scope mindestens
„Functions“). Nach jeder Änderung neu deployen.

| Variable | Wert | Pflicht |
|---|---|---|
| `TAX_MODE` | `kleinunternehmer` oder `regelbesteuerung` | ja, sonst kein Verkauf |
| `STRIPE_SECRET_KEY` | `sk_test_...` / `sk_live_...` (oder `rk_...`) | ja |
| `STRIPE_PRICE_ERSATZTEIL_CHECK` | `price_...` (490,00 EUR) | ja |
| `STRIPE_TAX_RATE_19` | `txr_...` | nur bei `regelbesteuerung` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | ja |
| `PAYMENT_LINK_SECRET` | ≥ 32 Zeichen, `openssl rand -base64 48` | ja, für Angebotslinks |
| `RESEND_API_KEY` | vorhanden (Lead-Mails) | ja |
| `LEAD_ALERT_FROM` | vorhanden, z. B. `3D-WINDT Alert <alerts@3d-windt.de>` | ja (oder `LEAD_REPLY_FROM`) |
| `LEAD_SALES_EMAIL` | Empfänger der Zahlungsmeldungen | ja |

`URL` setzt Netlify selbst. Die Vorlage steht in `.env.example`.

## 9. Testlauf im Testmodus

1. Testschlüssel, Test-Preis-ID, Test-Webhook-Geheimnis und `TAX_MODE` in Netlify
   setzen, deployen.
2. Routing prüfen (die Functions müssen vor der 404-Regel greifen):

   ```sh
   curl -sS -o /dev/null -w '%{http_code}\n' "https://3d-windt.de/api/payment-link" || exit 1
   # erwartet 400 (Link fehlt) oder 503 (TAX_MODE fehlt), NICHT 404
   ```

3. `/ersatzteile-3d-drucken/#check` öffnen, Unternehmer-Häkchen setzen, „Check
   direkt buchen“.
4. Testkarte `4242 4242 4242 4242`, beliebiges zukünftiges Ablaufdatum, beliebige
   Prüfziffer. 3-D-Secure testen mit `4000 0027 6000 3184`.
   SEPA-Test-IBAN: `DE89370400440532013000`.
5. Prüfen: Weiterleitung auf `/zahlung-erfolgreich/`, interne Mail mit `[TEST]` im
   Betreff an `LEAD_SALES_EMAIL`, Rechnung und Beleg im Postfach der Test-E-Mail,
   Rechnung im Dashboard mit korrektem Steuerausweis.
6. Webhook erneut senden (Dashboard → Webhooks → Ereignis → „Erneut senden“):
   Es darf **keine** zweite Mail kommen.
7. Angebotslink testen (Abschnitt 11) mit einem kleinen Betrag.

Lokal geht das auch mit `netlify dev` und der Stripe CLI:
`stripe listen --forward-to localhost:8888/api/stripe/webhook` (das dort angezeigte
`whsec_...` als lokales `STRIPE_WEBHOOK_SECRET` verwenden).

## 10. Live schalten

1. Abschnitt 0 ist mit dem Steuerberater geklärt, Datenschutz und AGB (Abschnitt
   12) sind freigegeben.
2. Im **Live-Modus** Produkt/Preis, ggf. Steuersatz und Webhook-Endpunkt neu anlegen.
3. In Netlify die Live-Werte eintragen (`sk_live_...`, Live-`price_...`, Live-`txr_...`,
   Live-`whsec_...`), deployen.
4. Eine echte Zahlung über einen Angebotslink mit 1,00 € durchführen und im
   Dashboard erstatten.

## 11. Angebotslink erzeugen („Angebot annehmen & bezahlen“)

```sh
export PAYMENT_LINK_SECRET='...'   # identisch mit Netlify
node scripts/payment-link.mjs --quote AB-2026-001 --amount 1234,50 --valid-days 14 --base-url https://3d-windt.de
```

- `--amount` ist der **Nettobetrag** in Euro (ohne Tausenderpunkt). Bei
  Regelbesteuerung kommen 19 % im Checkout dazu, bei Kleinunternehmer ist es der
  Endbetrag.
- Der Link erscheint auf stdout (z. B. `... | pbcopy`), Details auf stderr.
- Der Kunde sieht auf `/bezahlen/` Angebotsnummer, Betrag und Ablaufdatum, setzt
  das Unternehmer-Häkchen und zahlt.
- Ein Link ist **nicht einmalig**: Wird er zweimal bezahlt, kommen zwei Meldungen;
  dann im Dashboard erstatten. Nur an den Angebotsempfänger schicken.
- Wird `PAYMENT_LINK_SECRET` geändert, werden alle offenen Links ungültig.

## 12. Rechtliches

- **B2B only:** Checkbox § 14 BGB vor der Weiterleitung, Hinweis im Checkout.
- **Datenschutzerklärung:** Stripe-Abschnitt ist ergänzt (Anbieter Stripe Payments
  Europe Ltd., Dublin; Zweck; Art. 6 Abs. 1 lit. b und lit. c DSGVO; Übermittlung an
  Stripe, Inc. unter dem EU-US Data Privacy Framework und Standardvertragsklauseln;
  Link zur Stripe-Datenschutzerklärung). Vor Live-Gang rechtlich prüfen lassen.
- **AGB:** Die Website hat **keine AGB-Seite**. Vorschlag für eine
  Zahlungsklausel (vom Anwalt prüfen lassen, dann AGB-Seite anlegen und im Footer
  verlinken):

  > **Zahlung.** Unsere Angebote richten sich ausschließlich an Unternehmer im Sinne
  > des § 14 BGB. Online-Zahlungen wickeln wir über den Zahlungsdienstleister Stripe
  > (Stripe Payments Europe, Ltd., Dublin, Irland) ab. Die zur Verfügung stehenden
  > Zahlungsarten werden im Bezahlvorgang angezeigt. Der Ersatzteil- und
  > Vorrichtungs-Check ist bei Buchung vollständig im Voraus fällig; der Nettobetrag
  > wird auf einen Folgeauftrag angerechnet, der innerhalb von [X] Monaten erteilt
  > wird. Mit Zahlung über einen Angebotslink nimmt der Kunde das jeweilige Angebot
  > zu dessen Bedingungen an. Bei Rücklastschrift oder Zahlungsausfall sind wir
  > berechtigt, die Leistung bis zum Zahlungseingang zurückzuhalten; entstehende
  > Bankgebühren trägt der Kunde. Stornierung des Checks: [Regelung ergänzen].

- **Stripe-Dashboard:** Unter Einstellungen → Öffentliche Angaben kann später eine
  AGB-URL hinterlegt werden.
