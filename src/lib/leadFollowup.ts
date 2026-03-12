import { trackEvent } from './tracking';

type LeadFollowupPayload = {
  form_name: 'project-request' | 'contact-request';
  name: string;
  email: string;
  phone?: string;
  company?: string;
  use_case?: string;
  quantity?: string;
  deadline?: string;
  material_pref?: string;
  budget_band?: string;
  message?: string;
  source_path: string;
  file_names?: string[];
};

export async function triggerLeadFollowup(payload: LeadFollowupPayload): Promise<void> {
  try {
    const response = await fetch('/.netlify/functions/lead-followup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Follow-up fehlgeschlagen (${response.status})`);
    }

    trackEvent('lead_followup_triggered', {
      form: payload.form_name,
    });
  } catch (error) {
    trackEvent('lead_followup_error', {
      form: payload.form_name,
    });
    console.warn('Lead-Follow-up konnte nicht ausgelöst werden.', error);
  }
}
