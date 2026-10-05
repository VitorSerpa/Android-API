import type { UserData } from '@/data/types';
import { fromMinutes, isMinuteWithin, toMinutes } from '@/lib/time';

/**
 * Pure planning of every local notification from the user's data. Kept apart
 * from `expo-notifications` so the quiet-hours rule (RF-20 / CA-03) is easy to
 * read and test: a notification whose time falls inside the silence window is
 * moved to the moment the window ends, never shown inside it.
 */

export type PlannedNotification = {
  identifier: string;
  hour: number;
  minute: number;
  title: string;
  body: string;
  kind: 'reminder' | 'medication';
  /** Route opened when the notification is tapped. */
  url: string;
  sticky: boolean;
  data: Record<string, string>;
};

const BODIES: Record<string, string> = {
  checkin: 'Como você está agora? Toque para fazer seu check-in.',
  hydration: 'Hora de beber um copo de água.',
  break: 'Levante, caminhe um pouco e solte os ombros.',
  stretch: 'Que tal 2 minutos de alongamento?',
  custom: 'Lembrete do Mente Equilibrada.',
};

/** Where a time lands after quiet hours: unchanged, or the window's end. */
export function deferPastQuietHours(time: string, quiet: UserData['settings']['quietHours']): string {
  if (!quiet.enabled) return time;
  return isMinuteWithin(toMinutes(time), quiet.start, quiet.end) ? fromMinutes(toMinutes(quiet.end)) : time;
}

export function planNotifications(data: UserData): PlannedNotification[] {
  const { quietHours } = data.settings;
  const planned: PlannedNotification[] = [];

  for (const reminder of data.reminders) {
    if (!reminder.enabled) continue;
    for (const time of reminder.times) {
      const at = deferPastQuietHours(time, quietHours);
      const [hour, minute] = at.split(':').map(Number);
      planned.push({
        identifier: `rem:${reminder.id}:${time}`,
        hour,
        minute,
        title: reminder.title,
        body: BODIES[reminder.kind] ?? BODIES.custom,
        kind: 'reminder',
        url: reminder.kind === 'checkin' ? '/check-in' : '/reminders',
        sticky: false,
        data: { reminderId: reminder.id, time },
      });
    }
  }

  for (const medication of data.medications) {
    if (!medication.enabled) continue;
    for (const time of medication.times) {
      const at = deferPastQuietHours(time, quietHours);
      const [hour, minute] = at.split(':').map(Number);
      planned.push({
        identifier: medicationNotificationId(medication.id, time),
        hour,
        minute,
        // Generic title: it shows on the lock screen. The name goes in the body.
        title: 'Hora do medicamento',
        body: `${medication.name}${medication.dosage ? ` · ${medication.dosage}` : ''}. Toque em “Tomei” quando tomar.`,
        kind: 'medication',
        url: '/medications',
        // RF-18 / CA-01: stays in the status bar until confirmed.
        sticky: true,
        data: { medicationId: medication.id, time },
      });
    }
  }

  return planned;
}

export const medicationNotificationId = (medicationId: string, time: string) => `med:${medicationId}:${time}`;
