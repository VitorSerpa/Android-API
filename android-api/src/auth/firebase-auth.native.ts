import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  connectAuthEmulator,
  getAuth,
  getReactNativePersistence,
  initializeAuth,
  type Auth,
} from 'firebase/auth';

import { AUTH_EMULATOR_HOST, getFirebaseApp } from '@/lib/firebase';

let auth: Auth | null = null;

/**
 * Android/iOS: Firebase keeps its session in AsyncStorage, so the user stays
 * signed in across app restarts (the default on native is in-memory only).
 */
export function getFirebaseAuth(): Auth {
  if (auth) return auth;
  const app = getFirebaseApp();
  try {
    auth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
    if (AUTH_EMULATOR_HOST) {
      connectAuthEmulator(auth, `http://${AUTH_EMULATOR_HOST}`, { disableWarnings: true });
    }
  } catch {
    // Fast Refresh re-runs this module while Firebase keeps its instance.
    auth = getAuth(app);
  }
  return auth;
}
