/**
 * Calendar helpers. Days are stored as local `YYYY-MM-DD` keys so a check-in
 * made at 23:50 belongs to the day the user saw on screen, not to UTC.
 */

export const WEEKDAYS_LONG = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
] as const;

export const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;
export const WEEKDAY_INITIALS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'] as const;

export const MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
] as const;

const pad = (value: number) => String(value).padStart(2, '0');

export function toDayKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fromDayKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

/** The `count` day keys ending today, oldest first. */
export function lastDays(count: number, end: Date = new Date()): string[] {
  return Array.from({ length: count }, (_, index) => toDayKey(addDays(end, index - count + 1)));
}

/** "Sexta-feira, 24 de Outubro" */
export function formatLongDate(date: Date = new Date()): string {
  return `${WEEKDAYS_LONG[date.getDay()]}, ${date.getDate()} de ${MONTHS[date.getMonth()]}`;
}

/** "24 de Outubro" */
export function formatDayMonth(date: Date): string {
  return `${date.getDate()} de ${MONTHS[date.getMonth()]}`;
}

/** "23 Out" */
export function formatShortDate(date: Date): string {
  return `${date.getDate()} ${MONTHS[date.getMonth()].slice(0, 3)}`;
}

/** "14/10" */
export function formatNumericDate(date: Date): string {
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}`;
}

/** "9:41" */
export function formatTime(date: Date): string {
  return `${date.getHours()}:${pad(date.getMinutes())}`;
}

export function daysBetween(from: Date, to: Date): number {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}
