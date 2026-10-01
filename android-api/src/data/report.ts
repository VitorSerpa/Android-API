import { average, dayActivities, dayAverages, formatDecimal, practiceSummary, practicesSince, TOOL_NAMES } from '@/data/insights';
import type { UserData } from '@/data/types';
import { formatShortDate, fromDayKey, lastDays, WEEKDAYS_SHORT } from '@/lib/dates';

/**
 * Weekly report (RF-42): mood, sleep, anxiety and activities of the last 7
 * days. The same numbers feed the PDF, the plain-text share and the anonymous
 * summary sent to a supporter (RF-55) — the latter without the user's name.
 */

export type ReportDay = {
  day: string;
  label: string;
  checkIns: number;
  mood: number | null;
  anxiety: number | null;
  energy: number | null;
  sleepHours: number | null;
  sleepQuality: string | null;
  activities: string[];
};

export type WeeklyReport = {
  hasData: boolean;
  periodLabel: string;
  days: ReportDay[];
  mood: number | null;
  anxiety: number | null;
  sleepHours: number | null;
  checkInDays: number;
  practices: { total: number; detail: string };
};

export function buildWeeklyReport(data: UserData, end: Date = new Date()): WeeklyReport {
  const keys = lastDays(7, end);
  const days: ReportDay[] = keys.map((day) => {
    const averages = dayAverages(data, day);
    const health = data.health[day];
    const date = fromDayKey(day);
    return {
      day,
      label: `${WEEKDAYS_SHORT[date.getDay()]} ${formatShortDate(date)}`,
      checkIns: averages.count,
      mood: averages.mood,
      anxiety: averages.anxiety,
      energy: averages.energy,
      sleepHours: health?.sleepHours ?? null,
      sleepQuality: health?.sleepQuality ?? null,
      activities: dayActivities(data, day),
    };
  });

  const inWeek = new Set(keys);
  const checkIns = data.checkIns.filter((item) => inWeek.has(item.day));
  const weekPractices = practicesSince(data, fromDayKey(keys[0]));
  const summary = practiceSummary(data, weekPractices);
  const hasData =
    checkIns.length > 0 || days.some((day) => day.sleepHours !== null || day.sleepQuality || day.activities.length);

  return {
    hasData,
    periodLabel: `${formatShortDate(fromDayKey(keys[0]))} a ${formatShortDate(fromDayKey(keys[6]))}`,
    days,
    mood: average(checkIns.map((item) => item.mood + 1)),
    anxiety: average(checkIns.map((item) => item.anxiety)),
    sleepHours: average(days.map((day) => day.sleepHours).filter((value): value is number => value !== null)),
    checkInDays: days.filter((day) => day.checkIns > 0).length,
    practices: {
      total: summary.total,
      detail: summary.counts.map((item) => `${TOOL_NAMES[item.tool]} ${item.count}`).join(', '),
    },
  };
}

const show = (value: number | null, suffix = '') => (value === null ? '–' : `${formatDecimal(value)}${suffix}`);

/** Summary lines without anything that identifies the user. */
export function reportLines(report: WeeklyReport): string[] {
  return [
    `Dias com check-in: ${report.checkInDays} de 7`,
    `Humor médio: ${show(report.mood, ' / 5')}`,
    `Ansiedade média: ${show(report.anxiety, ' / 10')}`,
    `Sono médio: ${show(report.sleepHours, ' h')}`,
    `Práticas de autocuidado: ${report.practices.total}${report.practices.detail ? ` (${report.practices.detail})` : ''}`,
  ];
}

export function reportText(report: WeeklyReport, name: string): string {
  const lines = [`Mente Equilibrada — resumo semanal${name ? ` de ${name}` : ''}`, report.periodLabel, '', ...reportLines(report)];
  const withData = report.days.filter((day) => day.checkIns || day.sleepHours !== null || day.activities.length);
  if (withData.length) {
    lines.push('', 'Dia a dia:');
    for (const day of withData) {
      lines.push(
        `• ${day.label}: humor ${show(day.mood)}/5, ansiedade ${show(day.anxiety)}/10, sono ${show(day.sleepHours, ' h')}${
          day.activities.length ? `, ${day.activities.join(', ')}` : ''
        }`,
      );
    }
  }
  return lines.join('\n');
}

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);

/** Self-contained HTML rendered to PDF by `expo-print`. */
export function reportHtml(report: WeeklyReport, name: string): string {
  const rows = report.days
    .map(
      (day) => `<tr>
        <td>${escapeHtml(day.label)}</td>
        <td>${show(day.mood)}</td>
        <td>${show(day.anxiety)}</td>
        <td>${day.sleepHours === null ? '–' : `${formatDecimal(day.sleepHours)} h`}${day.sleepQuality ? ` · ${escapeHtml(day.sleepQuality)}` : ''}</td>
        <td>${day.activities.length ? escapeHtml(day.activities.join(', ')) : '–'}</td>
      </tr>`,
    )
    .join('');

  const cards = [
    ['Humor médio', show(report.mood, ' / 5')],
    ['Ansiedade média', show(report.anxiety, ' / 10')],
    ['Sono médio', show(report.sleepHours, ' h')],
    ['Dias com check-in', `${report.checkInDays} de 7`],
  ]
    .map(([label, value]) => `<div class="card"><div class="label">${label}</div><div class="value">${value}</div></div>`)
    .join('');

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8" />
<title>Relatório semanal — ${escapeHtml(report.periodLabel)}</title>
<style>
  body { font-family: -apple-system, Roboto, 'Segoe UI', sans-serif; color: #1B3A57; margin: 32px; }
  header { border-bottom: 2px solid #35607F; padding-bottom: 12px; margin-bottom: 20px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .period { font-size: 15px; color: #4D6478; }
  .cards { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 24px; }
  .card { flex: 1 1 120px; background: #E9F1F8; border-radius: 12px; padding: 12px; }
  .label { font-size: 12px; color: #4D6478; }
  .value { font-size: 20px; font-weight: 700; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { text-align: left; padding: 8px 6px; border-bottom: 1px solid #D5E2ED; }
  th { color: #4D6478; font-weight: 600; }
  footer { margin-top: 28px; font-size: 11px; color: #4D6478; }
</style></head>
<body>
  <header>
    <h1>Mente Equilibrada — relatório semanal${name ? ` de ${escapeHtml(name)}` : ''}</h1>
    <div class="period">Período: ${escapeHtml(report.periodLabel)}</div>
  </header>
  <div class="cards">${cards}</div>
  <p><strong>Práticas de autocuidado:</strong> ${report.practices.total}${
    report.practices.detail ? ` (${escapeHtml(report.practices.detail)})` : ''
  }</p>
  <table>
    <thead><tr><th>Dia</th><th>Humor (1–5)</th><th>Ansiedade (0–10)</th><th>Sono</th><th>Atividades</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <footer>Gerado em ${escapeHtml(new Date().toLocaleString('pt-BR'))}. Este relatório é um registro pessoal e não substitui acompanhamento profissional.</footer>
</body></html>`;
}
