/** Health Connect only exists on Android; the web preview shows the integration as unavailable. */

export const healthConnectMinApi = 26;
export type Availability = 'available' | 'needs-install' | 'unsupported';

export async function healthConnectAvailability(): Promise<Availability> {
  return 'unsupported';
}
export async function connectHealthConnect(): Promise<boolean> {
  return false;
}
export function openHealthConnectSettings() {}
export async function readSleepHours(_days = 14): Promise<Record<string, number>> {
  return {};
}
