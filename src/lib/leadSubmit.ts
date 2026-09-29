import { trackEvent } from './tracking';

export type LeadFormName = 'project-request' | 'contact-request';

/** Relative retrieval path (/datei-abruf/?...) of an uploaded file. */
export interface LeadFileLink {
  name: string;
  size: number;
  path: string;
}

export const LEAD_ENDPOINT = '/api/lead';

export class LeadSubmitError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'LeadSubmitError';
  }
}

/**
 * Sends a lead form to POST /api/lead. The server stores the submission
 * (durable record) before it sends the sales notification and the customer
 * confirmation; a resolved promise therefore means the lead is saved.
 * Rejects with LeadSubmitError otherwise.
 */
export async function submitLead(
  formName: LeadFormName,
  formData: FormData,
  fileLinks: readonly LeadFileLink[] = [],
): Promise<{ id: string | null; notified: boolean }> {
  const fields: Record<string, string> = {};
  formData.forEach((value, key) => {
    if (typeof value === 'string') {
      fields[key] = value;
    }
  });
  fields['form-name'] = formName;

  let response: Response;
  try {
    response = await fetch(LEAD_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ ...fields, file_links: fileLinks }),
      credentials: 'same-origin',
    });
  } catch {
    throw new LeadSubmitError('Netzwerkfehler bei der Übermittlung', 0);
  }

  let body: { ok?: boolean; id?: string; notified?: boolean; error?: string } = {};
  try {
    body = (await response.json()) as typeof body;
  } catch {
    // Non-JSON answer (e.g. an HTML error page): handled as failure below.
  }
  if (!response.ok || body.ok !== true) {
    throw new LeadSubmitError(body.error ?? `Übermittlung fehlgeschlagen (HTTP ${response.status})`, response.status);
  }
  if (body.notified === false) {
    // Stored, but the notification mail failed; the server logged it.
    trackEvent('lead_notification_failed', { form: formName });
  }
  return { id: typeof body.id === 'string' ? body.id : null, notified: body.notified !== false };
}
