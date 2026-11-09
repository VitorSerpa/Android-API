import type { DiaryKind, UserData } from '@/data/types';
import { addDays, formatDayMonth, fromDayKey, toDayKey } from '@/lib/dates';

/**
 * RF-63 / US-16: pure helpers behind the interactive word cloud — given the
 * word the user tapped, find the diary entries that contain it. The counting
 * itself stays in `word-cloud.ts`; the tokenizer here mirrors it so a word that
 * shows up in the cloud is always found in the entries it came from.
 */

/** A searchable diary text: free writing / dream, the gratitude items, and the voice-note transcripts. */
export type WordCloudEntry = { id?: string; day: string; kind?: DiaryKind; text: string; createdAt?: string };

export type WordEntryMatch = {
  id?: string;
  day: string;
  kind?: DiaryKind;
  /** How many times the word appears in this entry. */
  count: number;
  /** A short excerpt around the first occurrence. */
  snippet: string;
};

export const KIND_LABELS: Record<DiaryKind, string> = { free: 'Diário', gratitude: 'Gratidão', dream: 'Sonho' };

/** Same normalisation as `word-cloud.ts` (without the stop-word filter). */
export function tokensOf(text: string): string[] {
  return text
    .toLocaleLowerCase('pt-BR')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .map((word) => word.replace(/^-+|-+$/g, ''))
    .filter(Boolean);
}

/** Times `word` appears in `text` as a whole word (case-insensitive). */
export function countWordIn(text: string, word: string): number {
  const target = word.toLocaleLowerCase('pt-BR');
  if (!target) return 0;
  let total = 0;
  for (const token of tokensOf(text)) if (token === target) total += 1;
  return total;
}

/** Turns the diary into the texts the cloud counts, in the same way `diaryWordFrequencies` reads them. */
export function diaryWordEntries(data: Pick<UserData, 'diary'>, { days }: { days?: number } = {}): WordCloudEntry[] {
  const since = days ? toDayKey(addDays(new Date(), -(days - 1))) : '';
  return data.diary
    .filter((entry) => entry.day >= since)
    .map((entry) => ({
      id: entry.id,
      day: entry.day,
      kind: entry.kind,
      createdAt: entry.createdAt,
      text: [
        entry.kind === 'gratitude' ? (entry.gratitude ?? []).join(' ') : entry.text,
        ...entry.attachments.map((attachment) => attachment.transcript ?? ''),
      ]
        .filter(Boolean)
        .join('\n'),
    }));
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Excerpt of `text` around the first whole-word occurrence of `word`, with "…" where it was cut. */
export function wordSnippet(text: string, word: string, radius = 36): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  const match = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(word)}(?![\\p{L}\\p{N}])`, 'iu').exec(flat);
  if (!match) return flat.length > radius * 2 ? `${flat.slice(0, radius * 2).trimEnd()}…` : flat;
  let start = Math.max(0, match.index - radius);
  let end = Math.min(flat.length, match.index + match[0].length + radius);
  // Do not cut words in half.
  if (start > 0) {
    const space = flat.indexOf(' ', start);
    if (space !== -1 && space < match.index) start = space + 1;
  }
  if (end < flat.length) {
    const space = flat.lastIndexOf(' ', end);
    if (space > match.index + match[0].length) end = space;
  }
  return `${start > 0 ? '…' : ''}${flat.slice(start, end)}${end < flat.length ? '…' : ''}`;
}

/** Entries that contain `word`, most recent first (by day, then creation time), at most `limit`. */
export function findWordEntries(
  entries: readonly WordCloudEntry[],
  word: string,
  { limit = 5 }: { limit?: number } = {},
): WordEntryMatch[] {
  return entries
    .map((entry) => ({ entry, count: countWordIn(entry.text, word) }))
    .filter(({ count }) => count > 0)
    .sort(
      (a, b) =>
        b.entry.day.localeCompare(a.entry.day) || (b.entry.createdAt ?? '').localeCompare(a.entry.createdAt ?? ''),
    )
    .slice(0, limit)
    .map(({ entry, count }) => ({
      id: entry.id,
      day: entry.day,
      kind: entry.kind,
      count,
      snippet: wordSnippet(entry.text, word),
    }));
}

/** "1 vez" / "3 vezes". */
export function timesLabel(count: number): string {
  return `${count} ${count === 1 ? 'vez' : 'vezes'}`;
}

/** '"calma" aparece 3 vezes' */
export function wordUsageSummary(word: string, count: number): string {
  return `“${word}” aparece ${timesLabel(count)}`;
}

/** "24 de Outubro · Gratidão" */
export function entryRowLabel(match: Pick<WordEntryMatch, 'day' | 'kind'>): string {
  const date = formatDayMonth(fromDayKey(match.day));
  return match.kind ? `${date} · ${KIND_LABELS[match.kind]}` : date;
}
