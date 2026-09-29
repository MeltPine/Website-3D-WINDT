import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, FileText, Loader2 } from 'lucide-react';
import GlassSurface from '../components/GlassSurface';
import B2BCheckoutButton from '../components/B2BCheckoutButton';
import { CONTACT } from '../lib/brand';
import { KLEINUNTERNEHMER_NOTICE, VAT_RATE_PERCENT, formatEuroCents } from '../lib/payment/catalog';
import {
  verifyQuoteLink,
  type QuoteLinkParams,
  type VerifiedQuoteLink,
} from '../lib/payment/checkoutClient';

type ViewState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; quote: VerifiedQuoteLink; link: QuoteLinkParams };

function readLinkParams(search: string): QuoteLinkParams | null {
  const params = new URLSearchParams(search);
  const q = params.get('q');
  const a = params.get('a');
  const e = params.get('e');
  const s = params.get('s');
  return q && a && e && s ? { q, a, e, s } : null;
}

const dateFormatter = new Intl.DateTimeFormat('de-DE', { dateStyle: 'long' });

const Bezahlen = () => {
  const [state, setState] = useState<ViewState>({ status: 'loading' });

  useEffect(() => {
    // Read from window, not the router: prerendering has no query string.
    const link = readLinkParams(window.location.search);
    if (!link) {
      setState({
        status: 'error',
        message: 'Dieser Zahlungslink ist unvollständig. Bitte verwenden Sie den vollständigen Link aus unserer E-Mail.',
      });
      return;
    }
    let cancelled = false;
    verifyQuoteLink(link).then((result) => {
      if (cancelled) {
        return;
      }
      setState(result.ok ? { status: 'ready', quote: result.quote, link } : { status: 'error', message: result.error });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="py-16 animate-fade-in">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <GlassSurface variant="card" density="light" className="p-8 md:p-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-primary-100 text-primary-700 p-3 rounded-lg">
              <FileText className="h-6 w-6" />
            </div>
            <h1 className="font-display text-3xl font-bold text-gray-900">Angebot annehmen &amp; bezahlen</h1>
          </div>

          {state.status === 'loading' && (
            <p className="text-gray-700 flex items-center gap-2" role="status">
              <Loader2 className="h-5 w-5 animate-spin" />
              Zahlungslink wird geprüft …
            </p>
          )}

          {state.status === 'error' && (
            <div className="space-y-4">
              <p role="alert" className="text-red-700 flex items-start gap-2">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                {state.message}
              </p>
              <p className="text-gray-700">
                Kontakt: <a className="text-primary-700 underline" href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>{' '}
                · {CONTACT.phone}
              </p>
            </div>
          )}

          {state.status === 'ready' && (
            <div className="space-y-6">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 rounded-xl p-5">
                <div>
                  <dt className="text-sm text-gray-600">Angebotsnummer</dt>
                  <dd className="text-lg font-semibold text-gray-900">{state.quote.quoteNumber}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-600">
                    {state.quote.taxMode === 'regelbesteuerung' ? 'Betrag netto' : 'Betrag'}
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {formatEuroCents(state.quote.netAmountCents)}
                  </dd>
                </div>
                {state.quote.taxMode === 'regelbesteuerung' ? (
                  <>
                    <div>
                      <dt className="text-sm text-gray-600">zzgl. {VAT_RATE_PERCENT} % USt.</dt>
                      <dd className="text-gray-900">{formatEuroCents(state.quote.vatCents)}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-600">Gesamtbetrag</dt>
                      <dd className="text-lg font-semibold text-gray-900">
                        {formatEuroCents(state.quote.totalCents)}
                      </dd>
                    </div>
                  </>
                ) : (
                  <div className="sm:col-span-2">
                    <dd className="text-sm text-gray-700">{KLEINUNTERNEHMER_NOTICE}</dd>
                  </div>
                )}
                <div className="sm:col-span-2">
                  <dt className="text-sm text-gray-600">Link gültig bis</dt>
                  <dd className="text-gray-900">
                    {dateFormatter.format(new Date(state.quote.expiresAt * 1000))}
                  </dd>
                </div>
              </dl>
              <p className="text-sm text-gray-700">
                Mit der Zahlung nehmen Sie unser Angebot {state.quote.quoteNumber} zu den darin
                genannten Bedingungen an. Der verbindliche Endbetrag wird Ihnen vor der Zahlung bei
                Stripe angezeigt.
              </p>
              <B2BCheckoutButton
                selection={{ product: 'quote', link: state.link }}
                label="Angebot annehmen & bezahlen"
              />
            </div>
          )}

          <p className="text-sm text-gray-600 mt-8">
            Fragen zum Angebot? <Link to="/kontakt/" className="text-primary-700 underline">Kontakt aufnehmen</Link>
          </p>
        </GlassSurface>
      </div>
    </div>
  );
};

export default Bezahlen;
