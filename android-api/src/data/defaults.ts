import {
  DATA_VERSION,
  type CheckIn,
  type DailyHealth,
  type DiaryEntry,
  type Goal,
  type LifeProfile,
  type Reminder,
  type SleepQuality,
  type UserData,
} from '@/data/types';
import { fromDayKey } from '@/lib/dates';
import { createId } from '@/lib/id';

export const DEFAULT_PROFILES: readonly LifeProfile[] = [
  { id: 'trabalho', name: 'Trabalho' },
  { id: 'familia', name: 'Família' },
  { id: 'lazer', name: 'Lazer' },
];

function defaultReminders(): Reminder[] {
  return [
    // RF-04: ao acordar, ao meio-dia e ao dormir.
    { id: createId(), kind: 'checkin', title: 'Check-in de humor', times: ['08:00', '12:00', '21:30'], enabled: true, doneOn: null },
    { id: createId(), kind: 'hydration', title: 'Beber água', times: ['09:00', '11:00', '13:00', '15:00', '17:00', '19:00'], enabled: false, doneOn: null },
    { id: createId(), kind: 'break', title: 'Pausa ativa', times: ['10:30', '15:30'], enabled: false, doneOn: null },
    { id: createId(), kind: 'stretch', title: 'Alongamento', times: ['16:00'], enabled: false, doneOn: null },
  ];
}

function defaultGoals(): Goal[] {
  return [
    { id: createId(), kind: 'practiceMinutes', title: 'Meditar 10 minutos por dia', target: 10, period: 'day', tool: 'meditation', log: [] },
    { id: createId(), kind: 'checkins', title: 'Check-in 5 dias por semana', target: 5, period: 'week', log: [] },
  ];
}

