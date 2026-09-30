import { describe, expect, it } from 'vitest';
import {
  HESSEN_HOLIDAYS,
  LeadDateError,
  WORK_CALENDAR,
  addWorkdays,
  estimateShipWindow,
  formatCivilDate,
  isWorkday,
  isoDate,
  tryShipWindow,
  zonedNow,
  type WorkCalendar,
} from '../src/lib/quote/leadDate';
import { PRICING_CONFIG } from '../src/lib/quote/pricingConfig';

const standard = { minWorkdays: 3, maxWorkdays: 5 };
const express = { minWorkdays: 1, maxWorkdays: 2 };

/** Gregorian Easter Sunday (anonymous algorithm), used to cross-check the table. */
function easter(year: number): { month: number; day: number } {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

function shift(year: number, month: number, day: number, days: number): string {
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

describe('Hessen holiday table', () => {
  it('covers the current year and the next (fails when the table runs out)', () => {
    const year = new Date().getFullYear();
    expect(WORK_CALENDAR.coveredYears).toContain(year);
    // lead times reach at most a few weeks ahead: December needs the next year too
    if (new Date().getMonth() === 11) expect(WORK_CALENDAR.coveredYears).toContain(year + 1);
  });

  it.each(WORK_CALENDAR.coveredYears.map((year) => [year]))('matches the computed movable feasts in %i', (year) => {
    const { month, day } = easter(year);
    const expected: Record<string, string> = {
      [`${year}-01-01`]: 'Neujahr',
      [shift(year, month, day, -2)]: 'Karfreitag',
      [shift(year, month, day, 1)]: 'Ostermontag',
      [`${year}-05-01`]: 'Tag der Arbeit',
      [shift(year, month, day, 39)]: 'Christi Himmelfahrt',
      [shift(year, month, day, 50)]: 'Pfingstmontag',
      [shift(year, month, day, 60)]: 'Fronleichnam',
      [`${year}-10-03`]: 'Tag der Deutschen Einheit',
      [`${year}-12-25`]: '1. Weihnachtstag',
      [`${year}-12-26`]: '2. Weihnachtstag',
    };
    const actual = Object.fromEntries(Object.entries(HESSEN_HOLIDAYS).filter(([iso]) => iso.startsWith(`${year}-`)));
    expect(actual).toEqual(expected);
  });
});

describe('workdays', () => {
  it('skips weekends, holidays and blocked days', () => {
    expect(isWorkday({ year: 2026, month: 10, day: 3 })).toBe(false); // Saturday + holiday
    expect(isWorkday({ year: 2026, month: 6, day: 4 })).toBe(false); // Fronleichnam (Thursday)
    expect(isWorkday({ year: 2026, month: 6, day: 5 })).toBe(true);
    const blocked: WorkCalendar = { ...WORK_CALENDAR, blockedDays: ['2026-06-05'] };
    expect(isWorkday({ year: 2026, month: 6, day: 5 }, blocked)).toBe(false);
    expect(isoDate(addWorkdays({ year: 2026, month: 6, day: 3 }, 1))).toBe('2026-06-05');
    expect(isoDate(addWorkdays({ year: 2026, month: 6, day: 3 }, 1, blocked))).toBe('2026-06-08');
  });

  it('throws for years outside the calendar instead of assuming no holidays', () => {
    expect(() => isWorkday({ year: 2028, month: 1, day: 3 })).toThrow(LeadDateError);
    expect(tryShipWindow(new Date('2027-12-28T09:00:00+01:00'), standard)).toBeNull();
  });
});

describe('estimateShipWindow', () => {
  it('reproduces the spec example (Wed morning, standard: approve Thu 12:00, ship Mon–Wed)', () => {
    const window = estimateShipWindow(new Date('2026-09-30T09:15:00+02:00'), standard);
    expect(isoDate(window.approvalBy)).toBe('2026-10-01');
    expect(isoDate(window.earliest)).toBe('2026-10-05');
    expect(isoDate(window.latest)).toBe('2026-10-07');
    expect(window.cutoffHour).toBe(12);
    expect(formatCivilDate(window.earliest)).toBe('Mo 05.10.');
    expect(formatCivilDate(window.latest, true)).toBe('Mi 07.10.2026');
  });

  it('counts a request after the cut-off from the next workday', () => {
    const window = estimateShipWindow(new Date('2026-09-30T12:00:00+02:00'), standard);
    expect(isoDate(window.approvalBy)).toBe('2026-10-02');
  });

  it('moves weekend requests to Monday and respects holidays in the window', () => {
    // Saturday before Whit Monday 2026 (25.05.): received Tue 26.05., approval Wed 27.05.
    const window = estimateShipWindow(new Date('2026-05-23T10:00:00+02:00'), express);
    expect(isoDate(window.approvalBy)).toBe('2026-05-27');
    expect(isoDate(window.earliest)).toBe('2026-05-27');
    expect(isoDate(window.latest)).toBe('2026-05-28');
  });

  it('uses Berlin time regardless of the instant notation', () => {
    // 23:30 UTC on 30.09. is already 01:30 on 01.10. in Berlin
    expect(zonedNow(new Date('2026-09-30T23:30:00Z'))).toEqual({ year: 2026, month: 10, day: 1, hour: 1 });
  });

  it('gives each lead time option a window in order', () => {
    const now = new Date('2026-11-10T08:00:00+01:00');
    const windows = PRICING_CONFIG.leadTimeOptions.map((option) => estimateShipWindow(now, option));
    windows.forEach((window) => expect(isoDate(window.earliest) <= isoDate(window.latest)).toBe(true));
    const byId = Object.fromEntries(PRICING_CONFIG.leadTimeOptions.map((option, index) => [option.id, windows[index]]));
    expect(isoDate(byId.express.latest) < isoDate(byId.standard.latest)).toBe(true);
    expect(isoDate(byId.standard.latest) < isoDate(byId.eco.latest)).toBe(true);
  });

  it('rejects invalid input', () => {
    expect(() => estimateShipWindow(new Date('invalid'), standard)).toThrow(LeadDateError);
    expect(() => estimateShipWindow(new Date(), { minWorkdays: 3, maxWorkdays: 2 })).toThrow(LeadDateError);
  });
});
