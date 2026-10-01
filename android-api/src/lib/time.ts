/**
 * Clock-time helpers. Times of day are stored as `HH:MM` strings in local time
 * (reminders, quiet hours, digital rest, night mode).
 */

const pad = (value: number) => String(value).padStart(2, '0');

export const TIME_PATTERN = /^([01]?\d|2[0-3]):([0-5]\d)$/;

export function isValidTime(value: string): boolean {
  return TIME_PATTERN.test(value.trim());
}

/** `"7:5"`/`"07:05"` → minutes since midnight. Assumes a valid time. */
export function toMinutes(time: string): number {
  const [hours, minutes] = time.trim().split(':').map(Number);
  return hours * 60 + minutes;
}

export function fromMinutes(total: number): string {
  const normalised = ((total % 1440) + 1440) % 1440;
  return `${pad(Math.floor(normalised / 60))}:${pad(normalised % 60)}`;
}

/** Normalises what the user typed ("7:5", "7h", "0730") to `HH:MM`, or `null`. */
export function parseTime(input: string): string | null {
  const text = input.trim().toLowerCase().replace('h', ':');
  const compact = /^(\d{1,2})(\d{2})$/.exec(text);
  const candidate = compact ? `${compact[1]}:${compact[2]}` : text.endsWith(':') ? `${text}00` : text;
  const match = /^(\d{1,2}):(\d{1,2})$/.exec(candidate);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return `${pad(hours)}:${pad(minutes)}`;
}

/** Minutes since midnight of `date`. */
export function minutesOf(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

/**
 * Whether a minute-of-day falls in `[start, end)`. Windows may cross midnight
 * (22:00 → 07:00); an empty window (start = end) contains nothing.
 */
export function isMinuteWithin(minute: number, start: string, end: string): boolean {
  const from = toMinutes(start);
  const to = toMinutes(end);
  if (from === to) return false;
  return from < to ? minute >= from && minute < to : minute >= from || minute < to;
}

export function isWithinWindow(date: Date, start: string, end: string): boolean {
  return isMinuteWithin(minutesOf(date), start, end);
}

/** Sorted, de-duplicated list of valid `HH:MM` times. */
export function normaliseTimes(times: readonly string[]): string[] {
  const valid = times.map(parseTime).filter((time): time is string => time !== null);
  return [...new Set(valid)].sort((a, b) => toMinutes(a) - toMinutes(b));
}

/** Every `intervalHours` from `start` up to `end` (same day), e.g. hydration every 2 h. */
export function timesEvery(intervalHours: number, start: string, end: string): string[] {
  const from = toMinutes(start);
  const to = toMinutes(end);
  const step = Math.max(15, Math.round(intervalHours * 60));
  const times: string[] = [];
  for (let minute = from; minute <= (to >= from ? to : to + 1440); minute += step) {
    times.push(fromMinutes(minute));
  }
  return normaliseTimes(times);
}
