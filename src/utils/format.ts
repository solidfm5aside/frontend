/**
 * Shared formatting utilities used across Admin and Public pages.
 * Import from here instead of defining locally in each page.
 */

export const TBC_DAY_KEY = 'schedule-tbc';
export const LAGOS_TIME_ZONE = 'Africa/Lagos';

type SchedulableFixture = {
  _id?: string;
  date?: string | null;
  officialFixtureNumber?: number;
};

function dateParts(date: Date, includeTime = false) {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: LAGOS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' as const } : {}),
  });
  return Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  );
}

export function toLagosDateTimeInput(value: string | null | undefined): string {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  const parts = dateParts(parsed, true);
  const hour = parts.hour === '24' ? '00' : parts.hour;
  return `${parts.year}-${parts.month}-${parts.day}T${hour}:${parts.minute}`;
}

export function lagosDateTimeInputToIso(value: string): string {
  const components = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!components) throw new Error('Enter a valid Africa/Lagos kickoff time');
  const [, rawYear, rawMonth, rawDay, rawHour, rawMinute] = components;
  const year = Number(rawYear);
  const month = Number(rawMonth);
  const day = Number(rawDay);
  const hour = Number(rawHour);
  const minute = Number(rawMinute);
  const daysInMonth = month >= 1 && month <= 12
    ? new Date(Date.UTC(year, month, 0)).getUTCDate()
    : 0;
  if (year < 1000 || year > 9999 || month < 1 || month > 12 || day < 1 || day > daysInMonth || hour > 23 || minute > 59) {
    throw new Error('Enter a valid Africa/Lagos kickoff time');
  }
  const parsed = new Date(`${value}:00+01:00`);
  if (Number.isNaN(parsed.getTime())) throw new Error('Enter a valid Africa/Lagos kickoff time');
  return parsed.toISOString();
}

export function formatMatchDay(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Schedule TBC';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return 'Schedule TBC';
  return d.toLocaleDateString('en-GB', {
    timeZone: LAGOS_TIME_ZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatTime(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Time TBC';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return 'Time TBC';
  const time = date.toLocaleTimeString('en-GB', {
    timeZone: LAGOS_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${time} WAT`;
}

export function getDayKey(dateStr: string | null | undefined): string {
  if (!dateStr) return TBC_DAY_KEY;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return TBC_DAY_KEY;
  const parts = dateParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function formatMatchDayKey(dayKey: string | null | undefined): string {
  if (!dayKey || dayKey === TBC_DAY_KEY) return 'Schedule TBC';
  return formatMatchDay(`${dayKey}T00:00:00+01:00`);
}

/**
 * Keeps confirmed fixtures chronological and sends genuinely unscheduled
 * fixtures to the end. Official numbering provides deterministic ordering
 * when two fixtures share a kickoff.
 */
export function compareFixtureSchedule(left: SchedulableFixture, right: SchedulableFixture): number {
  const leftTime = left.date ? new Date(left.date).getTime() : Number.NaN;
  const rightTime = right.date ? new Date(right.date).getTime() : Number.NaN;
  const leftIsScheduled = Number.isFinite(leftTime);
  const rightIsScheduled = Number.isFinite(rightTime);

  if (leftIsScheduled !== rightIsScheduled) return leftIsScheduled ? -1 : 1;
  if (leftIsScheduled && rightIsScheduled && leftTime !== rightTime) return leftTime - rightTime;

  const leftNumber = left.officialFixtureNumber ?? Number.MAX_SAFE_INTEGER;
  const rightNumber = right.officialFixtureNumber ?? Number.MAX_SAFE_INTEGER;
  if (leftNumber !== rightNumber) return leftNumber - rightNumber;

  return (left._id ?? '').localeCompare(right._id ?? '');
}

export function compareFixtureDayKeys(left: string, right: string): number {
  if (left === TBC_DAY_KEY) return right === TBC_DAY_KEY ? 0 : 1;
  if (right === TBC_DAY_KEY) return -1;
  return left.localeCompare(right);
}
