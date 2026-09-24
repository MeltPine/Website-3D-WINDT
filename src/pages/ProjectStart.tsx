import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Calculator, Send } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { MailIcon, PhoneIcon } from '../components/icons';
import { trackEvent } from '../lib/tracking';
import GlassSurface from '../components/GlassSurface';
import { triggerLeadFollowup } from '../lib/leadFollowup';
import { reportLeadError } from '../lib/leadAlert';
import { CONTACT } from '../lib/brand';
import { isLikelyApplicationLead } from '../lib/leadIntent';
import { appendAttributionToFormData, getAttributionFields } from '../lib/attribution';
import QuoteWorkbench from '../components/quote/QuoteWorkbench';
import { getQuoteSession, resetQuoteSession, useQuoteSession } from '../lib/quote/quoteSession';
import { formatMegabytes } from '../lib/quote/summary';
import type { UploadOutcome } from '../lib/upload/uploadClient';

type FinishingOption = 'none' | 'basic' | 'premium';
type SubmitStatus = 'idle' | 'uploading' | 'submitting' | 'error';
type UploadStatusField = 'none' | 'complete' | 'partial' | 'skipped_after_error';

const fieldClassName =
  'w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary-600 focus:border-primary-600 transition-colors';

const ProjectStart = () => {
  const navigate = useNavigate();
  const quoteSession = useQuoteSession();
  const [status, setStatus] = useState<SubmitStatus>('idle');
  const [submitError, setSubmitError] = useState('');
  const [uploadProgress, setUploadProgress] = useState<{ uploadedBytes: number; totalBytes: number } | null>(null);
  const [offerSendWithoutFiles, setOfferSendWithoutFiles] = useState(false);
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
  const [roleInCompany, setRoleInCompany] = useState('');
  const [useCase, setUseCase] = useState('');
  const [quantity, setQuantity] = useState('');
  const [deadline, setDeadline] = useState('');
  const [materialPref, setMaterialPref] = useState('');
  const [budgetBand, setBudgetBand] = useState('');
  const [message, setMessage] = useState('');

  const formRef = useRef<HTMLFormElement>(null);
  const uploadAbortRef = useRef<AbortController | null>(null);

  // Prefill from the price calculator (client-side navigation keeps the session).
  useEffect(() => {
    const session = getQuoteSession();
    if (session.entries.length === 0) {
      return undefined;
    }
    let cancelled = false;
    void import('../lib/quote/requestPayload').then(({ summarizeQuoteSession }) => {
      if (cancelled) return;
      const summary = summarizeQuoteSession(session);
      setQuantity((current) => current || String(summary.quantity));
      setMaterialPref((current) => current || summary.materialName);
      setExpressDelivery((current) => current || summary.expressSelected);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Warn before leaving while files are being transferred.
  useEffect(() => {
    if (status !== 'uploading') {
      return undefined;
    }
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [status]);

  useEffect(() => () => uploadAbortRef.current?.abort(), []);

  const handleFormStart = () => {
    if (hasTrackedStart) {
      return;
    }
    setHasTrackedStart(true);
    trackEvent('lead_form_started', { form: 'project' });
  };

  const resetForm = () => {
    resetQuoteSession();
    setUploadProgress(null);
    setOfferSendWithoutFiles(false);
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
    setRoleInCompany('');
    setUseCase('');
    setQuantity('');
    setDeadline('');
    setMaterialPref('');
    setBudgetBand('');
    setMessage('');
  };

  const sendRequest = async (form: HTMLFormElement, skipFiles: boolean) => {
    const files = getQuoteSession().entries.map((entry) => entry.file);
    const formData = new FormData(form);
    appendAttributionToFormData(formData);
    const attributionFields = getAttributionFields();

    let outcome: UploadOutcome | null = null;
    let uploadStatus: UploadStatusField = 'none';

    if (files.length > 0 && !skipFiles) {
      setStatus('uploading');
      setUploadProgress({ uploadedBytes: 0, totalBytes: files.reduce((sum, file) => sum + file.size, 0) });
      trackEvent('file_upload_started', { form: 'project', file_count: files.length });
      const controller = new AbortController();
      uploadAbortRef.current = controller;
      try {
        const { uploadProjectFiles } = await import('../lib/upload/uploadClient');
        outcome = await uploadProjectFiles(files, setUploadProgress, controller.signal);
        uploadStatus = outcome.failedFileNames.length > 0 ? 'partial' : 'complete';
        trackEvent('file_upload_completed', {
          form: 'project',
          file_count: outcome.files.length,
          failed_count: outcome.failedFileNames.length,
        });
      } catch (error) {
        const reason =
          error instanceof Error && 'reason' in error && typeof error.reason === 'string' ? error.reason : 'network';
        const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
        trackEvent('file_upload_failed', { form: 'project', reason });
        void reportLeadError({
          form_name: 'project-request',
          source_path: '/projekt-starten/',
          error_message: `Datei-Upload fehlgeschlagen: ${message}`,
          lead_email: email || undefined,
          form_data: { file_count: files.length, reason },
        });
        setStatus('error');
        setOfferSendWithoutFiles(true);
        setSubmitError(
          `Die Dateien konnten nicht übertragen werden (${message}). Ihre Angaben sind nicht verloren: ` +
            'Sie können es erneut versuchen oder die Anfrage ohne Dateien senden – wir melden uns dann und ' +
            'Sie können die Dateien per E-Mail nachreichen.',
        );
        return;
      } finally {
        uploadAbortRef.current = null;
      }
    } else if (files.length > 0) {
      uploadStatus = 'skipped_after_error';
    }

    setStatus('submitting');
    // Re-read the session: analyses may have finished while files were uploading.
    const { summarizeQuoteSession } = await import('../lib/quote/requestPayload');
    const summary = summarizeQuoteSession(getQuoteSession());
    const fileLines =
      outcome?.files.map((file) => `${file.name} (${formatMegabytes(file.size)}): ${file.url}`) ?? [];
    if (outcome && outcome.failedFileNames.length > 0) {
      fileLines.push(`Nicht übertragen: ${outcome.failedFileNames.join(', ')}`);
    }
    if (uploadStatus === 'skipped_after_error') {
      fileLines.push(`Upload fehlgeschlagen, Dateien werden nachgereicht: ${files.map((file) => file.name).join(', ')}`);
    }

    const hasFiles = summary.hasFiles;
    formData.set('uploaded_files', fileLines.join('\n'));
    formData.set('upload_status', uploadStatus);
    formData.set('model_summary', summary.modelSummary);
    formData.set('price_range', hasFiles ? summary.priceRange : '');
    formData.set('calc_material', hasFiles ? summary.materialName : '');
    formData.set('calc_infill', hasFiles ? summary.infillLabel : '');
    formData.set('calc_lead_time', hasFiles ? summary.leadTimeLabel : '');
    formData.set('calc_quantity', hasFiles ? String(summary.quantity) : '');
    formData.set('estimated_price', summary.hasPriceRange ? 'richtpreis_spanne' : 'individuelles_angebot');

    const body = new URLSearchParams();
    formData.forEach((value, key) => {
      if (typeof value === 'string') {
        body.append(key, value);
      }
    });

    try {
      const response = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });

      if (!response.ok) {
        throw new Error('Übermittlung fehlgeschlagen');
      }

      trackEvent('lead_form_submitted', {
        form: 'project',
        use_case: useCase || 'nicht_angegeben',
        landing_page: attributionFields.landing_page || 'unknown',
        utm_source: attributionFields.utm_source || 'direct',
        file_count: outcome?.files.length ?? 0,
        has_price_range: summary.hasPriceRange,
      });

      void triggerLeadFollowup({
        form_name: 'project-request',
        name,
        email,
        phone,
        company,
        role_in_company: roleInCompany,
        use_case: useCase || 'nicht_angegeben',
        quantity,
        deadline,
        material_pref: materialPref,
        budget_band: budgetBand,
        message,
        source_path: '/projekt-starten/',
        file_names: files.map((file) => file.name),
        file_links: (outcome?.files ?? []).map((file) => {
          const url = new URL(file.url);
          return { name: file.name, size: file.size, path: `${url.pathname}${url.search}` };
        }),
        price_range: hasFiles ? summary.priceRange : '',
        model_summary: summary.modelSummary,
        ...attributionFields,
      });

      form.reset();
      resetForm();
      setStatus('idle');
      navigate('/danke-projekt/', { replace: true });
    } catch (error) {
      const submitFailureReason = error instanceof Error ? error.message : 'Unbekannter Fehler';
      trackEvent('lead_form_error', {
        form: 'project',
      });
      void reportLeadError({
        form_name: 'project-request',
        source_path: '/projekt-starten/',
        error_message: submitFailureReason,
        lead_email: email || undefined,
        form_data: {
          use_case: useCase || 'nicht_angegeben',
          role_in_company: roleInCompany || null,
          quantity,
          deadline,
          material_pref: materialPref,
          budget_band: budgetBand,
          file_count: files.length,
          upload_status: uploadStatus,
        },
      });
      setStatus('error');
      setSubmitError(
        'Die Anfrage konnte nicht gesendet werden. Bitte versuchen Sie es erneut oder kontaktieren Sie uns direkt.',
      );
      console.error(error);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleFormStart();
    setSubmitError('');
    setOfferSendWithoutFiles(false);

    if (isLikelyApplicationLead([roleInCompany, useCase, company, message, name])) {
      trackEvent('lead_form_filtered', {
        form: 'project',
        reason: 'application_keywords',
      });
      setStatus('error');
      setSubmitError(
        'Dieses Formular ist für Projektanfragen gedacht. Bewerbungen oder Jobanfragen können wir hier nicht bearbeiten.',
      );
      return;
    }

    if (getQuoteSession().entries.some((entry) => entry.status === 'queued' || entry.status === 'analyzing')) {
      trackEvent('lead_form_submit_during_analysis', { form: 'project' });
    }

    await sendRequest(event.currentTarget, false);
  };

  const sendWithoutFiles = () => {
    const form = formRef.current;
    if (!form || !form.reportValidity()) {
      return;
    }
    setSubmitError('');
    setOfferSendWithoutFiles(false);
    void sendRequest(form, true);
  };

  const isBusy = status === 'uploading' || status === 'submitting';
  const uploadPercent =
    uploadProgress && uploadProgress.totalBytes > 0
      ? Math.round((uploadProgress.uploadedBytes / uploadProgress.totalBytes) * 100)
      : 0;

  const phoneHref = `tel:${CONTACT.phone.replace(/[^\d+]/g, '')}`;
  const projectStartHighlights = [
    'Technische Prüfung statt Sofortpreis ohne Kontext',
    'Rückmeldung in der Regel innerhalb von 24 Stunden (werktags)',
    '3D-Vorschau und Richtpreis-Spanne direkt nach dem Hochladen',
  ];

  return (
    <div className="py-16 animate-fade-in">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h1 className="font-display text-4xl font-bold text-gray-900 mb-4">Projekt starten</h1>
          <p className="text-xl text-gray-700">
            Datei hochladen, Anforderungen hinterlegen und ein belastbares Angebot erhalten
          </p>
          <p className="mt-3 text-sm text-gray-600 max-w-3xl mx-auto">
            Für die Anfrage reichen Kontaktdaten, Unternehmen, Rolle und eine kurze Beschreibung.
            Technische Details können Sie optional ergänzen, um ein präziseres Angebot zu erhalten.
          </p>
          <p className="mt-3 text-sm text-amber-900 max-w-3xl mx-auto rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            Dieses Formular ist ausschließlich für Kunden- und Projektanfragen gedacht.
            Bewerbungen oder Jobanfragen können hier nicht bearbeitet werden.
          </p>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3 text-left">
            {projectStartHighlights.map((item) => (
              <div
                key={item}
                className="glass-lite rounded-lg px-4 py-3 text-sm font-medium text-gray-700"
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        <GlassSurface variant="card" density="light" className="p-4 md:p-8">
          <form
            ref={formRef}
            name="project-request"
            method="POST"
            data-netlify="true"
            data-netlify-honeypot="bot-field"
            onSubmit={handleSubmit}
            className="space-y-8"
          >
            <input type="hidden" name="form-name" value="project-request" />
            <input type="hidden" name="estimated_price" value="individuelles_angebot" />
            <input type="hidden" name="source_path" value="/projekt-starten/" />
            {/* Filled on submit; declared here so Netlify registers the fields. */}
            <input type="hidden" name="uploaded_files" value="" />
            <input type="hidden" name="upload_status" value="none" />
            <input type="hidden" name="model_summary" value="" />
            <input type="hidden" name="price_range" value="" />
            <input type="hidden" name="calc_material" value="" />
            <input type="hidden" name="calc_infill" value="" />
            <input type="hidden" name="calc_lead_time" value="" />
            <input type="hidden" name="calc_quantity" value="" />
            <p className="hidden">
              <label>
                Nicht ausfüllen: <input name="bot-field" />
              </label>
            </p>

            {status === 'error' && (
              <div className="bg-red-50 border border-red-200 p-4 rounded-xl" role="alert">
                <p className="text-red-700 flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
                  <span>{submitError}</span>
                </p>
                {offerSendWithoutFiles && (
                  <div className="mt-3 flex flex-col sm:flex-row gap-2">
                    <button
                      type="submit"
                      className="bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-800"
                    >
                      Upload erneut versuchen
                    </button>
                    <button
                      type="button"
                      onClick={sendWithoutFiles}
                      className="border border-primary-700 text-primary-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-50"
                    >
                      Anfrage ohne Dateien senden
                    </button>
                  </div>
                )}
              </div>
            )}

            <div>
              <QuoteWorkbench stepLabel="Schritt 1 von 4 (optional)" onInteract={handleFormStart} />
              {quoteSession.entries.length === 0 && (
                <p className="mt-3 text-sm text-gray-600 text-center">
                  <Calculator className="inline h-4 w-4 mr-1 text-primary-700" aria-hidden="true" />
                  Nach dem Hochladen sehen Sie Ihr Modell in 3D und eine unverbindliche Richtpreis-Spanne. Für die
                  Erstprüfung reichen meist 1–2 repräsentative Dateien.
                </p>
              )}
            </div>

            <div className="bg-white p-6 md:p-7 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-primary-700 font-semibold mb-2">
                Schritt 2 von 4
              </p>
              <h2 className="font-display text-lg font-semibold text-gray-900 mb-4">
                Projektanforderungen (optional)
              </h2>
              <p className="text-xs text-gray-500 mb-4">
                Diese Angaben verbessern die Angebotsgüte, sind aber für den Erstkontakt nicht
                zwingend erforderlich.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="use_case" className="block text-sm font-medium text-gray-700 mb-2">
                    Anwendungsfall (optional)
                  </label>
                  <select
                    id="use_case"
                    name="use_case"
                    value={useCase}
                    onFocus={handleFormStart}
                    onChange={(e) => setUseCase(e.target.value)}
                    className={fieldClassName}
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
                    Stückzahl (optional)
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    Geplante Menge pro Abruf oder Auftrag.
                  </p>
                  <input
                    type="number"
                    id="quantity"
                    name="quantity"
                    min="1"
                    value={quantity}
                    onFocus={handleFormStart}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="z. B. 20"
                    className={fieldClassName}
                  />
                </div>
                <div>
                  <label htmlFor="deadline" className="block text-sm font-medium text-gray-700 mb-2">
                    Gewünschter Termin (optional)
                  </label>
                  <input
                    type="date"
                    id="deadline"
                    name="deadline"
                    value={deadline}
                    onFocus={handleFormStart}
                    onChange={(e) => setDeadline(e.target.value)}
                    className={fieldClassName}
                  />
                </div>
                <div>
                  <label
                    htmlFor="material_pref"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Material / Anforderung (optional)
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    Nennen Sie Materialwunsch und Einsatzbedingungen (z. B. Temperatur, UV, Last).
                  </p>
                  <input
                    type="text"
                    id="material_pref"
                    name="material_pref"
                    value={materialPref}
                    onFocus={handleFormStart}
                    onChange={(e) => setMaterialPref(e.target.value)}
                    placeholder="z. B. PETG, UV-beständig"
                    className={fieldClassName}
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
                    className={fieldClassName}
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
                    className={fieldClassName}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white p-6 md:p-7 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-primary-700 font-semibold mb-2">
                  Schritt 3 von 4
                </p>
              <h2 className="font-display text-lg font-semibold text-gray-900 mb-4">
                Zusatzleistungen
              </h2>
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
                      className="w-24 border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-primary-600 focus:border-primary-600"
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

              <div className="bg-white p-6 md:p-7 rounded-xl border border-gray-200 shadow-sm">
              <h2 className="font-display text-lg font-semibold text-gray-900 mb-4">
                Nachbearbeitung
              </h2>
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

            <div className="bg-primary-50 p-6 rounded-xl border border-primary-100">
              <h2 className="font-display text-lg font-semibold text-gray-900 mb-2">
                Projektbewertung
              </h2>
              <p className="text-gray-700">
                Nach Eingang Ihrer Daten erhalten Sie innerhalb von 24 Stunden eine technische
                Rückmeldung und ein individuelles Angebot.
              </p>
            </div>

            <div className="bg-white p-6 md:p-7 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-primary-700 font-semibold mb-2">
                Schritt 4 von 4
              </p>
              <h2 className="font-display text-lg font-semibold text-gray-900 mb-4">
                Kontaktdaten
              </h2>
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
                    className={fieldClassName}
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
                    className={fieldClassName}
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
                    className={fieldClassName}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="company">
                    Unternehmen *
                  </label>
                  <p className="text-xs text-gray-500 mb-1">
                    Bitte Firma, Werk oder Standort angeben.
                  </p>
                  <input
                    type="text"
                    id="company"
                    name="company"
                    required
                    value={company}
                    onFocus={handleFormStart}
                    onChange={(e) => setCompany(e.target.value)}
                    className={fieldClassName}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="role_in_company">
                    Rolle im Unternehmen *
                  </label>
                  <select
                    id="role_in_company"
                    name="role_in_company"
                    required
                    value={roleInCompany}
                    onFocus={handleFormStart}
                    onChange={(e) => setRoleInCompany(e.target.value)}
                    className={fieldClassName}
                  >
                    <option value="">Bitte auswählen</option>
                    <option value="instandhaltung">Instandhaltung</option>
                    <option value="konstruktion_entwicklung">Konstruktion / Entwicklung</option>
                    <option value="produktion_fertigung">Produktion / Fertigung</option>
                    <option value="einkauf_beschaffung">Einkauf / Beschaffung</option>
                    <option value="qualitaet">Qualität</option>
                    <option value="geschaeftsfuehrung">Geschäftsführung / Leitung</option>
                    <option value="sonstiges_geschaeftlich">Sonstiges (geschäftlich)</option>
                  </select>
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="message">
                  Kurzbeschreibung Ihres Projekts *
                </label>
                <p className="text-xs text-gray-500 mb-1">
                  Bitte kurz Einsatzfall oder Ziel beschreiben, damit wir passend rückmelden können.
                </p>
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={4}
                  value={message}
                  onFocus={handleFormStart}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="z. B. Ersatzteil für Förderanlage, temperaturbelastet, Stückzahl zunächst 10"
                  className={fieldClassName}
                />
              </div>
              <div className="mt-4 bg-gray-50 p-4 rounded-lg">
                <div className="flex items-start space-x-3 mb-4">
                  <input
                    type="checkbox"
                    id="business_intent"
                    name="business_intent"
                    required
                    className="h-4 w-4 text-primary-600 focus:ring-primary-600 border-gray-300 rounded mt-1"
                  />
                  <label htmlFor="business_intent" className="text-sm text-gray-600">
                    Ich sende eine geschäftliche Projektanfrage (keine Bewerbung). *
                  </label>
                </div>
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    id="privacy_consent"
                    name="privacy_consent"
                    required
                    className="h-4 w-4 text-primary-600 focus:ring-primary-600 border-gray-300 rounded mt-1"
                  />
                  <label htmlFor="privacy_consent" className="text-sm text-gray-600">
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
            </div>

            <div className="text-center rounded-xl border border-primary-100 bg-primary-50/50 p-5">
              <button
                type="submit"
                disabled={isBusy}
                className="bg-primary-700 text-white px-6 sm:px-8 py-4 rounded-lg text-base sm:text-lg font-semibold hover:bg-primary-800 disabled:opacity-70 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center gap-2 w-full sm:w-auto text-center sm:whitespace-nowrap"
              >
                <Send className="h-5 w-5" />
                <span>
                  {status === 'uploading'
                    ? `Dateien werden übertragen … ${uploadPercent} %`
                    : status === 'submitting'
                      ? 'Wird gesendet...'
                      : 'Projektanfrage senden'}
                </span>
              </button>
              {status === 'uploading' && uploadProgress && (
                <div className="mx-auto mt-4 max-w-md text-left" aria-live="polite">
                  <div
                    className="h-2 w-full overflow-hidden rounded-full bg-primary-100"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={uploadPercent}
                    aria-label="Fortschritt Datei-Upload"
                  >
                    <div className="h-full bg-primary-600 transition-all" style={{ width: `${uploadPercent}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-gray-600">
                    {formatMegabytes(uploadProgress.uploadedBytes)} von {formatMegabytes(uploadProgress.totalBytes)}{' '}
                    übertragen – bitte die Seite nicht schließen.
                  </p>
                </div>
              )}
              {quoteSession.entries.length > 0 && status !== 'uploading' && (
                <p className="text-xs text-gray-500 mt-3">
                  Mit dem Absenden werden {quoteSession.entries.length} Datei
                  {quoteSession.entries.length === 1 ? '' : 'en'} verschlüsselt übertragen und in der EU gespeichert.
                </p>
              )}
              <p className="text-sm text-gray-600 mt-3">
                Sie erhalten in der Regel innerhalb von 24 Stunden eine Rückmeldung.
              </p>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm">
                <a href={phoneHref} className="inline-flex items-center gap-2 text-gray-700 hover:text-primary-700">
                  <PhoneIcon className="h-4 w-4" />
                  {CONTACT.phone}
                </a>
                <a
                  href={`mailto:${CONTACT.email}`}
                  className="inline-flex items-center gap-2 text-gray-700 hover:text-primary-700"
                >
                  <MailIcon className="h-4 w-4" />
                  {CONTACT.email}
                </a>
                <Link to="/kontakt/" className="text-primary-700 hover:text-primary-800 underline">
                  Zum Schnellkontakt
                </Link>
              </div>
            </div>
          </form>
        </GlassSurface>
      </div>
    </div>
  );
};

export default ProjectStart;
