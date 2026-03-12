function cleanString(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toSafeEntries(formData) {
  if (!formData || typeof formData !== 'object' || Array.isArray(formData)) {
    return [];
  }

  return Object.entries(formData)
    .filter(([, value]) => value !== undefined)
    .slice(0, 30)
    .map(([key, value]) => {
      const safeKey = escapeHtml(String(key));
      const safeValue =
        value === null ? 'null' : escapeHtml(typeof value === 'string' ? value : String(value));
      return `<li>${safeKey}: ${safeValue}</li>`;
    });
}

async function sendResendEmail(apiKey, payload) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const responseBody = await response.text();
    throw new Error(`Resend API Fehler (${response.status}): ${responseBody}`);
  }
}

exports.handler = async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Methode nicht erlaubt.' }),
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (error) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Ungültiges JSON.' }),
    };
  }

  const formName = cleanString(payload.form_name);
  const sourcePath = cleanString(payload.source_path) || 'unbekannt';
  const errorMessage = cleanString(payload.error_message) || 'unbekannter Fehler';
  const occurredAt = cleanString(payload.occurred_at) || new Date().toISOString();
  const pageUrl = cleanString(payload.page_url) || 'unbekannt';
  const userAgent = cleanString(payload.user_agent) || 'unbekannt';
  const leadEmail = cleanString(payload.lead_email).toLowerCase();
  const formEntries = toSafeEntries(payload.form_data);

  const resendApiKey = process.env.RESEND_API_KEY;
  const alertFrom =
    process.env.LEAD_ALERT_FROM ||
    process.env.LEAD_REPLY_FROM ||
    '3D-WINDT <noreply@3d-windt.de>';
  const alertTo = process.env.LEAD_SALES_EMAIL || 'support@3d-windt.de';

  if (!resendApiKey) {
    console.warn('RESEND_API_KEY fehlt. Lead-Alert wurde nicht versendet.', {
      formName,
      sourcePath,
      occurredAt,
    });
    return {
      statusCode: 202,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queued: false, reason: 'missing_resend_api_key' }),
    };
  }

  const formLabel = formName === 'project-request' ? 'Projektformular' : 'Kontaktformular';

  const html = `
    <p><strong>Lead-Funnel Alert:</strong> Formularübermittlung fehlgeschlagen</p>
    <ul>
      <li>Formular: ${escapeHtml(formLabel)}</li>
      <li>Route: ${escapeHtml(sourcePath)}</li>
      <li>Zeitpunkt: ${escapeHtml(occurredAt)}</li>
      <li>Lead-E-Mail: ${escapeHtml(leadEmail || 'nicht angegeben')}</li>
      <li>Seiten-URL: ${escapeHtml(pageUrl)}</li>
      <li>User-Agent: ${escapeHtml(userAgent)}</li>
      <li>Fehler: ${escapeHtml(errorMessage)}</li>
    </ul>
    ${
      formEntries.length > 0
        ? `<p><strong>Formulardaten (Ausschnitt)</strong></p><ul>${formEntries.join('')}</ul>`
        : '<p>Keine zusätzlichen Felder übermittelt.</p>'
    }
    <p>Bitte Funnel prüfen (Netlify Forms, Function-Logs, Browser-Konsole).</p>
  `;

  try {
    await sendResendEmail(resendApiKey, {
      from: alertFrom,
      to: alertTo,
      subject: `[ALERT] Formularfehler (${formLabel})`,
      html,
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queued: true }),
    };
  } catch (error) {
    console.error('Lead-Alert fehlgeschlagen', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Lead-Alert konnte nicht versendet werden.' }),
    };
  }
};
