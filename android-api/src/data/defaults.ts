import type { UserData } from '@/data/types';
import { createId } from '@/lib/id';

/** What a brand-new account starts with. */
export function createDefaultUserData(): UserData {
  return {
    version: 1,
    checkIns: {},
    diary: [],
    practices: [],
    thoughts: [],
    reminders: [
      { id: createId(), title: 'Check-in diário', schedule: 'Todo dia às 9:00', enabled: true, doneOn: null },
      { id: createId(), title: 'Hidratação', schedule: 'A cada 2 horas', enabled: true, doneOn: null },
    ],
    goals: [
      { id: createId(), kind: 'checkinsPerWeek', title: 'Check-in 5x por semana', target: 5, progress: 0 },
      {
        id: createId(),
        kind: 'meditationMinutesPerMonth',
        title: 'Meditar 60 min no mês',
        target: 60,
        progress: 0,
      },
    ],
    assessments: [],
    contacts: [],
    crises: [],
    actionPlan: [
      'Sair do ambiente e beber água',
      'Respiração 4-7-8 por 4 ciclos',
      'Mandar mensagem para alguém de confiança',
    ],
    customSymptoms: [],
    water: {},
    suggestionRating: null,
    settings: {
      offlineMode: true,
      digitalRest: false,
      quietHours: true,
    },
  };
}

/**
 * Fills in fields added after a document was first saved, so older installs
 * keep loading as the schema grows.
 */
export function migrate(stored: Partial<UserData>): UserData {
  const defaults = createDefaultUserData();
  return {
    ...defaults,
    ...stored,
    settings: { ...defaults.settings, ...stored.settings },
    version: 1,
  };
}
