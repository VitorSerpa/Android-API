import { ASSESSMENTS } from '@/data/assessments';
import { DEFAULT_MOTIVATION } from '@/data/phrases';
import {
  DEFAULT_ACTIVITIES,
  MOODS,
  type CheckIn,
  type DailyHealth,
  type Goal,
  type GoalPeriod,
  type Practice,
  type SleepQuality,
  type ToolId,
  type UserData,
} from '@/data/types';
import { addDays, lastDays, toDayKey } from '@/lib/dates';

/**
 * Pure read-side helpers (the app's domain layer): every number the screens
 * show is derived here from the raw records, so screens never store computed
 * values and the rules can be tested without React.
 */

export const SLEEP_SCORE: Record<SleepQuality, number> = {
  Ruim: 0.25,
  Regular: 0.5,
  Boa: 0.75,
  Ótima: 1,
};

export const TOOL_NAMES: Record<ToolId, string> = {
  breathing: 'Respiração',
  meditation: 'Meditação',
  grounding: 'Grounding',
  affirmations: 'Afirmações',
};

export function average(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** Mood on the 1–5 scale the dashboards print. */
export const moodScore = (checkIn: CheckIn) => checkIn.mood + 1;

export const moodLabel = (checkIn: CheckIn) => MOODS[checkIn.mood];

export const formatDecimal = (value: number, digits = 1) => value.toFixed(digits).replace('.', ',');

/* ------------------------------------------------------------------ */
/* Check-ins                                                           */
/* ------------------------------------------------------------------ */

/** Check-ins of one day, oldest first. */
export function checkInsOn(data: UserData, day: string): CheckIn[] {
  return data.checkIns.filter((item) => item.day === day).sort((a, b) => a.at.localeCompare(b.at));
}

export function latestCheckIn(data: UserData): CheckIn | null {
  return data.checkIns.reduce<CheckIn | null>((latest, item) => (!latest || item.at > latest.at ? item : latest), null);
}

export function todayCheckIns(data: UserData): CheckIn[] {
  return checkInsOn(data, toDayKey());
}

/** Mean mood (1–5) of a day, or `null` without check-ins. RF-05 / CA-05. */
export function dayMood(data: UserData, day: string): number | null {
  return average(checkInsOn(data, day).map(moodScore));
}

export function dayAverages(data: UserData, day: string) {
  const items = checkInsOn(data, day);
  return {
    count: items.length,
    mood: average(items.map(moodScore)),
    anxiety: average(items.map((item) => item.anxiety)),
    energy: average(items.map((item) => item.energy)),
  };
}

/** Days (keys) with at least one check-in. */
export function daysWithCheckIns(data: UserData): string[] {
  return [...new Set(data.checkIns.map((item) => item.day))].sort();
}

export function checkInCount(data: UserData): number {
  return data.checkIns.length;
}

/**
 * Arithmetic mean of every check-in's mood in the window (US-05 CA-02) and its
 * % change against the window right before it (RF-23).
 */
export function moodTrend(data: UserData, windowDays: number, end: Date = new Date()) {
  const meanOf = (days: readonly string[]) => {
    const set = new Set(days);
    return average(data.checkIns.filter((item) => set.has(item.day)).map(moodScore));
  };
  const current = meanOf(lastDays(windowDays, end));
  const previous = meanOf(lastDays(windowDays, addDays(end, -windowDays)));
  const delta =
    current !== null && previous !== null && previous > 0
      ? Math.round(((current - previous) / previous) * 100)
      : null;
  return { current, previous, delta };
}

/** Headline word for the status pill on Início. */
export function moodState(checkIn: CheckIn | null): string {
  if (!checkIn) return 'SEM CHECK-IN';
  if (checkIn.anxiety >= 7) return 'ATENÇÃO';
  if (checkIn.mood >= 3 && checkIn.anxiety <= 4) return 'PAZ';
  if (checkIn.mood <= 1) return 'CUIDADO';
  return 'EQUILÍBRIO';
}

/* ------------------------------------------------------------------ */
/* Suggestions (RF-45) — ordered by the user's own star ratings        */
/* ------------------------------------------------------------------ */

export type Suggestion = { tool: ToolId | null; minutes: number | null; text: string };

/** Mean stars per technique, or `null` when never rated. */
export function techniqueRating(data: UserData, tool: ToolId): number | null {
  return average(data.ratings.filter((item) => item.tool === tool).map((item) => item.stars));
}

/**
 * What to try now, from the latest check-in (CA-02: changes with the mood
 * informed). Among the techniques that fit that state, the best-rated wins.
 */
export function suggestionFor(data: UserData): Suggestion {
  const checkIn = latestCheckIn(data);
  if (!checkIn) {
    return { tool: null, minutes: null, text: 'Faça seu check-in para receber sugestões feitas para o seu momento.' };
  }

  type Candidate = Suggestion & { order: number };
  let candidates: Candidate[];
  if (checkIn.anxiety >= 6) {
    candidates = [
      { tool: 'meditation', minutes: 5, order: 0, text: 'Você está ansioso(a). Que tal uma meditação de 5 minutos?' },
      { tool: 'breathing', minutes: 1, order: 1, text: 'Sua ansiedade está alta. Que tal alguns ciclos de respiração 4-7-8 agora?' },
      { tool: 'grounding', minutes: 3, order: 2, text: 'A ansiedade subiu. O grounding 5-4-3-2-1 ajuda a voltar para o presente.' },
    ];
  } else if (checkIn.mood <= 1) {
    candidates = [
      { tool: 'affirmations', minutes: 2, order: 0, text: 'O dia está pesado. Algumas afirmações gentis podem ajudar a acolher o que sente.' },
      { tool: 'meditation', minutes: 3, order: 1, text: 'Humor baixo hoje. Uma meditação curta de 3 minutos pode trazer um pouco de alívio.' },
    ];
  } else if (checkIn.energy <= 2) {
    candidates = [
      { tool: 'breathing', minutes: 1, order: 0, text: 'Energia baixa? Um minuto de respiração consciente ajuda a despertar.' },
      { tool: 'meditation', minutes: 5, order: 1, text: 'Energia baixa. Uma pausa de 5 minutos de meditação pode recarregar.' },
    ];
  } else {
    candidates = [
      { tool: 'meditation', minutes: 10, order: 0, text: 'Você está bem hoje. Que tal manter o ritmo com 10 minutos de meditação?' },
      { tool: 'affirmations', minutes: 2, order: 1, text: 'Bom momento para reforçar o que está dando certo com uma afirmação.' },
    ];
  }

  const ranked = [...candidates].sort((a, b) => {
    const ra = a.tool ? (techniqueRating(data, a.tool) ?? 3) : 3;
    const rb = b.tool ? (techniqueRating(data, b.tool) ?? 3) : 3;
    return rb - ra || a.order - b.order;
  });
  const { tool, minutes, text } = ranked[0];
  return { tool, minutes, text };
}

/* ------------------------------------------------------------------ */
/* Saúde física e correlações (RF-16)                                  */
/* ------------------------------------------------------------------ */

export function healthOn(data: UserData, day: string): DailyHealth | null {
  return data.health[day] ?? null;
}

export function allActivities(data: UserData): string[] {
  return [...DEFAULT_ACTIVITIES, ...data.customActivities];
}

const ACTIVITY_PHRASES: Record<string, string> = {
  Exercício: 'se exercita',
  Meditação: 'medita',
  Leitura: 'lê',
  'Interações sociais': 'tem interações sociais',
};

/** CA-03: correlations need at least a week of records. */
export const MIN_CORRELATION_DAYS = 7;
const MEANINGFUL_DIFF = 0.3;

export type CorrelationResult =
  | { status: 'insufficient'; days: number }
  | { status: 'ready'; days: number; messages: string[] };

/**
 * Compares the mean mood of days with and without each activity. The meditation
 * sessions done in the app also count as "Meditação" for that day.
 */
export function activityCorrelations(data: UserData): CorrelationResult {
  const days = daysWithCheckIns(data);
  if (days.length < MIN_CORRELATION_DAYS) return { status: 'insufficient', days: days.length };

  const practicedMeditation = new Set(
    data.practices.filter((item) => item.tool === 'meditation').map((item) => toDayKey(new Date(item.at))),
  );
  const didOn = (day: string, activity: string) =>
    Boolean(data.health[day]?.activities.includes(activity)) ||
    (activity === 'Meditação' && practicedMeditation.has(day));

  const findings = allActivities(data)
    .map((activity) => {
      const withIt = days.filter((day) => didOn(day, activity));
      const without = days.filter((day) => !didOn(day, activity));
      const moodWith = average(withIt.map((day) => dayMood(data, day) ?? 0));
      const moodWithout = average(without.map((day) => dayMood(data, day) ?? 0));
      if (moodWith === null || moodWithout === null) return null;
      return { activity, diff: moodWith - moodWithout, moodWith, moodWithout };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

  const phrase = (activity: string) => ACTIVITY_PHRASES[activity] ?? `registra “${activity}”`;
  const messages = findings.map(({ activity, diff, moodWith, moodWithout }) => {
    const detail = `(${formatDecimal(moodWith)} contra ${formatDecimal(moodWithout)})`;
    if (diff >= MEANINGFUL_DIFF) return `Nos dias em que você ${phrase(activity)}, seu humor tende a ser melhor ${detail}.`;
    if (diff <= -MEANINGFUL_DIFF) return `Nos dias em que você ${phrase(activity)}, seu humor tende a ser mais baixo ${detail}.`;
    return `Nos dias em que você ${phrase(activity)}, seu humor fica parecido com o dos outros dias ${detail}.`;
  });

  if (messages.length === 0) {
    messages.push(
      'Você já tem uma semana de registros. Marque as atividades do dia no check-in para vermos como elas se relacionam com seu humor.',
    );
  }
  return { status: 'ready', days: days.length, messages: messages.slice(0, 4) };
}

/** Sleep observations shown next to the activity correlations (medication ones are disabled). */
export function otherInsights(data: UserData): string[] {
  const insights: string[] = [];
  const { delta } = moodTrend(data, 28);
  if (delta !== null && delta !== 0) {
    insights.push(`Nas últimas 4 semanas, seu humor médio ${delta > 0 ? 'aumentou' : 'caiu'} ${Math.abs(delta)}%.`);
  }

  const days = daysWithCheckIns(data);
  const slept = (day: string) => data.health[day]?.sleepHours ?? null;
  const good = days.filter((day) => (slept(day) ?? 0) >= 7).map((day) => dayMood(data, day) ?? 0);
  const short = days.filter((day) => slept(day) !== null && (slept(day) ?? 0) < 7).map((day) => dayMood(data, day) ?? 0);
  const moodGood = average(good);
  const moodShort = average(short);
  if (moodGood !== null && moodShort !== null && moodGood - moodShort >= MEANINGFUL_DIFF) {
    insights.push('Seu humor está melhor nos dias em que você dorme 7 horas ou mais.');
  }

  // Medicamentos desativados no app — correlação de adesão (RF-17) comentada:
  // // RF-17: correlate medication adherence with the emotional state.
  // if (data.medications.length) {
  //   const scheduledDays = days.filter((day) => day >= toDayKey(new Date(data.medications[0].createdAt)));
  //   const complete = scheduledDays.filter((day) => medicationAdherence(data, day) === 1);
  //   const incomplete = scheduledDays.filter((day) => medicationAdherence(data, day) < 1);
  //   const moodComplete = average(complete.map((day) => dayMood(data, day) ?? 0));
  //   const moodIncomplete = average(incomplete.map((day) => dayMood(data, day) ?? 0));
  //   if (moodComplete !== null && moodIncomplete !== null && Math.abs(moodComplete - moodIncomplete) >= MEANINGFUL_DIFF) {
  //     insights.push(
  //       moodComplete > moodIncomplete
  //         ? 'Nos dias em que você toma todos os medicamentos no horário, seu humor tende a ser melhor.'
  //         : 'Seu humor tem sido mais baixo nos dias com todos os medicamentos tomados — vale conversar com quem acompanha seu tratamento.',
  //     );
  //   }
  // }
  return insights;
}

/* ------------------------------------------------------------------ */
/* Medicamentos (RF-17/RF-18)                                          */
/* ------------------------------------------------------------------ */

export type Dose = { medicationId: string; name: string; dosage: string; time: string; takenAt: string | null };

export function dosesOn(data: UserData, day: string): Dose[] {
  return data.medications
    .filter((item) => item.enabled)
    .flatMap((medication) =>
      medication.times.map((time) => ({
        medicationId: medication.id,
        name: medication.name,
        dosage: medication.dosage,
        time,
        takenAt:
          data.intakes.find(
            (intake) => intake.medicationId === medication.id && intake.day === day && intake.time === time,
          )?.takenAt ?? null,
      })),
    )
    .sort((a, b) => a.time.localeCompare(b.time));
}

/** Share of the day's scheduled doses that were confirmed (1 when nothing was scheduled). */
export function medicationAdherence(data: UserData, day: string): number {
  const doses = dosesOn(data, day);
  if (!doses.length) return 1;
  return doses.filter((dose) => dose.takenAt).length / doses.length;
}

/* ------------------------------------------------------------------ */
/* Radar (RF-22)                                                       */
/* ------------------------------------------------------------------ */

const ACTIVITY_TARGET_MINUTES = 30;

function sleepScore(health: DailyHealth): number | null {
  const parts: number[] = [];
  if (health.sleepQuality) parts.push(SLEEP_SCORE[health.sleepQuality]);
  if (health.sleepHours !== null) parts.push(Math.min(health.sleepHours / 8, 1));
  return average(parts);
}

/**
 * 0–100 over the last 30 days for humor, sono, ansiedade, estresse e atividade
 * física, or `null` for a dimension without data.
 */
export function wellbeingIndicators(data: UserData) {
  const days = new Set(lastDays(30));
  const checkIns = data.checkIns.filter((item) => days.has(item.day));
  const health = Object.values(data.health).filter((item) => days.has(item.day));
  const pct = (value: number | null) => (value === null ? null : Math.round(Math.min(Math.max(value, 0), 1) * 100));

  const since = addDays(new Date(), -30).toISOString();
  const stress = data.assessments.find((item) => item.kind === 'stress' && item.at >= since);

  return {
    mood: pct(average(checkIns.map((item) => item.mood / 4))),
    sleep: pct(average(health.map(sleepScore).filter((value): value is number => value !== null))),
    anxiety: pct(average(checkIns.map((item) => item.anxiety / 10))),
    stress: stress ? pct(stress.score / ASSESSMENTS.stress.maxScore) : null,
    activity: pct(
      average(
        health
          .filter((item) => item.activityMinutes !== null)
          .map((item) => (item.activityMinutes ?? 0) / ACTIVITY_TARGET_MINUTES),
      ),
    ),
  };
}

/* ------------------------------------------------------------------ */
/* Metas (RF-44)                                                       */
/* ------------------------------------------------------------------ */

export function startOfPeriod(date: Date, period: GoalPeriod): Date {
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (period === 'day') return day;
  if (period === 'week') return addDays(day, -((day.getDay() + 6) % 7)); // Monday
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export const PERIOD_NAMES: Record<GoalPeriod, string> = { day: 'hoje', week: 'nesta semana', month: 'neste mês' };

export function practicesSince(data: UserData, since: Date, tool?: ToolId): Practice[] {
  return data.practices.filter((item) => new Date(item.at) >= since && (!tool || item.tool === tool));
}

/** Measured straight from the records, so it updates the moment an activity is saved (CA-01). */
export function goalProgress(data: UserData, goal: Goal, now: Date = new Date()): number {
  const since = startOfPeriod(now, goal.period);
  const sinceKey = toDayKey(since);
  switch (goal.kind) {
    case 'practiceMinutes':
      return Math.floor(practicesSince(data, since, goal.tool).reduce((sum, item) => sum + item.durationSec, 0) / 60);
    case 'practiceSessions':
      return practicesSince(data, since, goal.tool).length;
    case 'checkins':
      return new Set(data.checkIns.filter((item) => item.day >= sinceKey).map((item) => item.day)).size;
    case 'activityDays':
      return Object.values(data.health).filter(
        (item) => item.day >= sinceKey && goal.activity && item.activities.includes(goal.activity),
      ).length;
    case 'custom':
      return goal.log.filter((at) => new Date(at) >= since).length;
  }
}

/* ------------------------------------------------------------------ */
/* Práticas                                                            */
/* ------------------------------------------------------------------ */

export function practicesThisMonth(data: UserData) {
  return practicesSince(data, startOfPeriod(new Date(), 'month'));
}

export function practiceSummary(data: UserData, practices: readonly Practice[] = practicesThisMonth(data)) {
  const counts = (Object.keys(TOOL_NAMES) as ToolId[])
    .map((tool) => ({ tool, count: practices.filter((item) => item.tool === tool).length }))
    .filter((item) => item.count > 0);
  return { total: practices.length, counts };
}

/* ------------------------------------------------------------------ */
/* Resumo do dia (RF-05)                                               */
/* ------------------------------------------------------------------ */

/** What the user did that day: activities from the check-in plus practices done in the app. */
export function dayActivities(data: UserData, day: string): string[] {
  const practiced = data.practices
    .filter((item) => toDayKey(new Date(item.at)) === day)
    .map((item) => TOOL_NAMES[item.tool]);
  return [...new Set([...(data.health[day]?.activities ?? []), ...practiced])];
}

/** An encouraging line for the day, preferring the user's own motivational messages (RF-41). */
export function incentiveFor(data: UserData, mood: number | null, seed: number = Date.now()): string {
  const own = data.phrases.filter((item) => item.kind === 'motivation').map((item) => item.text);
  const builtIn = mood === null ? DEFAULT_MOTIVATION.neutral : mood >= 3.5 ? DEFAULT_MOTIVATION.good : mood <= 2.5 ? DEFAULT_MOTIVATION.hard : DEFAULT_MOTIVATION.neutral;
  const pool = own.length ? [...own, ...builtIn] : builtIn;
  return pool[Math.abs(Math.floor(seed / 1000)) % pool.length];
}

export function wordCount(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}
