/**
 * Shared formatting utilities used across Admin and Public pages.
 * Import from here instead of defining locally in each page.
 */

export function formatMatchDay(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getDayKey(dateStr: string): string {
  return new Date(dateStr).toISOString().split('T')[0]; // YYYY-MM-DD
}

/**
 * Estimates the fixture end date given scheduling parameters.
 * Matches are only played on Saturdays and Sundays.
 */
export function calculateFixtureEndDate(
  startDate: string,
  numRounds: number,
  matchesPerDay: number
): Date | null {
  if (!startDate) return null;
  const totalMatches = numRounds * 14;
  const totalDaysNeeded = Math.ceil(totalMatches / matchesPerDay);

  let currentDate = new Date(startDate);
  // Fast-forward to the first Saturday
  const day = currentDate.getUTCDay();
  const diff = (6 - day + 7) % 7;
  currentDate.setUTCDate(currentDate.getUTCDate() + diff);

  let daysCount = 1;
  let isSat = true;

  while (daysCount < totalDaysNeeded) {
    if (isSat) {
      currentDate.setUTCDate(currentDate.getUTCDate() + 1); // Sat -> Sun
      isSat = false;
    } else {
      currentDate.setUTCDate(currentDate.getUTCDate() + 6); // Sun -> next Sat
      isSat = true;
    }
    daysCount++;
  }

  return currentDate;
}

/**
 * Returns the first Saturday on or after startDate.
 */
export function getFirstMatchDay(startDate: string): Date | null {
  if (!startDate) return null;
  const d = new Date(startDate);
  const diff = (6 - d.getUTCDay() + 7) % 7;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}
