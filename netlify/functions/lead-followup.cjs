const SALES_STEPS = [
  'Eingangsbestätigung',
  'Technische Machbarkeitsprüfung',
  'Rückfragen zu Material, Stückzahl und Termin',
  'Angebot mit Lieferfenster',
];

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
  const name = cleanString(payload.name);
  const email = cleanString(payload.email).toLowerCase();
  const phone = cleanString(payload.phone);
  const company = cleanString(payload.company);
  const roleInCompany = cleanString(payload.role_in_company);
  const useCase = cleanString(payload.use_case);
  const quantity = cleanString(payload.quantity);
  const deadline = cleanString(payload.deadline);
  const materialPref = cleanString(payload.material_pref);
  const budgetBand = cleanString(payload.budget_band);
  const message = cleanString(payload.message);
  const sourcePath = cleanString(payload.source_path);
  const fileNames = Array.isArray(payload.file_names)
    ? payload.file_names.filter((item) => typeof item === 'string').map((item) => item.trim())
    : [];

  if (!email) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'E-Mail ist erforderlich.' }),
    };
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.LEAD_REPLY_FROM || '3D-WINDT <noreply@3d-windt.de>';
  const salesEmail = process.env.LEAD_SALES_EMAIL || 'support@3d-windt.de';
  const formLabel = formName === 'project-request' ? 'Projektformular' : 'Kontaktformular';

  if (!resendApiKey) {
    console.warn('RESEND_API_KEY fehlt. Lead-Follow-up wurde nicht per E-Mail versendet.', {
      formName,
      email,
    });
    return {
      statusCode: 202,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queued: false, reason: 'missing_resend_api_key' }),
    };
  }

  const safeName = escapeHtml(name || 'Interessent');
  const safeCompany = escapeHtml(company || 'Keine Angabe');
  const safeUseCase = escapeHtml(useCase || 'Keine Angabe');
  const safeQuantity = escapeHtml(quantity || 'Keine Angabe');
  const safeDeadline = escapeHtml(deadline || 'Keine Angabe');
  const safeMaterial = escapeHtml(materialPref || 'Keine Angabe');
  const safeBudget = escapeHtml(budgetBand || 'Keine Angabe');
  const safePhone = escapeHtml(phone || 'Keine Angabe');
  const safeRoleInCompany = escapeHtml(roleInCompany || 'Keine Angabe');
  const safeMessage = escapeHtml(message || 'Keine Angabe');
  const safeSourcePath = escapeHtml(sourcePath || 'unbekannt');
  const safeFiles = fileNames.length > 0 ? escapeHtml(fileNames.join(', ')) : 'Keine Datei übermittelt';

  const customerHtml = `
    <p>Guten Tag ${safeName},</p>
    <p>vielen Dank für Ihre Anfrage bei <strong>3D-WINDT</strong>. Wir haben Ihre Angaben erhalten und starten jetzt die technische Prüfung.</p>
    <p><strong>Nächste Schritte:</strong></p>
    <ol>
      ${SALES_STEPS.map((step) => `<li>${escapeHtml(step)}</li>`).join('')}
    </ol>
    <p>Bei Rückfragen antworten Sie einfach auf diese E-Mail.</p>
    <p>Freundliche Grüße<br />3D-WINDT</p>
  `;

  const internalHtml = `
    <p><strong>Neuer Lead eingegangen (${escapeHtml(formLabel)})</strong></p>
    <ul>
      <li>Name: ${safeName}</li>
      <li>E-Mail: ${escapeHtml(email)}</li>
      <li>Telefon: ${safePhone}</li>
      <li>Firma: ${safeCompany}</li>
      <li>Rolle im Unternehmen: ${safeRoleInCompany}</li>
      <li>Anwendungsfall: ${safeUseCase}</li>
      <li>Stückzahl: ${safeQuantity}</li>
      <li>Termin: ${safeDeadline}</li>
      <li>Material: ${safeMaterial}</li>
      <li>Projektumfang: ${safeBudget}</li>
      <li>Dateien: ${safeFiles}</li>
      <li>Quelle: ${safeSourcePath}</li>
      <li>Nachricht: ${safeMessage}</li>
    </ul>
    <p><strong>Vertriebsstatus:</strong> Neu eingegangen - Antwortziel innerhalb 24h.</p>
  `;

  try {
    await Promise.all([
      sendResendEmail(resendApiKey, {
        from: fromAddress,
        to: email,
        subject: 'Eingangsbestätigung: Ihre Anfrage bei 3D-WINDT',
        html: customerHtml,
      }),
      sendResendEmail(resendApiKey, {
        from: fromAddress,
        to: salesEmail,
        reply_to: email,
        subject: `Neuer Lead (${formLabel}) - ${name || email}`,
        html: internalHtml,
      }),
    ]);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queued: true }),
    };
  } catch (error) {
    console.error('Lead-Follow-up fehlgeschlagen', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Follow-up konnte nicht versendet werden.' }),
    };
  }
};
