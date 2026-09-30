import { OWNER_DECISIONS } from './ownerDecisions';
import type { BreakdownKey, ProjectBreakdown } from './pricing';
import type { PricingConfig } from './pricingConfig';

/*
 * German labels for the price breakdown, shared by the calculator UI and the
 * text that travels with the request. With OWNER_DECISIONS.showMachineRate
 * off, material and machine time are one "Fertigung" line (the hourly rate
 * could otherwise be derived from hours and euros).
 */

export type DisplayKey = BreakdownKey | 'production';

export interface DisplayLine {
  key: DisplayKey;
  label: string;
  detail: string;
  amountCents: number;
}

const decimal = (digits: number) =>
  new Intl.NumberFormat('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits });

export function formatCents(cents: number, signed = false): string {
  const text = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(Math.abs(cents) / 100);
  if (cents < 0) return `−${text}`;
  return signed && cents > 0 ? `+${text}` : text;
}

export function formatWeight(grams: number): string {
  return grams >= 1000 ? `${decimal(2).format(grams / 1000)} kg` : `${decimal(0).format(Math.max(1, grams))} g`;
}

export function formatHoursDecimal(hours: number): string {
  return `${decimal(hours < 10 ? 2 : 1).format(hours)} h`;
}

const percent = (fraction: number) => `${decimal(0).format(Math.round(fraction * 100))} %`;

export function breakdownDisplayLines(
  breakdown: ProjectBreakdown,
  config: PricingConfig,
  showMachineRate: boolean = OWNER_DECISIONS.showMachineRate,
): DisplayLine[] {
  const { estimate } = breakdown;
  const amount = (key: BreakdownKey) => breakdown.lines.find((line) => line.key === key)?.amountCents ?? 0;
  const lines: DisplayLine[] = [];
  const weight = formatWeight(breakdown.weightG);
  const hours = formatHoursDecimal(breakdown.printHours);
  if (showMachineRate) {
    lines.push({ key: 'material', label: 'Material', detail: `${weight} ${estimate.material.priceGroupName}`, amountCents: amount('material') });
    lines.push({ key: 'machine', label: 'Maschinenzeit', detail: `${hours} inkl. Aufheizen`, amountCents: amount('machine') });
  } else {
    lines.push({
      key: 'production',
      label: 'Fertigung',
      detail: `Material ${weight} ${estimate.material.priceGroupName} + Maschinenzeit ca. ${hours}`,
      amountCents: amount('material') + amount('machine'),
    });
  }
  const factor = estimate.leadTime.factor;
  if (amount('leadTime') !== 0) {
    lines.push({
      key: 'leadTime',
      label: `Lieferstufe ${estimate.leadTime.label}`,
      detail: `${factor > 1 ? '+' : '−'}${percent(Math.abs(factor - 1))} auf die Fertigung`,
      amountCents: amount('leadTime'),
    });
  }
  const discount = estimate.parts[0]?.discount ?? 0;
  if (amount('discount') !== 0) {
    const tier = config.quantityDiscounts.find((entry) => entry.discount === discount);
    lines.push({
      key: 'discount',
      label: 'Mengenrabatt',
      detail: `−${percent(discount)}${tier ? ` ab ${tier.minQuantity} Stück` : ''}`,
      amountCents: amount('discount'),
    });
  }
  const positions = estimate.parts.length;
  lines.push({
    key: 'setup',
    label: 'Rüsten & Prüfung',
    detail: `${formatCents(config.setupFeeEur * 100)} je Position${positions > 1 ? ` × ${positions}` : ''}`,
    amountCents: amount('setup'),
  });
  if (amount('minimumOrder') !== 0) {
    lines.push({
      key: 'minimumOrder',
      label: 'Mindestauftrag',
      detail: `aufgefüllt auf ${formatCents(config.minimumOrderEur * 100)}`,
      amountCents: amount('minimumOrder'),
    });
  }
  return lines;
}

/** One-line text of the breakdown for the lead record and the sales e-mail. */
export function buildBreakdownSummary(breakdown: ProjectBreakdown | null, config: PricingConfig): string {
  if (!breakdown) return '';
  const parts = breakdownDisplayLines(breakdown, config).map(
    (line) => `${line.label} (${line.detail}): ${formatCents(line.amountCents, line.key === 'minimumOrder')}`,
  );
  const { estimate } = breakdown;
  return [
    ...parts,
    `Punktwert ${formatCents(breakdown.totalCents)}`,
    `Spanne ${formatCents(estimate.lowEur * 100)} – ${formatCents(estimate.highEur * 100)} netto`,
  ].join(' · ');
}
