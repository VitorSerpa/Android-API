import type { UserData } from '@/data/types';
import { addDays, toDayKey } from '@/lib/dates';

/**
 * RF-63 / US-16: the words written most often in the emotional diary — free
 * writing, dreams, gratitude and the transcripts of voice notes (RF-60).
 *
 * CA-02: common words (articles, prepositions, pronouns, conjunctions and the
 * most frequent auxiliary verbs) are ignored, and each word's weight is its
 * frequency, which the screen turns into a proportional font size.
 */

const STOPWORDS = new Set(
  `a à às ao aos as o os um uma uns umas de do da dos das no na nos nas num numa em por pelo pela pelos pelas para pra pro
  com sem sob sobre entre até após ante contra desde perante trás e ou mas porém nem que se como quando onde porque pois
  então já também só ainda mais menos muito muita muitos muitas pouco pouca bem mal tão tanto quanto cada todo toda todos
  todas outro outra outros outras mesmo mesma eu tu ele ela nós vós eles elas você vocês me te se nos vos lhe lhes meu minha
  meus minhas teu tua seu sua seus suas nosso nossa dele dela deles delas isso isto aquilo esse essa esses essas este esta
  estes estas aquele aquela aqueles aquelas aqui ali lá aí não sim é ser sou era foi fui são estar estou está estava estão
  ter tenho tem tinha teve há haver vai vou ir fazer faz fiz feito ficar fiquei fica dia hoje coisa coisas algo alguém
  qual quais quem lo la los las tá tô né pq tb vc depois antes agora sempre nunca talvez apenas quase logo assim lá cá`.split(/\s+/),
);

const MIN_LENGTH = 3;

function wordsOf(text: string): string[] {
  return text
    .toLocaleLowerCase('pt-BR')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .map((word) => word.replace(/^-+|-+$/g, ''))
    .filter((word) => word.length >= MIN_LENGTH && !STOPWORDS.has(word) && !/^\d+$/.test(word));
}

export type WordWeight = { word: string; count: number };

/** Most frequent words in the last `days` days (all time when omitted), heaviest first. */
export function diaryWordFrequencies(data: UserData, { days, limit = 40 }: { days?: number; limit?: number } = {}): WordWeight[] {
  const since = days ? toDayKey(addDays(new Date(), -(days - 1))) : '';
  const counts = new Map<string, number>();
  const add = (text: string | undefined | null) => {
    for (const word of wordsOf(text ?? '')) counts.set(word, (counts.get(word) ?? 0) + 1);
  };

  for (const entry of data.diary) {
    if (entry.day < since) continue;
    add(entry.kind === 'gratitude' ? (entry.gratitude ?? []).join(' ') : entry.text);
    for (const attachment of entry.attachments) add(attachment.transcript);
  }

  return [...counts.entries()]
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word, 'pt-BR'))
    .slice(0, limit);
}

/** Font size proportional to frequency, between `min` and `max` points. */
export function fontSizeFor(count: number, lowest: number, highest: number, min = 13, max = 34): number {
  if (highest <= lowest) return Math.round((min + max) / 2);
  return Math.round(min + ((count - lowest) / (highest - lowest)) * (max - min));
}
