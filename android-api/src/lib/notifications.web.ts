import type { UserData } from '@/data/types';

/**
 * Browsers can't schedule notifications for when the page is closed, so the
 * web build (used for previews) only keeps the reminder list; Android shows them.
 */

export { medicationNotificationId } from '@/lib/reminder-schedule';

export const MEDICATION_CATEGORY = 'medication';
export const TAKEN_ACTION = 'taken';
export const notificationsSupported = false;

export async function configureNotifications() {}
export async function ensurePermission() {
  return false;
}
export async function syncNotifications(_data: UserData): Promise<'ok' | 'denied' | 'empty'> {
  return 'empty';
}
export async function dismissNotification(_identifier: string) {}
export async function clearAllNotifications() {}

export type NotificationResponse = {
  actionIdentifier: string;
  notification: { date?: number; request: { identifier: string; content: { data: Record<string, unknown> } } };
};
export const addResponseListener = (_listener: (response: NotificationResponse) => void) => ({ remove() {} });
export const getLastResponse = (): NotificationResponse | null => null;
export const clearLastResponse = () => {};
