import * as Network from 'expo-network';
import { createContext, use, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/auth';
import { createSyncEngine, type SyncEngine, type SyncStatus } from '@/data/sync-engine';
import { useUserStore } from '@/data/user-data-context';

/** A burst of edits (typing in the diary) becomes one sync. */
const CHANGE_DEBOUNCE_MS = 5_000;
/** While the app is open, look for changes made on other devices. */
const POLL_INTERVAL_MS = 5 * 60_000;
/** After a failure, try again on its own (the next trigger may come sooner). */
const RETRY_AFTER_ERROR_MS = 60_000;

const SyncContext = createContext<SyncEngine | null>(null);

/**
 * RF-58: syncs automatically — on launch, when the connection comes back
 * (CA-01), when the app returns to the foreground, a few seconds after each
 * change and every few minutes while open. Mount inside `UserDataProvider`.
 */
export function SyncProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const store = useUserStore();
  const { getFreshToken } = useAuth();
  const [engine] = useState(() => createSyncEngine({ userId, store, getToken: getFreshToken }));

  useEffect(() => {
    let debounce: ReturnType<typeof setTimeout> | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let lastData = store.getSnapshot();

    const run = () => {
      if (debounce) clearTimeout(debounce);
      debounce = null;
      engine.syncNow().then(() => {
        if (retry) clearTimeout(retry);
        retry = engine.getStatus().kind === 'error' ? setTimeout(run, RETRY_AFTER_ERROR_MS) : null;
      });
    };

    run();

    const offStore = store.subscribe(() => {
      const next = store.getSnapshot();
      if (next === lastData) return;
      const offlineToggled = next.settings.offlineMode !== lastData.settings.offlineMode;
      lastData = next;
      if (offlineToggled) return run();
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(run, CHANGE_DEBOUNCE_MS);
    });

    const network = Network.addNetworkStateListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) run();
    });

    const appState = AppState.addEventListener('change', (next) => next === 'active' && run());
    const poll = setInterval(() => AppState.currentState === 'active' && run(), POLL_INTERVAL_MS);

    return () => {
      offStore();
      network.remove();
      appState.remove();
      clearInterval(poll);
      if (debounce) clearTimeout(debounce);
      if (retry) clearTimeout(retry);
    };
  }, [engine, store]);

  return <SyncContext value={engine}>{children}</SyncContext>;
}

export function useSync(): { status: SyncStatus; syncNow: () => Promise<void> } {
  const engine = use(SyncContext);
  if (!engine) throw new Error('useSync must be used inside <SyncProvider />');
  const status = useSyncExternalStore(engine.subscribe, engine.getStatus);
  return { status, syncNow: engine.syncNow };
}
