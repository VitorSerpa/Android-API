import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';

import { AUTH_EMULATOR_HOST, getFirebaseApp } from '@/lib/firebase';

let auth: Auth | null = null;

/** Web: `getAuth` already persists the session in IndexedDB. */
export function getFirebaseAuth(): Auth {
  if (auth) return auth;
  auth = getAuth(getFirebaseApp());
  if (AUTH_EMULATOR_HOST && !auth.emulatorConfig) {
    connectAuthEmulator(auth, `http://${AUTH_EMULATOR_HOST}`, { disableWarnings: true });
  }
  return auth;
}
