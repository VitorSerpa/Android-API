import { Platform } from 'react-native';
import type * as HealthConnect from 'react-native-health-connect';

import { toDayKey } from '@/lib/dates';

/**
 * Sleep from wearables (RF-57). The Google Fit APIs stopped accepting new apps
 * in 2024 and shut down in 2026; Health Connect is Google's replacement and
 * receives the data Google Fit, Fitbit, Samsung Health and most watches write.
 *
 * The library needs Android 8.0+, while the app runs from 7.0 (RNF-09), so it
 * is loaded lazily and only on API 26 or newer.
 */

export const healthConnectMinApi = 26;

const supportedPlatform = Platform.OS === 'android' && Number(Platform.Version) >= healthConnectMinApi;

function load(): typeof HealthConnect | null {
  if (!supportedPlatform) return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('react-native-health-connect') as typeof HealthConnect;
}

export type Availability = 'available' | 'needs-install' | 'unsupported';

export async function healthConnectAvailability(): Promise<Availability> {
  const hc = load();
  if (!hc) return 'unsupported';
  try {
    const status = await hc.getSdkStatus();
    if (status === hc.SdkAvailabilityStatus.SDK_AVAILABLE) return 'available';
    if (status === hc.SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) return 'needs-install';
    return 'unsupported';
  } catch {
    return 'unsupported';
  }
}

/** Asks for read access to sleep sessions. Resolves whether it was granted. */
export async function connectHealthConnect(): Promise<boolean> {
  const hc = load();
  if (!hc) return false;
  await hc.initialize();
  const granted = await hc.requestPermission([{ accessType: 'read', recordType: 'SleepSession' }]);
  return granted.some((item) => 'recordType' in item && item.recordType === 'SleepSession');
}

export function openHealthConnectSettings() {
  load()?.openHealthConnectSettings();
}

/**
 * Hours slept per day over the last `days` days. A night is credited to the
 * day the user woke up, which is the day its check-in belongs to.
 */
export async function readSleepHours(days = 14): Promise<Record<string, number>> {
  const hc = load();
  if (!hc) return {};
  await hc.initialize();
  const end = new Date();
  const start = new Date(end.getTime() - days * 86_400_000);
  const totals: Record<string, number> = {};
  let pageToken: string | undefined;
  do {
    const result = await hc.readRecords('SleepSession', {
      timeRangeFilter: { operator: 'between', startTime: start.toISOString(), endTime: end.toISOString() },
      pageToken,
    });
    for (const record of result.records) {
      const hours = (new Date(record.endTime).getTime() - new Date(record.startTime).getTime()) / 3_600_000;
      if (hours <= 0) continue;
      const day = toDayKey(new Date(record.endTime));
      totals[day] = (totals[day] ?? 0) + hours;
    }
    pageToken = result.pageToken || undefined;
  } while (pageToken);

  return Object.fromEntries(Object.entries(totals).map(([day, hours]) => [day, Math.round(hours * 10) / 10]));
}
