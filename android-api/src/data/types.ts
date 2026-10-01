/**
 * Everything the app records for one signed-in user. It is stored as a single
 * document per user id (see `repository.ts`), which keeps one account's data
 * from leaking into another's on a shared device and maps cleanly onto a
 * future `/users/:id/...` API.
 */

export const DATA_VERSION = 2;

/** RF-01: five levels, "muito triste" … "muito feliz". Stored as the index 0…4. */
export const MOODS = ['Muito triste', 'Triste', 'Neutro', 'Feliz', 'Muito feliz'] as const;
export const MOOD_MIN = 0;
export const MOOD_MAX = MOODS.length - 1;
export const ANXIETY_MIN = 0;
export const ANXIETY_MAX = 10;
export const ENERGY_MIN = 1;
export const ENERGY_MAX = 5;

export const SLEEP_QUALITY = ['Ruim', 'Regular', 'Boa', 'Ótima'] as const;
export type SleepQuality = (typeof SLEEP_QUALITY)[number];

/** RF-12: offered by default; users can add their own. */
export const DEFAULT_SYMPTOMS = ['Dor de cabeça', 'Cansaço', 'Tensão muscular'] as const;

/** RF-14: activities that can be correlated with mood (RF-16). Users can add their own. */
export const DEFAULT_ACTIVITIES = ['Exercício', 'Meditação', 'Leitura', 'Interações sociais'] as const;

/** RF-08. */
export const DREAM_EMOTIONS = [
  'Alegria',
  'Tranquilidade',
  'Surpresa',
  'Confusão',
  'Ansiedade',
  'Medo',
  'Tristeza',
  'Raiva',
] as const;
export type DreamEmotion = (typeof DREAM_EMOTIONS)[number];

export type LifeProfile = {
  id: string;
  name: string;
};

/** RF-01…RF-03: one check-in = mood + anxiety + energy, saved together with date and time (CA-01). */
export type CheckIn = {
  id: string;
  /** Local `YYYY-MM-DD` of `at`. */
  day: string;
  /** ISO timestamp. */
  at: string;
  /** Index into `MOODS`. */
  mood: number;
  anxiety: number;
  /** RF-02: optional. */
  anxietyNote: string;
  energy: number;
  /** RF-52: life context the check-in belongs to. */
  profileId: string | null;
};

/** RF-12…RF-15: one per day. Numeric fields are `null` until informed. */
export type DailyHealth = {
  day: string;
  sleepHours: number | null;
  awakenings: number | null;
  sleepQuality: SleepQuality | null;
  /** RF-57: where the sleep hours came from. */
  sleepSource: 'manual' | 'health-connect' | null;
  symptoms: string[];
  activities: string[];
  weightKg: number | null;
  /** Minutes of physical activity in the day. */
  activityMinutes: number | null;
  updatedAt: string;
};

export type AttachmentKind = 'photo' | 'audio';

export type Attachment = {
  id: string;
  kind: AttachmentKind;
  /** File in the app's document directory (native) or a data/blob URI (web). */
  uri: string;
  durationSec?: number;
  createdAt: string;
};

export type DiaryKind = 'free' | 'gratitude' | 'dream';

