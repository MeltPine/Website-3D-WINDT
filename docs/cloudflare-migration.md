# Umzug 3d-windt.de: Netlify → Cloudflare Pages

Stand: 30.09.2026, Branch `feat/cloudflare`. Diese Anleitung ist für den Inhaber
(Dashboard-Schritte, Secrets, DNS). Architektur für Entwickler: `AGENTS.md`.

## 0. Was sich ändert

| Bisher (Netlify) | Neu (Cloudflare) |
|---|---|
| Hosting + CDN Netlify | Cloudflare Pages, Projekt `3d-windt`, Ausgabe `dist/` |
| `netlify.toml` (Header) | `public/_headers` (gleiche CSP und Pfad-Header) |
| `_redirects` mit `/* /404/index.html 404` | `_redirects` nur noch WordPress-301; unbekannte Pfade liefert Pages mit `dist/404.html` und Status 404 |
| Netlify Functions | Pages Functions unter `functions/api/…` (gleiche URLs `/api/…`) |
| Netlify Forms (Kontakt, Projekt) | `POST /api/lead`: Datensatz im R2-Bucket (`leads/JJJJ/MM/<id>.json`) + Mail an Vertrieb + Eingangsbestätigung |
| Netlify Blobs (Uploads, Stripe-Ledger) | R2-Bucket `3dw-uploads` (EU) für Uploads und Leads, KV-Namespace für Stripe-Idempotenz und Rate-Limits |
| Geplante Function `upload-cleanup` | R2-Lifecycle-Regeln (`infra/r2-lifecycle.json`) |
| DNS bei Netlify DNS (NS1) | DNS-Zone bei Cloudflare |

Unverändert: alle Seiten-URLs, `/api/checkout`, `/api/payment-link`,
Stripe-Webhook `https://3d-windt.de/api/stripe/webhook`, `/datei-abruf/`,
Resend als Mailversand, IONOS-Postfach.

Entfallen: `/.netlify/functions/lead-followup`. Die Eingangsbestätigung schickt
jetzt `/api/lead` selbst. Der alte Endpunkt war öffentlich, mit
`Access-Control-Allow-Origin: *`, und hat an jede beliebige Adresse Mails
verschickt (offenes Mail-Relay).

**Reihenfolge einhalten.** Netlify bleibt bis Schritt 9 unverändert online und ist
damit jederzeit das Rollback-Ziel.

## 1. Voraussetzungen

- Cloudflare-Konto (Free-Plan genügt; R2 braucht eine hinterlegte Zahlungsart,
  der Gratis-Kontingent von 10 GB reicht für diese Seite).
- Zugriff auf das GitHub-Konto **MeltPine** (Repo `MeltPine/Website-3D-WINDT`).
- Zugang zum Registrar der Domain (dort werden in Schritt 8 die Nameserver
  geändert). Die Mailboxen liegen bei IONOS, der Registrar ist sehr
  wahrscheinlich ebenfalls IONOS – im IONOS-Konto unter „Domains & SSL“ prüfen.
- Die aktuellen Werte aller Netlify-Umgebungsvariablen (Netlify → Site
  configuration → Environment variables), vor allem `PAYMENT_LINK_SECRET`.
- Lokal (optional, für die CLI-Varianten): `npx wrangler login`.

## 2. R2-Bucket anlegen (EU)

Dashboard: **R2 Object Storage → Create bucket**

- Name: `3dw-uploads`
- Location: **Jurisdiction „European Union (EU)“** wählen. Das garantiert, dass
  die Daten nur in der EU gespeichert werden. (Nicht nur „Location hint“.)
- Default storage class: Standard

CLI-Alternative:

```sh
npx wrangler r2 bucket create 3dw-uploads --jurisdiction eu || exit 1
```

Danach die Lifecycle-Regeln setzen (Uploads 90 Tage, abgebrochene Uploads
2 Tage, Leads ohne Ablauf; Details `infra/README.md`):

```sh
npx wrangler r2 bucket lifecycle set 3dw-uploads --file infra/r2-lifecycle.json --jurisdiction eu || exit 1
npx wrangler r2 bucket lifecycle list 3dw-uploads --jurisdiction eu || exit 1
```

Erwartet: drei Regeln (`uploads-files-retention`, `uploads-part-receipts`,
`Default Multipart Abort Rule`). Ohne diesen Schritt werden Uploads **nicht**
gelöscht, und die Angaben in der Datenschutzerklärung stimmen nicht.

