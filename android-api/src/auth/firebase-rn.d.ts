import type { Persistence, ReactNativeAsyncStorage } from 'firebase/auth';

/**
 * `firebase/auth` resolves to its React Native build on Android/iOS, which
 * exports this function, but the package's public typings are the web ones.
 */
declare module 'firebase/auth' {
  export function getReactNativePersistence(storage: ReactNativeAsyncStorage): Persistence;
}
