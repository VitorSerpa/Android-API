import type { UserData } from '@/data/types';

/** Built-in affirmations (RF-40). Ids are stable so favourites survive updates. */
export const BUILT_IN_AFFIRMATIONS: readonly { id: string; text: string }[] = [
  { id: 'b:1', text: 'Eu mereço cuidado, inclusive o meu.' },
  { id: 'b:2', text: 'Posso ir devagar e ainda assim chegar.' },
  { id: 'b:3', text: 'Meus sentimentos são válidos, e eles passam.' },
  { id: 'b:4', text: 'Já superei dias difíceis antes.' },
  { id: 'b:5', text: 'Estou fazendo o melhor que posso com o que tenho hoje.' },
  { id: 'b:6', text: 'Não preciso ser perfeito(a) para ter valor.' },
  { id: 'b:7', text: 'Respirar fundo também é uma forma de seguir em frente.' },
  { id: 'b:8', text: 'Posso pedir ajuda sem deixar de ser forte.' },
  { id: 'b:9', text: 'Um passo pequeno ainda é um passo.' },
  { id: 'b:10', text: 'Eu escolho ser gentil comigo agora.' },
];

export const DEFAULT_MOTIVATION = {
  good: [
    'Que bom dia! Guarde este momento para lembrar nos dias difíceis.',
    'Você está cuidando bem de si. Continue assim.',
    'Celebre as pequenas vitórias de hoje — elas contam.',
  ],
  neutral: [
    'Registrar como você está já é um ato de cuidado.',
    'Dias comuns também constroem o equilíbrio.',
    'Obrigado por reservar um momento para você.',
  ],
  hard: [
    'Dias difíceis passam. Você não precisa resolver tudo hoje.',
    'Seja gentil consigo: descansar também é avançar.',
    'Você já atravessou dias assim antes. Um passo de cada vez.',
  ],
} as const;

/** Shown when the emergency mode opens (RF-31). */
export const COMFORT_PHRASES = [
  'Você não está só.',
  'Isso que você sente vai passar.',
  'Você está seguro(a) agora. Respire comigo.',
  'Não precisa resolver tudo agora. Só o próximo passo.',
  'Sentir é humano. Você está fazendo o que pode.',
] as const;

export type Affirmation = { id: string; text: string; custom: boolean };

/** Built-in plus the user's own affirmations (RF-41). */
export function allAffirmations(data: UserData): Affirmation[] {
  return [
    ...BUILT_IN_AFFIRMATIONS.map((item) => ({ ...item, custom: false })),
    ...data.phrases.filter((item) => item.kind === 'affirmation').map((item) => ({ id: item.id, text: item.text, custom: true })),
  ];
}

/** A random affirmation, avoiding `exceptId` so each opening can differ (CA-02). */
export function randomAffirmation(data: UserData, exceptId?: string): Affirmation {
  const pool = allAffirmations(data);
  const candidates = pool.length > 1 ? pool.filter((item) => item.id !== exceptId) : pool;
  return candidates[Math.floor(Math.random() * candidates.length)];
}