/** What a brand-new account starts with. */
export function createDefaultUserData(): UserData {
  return {
    version: DATA_VERSION,
    checkIns: [],
    health: {},
    diary: [],
    practices: [],
    ratings: [],
    thoughts: [],
    phrases: [],
    favoriteAffirmations: [],
    reminders: defaultReminders(),
    medications: [],
    intakes: [],
    goals: defaultGoals(),
    assessments: [],
    contacts: [],
    crises: [],
    actionPlan: [
      'Sair do ambiente e beber água',
      'Respiração 4-7-8 por 4 ciclos',
      'Mandar mensagem para alguém de confiança',
    ],
    profiles: [...DEFAULT_PROFILES],
    customSymptoms: [],
    customActivities: [],
    water: {},
    invites: [],
    integrations: { spotify: null, healthConnect: null },
    settings: {
      offlineMode: false,
      quietHours: { enabled: true, start: '22:00', end: '07:00' },
      digitalRest: { enabled: false, start: '21:30', end: '07:00', skippedOn: null },
      crisisLocation: false,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Version 1 → 2                                                       */
/* ------------------------------------------------------------------ */

type V1CheckIn = {
  day: string;
  mood: number;
  anxiety: number;
  energy: number;
  sleep?: SleepQuality;
  symptoms?: string[];
  activity?: string;
  weight?: string;
  savedAt?: string;
};

type V1Diary = {
  id: string;
  day: string;
  profile?: string;
  text: string;
  collections?: string[];
  createdAt: string;
  updatedAt: string;
};

type V1 = Record<string, unknown> & {
  version?: number;
  checkIns?: Record<string, V1CheckIn>;
  diary?: V1Diary[];
  reminders?: { id: string; title: string; schedule?: string; enabled: boolean; doneOn: string | null }[];
  goals?: unknown[];
  settings?: { offlineMode?: boolean; digitalRest?: boolean; quietHours?: boolean };
  assessments?: { kind: string; at: string; score: number }[];
  crises?: { id: string; at: string; intensity: number; trigger?: string; place?: string; note?: string }[];
};

const PROFILE_BY_NAME: Record<string, string> = { Trabalho: 'trabalho', Família: 'familia', Lazer: 'lazer' };

function parseNumber(text: string | undefined): number | null {
  const match = /(\d+(?:[.,]\d+)?)/.exec(text ?? '');
  if (!match) return null;
  const value = Number(match[1].replace(',', '.'));
  return Number.isFinite(value) && value > 0 ? value : null;
}

function migrateV1(stored: V1): Partial<UserData> {
  const checkIns: CheckIn[] = [];
  const health: Record<string, DailyHealth> = {};

  for (const old of Object.values(stored.checkIns ?? {})) {
    const at = old.savedAt ?? fromDayKey(old.day).toISOString();
    checkIns.push({
      id: createId(),
      day: old.day,
      at,
      mood: old.mood,
      anxiety: old.anxiety,
      anxietyNote: '',
      energy: old.energy,
      profileId: null,
    });
    const activity = old.activity?.trim() ?? '';
    health[old.day] = {
      day: old.day,
      sleepHours: null,
      awakenings: null,
      sleepQuality: old.sleep ?? null,
      sleepSource: old.sleep ? 'manual' : null,
      symptoms: old.symptoms ?? [],
      activities: activity ? ['Exercício'] : [],
      weightKg: parseNumber(old.weight),
      activityMinutes: parseNumber(activity),
      updatedAt: at,
    };
  }

  const diary: DiaryEntry[] = (stored.diary ?? []).map((old) => {
    const isDream = old.collections?.includes('Sonhos');
    return {
      id: old.id,
      day: old.day,
      kind: isDream ? 'dream' : 'free',
      profileId: (old.profile && PROFILE_BY_NAME[old.profile]) || null,
      text: old.text,
      gratitude: null,
      dreamEmotion: null,
      attachments: [],
      createdAt: old.createdAt,
      updatedAt: old.updatedAt,
    };
  });

  const defaults = createDefaultUserData();
  const reminders: Reminder[] = (stored.reminders ?? []).map((old) => ({
    id: old.id,
    kind: /check-?in/i.test(old.title) ? 'checkin' : /hidrata|água/i.test(old.title) ? 'hydration' : 'custom',
    title: old.title,
    times: /check-?in/i.test(old.title) ? ['08:00', '12:00', '21:30'] : ['09:00'],
    enabled: old.enabled,
    doneOn: old.doneOn,
  }));

  return {
    ...(stored as Partial<UserData>),
    checkIns,
    health,
    diary,
    reminders: reminders.length ? reminders : defaults.reminders,
    goals: defaults.goals,
    assessments: (stored.assessments ?? []).map((item) => ({ ...item, id: createId() })) as UserData['assessments'],
    crises: (stored.crises ?? []).map((old) => ({
      id: old.id,
      at: old.at,
      intensity: old.intensity,
      triggers: { situation: old.trigger ?? '', place: old.place ?? '', thought: '' },
      note: old.note ?? '',
      location: null,
    })),
    settings: {
      ...defaults.settings,
      offlineMode: stored.settings?.offlineMode ?? defaults.settings.offlineMode,
      quietHours: { ...defaults.settings.quietHours, enabled: stored.settings?.quietHours ?? true },
      digitalRest: { ...defaults.settings.digitalRest, enabled: stored.settings?.digitalRest ?? false },
    },
  };
}

/**
 * Upgrades a stored document to the current schema and fills in fields added
 * later, so older installs keep loading as the schema grows.
 */
export function migrate(stored: Record<string, unknown>): UserData {
  const upgraded = (stored.version ?? 1) === 1 ? migrateV1(stored as V1) : (stored as Partial<UserData>);
  const defaults = createDefaultUserData();
  return {
    ...defaults,
    ...upgraded,
    integrations: { ...defaults.integrations, ...upgraded.integrations },
    settings: {
      ...defaults.settings,
      ...upgraded.settings,
      quietHours: { ...defaults.settings.quietHours, ...upgraded.settings?.quietHours },
      digitalRest: { ...defaults.settings.digitalRest, ...upgraded.settings?.digitalRest },
    },
    version: DATA_VERSION,
  };
}
