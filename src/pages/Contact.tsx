import React, { useRef, useState } from 'react';
import { Mail, Phone, MapPin, Clock, Send, AlertCircle, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { trackEvent } from '../lib/tracking';
import GlassSurface from '../components/GlassSurface';
import { BRAND, CONTACT } from '../lib/brand';
import { triggerLeadFollowup } from '../lib/leadFollowup';
import { reportLeadError } from '../lib/leadAlert';
import { isLikelyApplicationLead } from '../lib/leadIntent';

type ContactFormData = {
  name: string;
  email: string;
  phone: string;
  company: string;
  use_case: string;
  message: string;
};

const initialFormData: ContactFormData = {
  name: '',
  email: '',
  phone: '',
  company: '',
  use_case: '',
  message: '',
};
const fieldClassName =
  'w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary-600 focus:border-primary-600 transition-colors';

const Contact = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<ContactFormData>(initialFormData);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const hasTrackedStartRef = useRef(false);
  const phoneHref = `tel:${CONTACT.phone.replace(/[^\d+]/g, '')}`;
  const contactHighlights = [
    'Kurze Erstabstimmung ohne Dateiupload möglich',
    'Technische Rückmeldung in der Regel innerhalb von 24 Stunden',
    'Für belastbare Angebote: direkter Wechsel in den Projektstart',
  ];

  const handleFormStart = () => {
    if (hasTrackedStartRef.current) {
      return;
    }
    hasTrackedStartRef.current = true;
    trackEvent('lead_form_started', { form: 'contact' });
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('submitting');
    setErrorMessage('');

    const form = e.currentTarget;
    const payload = new FormData(form);

    if (isLikelyApplicationLead([formData.use_case, formData.company, formData.message])) {
      trackEvent('lead_form_filtered', {
        form: 'contact',
        reason: 'application_keywords',
      });
      setStatus('error');
      setErrorMessage(
        'Dieses Formular ist für Kundenanfragen gedacht. Bewerbungen oder Jobanfragen können wir hier nicht bearbeiten.',
      );
      return;
    }

    try {
      const response = await fetch('/', {
        method: 'POST',
        body: payload,
      });

      if (!response.ok) {
        throw new Error('Übermittlung fehlgeschlagen');
      }

      trackEvent('lead_form_submitted', {
        form: 'contact',
        use_case: formData.use_case || 'schnellkontakt',
      });

      void triggerLeadFollowup({
        form_name: 'contact-request',
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        company: formData.company,
        use_case: formData.use_case || 'schnellkontakt',
        message: formData.message,
        source_path: '/kontakt/',
      });

      setFormData(initialFormData);
      hasTrackedStartRef.current = false;
      form.reset();
      setStatus('idle');
      navigate('/danke-kontakt/', { replace: true });
    } catch (error) {
      const submitError = error instanceof Error ? error.message : 'Unbekannter Fehler';
      trackEvent('lead_form_error', {
        form: 'contact',
      });
      void reportLeadError({
        form_name: 'contact-request',
        source_path: '/kontakt/',
        error_message: submitError,
        lead_email: formData.email || undefined,
        form_data: {
          use_case: formData.use_case || 'schnellkontakt',
          company: formData.company || null,
        },
      });
      setStatus('error');
      setErrorMessage(
        'Die Nachricht konnte nicht gesendet werden. Bitte versuchen Sie es erneut oder rufen Sie uns an.',
      );
      console.error(error);
    }
  };

  return (
    <div className="py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="font-display text-4xl font-bold text-gray-900 mb-4">Kontakt</h1>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto">
            Für Rückfragen reicht eine kurze Nachricht. Für ein belastbares Angebot mit Datei-Upload
            nutzen Sie den Projektstart.
          </p>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3 text-left max-w-5xl mx-auto">
            {contactHighlights.map((item) => (
              <div key={item} className="glass-lite rounded-lg px-4 py-3 text-sm text-gray-700">
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <aside className="lg:col-span-1">
            <h2 className="font-display text-2xl font-bold text-gray-900 mb-6">Kontaktinformationen</h2>

            <div className="space-y-6">
              <div className="glass-lite p-4 flex items-start space-x-4">
                <div className="bg-primary-100 p-3 rounded-lg">
                  <Mail className="h-6 w-6 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">E-Mail</h3>
                  <p className="text-gray-600">{CONTACT.email}</p>
                </div>
              </div>

              <div className="glass-lite p-4 flex items-start space-x-4">
                <div className="bg-primary-100 p-3 rounded-lg">
                  <Phone className="h-6 w-6 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Telefon</h3>
                  <p className="text-gray-600">{CONTACT.phone}</p>
                  <p className="text-sm text-gray-500 mt-1">{CONTACT.officeHours}</p>
                </div>
              </div>

              <div className="glass-lite p-4 flex items-start space-x-4">
                <div className="bg-primary-100 p-3 rounded-lg">
                  <MapPin className="h-6 w-6 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Standort</h3>
                  <p className="text-gray-600">
                    {CONTACT.streetAddress}, {CONTACT.postalCode} {CONTACT.city}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">{CONTACT.serviceArea}</p>
                </div>
              </div>

              <div className="glass-lite p-4 flex items-start space-x-4">
                <div className="bg-primary-100 p-3 rounded-lg">
                  <Clock className="h-6 w-6 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Rückmeldung</h3>
                  <p className="text-gray-600">{CONTACT.responseTime}</p>
                  <p className="text-sm text-gray-500 mt-1">Rechtsträger: {BRAND.legalName}</p>
                </div>
              </div>
            </div>
          </aside>

          <div className="lg:col-span-2">
            <GlassSurface variant="card" density="light" className="p-6 md:p-8">
              <h2 className="font-display text-2xl font-bold text-gray-900 mb-3">
                Schnellkontakt senden
              </h2>
              <p className="text-gray-700 mb-6">
                Pflichtfelder: Name, E-Mail, Nachricht. Weitere Angaben können Sie optional ergänzen.
              </p>

              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 mb-6">
                <p className="text-sm text-amber-900">
                  Dieses Formular ist ausschließlich für Kundenanfragen aus Industrie und Produktion.
                  Bewerbungen oder Jobanfragen können hier nicht bearbeitet werden.
                </p>
              </div>

              <div className="glass-lite p-4 mb-6">
                <p className="text-sm text-gray-700">
                  Bereits Datei und technische Details vorhanden?{' '}
                  <Link
                    to="/projekt-starten/"
                    className="text-primary-700 font-medium hover:text-primary-800 inline-flex items-center gap-1"
                  >
                    Direkt zur Projektanfrage
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </p>
              </div>

              {status === 'error' && (
                <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-6">
                  <p className="text-red-700 flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 mt-0.5" />
                    <span>{errorMessage}</span>
                  </p>
                </div>
              )}

              <form
                name="contact-request"
                method="POST"
                data-netlify="true"
                data-netlify-honeypot="bot-field"
                onSubmit={handleSubmit}
                className="space-y-6"
              >
                <input type="hidden" name="form-name" value="contact-request" />
                <input type="hidden" name="source_path" value="/kontakt/" />
                <p className="hidden">
                  <label>
                    Nicht ausfüllen: <input name="bot-field" />
                  </label>
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                    required
                    value={formData.name}
                    onFocus={handleFormStart}
                    onChange={handleChange}
                    className={fieldClassName}
                    placeholder="Ihr Name"
                  />
                </div>
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      E-Mail *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                    required
                    value={formData.email}
                    onFocus={handleFormStart}
                    onChange={handleChange}
                    className={fieldClassName}
                    placeholder="ihre.email@example.com"
                  />
                </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label
                      htmlFor="phone"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Telefon (optional)
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onFocus={handleFormStart}
                      onChange={handleChange}
                      className={fieldClassName}
                      placeholder="+49 ..."
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="company"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Unternehmen (optional)
                    </label>
                    <input
                      type="text"
                      id="company"
                      name="company"
                      value={formData.company}
                      onFocus={handleFormStart}
                      onChange={handleChange}
                      className={fieldClassName}
                      placeholder="Unternehmen"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="use_case"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Thema (optional)
                  </label>
                  <select
                    id="use_case"
                    name="use_case"
                    value={formData.use_case}
                    onFocus={handleFormStart}
                    onChange={handleChange}
                    className={fieldClassName}
                  >
                    <option value="">Bitte auswählen</option>
                    <option value="rueckruf">Rückrufwunsch</option>
                    <option value="projektabstimmung">Projektabstimmung</option>
                    <option value="materialfrage">Materialfrage</option>
                    <option value="bestehender_auftrag">Bestehender Auftrag</option>
                    <option value="sonstiges">Sonstiges</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                    Nachricht *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={6}
                    value={formData.message}
                    onFocus={handleFormStart}
                    onChange={handleChange}
                    className={fieldClassName}
                    placeholder="Kurzbeschreibung Ihres Anliegens"
                  />
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-start space-x-3 mb-4">
                    <input
                      type="checkbox"
                      id="business_intent"
                      name="business_intent"
                      required
                      className="h-4 w-4 text-primary-700 focus:ring-primary-600 border-gray-300 rounded mt-1"
                    />
                    <label htmlFor="business_intent" className="text-sm text-gray-600">
                      Ich sende eine geschäftliche Anfrage (keine Bewerbung). *
                    </label>
                  </div>
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      id="privacy"
                      name="privacy_consent"
                      required
                      className="h-4 w-4 text-primary-700 focus:ring-primary-600 border-gray-300 rounded mt-1"
                    />
                    <label htmlFor="privacy" className="text-sm text-gray-600">
                      Ich habe die{' '}
                      <a
                        href="/datenschutz/"
                        className="text-primary-700 hover:text-primary-800 underline"
                      >
                        Datenschutzerklärung
                      </a>{' '}
                      gelesen und stimme der Verarbeitung meiner Daten zu. *
                    </label>
                  </div>
                </div>

                <div className="rounded-xl border border-primary-100 bg-primary-50/50 p-4">
                  <button
                    type="submit"
                    disabled={status === 'submitting'}
                    className="w-full bg-primary-700 text-white px-6 py-4 rounded-lg font-semibold hover:bg-primary-800 disabled:opacity-70 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                  >
                    <Send className="h-5 w-5" />
                    <span>{status === 'submitting' ? 'Wird gesendet...' : 'Nachricht senden'}</span>
                  </button>
                  <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm">
                    <a
                      href={phoneHref}
                      className="inline-flex items-center gap-2 text-gray-700 hover:text-primary-700"
                    >
                      <Phone className="h-4 w-4" />
                      {CONTACT.phone}
                    </a>
                    <a
                      href={`mailto:${CONTACT.email}`}
                      className="inline-flex items-center gap-2 text-gray-700 hover:text-primary-700"
                    >
                      <Mail className="h-4 w-4" />
                      {CONTACT.email}
                    </a>
                  </div>
                </div>
              </form>
            </GlassSurface>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
