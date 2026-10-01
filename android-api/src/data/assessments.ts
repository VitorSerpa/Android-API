import type { AssessmentKind } from '@/data/types';

type Question = { text: string; reverse?: boolean };

export type AssessmentDefinition = {
  kind: AssessmentKind;
  title: string;
  intro: string;
  options: readonly string[];
  questions: readonly Question[];
  /** Highest possible stored score, for charts and the radar. */
  maxScore: number;
  /** Raw answers (option index per question, after reverse-scoring) → stored score. */
  score: (answers: number[]) => number;
  /** Stored score → short label. */
  describe: (score: number) => string;
  /** Stored score → one or two sentences explaining it (RF-49: "pontuação interpretativa"). */
  interpret: (score: number) => string;
};

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

/**
 * Short self-report scales. Results are indicative only and are presented to
 * the user that way — they are not a diagnosis.
 */
export const ASSESSMENTS: Record<AssessmentKind, AssessmentDefinition> = {
  // RF-47: five questions, 0–4 each → 0–20.
  stress: {
    kind: 'stress',
    title: 'Teste rápido de estresse',
    intro: 'Pensando no último mês, com que frequência…',
    options: ['Nunca', 'Quase nunca', 'Às vezes', 'Com frequência', 'Muito frequentemente'],
    questions: [
      { text: 'você sentiu que era incapaz de controlar as coisas importantes da sua vida?' },
      { text: 'você se sentiu confiante para lidar com seus problemas pessoais?', reverse: true },
      { text: 'você sentiu que as coisas estavam acontecendo do seu jeito?', reverse: true },
      { text: 'você sentiu que as dificuldades se acumulavam a ponto de não conseguir superá-las?' },
      { text: 'você se sentiu nervoso(a) ou tenso(a) por causa de pressões do dia a dia?' },
    ],
    maxScore: 20,
    score: sum,
    describe: (score) => (score <= 6 ? 'Baixo' : score <= 13 ? 'Moderado' : 'Alto'),
    interpret: (score) =>
      score <= 6
        ? 'Seu nível de estresse percebido está baixo. Continue com os hábitos que te fazem bem.'
        : score <= 13
          ? 'Estresse moderado. Pausas curtas, respiração e sono regular costumam ajudar.'
          : 'Estresse alto. Priorize descanso e apoio — e considere conversar com um profissional.',
  },
  // RF-48: WHO-5, five questions 0–5 → raw 0–25, ×4 → 0–100.
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
    maxScore: 100,
    score: (answers) => sum(answers) * 4,
    describe: (score) => `${score} de 100`,
    interpret: (score) =>
      score >= 52
        ? 'Seu bem-estar está dentro do esperado. Acompanhe a pontuação ao longo do tempo.'
        : score > 28
          ? 'Bem-estar abaixo do ideal (menos de 52). Vale observar o que tem pesado nas últimas semanas.'
          : 'Bem-estar bem baixo (28 ou menos). É recomendável procurar um profissional de saúde mental.',
  },
  // RF-49: ten items inspired by the Connor-Davidson resilience scale (adapted wording), 0–4 → 0–40.
  resilience: {
    kind: 'resilience',
    title: 'Resiliência',
    intro: 'Nas últimas semanas, quanto cada frase descreve você?',
    options: ['Nada verdadeiro', 'Raramente', 'Às vezes', 'Frequentemente', 'Quase sempre'],
    questions: [
      { text: 'Consigo me adaptar quando as coisas mudam.' },
      { text: 'Consigo lidar com o que aparecer no meu caminho.' },
      { text: 'Tento ver o lado leve ou engraçado dos problemas.' },
      { text: 'Enfrentar situações estressantes me torna mais forte.' },
      { text: 'Costumo me recuperar depois de doenças, perdas ou dificuldades.' },
      { text: 'Acredito que consigo alcançar meus objetivos, mesmo com obstáculos.' },
      { text: 'Sob pressão, consigo manter o foco e pensar com clareza.' },
      { text: 'Não desanimo facilmente diante de um fracasso.' },
      { text: 'Me vejo como uma pessoa forte diante dos desafios da vida.' },
      { text: 'Consigo lidar com sentimentos desagradáveis, como tristeza, medo e raiva.' },
    ],
    maxScore: 40,
    score: sum,
    describe: (score) => (score <= 20 ? 'Em desenvolvimento' : score <= 30 ? 'Boa' : 'Alta'),
    interpret: (score) =>
      score <= 20
        ? 'Sua resiliência está em desenvolvimento. Rede de apoio, rotina e técnicas de enfrentamento ajudam a fortalecê-la.'
        : score <= 30
          ? 'Boa resiliência: você costuma se recuperar das dificuldades. Continue cultivando o que te sustenta.'
          : 'Resiliência alta: você tende a se adaptar bem e a se recuperar rápido dos contratempos.',
  },
};

/** Applies reverse scoring so every answer points the same way. */
export function normaliseAnswers(definition: AssessmentDefinition, answers: number[]): number[] {
  const max = definition.options.length - 1;
  return answers.map((value, index) => (definition.questions[index].reverse ? max - value : value));
}
