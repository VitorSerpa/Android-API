import type {
  AchievementNote,
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
  TechniqueShortcut,
  ThoughtRecord,
  ToolId,
  UserData,
  UserPhrase,
} from '@/data/types';
import { toDayKey } from '@/lib/dates';
import { createId } from '@/lib/id';
import { normaliseTimes } from '@/lib/time';

/**
 * Every change the app can make to a user's document, as pure recipes over
 * the previous state (the data layer's write side). No React and no I/O:
 * `user-data-context.tsx` runs them against the store and persists the result,
 * and the tests run them directly.
 */

export type Recipe = (data: UserData) => UserData;

export type DiaryDraft = Omit<DiaryEntry, 'id' | 'createdAt' | 'updatedAt'> & { id?: string };

export function createActions(update: (recipe: Recipe) => void) {
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

    /** RF-60 / US-15 CA-01: the transcript is shown with the audio and can be edited. */
    updateAttachment: (entryId: string, attachmentId: string, patch: Partial<Pick<Attachment, 'transcript' | 'transcriptStatus'>>) =>
      update((data) => ({
        ...data,
        diary: data.diary.map((entry) =>
          entry.id === entryId
            ? {
                ...entry,
                attachments: entry.attachments.map((item) => (item.id === attachmentId ? { ...item, ...patch } : item)),
                updatedAt: now(),
              }
            : entry,
        ),
      })),

    /* Notas de conquistas (US-15 / RF-61) --------------------------------- */

    addAchievement: (note: Omit<AchievementNote, 'id' | 'createdAt' | 'day'>) => {
      const at = new Date();
      const id = createId();
      update((data) => ({
        ...data,
        achievements: [{ ...note, id, day: toDayKey(at), createdAt: at.toISOString() }, ...data.achievements],
      }));
      return id;
    },

    renameAchievement: (id: string, title: string) =>
      update((data) => ({
        ...data,
        achievements: data.achievements.map((item) => (item.id === id ? { ...item, title } : item)),
      })),

    deleteAchievement: (id: string) =>
      update((data) => ({ ...data, achievements: data.achievements.filter((item) => item.id !== id) })),

    /* Práticas e avaliações de técnicas (US-06, US-11) ------------------ */

    /** RF-69: pins or unpins a technique in the shortcut list. */
    toggleFavoriteTechnique: (id: TechniqueShortcut) =>
      update((data) => ({
        ...data,
        favoriteTechniques: data.favoriteTechniques.includes(id)
          ? data.favoriteTechniques.filter((item) => item !== id)
          : [...data.favoriteTechniques, id],
      })),

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

    /** RF-72: removes every coordinate saved with past anxiety peaks. */
    clearCrisisLocations: () =>
      update((data) =>
        data.crises.some((item) => item.location)
          ? { ...data, crises: data.crises.map((item) => (item.location ? { ...item, location: null } : item)) }
          : data,
      ),

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

    /** RF-70 / US-19 CA-01: the morning question is asked once per day. */
    markMorningAsked: (day: string) =>
      update((data) =>
        data.settings.morningCheckIn.lastAskedOn === day
          ? data
          : { ...data, settings: { ...data.settings, morningCheckIn: { ...data.settings.morningCheckIn, lastAskedOn: day } } },
      ),

    /**
     * RF-58: folds the server copy into the current document. `merge` runs on
     * the latest state, so nothing typed while the request was in flight is lost.
     */
    applyRemote: (merge: (current: UserData) => UserData) => update(merge),

    /** RF-38 (import side of the backup): replaces everything with a validated document. */
    replaceAll: (next: UserData) => update(() => next),
  };
}

export type UserDataActions = ReturnType<typeof createActions>;
