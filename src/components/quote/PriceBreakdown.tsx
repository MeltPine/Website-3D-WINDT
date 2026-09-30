import { breakdownDisplayLines, formatCents } from '../../lib/quote/breakdownDisplay';
import type { ProjectBreakdown } from '../../lib/quote/pricing';
import { PRICING_CONFIG } from '../../lib/quote/pricingConfig';
import { formatEur } from '../../lib/quote/summary';

/*
 * "Rechenweg": stacked bar (one hue, steps in lightness) plus a mono table.
 * All amounts come from breakdownProject(); the lines add up to the point
 * estimate. Negative lines (discount) are listed but not drawn in the bar.
 */

const BAR_SHADES = ['var(--accent)', 'color-mix(in srgb, var(--accent) 70%, var(--surface-0))', 'color-mix(in srgb, var(--accent) 45%, var(--surface-0))', 'color-mix(in srgb, var(--accent) 25%, var(--surface-0))', 'color-mix(in srgb, var(--text-muted) 35%, var(--surface-0))'];

interface PriceBreakdownProps {
  breakdown: ProjectBreakdown;
  /** Compact: bar + lines without the explanation block (summary sidebar). */
  compact?: boolean;
}

const PriceBreakdown = ({ breakdown, compact = false }: PriceBreakdownProps) => {
  const lines = breakdownDisplayLines(breakdown, PRICING_CONFIG);
  const positive = lines.filter((line) => line.amountCents > 0);
  const barTotal = positive.reduce((sum, line) => sum + line.amountCents, 0);
  const minimum = lines.find((line) => line.key === 'minimumOrder');
  return (
    <div className="space-y-2">
      <div className="flex h-2.5 w-full overflow-hidden rounded-sm border border-line" aria-hidden="true">
        {positive.map((line, index) => (
          <div
            key={line.key}
            style={{
              width: `${(line.amountCents / barTotal) * 100}%`,
              background: line.key === 'minimumOrder' ? 'repeating-linear-gradient(45deg, var(--text-muted) 0 2px, transparent 2px 5px)' : BAR_SHADES[index % BAR_SHADES.length],
            }}
          />
        ))}
      </div>
      <table className="w-full text-sm">
        <caption className="sr-only">Aufschlüsselung des Richtpreises</caption>
        <tbody>
          {lines.map((line) => (
            <tr key={line.key} className="border-b border-line align-top last:border-b-0">
              <th scope="row" className="py-1.5 pr-2 text-left font-normal text-ink">
                {line.label}
                {!compact && <span className="block text-xs text-ink-muted">{line.detail}</span>}
              </th>
              <td className="num whitespace-nowrap py-1.5 text-right text-ink">{formatCents(line.amountCents, line.key === 'minimumOrder')}</td>
            </tr>
          ))}
          <tr className="border-t border-line-strong">
            <th scope="row" className="py-1.5 text-left font-medium text-ink">
              Punktwert
            </th>
            <td className="num whitespace-nowrap py-1.5 text-right font-medium text-ink">{formatCents(breakdown.totalCents)}</td>
          </tr>
        </tbody>
      </table>
      {!compact && (
        <>
          <p className="text-xs text-ink-muted">
            Spanne {formatEur(breakdown.estimate.lowEur)} – {formatEur(breakdown.estimate.highEur)}: Punktwert ×{' '}
            {String(PRICING_CONFIG.range.lowFactor).replace('.', ',')} … ×{String(PRICING_CONFIG.range.highFactor).replace('.', ',')}, auf{' '}
            {PRICING_CONFIG.range.roundingStepEur} € gerundet, nie unter dem Mindestauftrag.
          </p>
          {minimum && (
            <p className="text-xs text-ink-soft">
              Hier greift der Mindestauftrag von {formatCents(PRICING_CONFIG.minimumOrderEur * 100)}: {formatCents(minimum.amountCents)} des
              Punktwerts sind Auffüllbetrag, nicht Teilepreis.
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default PriceBreakdown;
