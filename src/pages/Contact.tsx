import React, { useRef, useState } from 'react';
import { Mail, Phone, MapPin, Clock, Send, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { trackEvent } from '../lib/tracking';
import { BRAND, CONTACT } from '../lib/brand';
import { triggerLeadFollowup } from '../lib/leadFollowup';
import { reportLeadError } from '../lib/leadAlert';

type ContactFormData = {
  name: string;
  email: string;
  phone: string;
  company: string;
  use_case: string;
  quantity: string;
  deadline: string;
  material_pref: string;
  budget_band: string;
  message: string;
};

const initialFormData: ContactFormData = {
  name: '',
  email: '',
  phone: '',
  company: '',
  use_case: '',
  quantity: '',
  deadline: '',
  material_pref: '',
  budget_band: '',
  message: '',
};

const Contact = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<ContactFormData>(initialFormData);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const hasTrackedStartRef = useRef(false);

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
        use_case: formData.use_case,
      });

      void triggerLeadFollowup({
        form_name: 'contact-request',
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        company: formData.company,
        use_case: formData.use_case,
        quantity: formData.quantity,
        deadline: formData.deadline,
        material_pref: formData.material_pref,
        budget_band: formData.budget_band,
        message: formData.message,
        source_path: '/kontakt',
      });

      setFormData(initialFormData);
      hasTrackedStartRef.current = false;
      form.reset();
      setStatus('idle');
      navigate('/danke-kontakt', { replace: true });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      trackEvent('lead_form_error', {
        form: 'contact',
      });
      void reportLeadError({
        form_name: 'contact-request',
        source_path: '/kontakt',
        error_message: errorMessage,
        lead_email: formData.email || undefined,
        form_data: {
          use_case: formData.use_case,
          quantity: formData.quantity,
          deadline: formData.deadline,
          material_pref: formData.material_pref,
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
    <div className="py-16 animate-fade-in">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Kontakt</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Für eine schnelle und belastbare Angebotserstellung helfen uns konkrete Angaben zu
            Einsatzfall, Stückzahl und Termin.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <aside className="lg:col-span-1">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Kontaktinformationen</h2>

            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="bg-primary-100 p-3 rounded-lg">
                  <Mail className="h-6 w-6 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">E-Mail</h3>
                  <p className="text-gray-600">{CONTACT.email}</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="bg-primary-100 p-3 rounded-lg">
                  <Phone className="h-6 w-6 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Telefon</h3>
                  <p className="text-gray-600">{CONTACT.phone}</p>
                  <p className="text-sm text-gray-500 mt-1">{CONTACT.officeHours}</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
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

              <div className="flex items-start space-x-4">
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
            <div className="bg-white border border-gray-200 rounded-xl p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Projektanfrage senden</h2>

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
                <input type="hidden" name="source_path" value="/kontakt" />
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
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                      placeholder="Ihr vollständiger Name"
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
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
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
                      Telefon
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onFocus={handleFormStart}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                      placeholder="+49 ..."
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="company"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Unternehmen
                    </label>
                    <input
                      type="text"
                      id="company"
                      name="company"
                      value={formData.company}
                      onFocus={handleFormStart}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                      placeholder="Unternehmen (optional)"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label
                      htmlFor="use_case"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Anwendungsfall *
                    </label>
                    <select
                      id="use_case"
                      name="use_case"
                      required
                      value={formData.use_case}
                      onFocus={handleFormStart}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                    >
                      <option value="">Bitte auswählen</option>
                      <option value="prototyp">Prototyp</option>
                      <option value="ersatzteil">Ersatzteil</option>
                      <option value="kleinserie">Kleinserie</option>
                      <option value="vorrichtung">Vorrichtung / Jig</option>
                      <option value="sonstiges">Sonstiges</option>
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="quantity"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Stückzahl *
                    </label>
                    <input
                      type="number"
                      id="quantity"
                      name="quantity"
                      min="1"
                      required
                      value={formData.quantity}
                      onFocus={handleFormStart}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                      placeholder="z. B. 10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label
                      htmlFor="deadline"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Gewünschter Termin *
                    </label>
                    <input
                      type="date"
                      id="deadline"
                      name="deadline"
                      required
                      value={formData.deadline}
                      onFocus={handleFormStart}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="material_pref"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Material / Anforderung *
                    </label>
                    <input
                      type="text"
                      id="material_pref"
                      name="material_pref"
                      required
                      value={formData.material_pref}
                      onFocus={handleFormStart}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                      placeholder="z. B. PETG, temperaturbeständig"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="budget_band"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Projektumfang (optional)
                    </label>
                    <select
                      id="budget_band"
                      name="budget_band"
                      value={formData.budget_band}
                      onFocus={handleFormStart}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                    >
                      <option value="">Keine Angabe</option>
                      <option value="klein">Kleiner Umfang</option>
                      <option value="mittel">Mittlerer Umfang</option>
                      <option value="gross">Größerer Umfang</option>
                      <option value="serie">Serien-/Rahmenbedarf</option>
                    </select>
                  </div>
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
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                    placeholder="Beschreiben Sie Ihr Projekt und wichtige technische Hinweise."
                  />
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      id="privacy"
                      name="privacy_consent"
                      required
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded mt-1"
                    />
                    <label htmlFor="privacy" className="text-sm text-gray-600">
                      Ich habe die{' '}
                      <a
                        href="/datenschutz"
                        className="text-primary-600 hover:text-primary-700 underline"
                      >
                        Datenschutzerklärung
                      </a>{' '}
                      gelesen und stimme der Verarbeitung meiner Daten zu. *
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={status === 'submitting'}
                  className="w-full bg-primary-600 text-white px-6 py-4 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-70 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2 group"
                >
                  <Send className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  <span>
                    {status === 'submitting' ? 'Wird gesendet...' : 'Projektanfrage senden'}
                  </span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
