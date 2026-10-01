/**
 * Cognitive restructuring (RF-39): spots common thinking traps in a negative
 * automatic thought and offers more balanced alternatives. Rule-based and fully
 * offline; it always returns at least one suggestion (CA-01).
 */

export type Distortion = {
  id: string;
  name: string;
  explanation: string;
  patterns: RegExp[];
  alternatives: string[];
};

const normalise = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

export const DISTORTIONS: readonly Distortion[] = [
  {
    id: 'catastrophizing',
    name: 'Catastrofização',
    explanation: 'Imaginar o pior cenário como se fosse o mais provável.',
    patterns: [/\b(desastre|catastrof|horrivel|terrivel|pior|vai dar (tudo )?errado|arruin|estragar|acabou|fim do mundo)/],
    alternatives: [
      'Mesmo que não saia perfeito, é pouco provável que seja um desastre — e eu consigo lidar com o que vier.',
      'Qual é o resultado mais provável, e não o pior? Já passei por situações parecidas e segui em frente.',
    ],
  },
  {
    id: 'all-or-nothing',
    name: 'Pensamento tudo ou nada',
    explanation: 'Ver as coisas em extremos, sem meio-termo.',
    patterns: [/\b(sempre|nunca|tudo|nada|ninguem|todo mundo|completamente|totalmente|jamais)\b/],
    alternatives: [
      'Nem sempre é assim: houve momentos em que foi diferente. Posso olhar para os tons de cinza.',
      'Algumas coisas não saíram como eu queria, mas outras deram certo.',
    ],
  },
  {
    id: 'labeling',
    name: 'Rotulação',
    explanation: 'Definir a si mesmo por um erro ou característica.',
    patterns: [/\b(sou|me sinto) (um|uma)? ?(fracass|idiota|burr|incapaz|inutil|fraco|fraca|perdedor|horrivel|ruim)/, /\bnao sirvo\b/],
    alternatives: [
      'Cometer um erro não me define. Sou uma pessoa que está aprendendo.',
      'Eu diria isso a um amigo? Posso falar comigo com a mesma gentileza.',
    ],
  },
  {
    id: 'mind-reading',
    name: 'Leitura mental',
    explanation: 'Supor que sabe o que os outros estão pensando.',
    patterns: [/\b(vao|vai|devem|deve) (me )?(achar|pensar|julgar|rir)|\b(acham|pensam) que eu|todo mundo (me )?(odeia|julga)|\bestao (me )?julgando/],
    alternatives: [
      'Não tenho como saber o que os outros pensam. Talvez estejam ocupados com as próprias preocupações.',
      'Que evidências eu tenho de que pensam isso? Posso perguntar em vez de adivinhar.',
    ],
  },
  {
    id: 'fortune-telling',
    name: 'Previsão do futuro',
    explanation: 'Tratar uma previsão negativa como um fato.',
    patterns: [/\b(nao vou conseguir|vou falhar|vou errar|nunca vai|nao vai dar|vai ser (um )?(horror|pessimo))/],
    alternatives: [
      'Não sei o que vai acontecer. Posso me preparar e ver como as coisas vão de fato.',
      'Já achei que não conseguiria antes e consegui. Vou dar um passo de cada vez.',
    ],
  },
  {
    id: 'should',
    name: 'Declarações de “deveria”',
    explanation: 'Cobranças rígidas sobre como você ou os outros deveriam ser.',
    patterns: [/\b(deveria|devia|tenho que|tinha que|preciso ser|nao posso errar)\b/],
    alternatives: [
      'Eu gostaria que fosse diferente, mas não precisa ser perfeito. Estou fazendo o possível.',
      'Posso trocar o “tenho que” por “eu escolho” ou “seria bom se”.',
    ],
  },
  {
    id: 'personalization',
    name: 'Personalização',
    explanation: 'Assumir toda a culpa por algo que tem várias causas.',
    patterns: [/\b(culpa (e )?minha|minha culpa|por minha causa|eu que estraguei)/],
    alternatives: [
      'Muitas coisas contribuíram para isso, não apenas eu. Posso assumir a minha parte sem carregar tudo.',
    ],
  },
];

const GENERAL_ALTERNATIVES = [
  'Esse é um pensamento, não um fato. O que eu diria a um amigo que pensasse assim?',
  'Que evidências confirmam esse pensamento, e quais o contradizem?',
  'Daqui a um mês, quanto isso vai importar? Posso focar no que está ao meu alcance agora.',
];

export type ThoughtAnalysis = {
  distortions: Distortion[];
  suggestions: string[];
};

export function analyseThought(thought: string): ThoughtAnalysis {
  const text = normalise(thought);
  const distortions = text.trim()
    ? DISTORTIONS.filter((item) => item.patterns.some((pattern) => pattern.test(text)))
    : [];
  const suggestions = [...distortions.flatMap((item) => item.alternatives), ...GENERAL_ALTERNATIVES];
  return { distortions, suggestions: [...new Set(suggestions)].slice(0, 4) };
}
