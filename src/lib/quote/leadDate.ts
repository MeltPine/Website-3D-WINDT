import { OWNER_DECISIONS } from './ownerDecisions';

/*
 * Shipping window as calendar dates instead of "3–5 Werktage".
 *
 * The clock starts with the approval of the binding offer, not with the click
 * in the calculator: the request is reviewed first (reviewWorkdays), the
 * customer approves the offer by the cut-off time on that day, and the
 * approval day counts as the first production workday. Workdays are Mon–Fri
 * without the public holidays of Hesse and without the owner's blocked days.
 *
 * All dates are civil dates in Europe/Berlin, independent of the browser's
 * time zone. Years that are not in the calendar raise LeadDateError instead of
 * silently assuming "no holidays" - the UI then says the date follows with
 * the offer.
 */

export interface CivilDate {
  year: number;
  month: number;
  day: number;
}

export interface WorkCalendar {
  timeZone: 'Europe/Berlin';
  /** Years for which `holidays` is complete. */
  coveredYears: readonly number[];
  /** ISO date -> German name. */
  holidays: Readonly<Record<string, string>>;
  /** Owner-maintained closing days (holiday, maintenance), ISO dates. */
  blockedDays: readonly string[];
  /** Hour (0-23, Berlin) until which an approval counts for the same day. */
  cutoffHour: number;
  /** Workdays for the technical review before the binding offer. */
  reviewWorkdays: number;
}

/** Public holidays in Hesse (HFeiertagsG), incl. Corpus Christi. */
export const HESSEN_HOLIDAYS: Readonly<Record<string, string>> = {
  '2026-01-01': 'Neujahr',
  '2026-04-03': 'Karfreitag',
  '2026-04-06': 'Ostermontag',
  '2026-05-01': 'Tag der Arbeit',
  '2026-05-14': 'Christi Himmelfahrt',
  '2026-05-25': 'Pfingstmontag',
  '2026-06-04': 'Fronleichnam',
  '2026-10-03': 'Tag der Deutschen Einheit',
  '2026-12-25': '1. Weihnachtstag',
  '2026-12-26': '2. Weihnachtstag',
  '2027-01-01': 'Neujahr',
  '2027-03-26': 'Karfreitag',
  '2027-03-29': 'Ostermontag',
  '2027-05-01': 'Tag der Arbeit',
  '2027-05-06': 'Christi Himmelfahrt',
  '2027-05-17': 'Pfingstmontag',
  '2027-05-27': 'Fronleichnam',
  '2027-10-03': 'Tag der Deutschen Einheit',
  '2027-12-25': '1. Weihnachtstag',
  '2027-12-26': '2. Weihnachtstag',
};

export const WORK_CALENDAR: WorkCalendar = {
  timeZone: 'Europe/Berlin',
  coveredYears: [2026, 2027],
  holidays: HESSEN_HOLIDAYS,
  blockedDays: [],
  cutoffHour: OWNER_DECISIONS.approvalCutoffHour,
  reviewWorkdays: 1,
};

export class LeadDateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LeadDateError';
  }
}

export interface ShipWindow {
  /** Day by whose cut-off the offer must be approved. */
  approvalBy: CivilDate;
  cutoffHour: number;
  earliest: CivilDate;
  latest: CivilDate;
}

const pad = (value: number) => String(value).padStart(2, '0');

export function isoDate(date: CivilDate): string {
  return `${date.year}-${pad(date.month)}-${pad(date.day)}`;
}

/** 0 = Sunday … 6 = Saturday. */
export function weekday(date: CivilDate): number {
  return new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay();
}

export function addDays(date: CivilDate, days: number): CivilDate {
  const utc = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return { year: utc.getUTCFullYear(), month: utc.getUTCMonth() + 1, day: utc.getUTCDate() };
}

function assertCovered(date: CivilDate, calendar: WorkCalendar): void {
  if (!calendar.coveredYears.includes(date.year)) {
    throw new LeadDateError(`Work calendar does not cover ${date.year}.`);
  }
}

export function isWorkday(date: CivilDate, calendar: WorkCalendar = WORK_CALENDAR): boolean {
  assertCovered(date, calendar);
  const day = weekday(date);
  if (day === 0 || day === 6) return false;
  const iso = isoDate(date);
  return !(iso in calendar.holidays) && !calendar.blockedDays.includes(iso);
}

/** The n-th workday after `date` (n = 0: `date` itself if it is one, else the next). */
export function addWorkdays(date: CivilDate, workdays: number, calendar: WorkCalendar = WORK_CALENDAR): CivilDate {
  if (!Number.isInteger(workdays) || workdays < 0) {
    throw new LeadDateError('Workdays must be a non-negative integer.');
  }
  let current = date;
  while (!isWorkday(current, calendar)) current = addDays(current, 1);
  for (let remaining = workdays; remaining > 0; ) {
    current = addDays(current, 1);
    if (isWorkday(current, calendar)) remaining -= 1;
  }
  return current;
}

/** Civil date and hour of `now` in the calendar's time zone. */
export function zonedNow(now: Date, calendar: WorkCalendar = WORK_CALENDAR): CivilDate & { hour: number } {
  if (Number.isNaN(now.getTime())) {
    throw new LeadDateError('Invalid date.');
  }
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: calendar.timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const read = (type: Intl.DateTimeFormatPartTypes) => {
    const part = parts.find((entry) => entry.type === type);
    if (!part) throw new LeadDateError(`Missing date part ${type}.`);
    return Number.parseInt(part.value, 10);
  };
  return { year: read('year'), month: read('month'), day: read('day'), hour: read('hour') };
}

export function estimateShipWindow(
  now: Date,
  leadTime: { minWorkdays: number; maxWorkdays: number },
  calendar: WorkCalendar = WORK_CALENDAR,
): ShipWindow {
  if (leadTime.minWorkdays < 1 || leadTime.maxWorkdays < leadTime.minWorkdays) {
    throw new LeadDateError('Lead time needs 1 <= minWorkdays <= maxWorkdays.');
  }
  const local = zonedNow(now, calendar);
  const today: CivilDate = { year: local.year, month: local.month, day: local.day };
  // Request received today if it arrives before the cut-off on a workday.
  const received =
    isWorkday(today, calendar) && local.hour < calendar.cutoffHour ? today : addWorkdays(addDays(today, 1), 0, calendar);
  const approvalBy = addWorkdays(received, calendar.reviewWorkdays, calendar);
  return {
    approvalBy,
    cutoffHour: calendar.cutoffHour,
    // the approval day is the first production workday
    earliest: addWorkdays(approvalBy, leadTime.minWorkdays - 1, calendar),
    latest: addWorkdays(approvalBy, leadTime.maxWorkdays - 1, calendar),
  };
}

const WEEKDAY_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'] as const;

/** "Mi 07.10." (withYear: "Mi 07.10.2026"). */
export function formatCivilDate(date: CivilDate, withYear = false): string {
  return `${WEEKDAY_SHORT[weekday(date)]} ${pad(date.day)}.${pad(date.month)}.${withYear ? date.year : ''}`;
}

/** Same window, or null if the calendar does not cover the dates (UI: "Termin mit dem Angebot"). */
export function tryShipWindow(
  now: Date,
  leadTime: { minWorkdays: number; maxWorkdays: number },
  calendar: WorkCalendar = WORK_CALENDAR,
): ShipWindow | null {
  try {
    return estimateShipWindow(now, leadTime, calendar);
  } catch (error) {
    if (error instanceof LeadDateError) return null;
    throw error;
  }
}