Den Bucket **nicht** öffentlich machen (kein „Public access“, keine r2.dev-URL,
keine Custom Domain). Zugriff läuft nur über die Functions.

## 3. KV-Namespace anlegen und ID eintragen

Dashboard: **Storage & Databases → KV → Create** → Name `3dw-state`.

CLI-Alternative:

```sh
npx wrangler kv namespace create 3dw-state || exit 1
```

Die angezeigte **Namespace-ID** in `wrangler.toml` bei `[[kv_namespaces]]`
(`id = "…"`) statt `00000000000000000000000000000000` eintragen, committen und
pushen. Die ID ist kein Geheimnis. **Vorher nicht Schritt 4 ausführen**: Mit der
Platzhalter-ID schlägt das Deployment fehl.

## 4. Pages-Projekt aus GitHub anlegen

Dashboard: **Workers & Pages → Create → Pages → Connect to Git**

1. GitHub verbinden und der Cloudflare-App Zugriff auf das Konto **MeltPine**,
   Repo `Website-3D-WINDT`, geben.
2. Projektname: **`3d-windt`** (muss zu `name` in `wrangler.toml` passen).
3. Production branch: `main`. Solange `feat/cloudflare` nicht gemergt ist, baut
   Cloudflare den Branch als **Preview** (URL `feat-cloudflare.3d-windt.pages.dev`).
4. Build settings:
   - Framework preset: **None**
   - Build command: **`npm run build`**
   - Build output directory: **`dist`**
   - Root directory: leer lassen
5. Node-Version: steht in `.node-version` (22). Falls das Dashboard
   Build-Variablen zulässt, zusätzlich `NODE_VERSION` = `22` setzen.
   `VITE_GA_MEASUREMENT_ID` kommt aus `.env.production` (`G-ZYS9S1RYB9`, wie live).

Bindings (R2 `UPLOADS`, KV `STATE`), Kompatibilitätsdatum, das Flag
`nodejs_compat` und die Variable `SITE_URL` liest Pages aus `wrangler.toml`.
Im Dashboard erscheinen sie unter Settings → Bindings bzw. Variables schreibgeschützt.
Das ist gewollt: Die Konfiguration steht versioniert im Repo.

Hinweis: Production und Preview nutzen denselben Bucket und denselben
KV-Namespace. Testanfragen aus der Preview landen also ebenfalls unter `leads/`
(Testdaten danach im Dashboard löschen).

## 5. Secrets setzen

Dashboard: **Workers & Pages → 3d-windt → Settings → Variables and Secrets →
Add**, Typ **Secret**, jeweils für **Production** und **Preview**. Nach dem
Setzen neu deployen (Deployments → „Retry deployment“), sonst gelten sie nicht.

| Name | Wert | Hinweis |
|---|---|---|
| `RESEND_API_KEY` | aus Netlify übernehmen (`re_…`) | Pflicht für alle Mails |
| `LEAD_SALES_EMAIL` | z. B. `support@3d-windt.de` | Empfänger Leads, Alerts, Zahlungen |
| `LEAD_REPLY_FROM` | z. B. `3D-WINDT <noreply@3d-windt.de>` | Absender Lead-Mails; ohne ihn keine Lead-Mails (Lead wird trotzdem gespeichert) |
| `LEAD_ALERT_FROM` | z. B. `3D-WINDT Alert <alerts@3d-windt.de>` | Absender Alerts/Zahlungsmeldungen (sonst `LEAD_REPLY_FROM`) |
| `UPLOAD_SIGNING_SECRET` | neu: `openssl rand -base64 48` | ≥ 32 Zeichen; ohne ihn ist der Upload aus |
| `PAYMENT_LINK_SECRET` | **exakt der Netlify-Wert** | sonst werden bereits verschickte Angebotslinks ungültig |
| `TAX_MODE` | `kleinunternehmer` oder `regelbesteuerung` | ohne Wert kein Verkauf (Absicht) |
| `STRIPE_SECRET_KEY` | aus Netlify (`sk_…`/`rk_…`) | |
| `STRIPE_WEBHOOK_SECRET` | aus Netlify (`whsec_…`) | gleicher Endpunkt, gleiches Geheimnis |
| `STRIPE_PRICE_ERSATZTEIL_CHECK` | aus Netlify (`price_…`) | |
| `STRIPE_TAX_RATE_19` | aus Netlify (`txr_…`) | nur bei `regelbesteuerung` |

