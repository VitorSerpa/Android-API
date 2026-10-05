// Alertas desativados — imports usados só pelo NotificationBridge, comentado abaixo:
// import { useRouter, type Href } from 'expo-router';
// import { addDays, toDayKey } from '@/lib/dates';
// import {
//   addResponseListener,
//   clearLastResponse,
//   dismissNotification,
//   getLastResponse,
//   medicationNotificationId,
//   syncNotifications,
//   TAKEN_ACTION,
//   type NotificationResponse,
// } from '@/lib/notifications';
// import { minutesOf, toMinutes } from '@/lib/time';
// Pessoa de confiança e integrações desativadas — imports usados só pelo CommunitySync/HealthSync:
// import { useRef } from 'react';
// import { AppState } from 'react-native';
// import { pushWeeklySummaries } from '@/data/community';
// import { apiConfigured } from '@/lib/api';
import { useEffect } from 'react';

import { useUserData } from '@/data/user-data-context';
import { readSleepHours } from '@/lib/health-connect';
import { clearAllNotifications, notificationsSupported } from '@/lib/notifications';

/**
 * Alertas desativados: lembretes e medicamentos saíram do app, então nada é
 * agendado. Ao abrir, apaga o que versões anteriores deixaram agendado ou na
 * tela, para que nenhum alarme antigo continue disparando.
 */
function ClearOldAlerts() {
  useEffect(() => {
    if (!notificationsSupported) return;
    clearAllNotifications().catch((error) => console.warn('Falha ao limpar notificações', error));
  }, []);
  return null;
}

// Lembretes e alarmes de medicamentos (RF-17/RF-18, US-01/US-04) — desativados.
// Para reativar, descomente este bloco e os imports marcados no topo, e troque
// <ClearOldAlerts /> por <NotificationBridge /> em BackgroundTasks.
// /**
//  * The day a dose belongs to. Quiet hours can push a dose past midnight (23:00 →
//  * 07:00) and "Tomei" can be tapped later still, so it is worked out from when
//  * the notification fired, not from the tap: fired earlier in the day than the
//  * dose's own time means it was deferred from the day before.
//  */
// function doseDay(time: string, firedAt: number | undefined): string {
//   const fired = firedAt ? new Date(firedAt) : new Date();
//   return toDayKey(minutesOf(fired) < toMinutes(time) ? addDays(fired, -1) : fired);
// }
//
// /**
//  * Keeps the scheduled notifications in step with the reminders, medications
//  * and quiet hours, and reacts to taps: the default tap opens the related screen
//  * (a check-in reminder opens the check-in, US-01 CA-04) and "Tomei" records the
//  * dose with the time it was taken (US-04 CA-01).
//  */
// function NotificationBridge() {
//   const router = useRouter();
//   const { data, actions } = useUserData();
//   const handled = useRef(new Set<string>());
//   const latest = useRef(data);
//   useEffect(() => {
//     latest.current = data;
//   });
//
//   const scheduleKey = JSON.stringify([data.reminders.map((item) => [item.id, item.enabled, item.times, item.title]), data.medications, data.settings.quietHours]);
//
//   useEffect(() => {
//     if (!notificationsSupported) return;
//     syncNotifications(data).catch((error) => console.warn('Falha ao agendar notificações', error));
//     // Only the scheduling inputs matter; `data` is read at that moment.
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [scheduleKey]);
//
//   useEffect(() => {
//     if (!notificationsSupported) return;
//
//     const handle = (response: NotificationResponse) => {
//       const request = response.notification.request;
//       const key = `${request.identifier}:${response.actionIdentifier}:${response.notification.date ?? ''}`;
//       if (handled.current.has(key)) return;
//       handled.current.add(key);
//
//       const content = request.content.data as Record<string, string | undefined>;
//       if (content.kind === 'medication' && content.medicationId && content.time) {
//         if (response.actionIdentifier === TAKEN_ACTION) {
//           // Only this account's medications: a leftover notification of another
//           // user (or of a removed medication) must not record anything.
//           if (!latest.current.medications.some((item) => item.id === content.medicationId)) {
//             dismissNotification(request.identifier).catch(() => {});
//             return;
//           }
//           actions.recordIntake(content.medicationId, doseDay(content.time, response.notification.date), content.time);
//           dismissNotification(medicationNotificationId(content.medicationId, content.time)).catch(() => {});
//           return;
//         }
//       }
//       if (content.url) router.push(content.url as Href);
//     };
//
//     // Cold start: the tap that launched the app.
//     const last = getLastResponse();
//     if (last) {
//       handle(last);
//       clearLastResponse();
//     }
//     const subscription = addResponseListener(handle);
//     return () => subscription.remove();
//   }, [actions, router]);
//
//   return null;
// }

// Pessoa de confiança e integrações desativadas (tela community removida do app):
// nem o resumo semanal aos apoiadores nem a importação de sono rodam mais.
// Para reativar, descomente este bloco, os imports marcados e as linhas em BackgroundTasks.
// /** On launch and when the app comes back: this week's anonymous summary to supporters (RF-55). */
// function CommunitySync() {
//   const { data, actions } = useUserData();
//   const latest = useRef(data);
//   useEffect(() => {
//     latest.current = data;
//   });
//
//   useEffect(() => {
//     const run = () => {
//       const current = latest.current;
//       if (current.settings.offlineMode || !apiConfigured || !current.invites.length) return;
//       pushWeeklySummaries(current, actions).catch(() => {});
//     };
//     run();
//     const subscription = AppState.addEventListener('change', (next) => next === 'active' && run());
//     return () => subscription.remove();
//   }, [actions]);
//
//   return null;
// }
//
// /** RF-57 / CA-03: imports the last two weeks of sleep from Health Connect into the sleep records. */
// function HealthSync() {
//   const { data, actions } = useUserData();
//   const connected = Boolean(data.integrations.healthConnect);
//   const offline = data.settings.offlineMode;
//   const latest = useRef(data);
//   useEffect(() => {
//     latest.current = data;
//   });
//
//   useEffect(() => {
//     if (!connected || offline) return;
//     let cancelled = false;
//     importSleep(latest.current, actions).catch((error) => {
//       if (!cancelled) console.warn('Health Connect: falha ao ler o sono', error);
//     });
//     return () => {
//       cancelled = true;
//     };
//   }, [connected, offline, actions]);
//
//   return null;
// }

/** Writes imported hours into days that don't already have hours typed by hand. */
export async function importSleep(data: ReturnType<typeof useUserData>['data'], actions: ReturnType<typeof useUserData>['actions']) {
  const hours = await readSleepHours(14);
  let imported = 0;
  for (const [day, value] of Object.entries(hours)) {
    const existing = data.health[day];
    if (existing?.sleepSource === 'manual' && existing.sleepHours !== null) continue;
    actions.saveHealth(day, { sleepHours: value, sleepSource: 'health-connect' });
    imported += 1;
  }
  const current = data.integrations.healthConnect;
  actions.setIntegration('healthConnect', {
    connectedAt: current?.connectedAt ?? new Date().toISOString(),
    lastSyncAt: new Date().toISOString(),
  });
  return imported;
}

export function BackgroundTasks() {
  return (
    <>
      {/* <NotificationBridge /> — alertas desativados */}
      <ClearOldAlerts />
      {/* <CommunitySync /> e <HealthSync /> — pessoa de confiança e integrações desativadas */}
    </>
  );
}
