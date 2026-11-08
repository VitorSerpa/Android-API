import { average, dayMood, moodScore, startOfPeriod } from '@/data/insights';
import type { UserData } from '@/data/types';
import { addDays, formatNumericDate, toDayKey } from '@/lib/dates';

/**
 * US-17: comparisons across records. Pure domain logic.
 */

/* ------------------------------------------------------------------ */
/* Sono × humor do dia seguinte (RF-64)                                */
/* ------------------------------------------------------------------ */

export type SleepMoodPoint = { day: string; sleepHours: number; mood: number };

/**
 * CA-01: one point per (hours slept that night, mood of the following day).
 * A night is stored on the day the user woke up (the check-in's "Sono" field
 * and the Health Connect import both do this), so a point pairs the hours kept
 * on day D with the mean mood of that same day D — the day after the night.
 */
export function sleepMoodPoints(data: UserData, days = 90): SleepMoodPoint[] {
  const since = toDayKey(addDays(new Date(), -(days - 1)));
  return Object.values(data.health)
    .filter((health) => health.day >= since && health.sleepHours !== null)
    .map((health) => ({ day: health.day, sleepHours: health.sleepHours!, mood: dayMood(data, health.day) }))
    .filter((point): point is SleepMoodPoint => point.mood !== null)
    .sort((a, b) => a.day.localeCompare(b.day));
}

/** Pearson correlation of the points, or `null` with fewer than 3 points or no variation. */
export function correlation(points: readonly SleepMoodPoint[]): number | null {
  if (points.length < 3) return null;
  const mx = average(points.map((point) => point.sleepHours))!;
  const my = average(points.map((point) => point.mood))!;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (const point of points) {
    sxy += (point.sleepHours - mx) * (point.mood - my);
    sxx += (point.sleepHours - mx) ** 2;
    syy += (point.mood - my) ** 2;
  }
  if (sxx === 0 || syy === 0) return null;
  return sxy / Math.sqrt(sxx * syy);
}

export function describeSleepMood(points: readonly SleepMoodPoint[]): string {
  const r = correlation(points);
  if (r === null) {
    return points.length < 3
      ? `Registre as horas de sono e faça check-ins em pelo menos 3 dias para ver a relação (${points.length} de 3).`
      : 'Ainda não dá para ver uma relação: os valores variaram pouco.';
  }
  if (r >= 0.3) return 'Nas suas noites mais longas, o humor do dia seguinte tende a ser melhor.';
  if (r <= -0.3) return 'Curiosamente, nas suas noites mais longas o humor do dia seguinte tende a ser mais baixo.';
  return 'Por enquanto, as horas de sono e o humor do dia seguinte não mostram uma relação clara.';
}

/* ------------------------------------------------------------------ */
/* Evolução do humor por perfil de vida (RF-65)                        */
/* ------------------------------------------------------------------ */

export const PROFILE_WEEKS = 8;

export type ProfileSeries = {
  profileId: string;
  name: string;
  /** Mean mood (1–5) per week, oldest first; `null` for weeks without check-ins. */
  weekly: (number | null)[];
  /** Mean over the whole window. */
  overall: number | null;
  count: number;
};

/** Monday of each of the last `weeks` weeks, oldest first, with a "dd/mm" label. */
export function recentWeeks(weeks = PROFILE_WEEKS, now: Date = new Date()) {
  const current = startOfPeriod(now, 'week');
  return Array.from({ length: weeks }, (_, index) => {
    const start = addDays(current, (index - weeks + 1) * 7);
    return { start: toDayKey(start), end: toDayKey(addDays(start, 6)), label: formatNumericDate(start) };
  });
}

/** CA-02: one mood curve per life profile, so the user can switch between them and compare. */
export function moodByProfile(data: UserData, weeks = PROFILE_WEEKS, now: Date = new Date()): ProfileSeries[] {
  const buckets = recentWeeks(weeks, now);
  const first = buckets[0].start;
  return data.profiles.map((profile) => {
    const items = data.checkIns.filter((item) => item.profileId === profile.id && item.day >= first);
    return {
      profileId: profile.id,
      name: profile.name,
      weekly: buckets.map((week) =>
        average(items.filter((item) => item.day >= week.start && item.day <= week.end).map(moodScore)),
      ),
      overall: average(items.map(moodScore)),
      count: items.length,
    };
  });
}

/** "Lazer está mais equilibrado" — the profile with the best mean among those with enough check-ins. */
export function mostBalancedProfile(series: readonly ProfileSeries[], minCheckIns = 3): ProfileSeries | null {
  const eligible = series.filter((item) => item.count >= minCheckIns && item.overall !== null);
  if (eligible.length < 2) return null;
  return eligible.reduce((best, item) => (item.overall! > best.overall! ? item : best));
}
