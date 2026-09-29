import type { PaymentLinkFailure } from './paymentLink.mjs';

export function linkFailureMessage(reason: PaymentLinkFailure): string {
  switch (reason) {
    case 'expired':
      return 'Dieser Zahlungslink ist abgelaufen. Bitte fordern Sie bei uns einen neuen Link an.';
    case 'bad_signature':
    case 'malformed':
      return 'Dieser Zahlungslink ist ungültig. Bitte verwenden Sie den vollständigen Link aus unserer E-Mail.';
  }
}
