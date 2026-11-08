/**
 * RF-73: word-association game for moments of anxiety. Pure rules and the
 * bundled word lists — it works without internet (US-20 CA-02).
 *
 * Each round shows words one at a time and the user taps the category it
 * belongs to. It is deliberately gentle: no timer, mistakes just show the
 * right answer, so attention moves to a simple task instead of the worry.
 */

export type WordCategory = { id: string; name: string; words: readonly string[] };

export const WORD_CATEGORIES: readonly WordCategory[] = [
  { id: 'frutas', name: 'Frutas', words: ['Manga', 'Banana', 'Caju', 'Morango', 'Abacaxi', 'Goiaba', 'Uva', 'Melancia', 'Laranja', 'Pitanga'] },
  { id: 'animais', name: 'Animais', words: ['Tartaruga', 'Coruja', 'Golfinho', 'Capivara', 'Beija-flor', 'Gato', 'Elefante', 'Tucano', 'Coelho', 'Baleia'] },
  { id: 'natureza', name: 'Natureza', words: ['Cachoeira', 'Montanha', 'Floresta', 'Rio', 'Arco-íris', 'Praia', 'Nuvem', 'Lago', 'Jardim', 'Pôr do sol'] },
  { id: 'casa', name: 'Coisas de casa', words: ['Almofada', 'Cobertor', 'Caneca', 'Abajur', 'Tapete', 'Sofá', 'Travesseiro', 'Cortina', 'Chaleira', 'Prateleira'] },
  { id: 'cores', name: 'Cores', words: ['Azul', 'Verde', 'Lilás', 'Amarelo', 'Turquesa', 'Coral', 'Bege', 'Vinho', 'Dourado', 'Lavanda'] },
  { id: 'musica', name: 'Música', words: ['Violão', 'Piano', 'Flauta', 'Tambor', 'Melodia', 'Canção', 'Ritmo', 'Violino', 'Coral de vozes', 'Harpa'] },
];

export const ROUND_LENGTH = 10;
const CATEGORIES_PER_ROUND = 3;

export type Round = {
  categories: WordCategory[];
  /** Words in play order, each with the id of the category it belongs to. */
  words: { word: string; categoryId: string }[];
};

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const list = [...items];
  for (let index = list.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [list[index], list[other]] = [list[other], list[index]];
  }
  return list;
}

/** A new round: three categories and ten words drawn from them. */
export function newRound(random: () => number = Math.random): Round {
  const categories = shuffle(WORD_CATEGORIES, random).slice(0, CATEGORIES_PER_ROUND);
  const pool = categories.flatMap((category) => category.words.map((word) => ({ word, categoryId: category.id })));
  return { categories, words: shuffle(pool, random).slice(0, ROUND_LENGTH) };
}

/** Kind words for the end of a round, whatever the score. */
export function roundMessage(correct: number, total: number): string {
  if (correct === total) return 'Rodada perfeita! Sua atenção está toda aqui, no presente.';
  if (correct >= total * 0.7) return 'Muito bem! Perceba como sua mente se concentrou na tarefa.';
  return 'Cada palavra é um passo de volta para o agora. Que tal mais uma rodada?';
}
