import { createContext, use, useCallback, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { Button } from '@/components/mente/ui';
import { MenteType } from '@/constants/mente-theme';
import { createDefaultUserData, migrate } from '@/data/defaults';
import { userDataRepository } from '@/data/repository';
import type {
  AssessmentKind,
  Attachment,
  Contact,
  CrisisLog,
  DailyHealth,
  DiaryEntry,
  Goal,
  Integrations,
  Medication,
  Reminder,
  Settings,
  SupporterInvite,
  ThoughtRecord,
  ToolId,
  UserData,
  UserPhrase,
} from '@/data/types';
import { notify } from '@/lib/dialogs';
import { toDayKey } from '@/lib/dates';
import { createId } from '@/lib/id';
import { setDeviceOfflineMode } from '@/lib/offline';
import { normaliseTimes } from '@/lib/time';
import { makeStyles } from '@/theme';

type Recipe = (data: UserData) => UserData;

export type DiaryDraft = Omit<DiaryEntry, 'id' | 'createdAt' | 'updatedAt'> & { id?: string };

function createActions(update: (recipe: Recipe) => void) {
  const now = () => new Date().toISOString();

  const emptyHealth = (day: string): DailyHealth => ({
    day,
    sleepHours: null,
    awakenings: null,
    sleepQuality: null,
    sleepSource: null,
    symptoms: [],
    activities: [],
    weightKg: null,
    activityMinutes: null,
    updatedAt: now(),
  });

  return {
    /* Check-in (US-01) ------------------------------------------------ */

    /** Always a new record: several check-ins a day feed the day's average (CA-05). */
    saveCheckIn: (input: { mood: number; anxiety: number; anxietyNote: string; energy: number; profileId: string | null }) => {
      const at = new Date();
      const id = createId();
      update((data) => ({
        ...data,
        checkIns: [{ ...input, id, at: at.toISOString(), day: toDayKey(at) }, ...data.checkIns],
      }));
      return id;
    },

    deleteCheckIn: (id: string) =>
      update((data) => ({ ...data, checkIns: data.checkIns.filter((item) => item.id !== id) })),

    /* Saúde física (US-03) -------------------------------------------- */

    saveHealth: (day: string, patch: Partial<Omit<DailyHealth, 'day' | 'updatedAt'>>) =>
      update((data) => ({
        ...data,
        health: {
          ...data.health,
          [day]: { ...(data.health[day] ?? emptyHealth(day)), ...patch, day, updatedAt: now() },
        },
      })),

    addCustomSymptom: (symptom: string) =>
      update((data) =>
        data.customSymptoms.includes(symptom)
          ? data
          : { ...data, customSymptoms: [...data.customSymptoms, symptom] },
      ),

    addCustomActivity: (activity: string) =>
      update((data) =>
        data.customActivities.includes(activity)
          ? data
          : { ...data, customActivities: [...data.customActivities, activity] },
      ),

    /* Diário (US-02) --------------------------------------------------- */

    /** Creates the entry when `id` is omitted. Returns the entry id. */
    saveDiaryEntry: (draft: DiaryDraft) => {
      const id = draft.id ?? createId();
      update((data) => {
        const existing = data.diary.find((item) => item.id === id);
        const saved: DiaryEntry = {
          ...draft,
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

    addAttachment: (entryId: string, attachment: Attachment) =>
      update((data) => ({
        ...data,
        diary: data.diary.map((entry) =>
          entry.id === entryId
            ? { ...entry, attachments: [...entry.attachments, attachment], updatedAt: now() }
            : entry,
        ),
      })),

    removeAttachment: (entryId: string, attachmentId: string) =>
      update((data) => ({
        ...data,
        diary: data.diary.map((entry) =>
          entry.id === entryId
            ? {
                ...entry,
                attachments: entry.attachments.filter((item) => item.id !== attachmentId),
                updatedAt: now(),
              }
            : entry,
        ),
      })),

    /* Práticas e avaliações de técnicas (US-06, US-11) ------------------ */

    logPractice: (tool: ToolId, durationSec: number) =>
      update((data) => ({
        ...data,
        practices: [{ id: createId(), tool, durationSec, at: now() }, ...data.practices],
      })),

    /** Records a rating, or replaces rating `id` (the same session changing its stars). Returns its id. */
    rateTechnique: (tool: ToolId, stars: number, id?: string) => {
      const rating = { id: id ?? createId(), tool, stars: Math.min(Math.max(Math.round(stars), 1), 5), at: now() };
      update((data) => ({
        ...data,
        ratings: [rating, ...data.ratings.filter((item) => item.id !== rating.id)],
      }));
      return rating.id;
    },

    /* Pensamentos e afirmações (US-09) ---------------------------------- */

    saveThought: (record: Omit<ThoughtRecord, 'id' | 'at'>) =>
      update((data) => ({
        ...data,
        thoughts: [{ ...record, id: createId(), at: now() }, ...data.thoughts],
      })),

    deleteThought: (id: string) =>
      update((data) => ({ ...data, thoughts: data.thoughts.filter((item) => item.id !== id) })),

    addPhrase: (kind: UserPhrase['kind'], text: string) =>
      update((data) => ({
        ...data,
        phrases: [...data.phrases, { id: createId(), kind, text, createdAt: now() }],
      })),

    updatePhrase: (id: string, text: string) =>
      update((data) => ({
        ...data,
        phrases: data.phrases.map((item) => (item.id === id ? { ...item, text } : item)),
      })),

    removePhrase: (id: string) =>
      update((data) => ({
        ...data,
        phrases: data.phrases.filter((item) => item.id !== id),
        favoriteAffirmations: data.favoriteAffirmations.filter((item) => item !== id),
      })),

    toggleFavoriteAffirmation: (id: string) =>
      update((data) => ({
        ...data,
        favoriteAffirmations: data.favoriteAffirmations.includes(id)
          ? data.favoriteAffirmations.filter((item) => item !== id)
          : [...data.favoriteAffirmations, id],
      })),

    /* Lembretes e medicamentos (US-01, US-04) --------------------------- */

    addReminder: (reminder: Pick<Reminder, 'kind' | 'title' | 'times'>) =>
      update((data) => ({
        ...data,
        reminders: [
          ...data.reminders,
          { ...reminder, times: normaliseTimes(reminder.times), id: createId(), enabled: true, doneOn: null },
        ],
      })),

    updateReminder: (id: string, patch: Partial<Pick<Reminder, 'title' | 'times' | 'enabled'>>) =>
      update((data) => ({
        ...data,
        reminders: data.reminders.map((item) =>
          item.id === id
            ? { ...item, ...patch, times: patch.times ? normaliseTimes(patch.times) : item.times }
            : item,
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

    addMedication: (medication: Pick<Medication, 'name' | 'dosage' | 'times'>) =>
      update((data) => ({
        ...data,
        medications: [
          ...data.medications,
          { ...medication, times: normaliseTimes(medication.times), id: createId(), enabled: true, createdAt: now() },
        ],
      })),

    updateMedication: (id: string, patch: Partial<Pick<Medication, 'name' | 'dosage' | 'times' | 'enabled'>>) =>
      update((data) => ({
        ...data,
        medications: data.medications.map((item) =>
          item.id === id
            ? { ...item, ...patch, times: patch.times ? normaliseTimes(patch.times) : item.times }
            : item,
        ),
      })),

    removeMedication: (id: string) =>
      update((data) => ({
        ...data,
        medications: data.medications.filter((item) => item.id !== id),
      })),

    /** "Tomei": idempotent per medication, day and scheduled time. */
    recordIntake: (medicationId: string, day: string, time: string, takenAt = now()) =>
      update((data) =>
        data.intakes.some(
          (item) => item.medicationId === medicationId && item.day === day && item.time === time,
        )
          ? data
          : { ...data, intakes: [{ id: createId(), medicationId, day, time, takenAt }, ...data.intakes] },
      ),

    undoIntake: (medicationId: string, day: string, time: string) =>
      update((data) => ({
        ...data,
        intakes: data.intakes.filter(
          (item) => !(item.medicationId === medicationId && item.day === day && item.time === time),
        ),
      })),

    /* Metas e testes (US-11) -------------------------------------------- */

    addGoal: (goal: Omit<Goal, 'id' | 'log'>) =>
      update((data) => ({ ...data, goals: [...data.goals, { ...goal, id: createId(), log: [] }] })),

    incrementGoal: (id: string) =>
      update((data) => ({
        ...data,
        goals: data.goals.map((goal) => (goal.id === id ? { ...goal, log: [...goal.log, now()] } : goal)),
      })),

    removeGoal: (id: string) =>
      update((data) => ({ ...data, goals: data.goals.filter((goal) => goal.id !== id) })),

    saveAssessment: (kind: AssessmentKind, score: number) =>
      update((data) => ({
        ...data,
        assessments: [{ id: createId(), kind, score, at: now() }, ...data.assessments],
      })),

    /* Emergência (US-07) ------------------------------------------------ */

    addContact: (contact: Omit<Contact, 'id'>) =>
      update((data) => ({ ...data, contacts: [...data.contacts, { ...contact, id: createId() }] })),

    removeContact: (id: string) =>
      update((data) => ({ ...data, contacts: data.contacts.filter((item) => item.id !== id) })),

    /** RF-33: saves date, time and intensity at once; triggers and place come later. */
    logCrisis: (intensity: number) => {
      const id = createId();
      update((data) => ({
        ...data,
        crises: [
          {
            id,
            at: now(),
            intensity,
            triggers: { situation: '', place: '', thought: '' },
            note: '',
            location: null,
          },
          ...data.crises,
        ],
      }));
      return id;
    },

    updateCrisis: (id: string, patch: Partial<Omit<CrisisLog, 'id' | 'at'>>) =>
      update((data) => ({
        ...data,
        crises: data.crises.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      })),

    setActionPlan: (steps: string[]) => update((data) => ({ ...data, actionPlan: steps })),

    /* Perfis de vida (US-12) -------------------------------------------- */

    addProfile: (name: string) => {
      const id = createId();
      update((data) => ({ ...data, profiles: [...data.profiles, { id, name }] }));
      return id;
    },

    renameProfile: (id: string, name: string) =>
      update((data) => ({
        ...data,
        profiles: data.profiles.map((item) => (item.id === id ? { ...item, name } : item)),
      })),

    removeProfile: (id: string) =>
      update((data) => ({
        ...data,
        profiles: data.profiles.filter((item) => item.id !== id),
        checkIns: data.checkIns.map((item) => (item.profileId === id ? { ...item, profileId: null } : item)),
        diary: data.diary.map((item) => (item.profileId === id ? { ...item, profileId: null } : item)),
      })),

    /* Outros ------------------------------------------------------------ */

    addWater: (delta: number) => {
      const today = toDayKey();
      update((data) => ({
        ...data,
        water: { ...data.water, [today]: Math.max(0, (data.water[today] ?? 0) + delta) },
      }));
    },

    addInvite: (invite: SupporterInvite) =>
      update((data) => ({ ...data, invites: [...data.invites, invite] })),

    markInviteSent: (token: string, week: string) =>
      update((data) => ({
        ...data,
        invites: data.invites.map((item) => (item.token === token ? { ...item, lastSentWeek: week } : item)),
      })),

    removeInvite: (token: string) =>
      update((data) => ({ ...data, invites: data.invites.filter((item) => item.token !== token) })),

    setIntegration: <K extends keyof Integrations>(key: K, value: Integrations[K]) =>
      update((data) => ({ ...data, integrations: { ...data.integrations, [key]: value } })),

    updateSettings: (patch: Partial<Settings>) =>
      update((data) => ({ ...data, settings: { ...data.settings, ...patch } })),

    /** RF-38 (import side of the backup): replaces everything with a validated document. */
    replaceAll: (next: UserData) => update(() => next),
  };
}

export type UserDataActions = ReturnType<typeof createActions>;

type UserStore = {
  getSnapshot: () => UserData;
  subscribe: (listener: () => void) => () => void;
  actions: UserDataActions;
};

const SAVE_ERROR_COOLDOWN_MS = 30_000;

/**
 * Holds one user's document outside React so actions always build on the
 * latest state, and chains saves so a slow write can never land after a newer
 * one. Every save writes the whole document, so a later successful save also
 * persists whatever an earlier failed one missed.
 */
function createUserStore(userId: string, initial: UserData): UserStore {
  let data = initial;
  let writes = Promise.resolve();
  let lastErrorAt = 0;
  const listeners = new Set<() => void>();

  const update = (recipe: Recipe) => {
    const next = recipe(data);
    if (next === data) return;
    data = next;
    listeners.forEach((listener) => listener());
    writes = writes
      .then(() => userDataRepository.save(userId, next))
      .catch(() => {
        // The repository already logged it; tell the user, but not on every keystroke.
        if (Date.now() - lastErrorAt < SAVE_ERROR_COOLDOWN_MS) return;
        lastErrorAt = Date.now();
        notify(
          'Não foi possível salvar',
          'Sua última alteração ainda não foi gravada no aparelho. Tentaremos de novo na próxima alteração.',
        );
      });
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

const UserDataContext = createContext<UserStore | null>(null);

type LoadState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; store: UserStore };

/**
 * Loads the signed-in user's document and saves every change back. Mount it
 * with `key={user.id}` so switching accounts starts from a clean slate.
 */
export function UserDataProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    userDataRepository.load(userId).then(
      (stored) => {
        if (cancelled) return;
        setState({
          status: 'ready',
          store: createUserStore(userId, stored ? migrate(stored) : createDefaultUserData()),
        });
      },
      (error: unknown) => {
        // Never fall back to an empty account here: the first change would
        // overwrite the records we failed to read.
        if (cancelled) return;
        setState({ status: 'error', message: error instanceof Error ? error.message : 'Erro desconhecido.' });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [userId, attempt]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((value) => value + 1);
  }, []);

  if (state.status === 'loading') return <LoadingData />;
  if (state.status === 'error') return <LoadError message={state.message} onRetry={retry} />;

  return (
    <UserDataContext value={state.store}>
      <OfflineMirror />
      {children}
    </UserDataContext>
  );
}

/** Mirrors the offline-mode switch to a device flag the auth layer reads before any account data is open. */
function OfflineMirror() {
  const { data } = useUserData();
  const offline = data.settings.offlineMode;
  useEffect(() => {
    setDeviceOfflineMode(offline);
  }, [offline]);
  return null;
}

function LoadingData() {
  const styles = useStyles();
  return (
    <View style={styles.center}>
      <ActivityIndicator color={styles.title.color as string} />
    </View>
  );
}

function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  const styles = useStyles();
  return (
    <View style={styles.center} accessibilityRole="alert">
      <Text style={styles.title}>Não conseguimos abrir seus registros</Text>
      <Text style={styles.body}>
        {message} Nada foi apagado. Feche e abra o app ou tente novamente.
      </Text>
      <Button label="Tentar novamente" onPress={onRetry} style={styles.button} />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 32,
    backgroundColor: c.background,
  },
  title: {
    ...MenteType.sectionTitle,
    color: c.text,
    textAlign: 'center',
  },
  body: {
    ...MenteType.body,
    color: c.textMuted,
    textAlign: 'center',
  },
  button: {
    alignSelf: 'stretch',
  },
}));

export function useUserData() {
  const store = use(UserDataContext);
  if (!store) throw new Error('useUserData must be used inside <UserDataProvider />');
  const data = useSyncExternalStore(store.subscribe, store.getSnapshot);
  return { data, actions: store.actions };
}
