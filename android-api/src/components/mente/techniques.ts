import type { Href } from 'expo-router';

import type { IconName } from '@/components/mente/icon';
import type { TechniqueShortcut } from '@/data/types';

/**
 * RF-69: the relaxation techniques the user can pin as shortcuts, and where
 * each one opens.
 */
export const TECHNIQUES: Record<TechniqueShortcut, { title: string; detail: string; icon: IconName; href: Href }> = {
  breathing: { title: 'Respiração 4-7-8', detail: '1, 3 ou 5 minutos', icon: 'wave', href: { pathname: '/practice', params: { tool: 'breathing' } } },
  meditation: { title: 'Meditação guiada', detail: 'Áudio e voz', icon: 'moon', href: { pathname: '/practice', params: { tool: 'meditation' } } },
  grounding: { title: 'Grounding 5-4-3-2-1', detail: 'Pelos cinco sentidos', icon: 'anchor', href: { pathname: '/practice', params: { tool: 'grounding' } } },
  affirmations: { title: 'Afirmações', detail: 'Frases para hoje', icon: 'heart', href: { pathname: '/practice', params: { tool: 'affirmations' } } },
  'word-game': { title: 'Jogo de palavras', detail: 'Distração em momentos de ansiedade', icon: 'bulb', href: '/word-game' },
  achievements: { title: 'Minhas conquistas', detail: 'Notas de voz das vitórias', icon: 'mic', href: '/achievements' },
};

export const TECHNIQUE_ORDER = Object.keys(TECHNIQUES) as TechniqueShortcut[];
