/*
 * Accepted fields of the two lead forms (contact-request, project-request)
 * with their labels for the sales e-mail and a length cap. Anything not listed
 * here is dropped, so the stored record never contains arbitrary client keys.
 * Order = order in the sales e-mail.
 */

export const LEAD_FORMS = ['contact-request', 'project-request'] as const;
export type LeadFormName = (typeof LEAD_FORMS)[number];

export interface LeadFieldSpec {
  name: string;
  label: string;
  maxLength: number;
}

export const LEAD_FIELDS: readonly LeadFieldSpec[] = [
  { name: 'name', label: 'Name', maxLength: 200 },
  { name: 'email', label: 'E-Mail', maxLength: 254 },
  { name: 'phone', label: 'Telefon', maxLength: 60 },
  { name: 'company', label: 'Firma', maxLength: 200 },
  { name: 'role_in_company', label: 'Rolle im Unternehmen', maxLength: 200 },
  { name: 'use_case', label: 'Anwendungsfall', maxLength: 200 },
  { name: 'quantity', label: 'Stückzahl', maxLength: 40 },
  { name: 'deadline', label: 'Termin', maxLength: 40 },
  { name: 'material_pref', label: 'Material', maxLength: 200 },
  { name: 'budget_band', label: 'Projektumfang', maxLength: 100 },
  { name: 'weight', label: 'Gewicht (g)', maxLength: 40 },
  { name: 'needs_cad', label: 'CAD-Unterstützung', maxLength: 20 },
  { name: 'cad_hours', label: 'CAD-Stunden', maxLength: 20 },
  { name: 'needs_scan', label: '3D-Scan', maxLength: 20 },
  { name: 'express_delivery', label: 'Express', maxLength: 20 },
  { name: 'finishing', label: 'Nachbearbeitung', maxLength: 40 },
  { name: 'estimated_price', label: 'Preisangabe', maxLength: 60 },
  { name: 'price_range', label: 'Richtpreis-Spanne (Kunde gesehen)', maxLength: 200 },
  { name: 'calc_material', label: 'Rechner: Material', maxLength: 200 },
  { name: 'calc_infill', label: 'Rechner: Füllgrad', maxLength: 100 },
  { name: 'calc_lead_time', label: 'Rechner: Lieferzeit', maxLength: 100 },
  { name: 'calc_quantity', label: 'Rechner: Stückzahl', maxLength: 40 },
  { name: 'upload_status', label: 'Upload-Status', maxLength: 40 },
  { name: 'uploaded_files', label: 'Dateien', maxLength: 8000 },
  { name: 'model_summary', label: 'Modellanalyse', maxLength: 8000 },
  { name: 'printcheck_request', label: 'Anliegen (Druckbarkeits-Check)', maxLength: 100 },
  { name: 'printcheck_summary', label: 'Druckbarkeits-Check (automatische Vorprüfung)', maxLength: 4000 },
  { name: 'message', label: 'Nachricht', maxLength: 5000 },
  { name: 'business_intent', label: 'Geschäftliche Anfrage bestätigt', maxLength: 20 },
  { name: 'privacy_consent', label: 'Datenschutzhinweise akzeptiert', maxLength: 20 },
  { name: 'source_path', label: 'Quelle', maxLength: 300 },
  { name: 'landing_page', label: 'Landingpage', maxLength: 500 },
  { name: 'initial_referrer', label: 'Referrer', maxLength: 500 },
  { name: 'utm_source', label: 'UTM Source', maxLength: 200 },
  { name: 'utm_medium', label: 'UTM Medium', maxLength: 200 },
  { name: 'utm_campaign', label: 'UTM Campaign', maxLength: 200 },
  { name: 'utm_term', label: 'UTM Term', maxLength: 200 },
  { name: 'utm_content', label: 'UTM Content', maxLength: 200 },
  { name: 'gclid', label: 'Google Click ID', maxLength: 300 },
  { name: 'gbraid', label: 'Google GBRAID', maxLength: 300 },
  { name: 'wbraid', label: 'Google WBRAID', maxLength: 300 },
];

/** Must be present and non-empty in every submission (the UI requires more). */
export const REQUIRED_LEAD_FIELDS = ['name', 'email', 'business_intent', 'privacy_consent'] as const;

export const LEAD_THANK_YOU_PATH: Readonly<Record<LeadFormName, string>> = {
  'contact-request': '/danke-kontakt/',
  'project-request': '/danke-projekt/',
};

export const LEAD_FORM_LABEL: Readonly<Record<LeadFormName, string>> = {
  'contact-request': 'Kontaktformular',
  'project-request': 'Projektformular',
};

export function isLeadFormName(value: unknown): value is LeadFormName {
  return typeof value === 'string' && (LEAD_FORMS as readonly string[]).includes(value);
}