CLI-Alternative (fragt den Wert interaktiv ab, landet nicht in der Shell-History):

```sh
npx wrangler pages secret put RESEND_API_KEY --project-name 3d-windt || exit 1
```

`SITE_URL` ist kein Secret und steht fest in `wrangler.toml`
(`https://3d-windt.de`). Stripe-Rückleitungen gehen deshalb auch aus der Preview
auf die Live-Domain.

## 6. Preview testen (vor dem DNS-Umzug)

`P=https://feat-cloudflare.3d-windt.pages.dev` (URL aus dem Deployment übernehmen).

```sh
P=https://feat-cloudflare.3d-windt.pages.dev
curl -sS -o /dev/null -w '%{http_code}\n' "$P/" || exit 1                       # 200
curl -sS -o /dev/null -w '%{http_code}\n' "$P/werkstoffe/pla/" || exit 1        # 200
curl -sS -o /dev/null -w '%{http_code}\n' "$P/gibt-es-nicht" || exit 1          # 404
curl -sS -o /dev/null -w '%{http_code}\n' "$P/api/payment-link" || exit 1       # 400 oder 503, NICHT 404
curl -sSI "$P/bezahlen/" | grep -i -E 'referrer-policy|x-robots-tag' || exit 1  # no-referrer, noindex
```

Im Browser (Preview-URL):

1. `/kontakt/` absenden → Weiterleitung auf `/danke-kontakt/`, Lead-Mail und
   Eingangsbestätigung kommen an, Datensatz unter R2 → `3dw-uploads` → `leads/`.
2. `/projekt-starten/` mit einer kleinen STL absenden → Mail enthält einen
   Datei-Link; der Link öffnet `/datei-abruf/` (Domain in der Mail ist
   `3d-windt.de`, für den Test gegen die Preview-Domain tauschen) und lädt die
   Datei mit korrekter Prüfsumme.
3. `/3d-druck-preisrechner/` mit einer STEP-Datei → 3D-Vorschau erscheint (prüft
   die eigene CSP des Geometrie-Workers).
4. Stripe im Testmodus nach `docs/stripe-setup.md` Abschnitt 9 (Webhook-Test erst
   nach dem DNS-Umzug, der Endpunkt zeigt auf `3d-windt.de`).

## 7. DNS-Zone bei Cloudflare vorbereiten

Dashboard: **Add a domain** → `3d-windt.de` → Free-Plan. Cloudflare liest die
bestehenden Einträge ein. Die Zone ist danach „Pending“, bis die Nameserver
umgestellt sind (Schritt 8). Vorher im Netlify-DNS-Panel (Netlify → Domains →
3d-windt.de) alle Einträge ansehen und mit der Liste unten abgleichen.

**Behalten bzw. exakt übernehmen** (alle „DNS only“, graue Wolke):

| Typ | Name | Inhalt | Prio |
|---|---|---|---|
| MX | `@` | `mx00.ionos.de` | 10 |
| MX | `@` | `mx01.ionos.de` | 10 |
| TXT | `resend._domainkey` | DKIM-Schlüssel von Resend, Zeichen für Zeichen aus dem Resend-Dashboard (Domains → 3d-windt.de) bzw. aus Netlify übernehmen (`p=MIGfMA0G…`) | |
| MX | `send` | `feedback-smtp.eu-west-1.amazonses.com` (Resend-Bounces) | 10 |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` | |

**Neu anlegen:**

| Typ | Name | Inhalt | Zweck |
|---|---|---|---|
| TXT | `@` | `v=spf1 include:_spf-eu.ionos.com ~all` | SPF für Mails aus dem IONOS-Postfach (bisher fehlt ein SPF-Eintrag auf der Hauptdomain) |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:dmarc@3d-windt.de` | DMARC im Beobachtungsmodus; vorher das Postfach bzw. den Alias `dmarc@3d-windt.de` bei IONOS anlegen |

Die IONOS-Angabe `_spf-eu.ionos.com` ist gegen die IONOS-Hilfe und das DNS
geprüft (der Eintrag löst auf die IONOS-Mailserver-Netze auf). Verschicken
weitere Dienste Mails mit Absender `@3d-windt.de` (z. B. ein Newsletter-Tool),
müssen sie in denselben SPF-Eintrag (es darf nur einen geben). Resend braucht
keinen Eintrag auf der Hauptdomain: Es nutzt `send.3d-windt.de` als
Envelope-Absender und signiert per DKIM, beides passt zu DMARC. Nach 2–4 Wochen
ohne Auffälligkeiten in den DMARC-Berichten kann `p=quarantine` folgen.

