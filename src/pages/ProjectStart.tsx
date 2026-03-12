import React, { useRef, useState } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Send } from 'lucide-react';
import { trackEvent } from '../lib/tracking';

type FinishingOption = 'none' | 'basic' | 'premium';

const acceptedFileTypes = ['.stl', '.obj', '.3mf', '.svg'];
const maxFileSizeMb = 50;

const ProjectStart = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [uploadError, setUploadError] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [submitError, setSubmitError] = useState('');
  const [hasTrackedStart, setHasTrackedStart] = useState(false);

  const [weight, setWeight] = useState('');
  const [needsCad, setNeedsCad] = useState(false);
  const [cadHours, setCadHours] = useState('1');
  const [needsScan, setNeedsScan] = useState(false);
  const [expressDelivery, setExpressDelivery] = useState(false);
  const [finishing, setFinishing] = useState<FinishingOption>('none');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [useCase, setUseCase] = useState('');
  const [quantity, setQuantity] = useState('');
  const [deadline, setDeadline] = useState('');
  const [materialPref, setMaterialPref] = useState('');
  const [budgetBand, setBudgetBand] = useState('');
  const [message, setMessage] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFormStart = () => {
    if (hasTrackedStart) {
      return;
    }
    setHasTrackedStart(true);
    trackEvent('lead_form_started', { form: 'project' });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFormStart();
    const selectedFiles = Array.from(event.target.files || []);
    const validFiles: File[] = [];
    const errors: string[] = [];

    selectedFiles.forEach((file) => {
      const extension = `.${file.name.split('.').pop()?.toLowerCase()}`;
      if (!acceptedFileTypes.includes(extension)) {
        errors.push(`${file.name}: Dateityp nicht unterstützt`);
        return;
      }
      if (file.size > maxFileSizeMb * 1024 * 1024) {
        errors.push(`${file.name}: größer als ${maxFileSizeMb} MB`);
        return;
      }
      validFiles.push(file);
    });

    setUploadError(errors.join(' | '));

    if (validFiles.length > 0) {
      setFiles((prev) => [...prev, ...validFiles]);
      trackEvent('file_upload_added', {
        form: 'project',
        file_count: validFiles.length,
      });
    }

    event.target.value = '';
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setFiles([]);
    setUploadError('');
    setSubmitError('');
    setHasTrackedStart(false);

    setWeight('');
    setNeedsCad(false);
    setCadHours('1');
    setNeedsScan(false);
    setExpressDelivery(false);
    setFinishing('none');

    setName('');
    setEmail('');
    setPhone('');
    setCompany('');
    setUseCase('');
    setQuantity('');
    setDeadline('');
    setMaterialPref('');
    setBudgetBand('');
    setMessage('');
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleFormStart();
    setStatus('submitting');
    setSubmitError('');

    const form = event.currentTarget;
    const payload = new FormData(form);
    payload.delete('project_files');
    files.forEach((file) => payload.append('project_files', file));
    payload.set('estimated_price', 'individuelles_angebot');

    try {
      const response = await fetch('/', {
        method: 'POST',
        body: payload,
      });

      if (!response.ok) {
        throw new Error('Übermittlung fehlgeschlagen');
      }

      trackEvent('lead_form_submitted', {
        form: 'project',
        use_case: useCase,
      });
      setStatus('success');
      form.reset();
      resetForm();
      setStatus('success');
    } catch (error) {
      trackEvent('lead_form_error', {
        form: 'project',
      });
      setStatus('error');
      setSubmitError(
        'Die Anfrage konnte nicht gesendet werden. Bitte versuchen Sie es erneut oder kontaktieren Sie uns direkt.',
      );
      console.error(error);
    }
  };

  if (status === 'success') {
    return (
      <div className="py-16 animate-fade-in">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-green-50 p-8 rounded-2xl border border-green-200">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Projektanfrage erfolgreich gesendet
            </h1>
            <p className="text-lg text-gray-600 mb-6">
              Danke für Ihre Angaben. Wir melden uns mit einer qualifizierten
              Rückmeldung in der Regel innerhalb von 24 Stunden.
            </p>
            <button
              onClick={() => {
                resetForm();
                setStatus('idle');
              }}
              className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors"
            >
              Neue Anfrage starten
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-16 animate-fade-in">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Projekt starten</h1>
          <p className="text-xl text-gray-600">
            Datei hochladen, Anforderungen hinterlegen und ein belastbares Angebot erhalten
          </p>
        </div>

        <form
          name="project-request"
          method="POST"
          data-netlify="true"
          data-netlify-honeypot="bot-field"
          encType="multipart/form-data"
          onSubmit={handleSubmit}
          className="space-y-8"
        >
          <input type="hidden" name="form-name" value="project-request" />
          <input type="hidden" name="estimated_price" value="individuelles_angebot" />
          <p className="hidden">
            <label>
              Nicht ausfüllen: <input name="bot-field" />
            </label>
          </p>

          {status === 'error' && (
            <div className="bg-red-50 border border-red-200 p-4 rounded-xl">
              <p className="text-red-700 flex items-start gap-2">
                <AlertCircle className="h-5 w-5 mt-0.5" />
                <span>{submitError}</span>
              </p>
            </div>
          )}

          <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-primary-400 transition-colors">
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Dateien hochladen</h2>
            <p className="text-gray-600 mb-4">
              Unterstützte Formate: STL, OBJ, 3MF, SVG (max. {maxFileSizeMb}MB pro Datei)
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Laden Sie Ihre CAD-/STL-Datei hoch. Alternativ können Sie uns auch ein Musterteil
              nach Absprache zusenden.
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors"
            >
              Dateien auswählen
            </button>
            <input
              ref={fileInputRef}
              type="file"
              name="project_files"
              multiple
              accept=".stl,.obj,.3mf,.svg"
              onChange={handleFileUpload}
              className="hidden"
            />
            {uploadError && (
              <p className="mt-4 text-sm text-red-600 flex items-center justify-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span>{uploadError}</span>
              </p>
            )}
          </div>

          {files.length > 0 && (
            <div className="bg-gray-50 p-6 rounded-xl">
              <h3 className="font-semibold text-gray-900 mb-4">Hochgeladene Dateien</h3>
              <div className="space-y-2">
                {files.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between bg-white p-3 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-primary-500" />
                      <span className="text-gray-900">{file.name}</span>
                      <span className="text-sm text-gray-500">
                        ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Entfernen
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Projektanforderungen</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="use_case" className="block text-sm font-medium text-gray-700 mb-2">
                  Anwendungsfall *
                </label>
                <select
                  id="use_case"
                  name="use_case"
                  required
                  value={useCase}
                  onFocus={handleFormStart}
                  onChange={(e) => setUseCase(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
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
                <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-2">
                  Stückzahl *
                </label>
                <p className="text-xs text-gray-500 mb-2">Geplante Menge pro Abruf oder Auftrag.</p>
                <input
                  type="number"
                  id="quantity"
                  name="quantity"
                  min="1"
                  required
                  value={quantity}
                  onFocus={handleFormStart}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="z. B. 20"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label htmlFor="deadline" className="block text-sm font-medium text-gray-700 mb-2">
                  Gewünschter Termin *
                </label>
                <input
                  type="date"
                  id="deadline"
                  name="deadline"
                  required
                  value={deadline}
                  onFocus={handleFormStart}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label
                  htmlFor="material_pref"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Material / Anforderung *
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Nennen Sie Materialwunsch und Einsatzbedingungen (z. B. Temperatur, UV, Last).
                </p>
                <input
                  type="text"
                  id="material_pref"
                  name="material_pref"
                  required
                  value={materialPref}
                  onFocus={handleFormStart}
                  onChange={(e) => setMaterialPref(e.target.value)}
                  placeholder="z. B. PETG, UV-beständig"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
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
                  value={budgetBand}
                  onFocus={handleFormStart}
                  onChange={(e) => setBudgetBand(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Keine Angabe</option>
                  <option value="klein">Kleiner Umfang</option>
                  <option value="mittel">Mittlerer Umfang</option>
                  <option value="gross">Größerer Umfang</option>
                  <option value="serie">Serien-/Rahmenbedarf</option>
                </select>
              </div>
              <div>
                <label htmlFor="weight" className="block text-sm font-medium text-gray-700 mb-2">
                  Geschätztes Gewicht (g)
                </label>
                <input
                  type="number"
                  id="weight"
                  name="weight"
                  min="1"
                  step="0.1"
                  value={weight}
                  onFocus={handleFormStart}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="z. B. 150"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Zusatzleistungen</h2>
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="needs_cad"
                    name="needs_cad"
                    checked={needsCad}
                    onFocus={handleFormStart}
                    onChange={(e) => setNeedsCad(e.target.checked)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="needs_cad" className="ml-3 text-sm font-medium text-gray-700">
                    CAD-Unterstützung benötigt
                  </label>
                </div>

                {needsCad && (
                  <div className="ml-7">
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="cad_hours">
                      Geschätzte Stunden
                    </label>
                    <input
                      type="number"
                      id="cad_hours"
                      name="cad_hours"
                      min="0.5"
                      step="0.5"
                      value={cadHours}
                      onFocus={handleFormStart}
                      onChange={(e) => setCadHours(e.target.value)}
                      className="w-24 border border-gray-300 rounded px-2 py-1 text-sm"
                    />
                  </div>
                )}

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="needs_scan"
                    name="needs_scan"
                    checked={needsScan}
                    onFocus={handleFormStart}
                    onChange={(e) => setNeedsScan(e.target.checked)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="needs_scan" className="ml-3 text-sm font-medium text-gray-700">
                    3D-Scan benötigt
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="express_delivery"
                    name="express_delivery"
                    checked={expressDelivery}
                    onFocus={handleFormStart}
                    onChange={(e) => setExpressDelivery(e.target.checked)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="express_delivery"
                    className="ml-3 text-sm font-medium text-gray-700"
                  >
                    Express-Lieferung gewünscht
                  </label>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Nachbearbeitung</h2>
              <div className="space-y-3">
                <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="finishing"
                    value="none"
                    checked={finishing === 'none'}
                    onFocus={handleFormStart}
                    onChange={() => setFinishing('none')}
                    className="h-4 w-4 text-primary-600"
                  />
                  <div>
                    <div className="font-medium">Keine</div>
                    <div className="text-sm text-gray-500">Standardoberfläche</div>
                  </div>
                </label>

                <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="finishing"
                    value="basic"
                    checked={finishing === 'basic'}
                    onFocus={handleFormStart}
                    onChange={() => setFinishing('basic')}
                    className="h-4 w-4 text-primary-600"
                  />
                  <div>
                    <div className="font-medium">Basic</div>
                    <div className="text-sm text-gray-500">Schleifen & Glätten</div>
                  </div>
                </label>

                <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="finishing"
                    value="premium"
                    checked={finishing === 'premium'}
                    onFocus={handleFormStart}
                    onChange={() => setFinishing('premium')}
                    className="h-4 w-4 text-primary-600"
                  />
                  <div>
                    <div className="font-medium">Premium</div>
                    <div className="text-sm text-gray-500">Lackierung & Finish</div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="bg-primary-50 p-6 rounded-xl">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Projektbewertung</h2>
            <p className="text-gray-700">
              Nach Eingang Ihrer Daten erhalten Sie innerhalb von 24 Stunden eine technische
              Rückmeldung und ein individuelles Angebot.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Kontaktdaten</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="name">
                  Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={name}
                  onFocus={handleFormStart}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">
                  E-Mail *
                </label>
                <p className="text-xs text-gray-500 mb-1">
                  An diese Adresse senden wir Ihre technische Rückmeldung und das Angebot.
                </p>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  value={email}
                  onFocus={handleFormStart}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="phone">
                  Telefon
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={phone}
                  onFocus={handleFormStart}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="company">
                  Unternehmen
                </label>
                <p className="text-xs text-gray-500 mb-1">
                  Optional: Für schnellere Zuordnung Ihrer Anfrage.
                </p>
                <input
                  type="text"
                  id="company"
                  name="company"
                  value={company}
                  onFocus={handleFormStart}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="message">
                Zusätzliche Hinweise
              </label>
              <textarea
                id="message"
                name="message"
                rows={4}
                value={message}
                onFocus={handleFormStart}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Einsatzbedingungen, kritische Maße oder weitere Wünsche"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div className="mt-4 bg-gray-50 p-4 rounded-lg">
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="privacy_consent"
                  name="privacy_consent"
                  required
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded mt-1"
                />
                <label htmlFor="privacy_consent" className="text-sm text-gray-600">
                  Ich habe die{' '}
                  <a href="/datenschutz" className="text-primary-600 hover:text-primary-700 underline">
                    Datenschutzerklärung
                  </a>{' '}
                  gelesen und stimme der Verarbeitung meiner Daten zu. *
                </label>
              </div>
            </div>
          </div>

          <div className="text-center">
            <button
              type="submit"
              disabled={status === 'submitting'}
              className="bg-primary-600 text-white px-8 py-4 rounded-lg text-lg font-medium hover:bg-primary-700 disabled:opacity-70 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
            >
              <Send className="h-5 w-5" />
              <span>
                {status === 'submitting' ? 'Wird gesendet...' : 'Projektanfrage senden'}
              </span>
            </button>
            <p className="text-sm text-gray-500 mt-2">
              Sie erhalten in der Regel innerhalb von 24 Stunden eine Rückmeldung.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectStart;
