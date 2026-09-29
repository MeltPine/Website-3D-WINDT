import { useId, useState } from 'react';
import { AlertCircle, ArrowRight, Lock } from 'lucide-react';
import { startCheckout, type CheckoutSelection } from '../lib/payment/checkoutClient';

interface B2BCheckoutButtonProps {
  selection: CheckoutSelection;
  label: string;
}

/**
 * B2B declaration + redirect to Stripe's hosted checkout. Card data is only
 * ever entered on checkout.stripe.com; this page never loads Stripe.js.
 */
const B2BCheckoutButton = ({ selection, label }: B2BCheckoutButtonProps) => {
  const checkboxId = useId();
  const [isBusiness, setIsBusiness] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const handleClick = async () => {
    if (!isBusiness || pending) {
      return;
    }
    setPending(true);
    setError('');
    const message = await startCheckout(selection);
    if (message) {
      setError(message);
      setPending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <input
          id={checkboxId}
          type="checkbox"
          checked={isBusiness}
          onChange={(event) => setIsBusiness(event.target.checked)}
          className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-700 focus:ring-primary-600"
        />
        <label htmlFor={checkboxId} className="text-sm text-gray-800">
          Ich bestelle als Unternehmer (§ 14 BGB). Das Angebot richtet sich ausschließlich an
          Unternehmen, nicht an Verbraucher.
        </label>
      </div>
      <button
        type="button"
        onClick={handleClick}
        disabled={!isBusiness || pending}
        className="bg-primary-700 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-800 transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pending ? 'Zahlungsseite wird geöffnet …' : label}
        <ArrowRight className="h-5 w-5" />
      </button>
      <p className="text-xs text-gray-600 flex items-start gap-2">
        <Lock className="h-4 w-4 flex-shrink-0 mt-0.5" />
        Sie werden zu unserem Zahlungsdienstleister Stripe weitergeleitet. Zahlungsdaten werden
        ausschließlich dort eingegeben; Rechnung und Zahlungsbeleg erhalten Sie per E-Mail.
      </p>
      {error && (
        <p role="alert" className="text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          {error}
        </p>
      )}
    </div>
  );
};

export default B2BCheckoutButton;
