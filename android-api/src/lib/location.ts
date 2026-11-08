import * as Location from 'expo-location';

import type { Coordinates } from '@/data/types';

/**
 * RF-35: the place of an anxiety peak is stored only with the user's explicit
 * permission. It is a single foreground fix — GPS is never watched or left on
 * (RNF-06) — and any refusal or timeout just saves the record without it (CA-04).
 */

const TIMEOUT_MS = 10_000;
/** Fallback: a fix the phone already has, if it is this recent and this precise. */
const LAST_KNOWN = { maxAge: 15 * 60_000, requiredAccuracy: 500 };

export async function requestLocationPermission(): Promise<boolean> {
  try {
    return (await Location.requestForegroundPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

const toCoordinates = (position: Location.LocationObject): Coordinates => ({
  latitude: position.coords.latitude,
  longitude: position.coords.longitude,
  accuracy: position.coords.accuracy ?? null,
});

/**
 * A fresh fix when possible. Phones with Google's "Location accuracy" switched
 * off reject the balanced request ("unsatisfied device settings") even though
 * GPS works, and a fix can also time out indoors; then a recent last-known
 * position is used instead of losing the place of the peak.
 */
export async function currentCoordinates(): Promise<Coordinates | null> {
  try {
    const { granted } = await Location.getForegroundPermissionsAsync();
    if (!granted && !(await requestLocationPermission())) return null;
  } catch {
    return null;
  }
  try {
    const position = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), TIMEOUT_MS)),
    ]);
    if (position) return toCoordinates(position);
  } catch (error) {
    console.warn('Localização atual indisponível; tentando a última conhecida', error);
  }
  try {
    const last = await Location.getLastKnownPositionAsync(LAST_KNOWN);
    return last ? toCoordinates(last) : null;
  } catch (error) {
    console.warn('Localização indisponível', error);
    return null;
  }
}
