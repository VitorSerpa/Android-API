import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { UserData } from '@/data/types';
import { planNotifications } from '@/lib/reminder-schedule';
import { isWithinWindow } from '@/lib/time';

export { medicationNotificationId } from '@/lib/reminder-schedule';

export const MEDICATION_CATEGORY = 'medication';
export const TAKEN_ACTION = 'taken';

const CHANNEL_REMINDERS = 'reminders';
const CHANNEL_MEDICATION = 'medication';

export const notificationsSupported = Platform.OS !== 'web';

/** Latest quiet-hours window, read by the foreground handler as a second guard. */
let quietHours: UserData['settings']['quietHours'] | null = null;

let configured = false;

/** Channels, the "Tomei" action and the foreground behaviour. Safe to call more than once. */
export async function configureNotifications() {
  if (configured) return;
  configured = true;

  Notifications.setNotificationHandler({
    handleNotification: async () => {
      // Scheduling already defers to the end of the silence; this only guards edge cases.
      const silenced = Boolean(quietHours?.enabled && isWithinWindow(new Date(), quietHours.start, quietHours.end));
      return {
        shouldShowBanner: !silenced,
        shouldShowList: !silenced,
        shouldPlaySound: !silenced,
        shouldSetBadge: false,
      };
    },
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_REMINDERS, {
      name: 'Lembretes',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
    await Notifications.setNotificationChannelAsync(CHANNEL_MEDICATION, {
      name: 'Medicamentos',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  await Notifications.setNotificationCategoryAsync(MEDICATION_CATEGORY, [
    { identifier: TAKEN_ACTION, buttonTitle: 'Tomei', options: { opensAppToForeground: true } },
  ]);
}

export async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/** Runs one sync at a time, so an older run can't reschedule what a newer one removed. */
let syncQueue: Promise<unknown> = Promise.resolve();

/**
 * Replaces every scheduled notification with the plan for `data`. Daily
 * triggers keep firing without the app open; call again whenever reminders,
 * medications or quiet hours change.
 */
export function syncNotifications(data: UserData): Promise<'ok' | 'denied' | 'empty'> {
  const run = syncQueue.then(() => scheduleAll(data));
  syncQueue = run.catch(() => {});
  return run;
}

async function scheduleAll(data: UserData): Promise<'ok' | 'denied' | 'empty'> {
  quietHours = data.settings.quietHours;
  const plan = planNotifications(data);

  await configureNotifications();
  await Notifications.cancelAllScheduledNotificationsAsync();
  // A sticky medication notification already on screen outlives its trigger:
  // drop the ones whose medication or time was removed, disabled or changed.
  const planned = new Set(plan.map((item) => item.identifier));
  const presented = await Notifications.getPresentedNotificationsAsync();
  await Promise.all(
    presented
      .filter((item) => item.request.identifier.startsWith('med:') && !planned.has(item.request.identifier))
      .map((item) => Notifications.dismissNotificationAsync(item.request.identifier)),
  );
  if (!plan.length) return 'empty';
  if (!(await ensurePermission())) return 'denied';

  for (const item of plan) {
    await Notifications.scheduleNotificationAsync({
      identifier: item.identifier,
      content: {
        title: item.title,
        body: item.body,
        data: { ...item.data, kind: item.kind, url: item.url },
        sticky: item.sticky,
        autoDismiss: !item.sticky,
        categoryIdentifier: item.kind === 'medication' ? MEDICATION_CATEGORY : undefined,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: item.hour,
        minute: item.minute,
        channelId: item.kind === 'medication' ? CHANNEL_MEDICATION : CHANNEL_REMINDERS,
      },
    });
  }
  return 'ok';
}

/** On sign-out: nothing of this user may keep firing, stay on screen or be handled by the next one. */
export function clearAllNotifications(): Promise<void> {
  const run = syncQueue.then(async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.dismissAllNotificationsAsync();
    Notifications.clearLastNotificationResponse();
  });
  syncQueue = run.catch(() => {});
  return run;
}

/** Removes a shown notification, e.g. the sticky medication one once the dose is confirmed. */
export async function dismissNotification(identifier: string) {
  const presented = await Notifications.getPresentedNotificationsAsync();
  await Promise.all(
    presented
      .filter((item) => item.request.identifier === identifier)
      .map((item) => Notifications.dismissNotificationAsync(item.request.identifier)),
  );
}

export type NotificationResponse = Notifications.NotificationResponse;
export const addResponseListener = Notifications.addNotificationResponseReceivedListener;
export const getLastResponse = Notifications.getLastNotificationResponse;
export const clearLastResponse = Notifications.clearLastNotificationResponse;
