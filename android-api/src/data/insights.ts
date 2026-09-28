import type { CheckIn, Goal, SleepQuality, ToolId, UserData } from '@/data/types';
import { addDays, fromDayKey, lastDays, toDayKey } from '@/lib/dates';

/**
 * Pure read-side helpers: every number the dashboards show is derived here
 * from the raw records, so screens never store computed values.
 */

export const SLEEP_SCORE: Record<SleepQuality, number> = {
  Ruim: 0.25,
  Regular: 0.5,
  Boa: 0.75,
  Ótima: 1,
};

export function average(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function checkInsFor(data: UserData, days: readonly string[]): (CheckIn | null)[] {
  return days.map((day) => data.checkIns[day] ?? null);
}

export function todayCheckIn(data: UserData): CheckIn | null {
  return data.checkIns[toDayKey()] ?? null;
}

/** Mood on the 1–5 scale the dashboards print. */
export const moodScore = (checkIn: CheckIn) => checkIn.mood + 1;

function averageMood(data: UserData, days: readonly string[]) {
  return average(
    checkInsFor(data, days)
      .filter((item): item is CheckIn => item !== null)
      .map(moodScore),
  );
}

/** Mean mood over the window and its % change against the window before it. */
export function moodTrend(data: UserData, windowDays: number) {
  const current = averageMood(data, lastDays(windowDays));
  const previous = averageMood(data, lastDays(windowDays, addDays(new Date(), -windowDays)));
  const delta =
    current !== null && previous !== null && previous > 0
      ? Math.round(((current - previous) / previous) * 100)
      : null;
  return { current, delta };
}

/** Headline word for the status pill on Início. */
export function moodState(checkIn: CheckIn | null): string {
  if (!checkIn) return 'SEM CHECK-IN';
  if (checkIn.anxiety >= 7) return 'ATENÇÃO';
  if (checkIn.mood >= 3 && checkIn.anxiety <= 4) return 'PAZ';
  if (checkIn.mood <= 1) return 'CUIDADO';
  return 'EQUILÍBRIO';
}

export function suggestionFor(checkIn: CheckIn | null): string {
  if (!checkIn) {
    return 'Faça seu check-in para receber sugestões feitas para o seu dia.';
  }
  if (checkIn.anxiety >= 6) {
    return 'Sua ansiedade está alta hoje. Que tal 3 minutos de respiração 4-7-8 agora?';
  }
  if (checkIn.sleep === 'Ruim' || checkIn.sleep === 'Regular') {
    return 'Seu sono não foi dos melhores. Uma meditação curta pode ajudar a recarregar.';
  }
  if (checkIn.energy <= 2) {
    return 'Energia baixa? Uma caminhada leve de 10 minutos costuma ajudar.';
  }
  return 'Você está bem hoje. Registre no diário algo pelo que é grato.';
}

/** 0–100 per wellbeing dimension over the last 30 days, or `null` without data. */
export function wellbeingIndicators(data: UserData) {
  const month = checkInsFor(data, lastDays(30)).filter((item): item is CheckIn => item !== null);
  const pct = (value: number | null) => (value === null ? null : Math.round(value * 100));

  return {
    mood: pct(average(month.map((item) => item.mood / 4))),
    sleep: pct(average(month.map((item) => SLEEP_SCORE[item.sleep]))),
    energy: pct(average(month.map((item) => item.energy / 5))),
    calm: pct(average(month.map((item) => 1 - item.anxiety / 10))),
    routine: month.length ? Math.round((month.length / 30) * 100) : null,
  };
}

/** Observations generated from the check-ins; empty until there is enough data. */
export function historyInsights(data: UserData): string[] {
  const insights: string[] = [];
  const all = Object.values(data.checkIns);

  const { delta } = moodTrend(data, 28);
  if (delta !== null && delta !== 0) {
    insights.push(
      `Nas últimas 4 semanas, seu humor médio ${delta > 0 ? 'aumentou' : 'caiu'} ${Math.abs(delta)}%.`,
    );
  }

  const withActivity = all.filter((item) => item.activity.trim());
  const withoutActivity = all.filter((item) => !item.activity.trim());
  const anxietyWith = average(withActivity.map((item) => item.anxiety));
  const anxietyWithout = average(withoutActivity.map((item) => item.anxiety));
  if (anxietyWith !== null && anxietyWithout !== null && anxietyWithout > 0) {
    const diff = Math.round(((anxietyWithout - anxietyWith) / anxietyWithout) * 100);
    if (diff > 0) insights.push(`Dias com atividade física apresentam ansiedade ${diff}% menor.`);
  }

  const goodSleep = all.filter((item) => SLEEP_SCORE[item.sleep] >= 0.75).map(moodScore);
  const badSleep = all.filter((item) => SLEEP_SCORE[item.sleep] < 0.75).map(moodScore);
  const moodGood = average(goodSleep);
  const moodBad = average(badSleep);
  if (moodGood !== null && moodBad !== null && moodGood > moodBad) {
    insights.push('Seu humor está melhor nos dias em que você dorme bem.');
  }

  return insights;
}

export function checkInCount(data: UserData): number {
  return Object.keys(data.checkIns).length;
}

function startOfWeek(date: Date) {
  // Weeks start on Monday, as in the pt-BR calendar.
  const offset = (date.getDay() + 6) % 7;
  return addDays(new Date(date.getFullYear(), date.getMonth(), date.getDate()), -offset);
}

export function goalProgress(data: UserData, goal: Goal): number {
  const now = new Date();
  switch (goal.kind) {
    case 'checkinsPerWeek': {
      const start = startOfWeek(now);
      return Object.keys(data.checkIns).filter((day) => fromDayKey(day) >= start).length;
    }
    case 'meditationMinutesPerMonth':
      return Math.round(
        practicesThisMonth(data)
          .filter((item) => item.tool === 'meditation')
          .reduce((sum, item) => sum + item.durationSec, 0) / 60,
      );
    case 'custom':
      return goal.progress;
  }
}

export function practicesThisMonth(data: UserData) {
  const now = new Date();
  return data.practices.filter((item) => {
    const at = new Date(item.at);
    return at.getFullYear() === now.getFullYear() && at.getMonth() === now.getMonth();
  });
}

export const TOOL_NAMES: Record<ToolId, string> = {
  breathing: 'Respiração',
  meditation: 'Meditação',
  grounding: 'Grounding',
  affirmations: 'Afirmações',
};

export function practiceSummary(data: UserData) {
  const month = practicesThisMonth(data);
  const counts = (Object.keys(TOOL_NAMES) as ToolId[])
    .map((tool) => ({ tool, count: month.filter((item) => item.tool === tool).length }))
    .filter((item) => item.count > 0);
  return { total: month.length, counts };
}

export function wordCount(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}
