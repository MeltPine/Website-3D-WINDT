const STORAGE_KEY = '3dw_attribution_v1';

export const ATTRIBUTION_FIELD_NAMES = [
  'landing_page',
  'initial_referrer',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'gclid',
  'gbraid',
  'wbraid',
] as const;

export type AttributionFieldName = (typeof ATTRIBUTION_FIELD_NAMES)[number];
export type AttributionFields = Record<AttributionFieldName, string>;

const campaignFieldNames = ATTRIBUTION_FIELD_NAMES.filter(
  (fieldName) => fieldName !== 'landing_page' && fieldName !== 'initial_referrer',
);

function emptyAttribution(): AttributionFields {
  return ATTRIBUTION_FIELD_NAMES.reduce((fields, fieldName) => {
    fields[fieldName] = '';
    return fields;
  }, {} as AttributionFields);
}

function readStoredAttribution(): AttributionFields {
  if (typeof window === 'undefined') {
    return emptyAttribution();
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    if (!rawValue) {
      return emptyAttribution();
    }

    const parsed = JSON.parse(rawValue) as Partial<Record<AttributionFieldName, unknown>>;
    const fields = emptyAttribution();
    ATTRIBUTION_FIELD_NAMES.forEach((fieldName) => {
      const value = parsed[fieldName];
      fields[fieldName] = typeof value === 'string' ? value : '';
    });
    return fields;
  } catch {
    return emptyAttribution();
  }
}

function writeStoredAttribution(fields: AttributionFields): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fields));
  } catch {
    // Attribution is useful for lead quality, but must never block the funnel.
  }
}

function getExternalReferrer(): string {
  if (typeof document === 'undefined' || typeof window === 'undefined' || !document.referrer) {
    return '';
  }

  try {
    const referrer = new URL(document.referrer);
    if (referrer.hostname === window.location.hostname) {
      return '';
    }
    return referrer.toString();
  } catch {
    return '';
  }
}

export function captureAttribution(): void {
  if (typeof window === 'undefined') {
    return;
  }

  const fields = readStoredAttribution();
  const currentUrl = new URL(window.location.href);

  if (!fields.landing_page) {
    fields.landing_page = `${currentUrl.pathname}${currentUrl.search}`;
  }

  if (!fields.initial_referrer) {
    fields.initial_referrer = getExternalReferrer();
  }

  campaignFieldNames.forEach((fieldName) => {
    const value = currentUrl.searchParams.get(fieldName);
    if (value) {
      fields[fieldName] = value.trim();
    }
  });

  writeStoredAttribution(fields);
}

export function getAttributionFields(): AttributionFields {
  if (typeof window === 'undefined') {
    return emptyAttribution();
  }

  captureAttribution();
  return readStoredAttribution();
}

export function appendAttributionToFormData(formData: FormData): void {
  const fields = getAttributionFields();
  ATTRIBUTION_FIELD_NAMES.forEach((fieldName) => {
    const value = fields[fieldName];
    if (value) {
      formData.set(fieldName, value);
    }
  });
}
