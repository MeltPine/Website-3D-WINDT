import { trackEvent } from './tracking';

type LeadAlertPayload = {
  form_name: 'project-request' | 'contact-request';
  source_path: string;
  error_message: string;
  lead_email?: string;
  form_data?: Record<string, string | number | boolean | null | undefined>;
};

function cleanFormData(
  formData: Record<string, string | number | boolean | null | undefined> | undefined,
) {
  if (!formData) {
    return {};
  }

  const cleaned: Record<string, string | number | boolean | null> = {};
  Object.entries(formData).forEach(([key, value]) => {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  });

  return cleaned;
}

export async function reportLeadError(payload: LeadAlertPayload): Promise<void> {
  try {
    const response = await fetch('/.netlify/functions/lead-alert', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...payload,
        form_data: cleanFormData(payload.form_data),
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        page_url: typeof window !== 'undefined' ? window.location.href : '',
        occurred_at: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Lead-Alert fehlgeschlagen (${response.status})`);
    }

    trackEvent('lead_alert_queued', {
      form: payload.form_name,
    });
  } catch (error) {
    trackEvent('lead_alert_error', {
      form: payload.form_name,
    });
    console.warn('Lead-Error-Alert konnte nicht versendet werden.', error);
  }
}
