import type { SleepMoodPoint } from '@/data/comparisons';
import { MOODS } from '@/data/types';
import { fromDayKey, MONTHS, WEEKDAYS_SHORT } from '@/lib/dates';

/**
 * Pure helpers behind the sleep × mood scatter chart (RF-64): domain, the
 * nearest-dot lookup used on tap, the least-squares trend line and the copy
 * shown in the tooltip. Kept free of React so `node --test` can cover them.
 */

/** Mood axis: the daily mean score runs from 1 (muito triste) to 5 (muito feliz). */
export const MOOD_AXIS_MIN = 1;
export const MOOD_AXIS_MAX = 5;

/** Hours axis: at least 4h–10h, widened to whole hours so every night fits. */
export function sleepDomain(points: readonly Pick<SleepMoodPoint, 'sleepHours'>[]): { minX: number; maxX: number } {
  const hours = points.map((point) => point.sleepHours);
  const minX = Math.max(0, Math.floor(Math.min(4, ...hours)));
  const maxX = Math.ceil(Math.max(10, ...hours));
  return { minX, maxX: maxX > minX ? maxX : minX + 1 };
}

export type PixelPoint = { x: number; y: number };

/**
 * Index of the dot closest to the touch, or `null` when none lies within
 * `maxDistance` (so tapping empty space clears the selection). Ties keep the
 * first dot, which is the earlier night because the points are sorted by day.
 */
export function nearestPointIndex(dots: readonly PixelPoint[], touch: PixelPoint, maxDistance = 28): number | null {
  let best: number | null = null;
  let bestDistance = maxDistance * maxDistance;
  dots.forEach((dot, index) => {
    const distance = (dot.x - touch.x) ** 2 + (dot.y - touch.y) ** 2;
    if (distance <= bestDistance && (best === null || distance < bestDistance)) {
      best = index;
      bestDistance = distance;
    }
  });
  return best;
}

export type LinearFit = { slope: number; intercept: number };

/** Ordinary least squares of mood on hours; `null` with fewer than 3 nights or no spread in hours. */
export function leastSquares(points: readonly SleepMoodPoint[]): LinearFit | null {
  if (points.length < 3) return null;
  const n = points.length;
  const mx = points.reduce((sum, point) => sum + point.sleepHours, 0) / n;
  const my = points.reduce((sum, point) => sum + point.mood, 0) / n;
  let sxy = 0;
  let sxx = 0;
  for (const point of points) {
    sxy += (point.sleepHours - mx) * (point.mood - my);
    sxx += (point.sleepHours - mx) ** 2;
  }
  if (sxx < 1e-9) return null;
  const slope = sxy / sxx;
  return { slope, intercept: my - slope * mx };
}

export type Segment = { x1: number; y1: number; x2: number; y2: number };

/**
 * The fitted line across `[minX, maxX]`, clipped to the mood axis (1–5) so it
 * never leaves the plot. Values are in data units (hours, mood).
 */
export function trendSegment(fit: LinearFit, minX: number, maxX: number): Segment | null {
  const at = (hours: number) => fit.slope * hours + fit.intercept;
  let x1 = minX;
  let x2 = maxX;
  if (fit.slope !== 0) {
    const xAtMin = (MOOD_AXIS_MIN - fit.intercept) / fit.slope;
    const xAtMax = (MOOD_AXIS_MAX - fit.intercept) / fit.slope;
    const lo = Math.min(xAtMin, xAtMax);
    const hi = Math.max(xAtMin, xAtMax);
    x1 = Math.max(x1, lo);
    x2 = Math.min(x2, hi);
  } else if (fit.intercept < MOOD_AXIS_MIN || fit.intercept > MOOD_AXIS_MAX) {
    return null;
  }
  if (x2 - x1 < 1e-6) return null;
  return { x1, y1: at(x1), x2, y2: at(x2) };
}

/** "7" or "7,5": one decimal, comma separator, no trailing ",0". */
export function formatHours(hours: number): string {
  const rounded = Math.round(hours * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1).replace('.', ',');
}

/** "3,8": the mean mood with one decimal and comma separator. */
export function formatMoodScore(mood: number): string {
  return mood.toFixed(1).replace('.', ',');
}

/** Name of the mood a 1–5 mean rounds to ("Feliz" for 3,8). */
export function moodNameFor(mood: number): string {
  const index = Math.min(MOODS.length - 1, Math.max(0, Math.round(mood) - 1));
  return MOODS[index];
}

/** "Sex, 24 de Outubro" */
export function formatPointDate(day: string): string {
  const date = fromDayKey(day);
  return `${WEEKDAYS_SHORT[date.getDay()]}, ${date.getDate()} de ${MONTHS[date.getMonth()]}`;
}

export type PointDetails = { date: string; sleep: string; mood: string; accessibilityLabel: string };

/** Copy for the tooltip of one night, plus a sentence for screen readers. */
export function describePoint(point: SleepMoodPoint): PointDetails {
  const date = formatPointDate(point.day);
  const sleep = `${formatHours(point.sleepHours)} h de sono`;
  const mood = `${moodNameFor(point.mood)} (${formatMoodScore(point.mood)})`;
  return {
    date,
    sleep,
    mood,
    accessibilityLabel: `${date}: ${sleep}, humor do dia ${moodNameFor(point.mood)}, ${formatMoodScore(point.mood)} de 5.`,
  };
}

/** Index after stepping `delta` nights in day order, wrapping around; starts at the first/last night. */
export function stepIndex(current: number | null, delta: number, count: number): number | null {
  if (count === 0) return null;
  if (current === null) return delta >= 0 ? 0 : count - 1;
  return (((current + delta) % count) + count) % count;
}
