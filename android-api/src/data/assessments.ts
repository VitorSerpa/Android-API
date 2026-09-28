import type { AssessmentKind } from '@/data/types';

type Question = { text: string; reverse?: boolean };

export type AssessmentDefinition = {
  kind: AssessmentKind;
  title: string;
  intro: string;
  options: readonly string[];
  questions: readonly Question[];
  /** Raw answers (option index per question, after reverse-scoring) → stored score. */
  score: (answers: number[]) => number;
  /** Stored score → the short label shown in Rotina e evolução. */
  describe: (score: number) => string;
};

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

/**
 * Short, widely used self-report scales. Results are indicative only and are
 * presented to the user that way — they are not a diagnosis.
 */
export const ASSESSMENTS: Record<AssessmentKind, AssessmentDefinition> = {
  stress: {
    kind: 'stress',
    title: 'Nível de estresse',
    intro: 'Pensando no último mês, com que frequência…',
    options: ['Nunca', 'Quase nunca', 'Às vezes', 'Com frequência', 'Muito frequentemente'],
    questions: [
      { text: 'você sentiu que era incapaz de controlar as coisas importantes da sua vida?' },
      { text: 'você se sentiu confiante para lidar com seus problemas pessoais?', reverse: true },
      { text: 'você sentiu que as coisas estavam acontecendo do seu jeito?', reverse: true },
      { text: 'você sentiu que as dificuldades se acumulavam a ponto de não conseguir superá-las?' },
    ],
    score: sum,
    describe: (score) => (score <= 5 ? 'Baixo' : score <= 10 ? 'Moderado' : 'Alto'),
  },
  wellbeing: {
    kind: 'wellbeing',
    title: 'Bem-estar geral (WHO-5)',
    intro: 'Nas últimas duas semanas…',
    options: [
      'Em nenhum momento',
      'Algumas vezes',
      'Menos da metade do tempo',
      'Mais da metade do tempo',
      'A maior parte do tempo',
      'O tempo todo',
    ],
    questions: [
      { text: 'Tenho me sentido alegre e de bom humor.' },
      { text: 'Tenho me sentido calmo(a) e tranquilo(a).' },
      { text: 'Tenho me sentido ativo(a) e com energia.' },
      { text: 'Tenho acordado me sentindo descansado(a).' },
      { text: 'Meu dia a dia tem sido cheio de coisas que me interessam.' },
    ],
    score: (answers) => sum(answers) * 4,
    describe: (score) => `${score} de 100`,
  },
  resilience: {
    kind: 'resilience',
    title: 'Resiliência',
    intro: 'Quanto você concorda com cada frase?',
    options: ['Discordo totalmente', 'Discordo', 'Neutro', 'Concordo', 'Concordo totalmente'],
    questions: [
      { text: 'Costumo me recuperar rapidamente depois de momentos difíceis.' },
      { text: 'Tenho dificuldade em passar por eventos estressantes.', reverse: true },
      { text: 'Não demoro muito para me recuperar de um evento estressante.' },
      { text: 'É difícil me recuperar quando algo ruim acontece.', reverse: true },
      { text: 'Costumo passar por momentos difíceis sem grandes problemas.' },
      { text: 'Costumo demorar para superar contratempos na minha vida.', reverse: true },
    ],
    // Mean on the 1–5 scale, kept to one decimal.
    score: (answers) => Math.round((sum(answers.map((value) => value + 1)) / answers.length) * 10) / 10,
    describe: (score) => (score < 3 ? 'Baixa' : score <= 4.3 ? 'Boa' : 'Alta'),
  },
};

/** Applies reverse scoring so every answer points the same way. */
export function normaliseAnswers(definition: AssessmentDefinition, answers: number[]): number[] {
  const max = definition.options.length - 1;
  return answers.map((value, index) =>
    definition.questions[index].reverse ? max - value : value,
  );
}
