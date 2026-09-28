import { checkInsFor, moodScore, moodTrend, practiceSummary, TOOL_NAMES } from '@/data/insights';
import type { CheckIn, UserData } from '@/data/types';
import { formatShortDate, fromDayKey, lastDays } from '@/lib/dates';

/** Plain-text weekly summary for "Compartilhar relatório". */
export function buildWeeklyReport(data: UserData, name: string): string {
  const days = lastDays(7);
  const week = checkInsFor(data, days).filter((item): item is CheckIn => item !== null);
  const { current } = moodTrend(data, 7);
  const anxiety = week.length
    ? (week.reduce((sum, item) => sum + item.anxiety, 0) / week.length).toFixed(1).replace('.', ',')
    : '–';
  const practices = practiceSummary(data);

  const lines = [
    `Mente Equilibrada — resumo semanal de ${name}`,
    `${formatShortDate(fromDayKey(days[0]))} a ${formatShortDate(fromDayKey(days[6]))}`,
    '',
    `Check-ins: ${week.length} de 7 dias`,
    `Humor médio: ${current === null ? '–' : current.toFixed(1).replace('.', ',')} / 5`,
    `Ansiedade média: ${anxiety} / 10`,
    `Práticas no mês: ${practices.total}${
      practices.counts.length
        ? ` (${practices.counts.map((item) => `${TOOL_NAMES[item.tool]} ${item.count}`).join(', ')})`
        : ''
    }`,
  ];

  if (week.length) {
    lines.push('', 'Dia a dia:');
    for (const item of week) {
      lines.push(
        `• ${formatShortDate(fromDayKey(item.day))}: humor ${moodScore(item)}/5, ansiedade ${item.anxiety}/10, sono ${item.sleep.toLowerCase()}`,
      );
    }
  }

  return lines.join('\n');
}
