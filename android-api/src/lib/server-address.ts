import { setApiUrl } from '@/lib/api';
import { jsonStorage } from '@/lib/storage';

/**
 * The server address typed in Configurações → Sincronização (US-14). It is a
 * setting of this device, not of the account, so it lives in AsyncStorage and
 * not in the synced document.
 */
const KEY = 'mente.serverAddress';

let loading: Promise<void> | null = null;

/** Applies the saved address once; later calls wait for the same load. */
export function loadServerAddress(): Promise<void> {
  loading ??= jsonStorage.get<string>(KEY).then(
    (saved) => {
      if (saved) setApiUrl(saved);
    },
    () => {},
  );
  return loading;
}

/** `null` (or '') goes back to the address the app was built with. */
export async function saveServerAddress(value: string | null): Promise<void> {
  const trimmed = value?.trim() || null;
  setApiUrl(trimmed);
  if (trimmed) await jsonStorage.set(KEY, trimmed);
  else await jsonStorage.remove(KEY);
}
