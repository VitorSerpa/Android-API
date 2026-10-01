import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Device-level copy of the "modo offline completo" switch (RF-37). Account data
 * only opens after login, but the login restore itself would call Firebase, so
 * the auth layer reads this flag first and skips the network when it is on.
 */
const KEY = 'mente:offline-mode';

let cached: boolean | null = null;

export async function isDeviceOffline(): Promise<boolean> {
  if (cached !== null) return cached;
  try {
    cached = (await AsyncStorage.getItem(KEY)) === '1';
  } catch {
    cached = false;
  }
  return cached;
}

export function setDeviceOfflineMode(enabled: boolean) {
  cached = enabled;
  AsyncStorage.setItem(KEY, enabled ? '1' : '0').catch((error) =>
    console.warn('Falha ao salvar o modo offline', error),
  );
}

/** Throws a friendly error when a feature needs the internet but offline mode is on. */
export function assertOnlineAllowed(offlineMode: boolean) {
  if (offlineMode) {
    throw new Error('O modo offline completo está ativo. Desative-o em Perfil para usar este recurso.');
  }
}