export type DiaryEntry = {
  id: string;
  day: string;
  kind: DiaryKind;
  profileId: string | null;
  /** Free writing, or the dream's description. */
  text: string;
  /** RF-07: the three good things, only for `gratitude`. */
  gratitude: [string, string, string] | null;
  /** RF-08: only for `dream`. */
  dreamEmotion: DreamEmotion | null;
  /** RF-09/RF-10. */
  attachments: Attachment[];
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

/** RF-46: how useful a technique was, 1…5 stars. */
export type TechniqueRating = {
  id: string;
  tool: ToolId;
  stars: number;
  at: string;
};

export type ThoughtRecord = {
  id: string;
  negative: string;
  feeling: string;
  alternative: string;
  /** Distortion ids detected by `thoughts.ts` when the record was saved. */
  distortions: string[];
  at: string;
};

/** RF-41: the user's own affirmations and motivational messages. */
export type UserPhrase = {
  id: string;
  kind: 'affirmation' | 'motivation';
  text: string;
  createdAt: string;
};

export type ReminderKind = 'checkin' | 'hydration' | 'break' | 'stretch' | 'custom';

export type Reminder = {
  id: string;
  kind: ReminderKind;
  title: string;
  /** `HH:MM`, local time, sorted. */
  times: string[];
  enabled: boolean;
  /** Day key of the last time it was ticked off in the app. */
  doneOn: string | null;
};

/** RF-17. */
export type Medication = {
  id: string;
  name: string;
  dosage: string;
  times: string[];
  enabled: boolean;
  createdAt: string;
};

/** RF-18/CA-01: a confirmed dose, with the time it was taken. */
export type MedicationIntake = {
  id: string;
  medicationId: string;
  day: string;
  /** Scheduled `HH:MM` this intake answers. */
  time: string;
  takenAt: string;
};

export type GoalPeriod = 'day' | 'week' | 'month';

/** RF-44: built-in goals are measured from the user's records, so progress updates the same day (CA-01). */
export type GoalKind = 'practiceMinutes' | 'practiceSessions' | 'checkins' | 'activityDays' | 'custom';

export type Goal = {
  id: string;
  kind: GoalKind;
  title: string;
  target: number;
  period: GoalPeriod;
  /** For practice goals: which tool counts (any when omitted). */
  tool?: ToolId;
  /** For `activityDays`. */
  activity?: string;
  /** For `custom`: ISO timestamps of each manual "+1". */
  log: string[];
};

export type AssessmentKind = 'stress' | 'wellbeing' | 'resilience';

export type AssessmentResult = {
  id: string;
  kind: AssessmentKind;
  at: string;
  score: number;
};

export type Contact = {
  id: string;
  name: string;
  phone: string;
};

export type Coordinates = { latitude: number; longitude: number; accuracy: number | null };

/** RF-33…RF-35. */
export type CrisisLog = {
  id: string;
  at: string;
  intensity: number;
  /** RF-34: what may have set it off. Empty strings when unanswered. */
  triggers: { situation: string; place: string; thought: string };
  note: string;
  /** RF-35: only with the user's explicit permission. */
  location: Coordinates | null;
};

export type TimeWindow = { enabled: boolean; start: string; end: string };

export type Settings = {
  /** RF-37: nothing leaves the device, no network request is made. */
  offlineMode: boolean;
  /** RF-20: no notification inside this window; reminders move to its end. */
  quietHours: TimeWindow;
  /** RF-53: only the breathing screen is reachable inside this window. */
  digitalRest: TimeWindow & { skippedOn: string | null };
  /** RF-35: ask for and store the location of anxiety peaks. */
  crisisLocation: boolean;
};

/** RF-55: a trusted person who receives an anonymous weekly summary. */
export type SupporterInvite = {
  token: string;
  url: string;
  label: string;
  createdAt: string;
  /** Week key of the last summary sent, so each week is sent once. */
  lastSentWeek: string | null;
};

export type Integrations = {
  spotify: { displayName: string; connectedAt: string } | null;
  healthConnect: { connectedAt: string; lastSyncAt: string | null } | null;
};

export type UserData = {
  version: typeof DATA_VERSION;
  checkIns: CheckIn[];
  health: Record<string, DailyHealth>;
  diary: DiaryEntry[];
  practices: Practice[];
  ratings: TechniqueRating[];
  thoughts: ThoughtRecord[];
  phrases: UserPhrase[];
  /** Ids of favourite affirmations (built-in `b:*` or a `UserPhrase` id). */
  favoriteAffirmations: string[];
  reminders: Reminder[];
  medications: Medication[];
  intakes: MedicationIntake[];
  goals: Goal[];
  assessments: AssessmentResult[];
  contacts: Contact[];
  crises: CrisisLog[];
  actionPlan: string[];
  profiles: LifeProfile[];
  customSymptoms: string[];
  customActivities: string[];
  /** Glasses of water per day key. */
  water: Record<string, number>;
  invites: SupporterInvite[];
  integrations: Integrations;
  settings: Settings;
};