**Löschen** (zeigen auf Netlify; Pages legt eigene Einträge an):

- `A`/`AAAA` für `3d-windt.de` und `www` (derzeit `63.176.8.218`,
  `35.157.26.135`, `2a05:d014:58f:6200::258`, `2a05:d014:58f:6200::259`)
- ein evtl. vorhandener `CNAME www → …netlify.app`

**Custom Domains im Pages-Projekt:** Workers & Pages → 3d-windt → Custom domains
→ `3d-windt.de` und `www.3d-windt.de` hinzufügen. Cloudflare legt dafür
automatisch `CNAME`-Einträge auf `3d-windt.pages.dev` an (Proxy an, orange
Wolke) und stellt die Zertifikate aus, sobald die Zone aktiv ist.

**www → Hauptdomain:** Rules → Redirect Rules → Create → „Redirect from WWW to
root“ (Vorlage) bzw. manuell: Hostname gleich `www.3d-windt.de` → Dynamic
`concat("https://3d-windt.de", http.request.uri.path)`, Status 301, Query
String beibehalten.

**Rate-Limit (harte Grenze für die API):** Security → WAF → Rate limiting rules
→ Create: URI Path beginnt mit `/api/` → 60 Anfragen pro 10 Sekunden pro IP →
Block für 10 Sekunden. (Free-Plan: eine Regel, feste 10 s.) Die
KV-Rate-Limits im Code sind nur eine ungefähre zweite Linie.

**SSL/TLS:** Modus „Full (strict)“, „Always Use HTTPS“ an.

## 8. Nameserver umstellen (Cutover)

1. Falls DNSSEC für die Domain aktiv ist: beim Registrar **vorher** deaktivieren
   (sonst ist die Domain nach dem Wechsel nicht auflösbar). Nach der Aktivierung
   bei Cloudflare unter DNS → Settings wieder einschalten und den DS-Eintrag
   beim Registrar hinterlegen.
2. Beim Registrar die Nameserver von `dns1–4.p06.nsone.net` (Netlify DNS) auf
   die zwei Cloudflare-Nameserver aus dem Dashboard ändern.
3. Warten, bis Cloudflare die Zone als „Active“ meldet (Minuten bis einige
   Stunden; die `.de`-Delegation hat eine TTL von bis zu 24 h). In dieser Zeit
   landen manche Besucher noch auf Netlify. Das ist in Ordnung, **solange die
   Netlify-Seite unverändert weiterläuft**.
4. Prüfen:

```sh
dig +short NS 3d-windt.de || exit 1                     # Cloudflare-Nameserver
dig +short MX 3d-windt.de || exit 1                     # mx00/mx01.ionos.de
dig +short TXT 3d-windt.de || exit 1                    # v=spf1 include:_spf-eu.ionos.com ~all
dig +short TXT _dmarc.3d-windt.de || exit 1
dig +short TXT resend._domainkey.3d-windt.de || exit 1  # identisch zu vorher
dig +short MX send.3d-windt.de || exit 1
curl -sS -o /dev/null -w '%{http_code}\n' https://3d-windt.de/ || exit 1                 # 200
curl -sS -o /dev/null -w '%{http_code}\n' https://3d-windt.de/gibt-es-nicht || exit 1    # 404
curl -sS -o /dev/null -w '%{http_code}\n' https://3d-windt.de/api/payment-link || exit 1 # 400/503
curl -sS -o /dev/null -w '%{http_code} %{redirect_url}\n' https://www.3d-windt.de/kontakt/ || exit 1  # 301 → https://3d-windt.de/kontakt/
```

5. Resend-Dashboard → Domains → `3d-windt.de` → „Verify“: muss grün bleiben.
6. Testmail aus dem IONOS-Postfach an ein Gmail-Konto → „Original anzeigen“:
   `SPF: PASS`, `DMARC: PASS`.
7. Stripe: Die Webhook-URL `https://3d-windt.de/api/stripe/webhook` bleibt
   unverändert. Im Stripe-Dashboard ein Test-Event erneut senden → Antwort 200
   (bzw. `duplicate`), unter Webhooks keine Fehlzustellungen.

## 9. Nach dem Umzug: Netlify stilllegen (nicht löschen)

