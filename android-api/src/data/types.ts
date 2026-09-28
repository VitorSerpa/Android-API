/**
 * Everything the app records for one signed-in user. It is stored as a single
 * document per user id (see `repository.ts`), which keeps one account's data
 * from leaking into another's on a shared device and maps cleanly onto a
 * future `/users/:id/...` API.
 */

export const LIFE_PROFILES = ['Trabalho', 'Família', 'Lazer'] as const;
export type LifeProfile = (typeof LIFE_PROFILES)[number];

export const MOODS = ['Muito mal', 'Mal', 'Neutro', 'Bem', 'Ótimo'] as const;
export const SLEEP_QUALITY = ['Ruim', 'Regular', 'Boa', 'Ótima'] as const;
export type SleepQuality = (typeof SLEEP_QUALITY)[number];

export const DEFAULT_SYMPTOMS = ['Dor de cabeça', 'Tensão', 'Cansaço'] as const;

export const COLLECTIONS = ['Gratidão', 'Sonhos'] as const;
export type Collection = (typeof COLLECTIONS)[number];

export type CheckIn = {
  /** `YYYY-MM-DD`; one check-in per day, re-saving overwrites it. */
  day: string;
  /** Index into `MOODS`, 0 (muito mal) … 4 (ótimo). */
  mood: number;
  /** 0 (calma) … 10 (intensa). */
  anxiety: number;
  /** 1 … 5. */
  energy: number;
  sleep: SleepQuality;
  symptoms: string[];
  activity: string;
  weight: string;
  savedAt: string;
};

export type DiaryEntry = {
  id: string;
  day: string;
  profile: LifeProfile;
  text: string;
  collections: Collection[];
  createdAt: string;
  updatedAt: string;
};

export type ToolId = 'breathing' | 'meditation' | 'grounding' | 'affirmations';

export type Practice = {
  id: string;
  tool: ToolId;
  at: string;
  durationSec: number;
};

export type ThoughtRecord = {
  id: string;
  negative: string;
  feeling: string;
  alternative: string;
  at: string;
};

export type Reminder = {
  id: string;
  title: string;
  schedule: string;
  enabled: boolean;
  /** Day key of the last time it was ticked off. */
  doneOn: string | null;
};

/** Built-in goals are measured from the user's data; custom ones are counted by hand. */
export type GoalKind = 'checkinsPerWeek' | 'meditationMinutesPerMonth' | 'custom';

export type Goal = {
  id: string;
  kind: GoalKind;
  title: string;
  target: number;
  /** Only used by `custom` goals. */
  progress: number;
};

export type AssessmentKind = 'stress' | 'wellbeing' | 'resilience';

export type AssessmentResult = {
  kind: AssessmentKind;
  at: string;
  score: number;
};

export type Contact = {
  id: string;
  name: string;
  phone: string;
};

export type CrisisLog = {
  id: string;
  at: string;
  intensity: number;
  trigger: string;
  place: string;
  note: string;
};

/** Preferences. Honoured by sync/notifications once those exist; stored now. */
export type Settings = {
  offlineMode: boolean;
  digitalRest: boolean;
  quietHours: boolean;
};

export type UserData = {
  version: 1;
  checkIns: Record<string, CheckIn>;
  diary: DiaryEntry[];
  practices: Practice[];
  thoughts: ThoughtRecord[];
  reminders: Reminder[];
  goals: Goal[];
  assessments: AssessmentResult[];
  contacts: Contact[];
  crises: CrisisLog[];
  actionPlan: string[];
  customSymptoms: string[];
  /** Glasses of water per day key. */
  water: Record<string, number>;
  suggestionRating: string | null;
  settings: Settings;
};
