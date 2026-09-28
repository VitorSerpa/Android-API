import { createContext, use, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';

import { createDefaultUserData, migrate } from '@/data/defaults';
import { userDataRepository } from '@/data/repository';
import type {
  AssessmentKind,
  CheckIn,
  Collection,
  Contact,
  CrisisLog,
  LifeProfile,
  Settings,
  ThoughtRecord,
  ToolId,
  UserData,
} from '@/data/types';
import { toDayKey } from '@/lib/dates';
import { createId } from '@/lib/id';

type Recipe = (data: UserData) => UserData;

function createActions(update: (recipe: Recipe) => void) {
  const now = () => new Date().toISOString();

  return {
    saveCheckIn: (checkIn: Omit<CheckIn, 'savedAt'>) =>
      update((data) => ({
        ...data,
        checkIns: { ...data.checkIns, [checkIn.day]: { ...checkIn, savedAt: now() } },
      })),

    addCustomSymptom: (symptom: string) =>
      update((data) =>
        data.customSymptoms.includes(symptom)
          ? data
          : { ...data, customSymptoms: [...data.customSymptoms, symptom] },
      ),

    /** Creates the entry when `id` is omitted. Returns the entry id. */
    saveDiaryEntry: (entry: {
      id?: string;
      day: string;
      profile: LifeProfile;
      text: string;
      collections: Collection[];
    }) => {
      const id = entry.id ?? createId();
      update((data) => {
        const existing = data.diary.find((item) => item.id === id);
        const saved = {
          ...entry,
          id,
          createdAt: existing?.createdAt ?? now(),
          updatedAt: now(),
        };
        return {
          ...data,
          diary: existing
            ? data.diary.map((item) => (item.id === id ? saved : item))
            : [saved, ...data.diary],
        };
      });
      return id;
    },

    deleteDiaryEntry: (id: string) =>
      update((data) => ({ ...data, diary: data.diary.filter((item) => item.id !== id) })),

    logPractice: (tool: ToolId, durationSec: number) =>
      update((data) => ({
        ...data,
        practices: [{ id: createId(), tool, durationSec, at: now() }, ...data.practices],
      })),

    saveThought: (record: Omit<ThoughtRecord, 'id' | 'at'>) =>
      update((data) => ({
        ...data,
        thoughts: [{ ...record, id: createId(), at: now() }, ...data.thoughts],
      })),

    addReminder: (title: string, schedule: string) =>
      update((data) => ({
        ...data,
        reminders: [
          ...data.reminders,
          { id: createId(), title, schedule, enabled: true, doneOn: null },
        ],
      })),

    toggleReminder: (id: string) =>
      update((data) => ({
        ...data,
        reminders: data.reminders.map((item) =>
          item.id === id ? { ...item, enabled: !item.enabled } : item,
        ),
      })),

    toggleReminderDone: (id: string) => {
      const today = toDayKey();
      update((data) => ({
        ...data,
        reminders: data.reminders.map((item) =>
          item.id === id ? { ...item, doneOn: item.doneOn === today ? null : today } : item,
        ),
      }));
    },

    removeReminder: (id: string) =>
      update((data) => ({ ...data, reminders: data.reminders.filter((item) => item.id !== id) })),

    addGoal: (title: string, target: number) =>
      update((data) => ({
        ...data,
        goals: [...data.goals, { id: createId(), kind: 'custom', title, target, progress: 0 }],
      })),

    incrementGoal: (id: string) =>
      update((data) => ({
        ...data,
        goals: data.goals.map((goal) =>
          goal.id === id ? { ...goal, progress: Math.min(goal.progress + 1, goal.target) } : goal,
        ),
      })),

    removeGoal: (id: string) =>
      update((data) => ({ ...data, goals: data.goals.filter((goal) => goal.id !== id) })),

    saveAssessment: (kind: AssessmentKind, score: number) =>
      update((data) => ({
        ...data,
        assessments: [{ kind, score, at: now() }, ...data.assessments],
      })),

    addContact: (contact: Omit<Contact, 'id'>) =>
      update((data) => ({ ...data, contacts: [...data.contacts, { ...contact, id: createId() }] })),

    removeContact: (id: string) =>
      update((data) => ({ ...data, contacts: data.contacts.filter((item) => item.id !== id) })),

    logCrisis: (log: Omit<CrisisLog, 'id' | 'at'>) =>
      update((data) => ({ ...data, crises: [{ ...log, id: createId(), at: now() }, ...data.crises] })),

    setActionPlan: (steps: string[]) => update((data) => ({ ...data, actionPlan: steps })),

    addWater: (delta: number) => {
      const today = toDayKey();
      update((data) => ({
        ...data,
        water: { ...data.water, [today]: Math.max(0, (data.water[today] ?? 0) + delta) },
      }));
    },

    setSuggestionRating: (rating: string | null) =>
      update((data) => ({ ...data, suggestionRating: rating })),

    updateSettings: (patch: Partial<Settings>) =>
      update((data) => ({ ...data, settings: { ...data.settings, ...patch } })),
  };
}

export type UserDataActions = ReturnType<typeof createActions>;

type UserStore = {
  getSnapshot: () => UserData;
  subscribe: (listener: () => void) => () => void;
  actions: UserDataActions;
};

/**
 * Holds one user's document outside React so actions always build on the
 * latest state, and chains saves so a slow write can never land after a newer one.
 */
function createUserStore(userId: string, initial: UserData): UserStore {
  let data = initial;
  let writes = Promise.resolve();
  const listeners = new Set<() => void>();

  const update = (recipe: Recipe) => {
    const next = recipe(data);
    if (next === data) return;
    data = next;
    listeners.forEach((listener) => listener());
    writes = writes
      .then(() => userDataRepository.save(userId, next))
      .catch((error) => console.warn('Falha ao salvar dados do usuário', error));
  };

  return {
    getSnapshot: () => data,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    actions: createActions(update),
  };
}

type UserDataContextValue = { data: UserData; actions: UserDataActions };

const UserDataContext = createContext<UserStore | null>(null);

/**
 * Loads the signed-in user's document and saves every change back. Mount it
 * with `key={user.id}` so switching accounts starts from a clean slate.
 */
export function UserDataProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [store, setStore] = useState<UserStore | null>(null);

  useEffect(() => {
    let cancelled = false;
    userDataRepository
      .load(userId)
      .catch(() => null)
      .then((stored) => {
        if (cancelled) return;
        setStore(createUserStore(userId, stored ? migrate(stored) : createDefaultUserData()));
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (!store) return null;

  return <UserDataContext value={store}>{children}</UserDataContext>;
}

export function useUserData(): UserDataContextValue {
  const store = use(UserDataContext);
  if (!store) throw new Error('useUserData must be used inside <UserDataProvider />');
  const data = useSyncExternalStore(store.subscribe, store.getSnapshot);
  return { data, actions: store.actions };
}
