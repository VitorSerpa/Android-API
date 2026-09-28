import { getApp, getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';

/**
 * Firebase project settings, read from `EXPO_PUBLIC_FIREBASE_*` (see `.env.example`).
 * These are the web app's public identifiers, not secrets — access is guarded by
 * Firebase Authentication and security rules. Expo only inlines `process.env`
 * reads written out in full, so each variable is referenced literally.
 */
const config: FirebaseOptions = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

/** `host:port` of a local Auth emulator, e.g. `127.0.0.1:9099`. Development only. */
export const AUTH_EMULATOR_HOST = process.env.EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST || null;

export const isFirebaseConfigured = Boolean(config.apiKey && config.projectId);

/** Created on first use so importing this module never throws, even without config. */
export function getFirebaseApp(): FirebaseApp {
  if (!isFirebaseConfigured) {
    throw new Error(
      'Firebase não configurado: defina EXPO_PUBLIC_FIREBASE_API_KEY e EXPO_PUBLIC_FIREBASE_PROJECT_ID (veja .env.example).',
    );
  }
  return getApps().length ? getApp() : initializeApp(config);
}