1. **Sofort nach dem Cutover** in Netlify: Site configuration → Build & deploy →
   **Stop builds**. Grund: Wird `feat/cloudflare` nach `main` gemergt, würde
   Netlify sonst `main` ohne `netlify.toml` neu bauen und die Rollback-Version
   überschreiben. Der letzte Netlify-Deploy bleibt so eingefroren.
2. Eine Woche lang Netlify → Forms prüfen (Besucher mit altem DNS-Cache) und
   dortige Einsendungen übernehmen. Danach Forms als CSV exportieren (Archiv).
3. **Alte Datei-Links** (Lead-Mails vor dem Umzug) zeigen auf Netlify Blobs. Auf
   `3d-windt.de` liefern sie nach dem Umzug „Datei nicht gefunden“. Sie
   funktionieren weiter, wenn man in der URL `3d-windt.de` durch die
   Netlify-Adresse der Seite (`<name>.netlify.app`) ersetzt. Die Netlify-Seite
   darum mindestens **90 Tage** bestehen lassen; danach sind die Dateien laut
   Datenschutzerklärung ohnehin gelöscht.
4. Die Domain in Netlify erst nach Ablauf dieser Frist entfernen.

## 10. Rollback

Solange die Netlify-Seite eingefroren existiert:

1. Beim Registrar die Nameserver zurück auf `dns1–4.p06.nsone.net` stellen
   (die Netlify-DNS-Zone bleibt dafür bis Ende der 90 Tage bestehen).
2. Falls Netlify zwischenzeitlich neu gebaut hat: in Netlify → Deploys den
   letzten Deploy vor der Migration auswählen → „Publish deploy“, oder den alten
   Stand von `main` (vor dem Merge von `feat/cloudflare`) neu deployen.
3. In der Rollback-Phase eingegangene Leads liegen in R2 (`leads/`) und müssen
   manuell übernommen werden.

## 11. Restrisiken

- **Stripe-Idempotenz über KV:** KV ist nur „eventually consistent“ (bis ca.
  60 s). Treffen zwei Zustellungen desselben Events in dieser Zeit auf
  verschiedene Cloudflare-Standorte, verarbeiten beide das Event. Der
  Resend-Idempotenzschlüssel `stripe-event-<id>` verhindert dann die doppelte
  Mail (Fenster 24 h). Restrisiko: eine doppelte **interne** Zahlungsmeldung,
  wenn ein Marker verloren geht und Stripe erst nach mehr als 24 h erneut
  zustellt. Die Zahlung selbst ist nicht betroffen.
- **Rate-Limits über KV** sind ungefähr (keine atomaren Zähler) und lassen bei
  KV-Störungen alles durch, damit keine Anfrage verloren geht. Die WAF-Regel aus
  Schritt 7 ist die eigentliche Grenze.
- **Lead ohne Mail:** Fällt Resend aus, ist der Lead trotzdem gespeichert, es
  kommt aber keine Benachrichtigung. Deshalb: wöchentlich R2 → `leads/` mit den
  eingegangenen Mails abgleichen und in den Pages-Logs (Deployments → Functions →
  Real-time Logs) nach `[lead]` suchen.
- **Leads haben keine automatische Löschung.** Laut Datenschutzerklärung
  „in der Regel bis zu 24 Monate nach Abschluss“: alte Datensätze unter
  `leads/JJJJ/MM/` regelmäßig manuell löschen.
- **Datenschutz:** Die Datenschutzerklärung nennt jetzt Cloudflare (Hosting,
  Formulare, Uploads, R2 mit Speicherort EU) und die kurzzeitige Speicherung
  eines IP-Hashes zur Missbrauchsabwehr. Der Auftragsverarbeitungsvertrag
  (Cloudflare Customer DPA, auf cloudflare.com im Trust Hub veröffentlicht) ist
  Teil der Cloudflare-Nutzungsbedingungen; herunterladen und zu den
  Vertragsunterlagen legen. Die Formulierung vor Livegang rechtlich prüfen lassen.
- **Preview-Deployments** sind öffentlich erreichbar und teilen Bucket/KV mit
  Production. Optional: Workers & Pages → 3d-windt → Settings → „Enable access
  policy“ für Previews (Cloudflare Access).
- **Academy-Seiten** (`academy/`, `academy-growth-site/`) sind nicht Teil dieses
  Umzugs; sie haben eigene `netlify.toml` und eigene Netlify-Forms. Wenn sie
  unter einer Subdomain von `3d-windt.de` laufen, deren DNS-Einträge in
  Schritt 7 mit übernehmen.
