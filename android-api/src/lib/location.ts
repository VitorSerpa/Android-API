import * as Location from 'expo-location';

import type { Coordinates } from '@/data/types';

/**
 * RF-35: the place of an anxiety peak is stored only with the user's explicit
 * permission. It is a single foreground fix — GPS is never watched or left on
 * (RNF-06) — and any refusal or timeout just saves the record without it (CA-04).
 */

const TIMEOUT_MS = 10_000;

export async function requestLocationPermission(): Promise<boolean> {
  try {
    return (await Location.requestForegroundPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

export async function currentCoordinates(): Promise<Coordinates | null> {
  try {
    const { granted } = await Location.getForegroundPermissionsAsync();
    if (!granted && !(await requestLocationPermission())) return null;
    const position = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), TIMEOUT_MS)),
    ]);
    if (!position) return null;
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy ?? null,
    };
  } catch (error) {
    console.warn('Localização indisponível', error);
    return null;
  }
}
