import type { QuantityPoint } from '../../lib/quote/pricing';
import { formatCents } from '../../lib/quote/breakdownDisplay';

/*
 * Unit price over quantity as a step chart (SVG, no chart library). X is
 * logarithmic, the band is the displayed range per unit, the dot is the
 * selected quantity. Steps are the real discount tiers. The table below is
 * the text equivalent (screen readers, purchasing).
 */

interface QuantityCurveProps {
  points: readonly QuantityPoint[];
  selected: number;
  onSelect: (quantity: number) => void;
  /** Set label ("Stück" or "Satz" for several parts). */
  unitLabel: string;
  /** Up to this quantity the minimum order sets the price (0 = never). */
  minimumLimit: number;
}

const WIDTH = 560;
const HEIGHT = 200;
const PAD = { left: 52, right: 12, top: 12, bottom: 28 };

const QuantityCurve = ({ points, selected, onSelect, unitLabel, minimumLimit }: QuantityCurveProps) => {
  if (points.length === 0) return null;
  const minQ = points[0].quantity;
  const maxQ = points[points.length - 1].quantity;
  const logMin = Math.log10(minQ);
  const logSpan = Math.max(1e-9, Math.log10(maxQ) - logMin);
  const maxY = Math.max(...points.map((point) => point.perUnitHighEur)) * 1.05;
  const x = (q: number) => PAD.left + ((Math.log10(q) - logMin) / logSpan) * (WIDTH - PAD.left - PAD.right);
  const y = (eur: number) => PAD.top + (1 - eur / maxY) * (HEIGHT - PAD.top - PAD.bottom);

  // step path: value holds until the next quantity
  const step = (value: (point: QuantityPoint) => number) =>
    points
      .map((point, index) => {
        const next = points[index + 1];
        const x0 = x(point.quantity);
        const x1 = next ? x(next.quantity) : x0;
        return `${index === 0 ? 'M' : 'L'}${x0.toFixed(1)},${y(value(point)).toFixed(1)} L${x1.toFixed(1)},${y(value(point)).toFixed(1)}`;
      })
      .join(' ');
  const bandTop = step((point) => point.perUnitHighEur);
  // lower edge of the band, walked backwards so the band closes
  const bandBottom = points
    .map((point, index) => ({
      x0: x(point.quantity),
      x1: index < points.length - 1 ? x(points[index + 1].quantity) : x(point.quantity),
      y: y(point.perUnitLowEur),
    }))
    .reverse()
    .map((segment) => `L${segment.x1.toFixed(1)},${segment.y.toFixed(1)} L${segment.x0.toFixed(1)},${segment.y.toFixed(1)}`)
    .join(' ');
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * maxY);

  return (
    <div className="space-y-3">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full" role="img" aria-label={`Preis je ${unitLabel} nach Menge, Tabelle darunter`}>
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y(tick)} y2={y(tick)} stroke="var(--border-soft)" strokeWidth="1" />
            <text x={PAD.left - 6} y={y(tick) + 4} textAnchor="end" className="num" fontSize="11" fill="var(--text-muted)">
              {Math.round(tick)} €
            </text>
          </g>
        ))}
        <path d={`${bandTop} ${bandBottom} Z`} fill="var(--accent-soft)" stroke="none" />
        <path d={step((point) => point.perUnitEur)} fill="none" stroke="var(--accent)" strokeWidth="2" />
        {points.map((point) => {
          const active = point.quantity === selected;
          return (
            <g key={point.quantity}>
              <text x={x(point.quantity)} y={HEIGHT - 8} textAnchor="middle" className="num" fontSize="11" fill="var(--text-muted)">
                {point.quantity}
              </text>
              <circle
                cx={x(point.quantity)}
                cy={y(point.perUnitEur)}
                r={active ? 6 : 4}
                fill={active ? 'var(--accent)' : 'var(--surface-0)'}
                stroke="var(--accent)"
                strokeWidth="2"
                className="cursor-pointer"
                onClick={() => onSelect(point.quantity)}
              >
                <title>
                  {point.quantity} {unitLabel}: {formatCents(Math.round(point.perUnitEur * 100))} je {unitLabel}
                </title>
              </circle>
            </g>
          );
        })}
      </svg>
      <table className="w-full text-sm">
        <caption className="sr-only">Preis nach Menge</caption>
        <thead>
          <tr className="border-b border-line">
            <th scope="col" className="label-caps py-1 text-left">
              Menge
            </th>
            <th scope="col" className="label-caps py-1 text-right">
              je {unitLabel} (Punkt)
            </th>
            <th scope="col" className="label-caps py-1 text-right">
              Summe netto
            </th>
            <th scope="col" className="label-caps py-1 text-right">
              <span className="sr-only">Auswählen</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.quantity} className={`border-b border-line last:border-b-0 ${point.quantity === selected ? 'bg-accent-soft' : ''}`}>
              <td className="num py-1.5 text-ink">{point.quantity}</td>
              <td className="num py-1.5 text-right text-ink">
                {formatCents(Math.round(point.perUnitEur * 100))}
                {point.minimumOrderApplied ? '*' : ''}
              </td>
              <td className="num py-1.5 text-right text-ink">{formatCents(Math.round(point.totalEur * 100))}</td>
              <td className="py-1 text-right">
                {point.quantity !== selected && (
                  <button type="button" onClick={() => onSelect(point.quantity)} className="min-h-[36px] px-2 text-xs font-medium text-accent underline">
                    übernehmen
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {points.some((point) => point.minimumOrderApplied) && (
        <p className="text-xs text-ink-muted">
          * Mindestauftrag.{' '}
          {minimumLimit === 1 && `Beim einzelnen ${unitLabel === 'Stück' ? 'Stück' : 'Satz'} zahlen Sie hauptsächlich den Mindestauftrag.`}
          {minimumLimit > 1 && `Bis ${minimumLimit} ${unitLabel === 'Stück' ? 'Stück' : 'Sätze'} zahlen Sie hauptsächlich den Mindestauftrag.`}
        </p>
      )}
    </div>
  );
};

export default QuantityCurve;
