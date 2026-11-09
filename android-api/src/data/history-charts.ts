import { formatDecimal } from '@/data/insights';
import { MOODS } from '@/data/types';
import { MONTHS, WEEKDAYS_SHORT, fromDayKey } from '@/lib/dates';

/**
 * Text shown by the interactive charts of the Histórico tab (tooltips, radar
 * details). Pure functions so they can be unit tested.
 */

const shortMonth = (index: number) => MONTHS[index].slice(0, 3).toLowerCase();

/** "qua, 5 nov" — tooltip title of a day. */
export function chartDayTitle(day: string): string {
  const date = fromDayKey(day);
  return `${WEEKDAYS_SHORT[date.getDay()].toLowerCase()}, ${date.getDate()} ${shortMonth(date.getMonth())}`;
}

/** "Semana de 27 out" — tooltip title of a week starting on `start`. */
export function chartWeekTitle(start: string): string {
  const date = fromDayKey(start);
  return `Semana de ${date.getDate()} ${shortMonth(date.getMonth())}`;
}

/** Mood name of a 1–5 average ("Feliz"), or `null` when there is none. */
export function moodNameOf(mood: number | null): string | null {
  if (mood === null || Number.isNaN(mood)) return null;
  const index = Math.min(Math.max(Math.round(mood) - 1, 0), MOODS.length - 1);
  return MOODS[index];
}

/** "Feliz · 3,8" for a 1–5 mood average; `null` without a value. */
export function moodValueText(mood: number | null): string | null {
  const name = moodNameOf(mood);
  return name === null ? null : `${name} · ${formatDecimal(mood!)}`;
}

/** "4,5/10" for a 0–10 anxiety average; `null` without a value. */
export function anxietyValueText(anxiety: number | null): string | null {
  return anxiety === null || Number.isNaN(anxiety) ? null : `${formatDecimal(anxiety)}/10`;
}

/** "3,8 / 5" for a weekly profile mood average; `null` without a value. */
export function profileValueText(mood: number | null): string | null {
  return mood === null || Number.isNaN(mood) ? null : `${formatDecimal(mood)} / 5`;
}

export type WellbeingPercents = {
  mood: number | null;
  sleep: number | null;
  anxiety: number | null;
  stress: number | null;
  activity: number | null;
};

/**
 * Per-axis explanation for the radar "Indicadores de bem-estar", in the same
 * order as the axes (Humor, Sono, Ansiedade, Estresse, Atividade). Percentages
 * are converted back to the scale the user answered on.
 */
export function wellbeingDetails(w: WellbeingPercents) {
  return {
    mood:
      w.mood === null
        ? 'Faça check-ins para ver seu humor médio.'
        : `Média ${formatDecimal(1 + (w.mood / 100) * 4)} de 5 nos check-ins dos últimos 30 dias. Quanto maior, melhor.`,
    sleep:
      w.sleep === null
        ? 'Registre suas noites de sono para preencher este eixo.'
        : 'Horas e qualidade do sono registradas nos últimos 30 dias. Quanto maior, melhor.',
    anxiety:
      w.anxiety === null
        ? 'Faça check-ins para ver sua ansiedade média.'
        : `Média ${formatDecimal(w.anxiety / 10)} de 10 nos check-ins. Quanto maior, mais intensa.`,
    stress:
      w.stress === null
        ? 'Faça o teste rápido de estresse para preencher este eixo.'
        : 'Resultado do último teste rápido de estresse. Quanto maior, mais intenso.',
    activity:
      w.activity === null
        ? 'Registre seus minutos de atividade física para preencher este eixo.'
        : 'Minutos de atividade física por dia em relação à meta de 30 minutos.',
  };
}
