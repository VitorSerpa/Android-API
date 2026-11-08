import { migrate } from '@/data/defaults';
import { userDataRepository, type SyncState } from '@/data/repository';
import { deepEqual, mergeUserData } from '@/data/sync-merge';
import type { UserData } from '@/data/types';
import type { UserStore } from '@/data/user-data-context';
import { apiConfigured, ApiError, pullDocument, pushDocument } from '@/lib/api';

/**
 * Keeps the device's SQLite document and the server copy in step (US-14 / RF-58).
 *
 * Every sync is: pull what changed on the server since the revision we know,
 * merge it three-way into the current state (`sync-merge.ts`), then push the
 * result with the revision it was based on. If another device pushed first the
 * server answers with its copy (409) and we merge again — so records made
 * offline, even for weeks (CA-02), are sent once and never duplicated (CA-01).
 *
 * Nothing here runs in "modo offline completo" (RF-37) or without a server URL.
 */

export type SyncStatus =
  | { kind: 'disabled'; reason: 'offline-mode' | 'not-configured' }
  | { kind: 'idle'; lastSyncAt: string | null }
  | { kind: 'syncing'; lastSyncAt: string | null }
  | { kind: 'error'; message: string; lastSyncAt: string | null };

const MAX_PUSH_ATTEMPTS = 3;

export type SyncEngine = {
  /** Runs a sync now, or right after the one in flight. Never rejects. */
  syncNow: () => Promise<void>;
  getStatus: () => SyncStatus;
  subscribe: (listener: () => void) => () => void;
};

export function createSyncEngine({
  userId,
  store,
  getToken,
}: {
  userId: string;
  store: UserStore;
  getToken: () => Promise<string | null>;
}): SyncEngine {
  let status: SyncStatus = { kind: 'idle', lastSyncAt: null };
  let running: Promise<void> | null = null;
  let again = false;
  const listeners = new Set<() => void>();

  const setStatus = (next: SyncStatus) => {
    status = next;
    listeners.forEach((listener) => listener());
  };
  const lastSyncAt = () => ('lastSyncAt' in status ? status.lastSyncAt : null);

  const save = (state: SyncState) => userDataRepository.saveSyncState(userId, state);

  /** Folds `remote` into whatever the user has now; returns the resulting document. */
  const absorb = (base: UserData | null, remote: UserData) => {
    store.actions.applyRemote((current) => mergeUserData(base, current, remote));
    return store.getSnapshot();
  };

  async function syncOnce() {
    if (store.getSnapshot().settings.offlineMode) {
      setStatus({ kind: 'disabled', reason: 'offline-mode' });
      return;
    }
    if (!apiConfigured) {
      setStatus({ kind: 'disabled', reason: 'not-configured' });
      return;
    }

    setStatus({ kind: 'syncing', lastSyncAt: lastSyncAt() });
    const token = await getToken();
    if (!token) throw new ApiError('Não foi possível confirmar sua sessão. Verifique a conexão.', null);

    let state: SyncState = (await userDataRepository.loadSyncState(userId)) ?? { revision: 0, base: null, lastSyncAt: null };

    // 1. Pull, unless this device has changes the server hasn't seen (then the push below merges).
    if (state.base && deepEqual(state.base, store.getSnapshot())) {
      const remote = await pullDocument(token, state.revision);
      if (remote.unchanged || remote.data === null) {
        state = { ...state, lastSyncAt: new Date().toISOString() };
        await save(state);
        setStatus({ kind: 'idle', lastSyncAt: state.lastSyncAt });
        return;
      }
      const remoteDoc = migrate(remote.data);
      const merged = absorb(state.base, remoteDoc);
      state = { revision: remote.revision, base: remoteDoc, lastSyncAt: new Date().toISOString() };
      if (deepEqual(merged, remoteDoc)) {
        await save(state);
        setStatus({ kind: 'idle', lastSyncAt: state.lastSyncAt });
        return;
      }
      // Something was typed while the pull was in flight: push it below.
    }

    // 2. Push, merging again whenever another device wrote first.
    for (let attempt = 0; attempt < MAX_PUSH_ATTEMPTS; attempt += 1) {
      const sending = store.getSnapshot();
      const result = await pushDocument(token, state.revision, sending);
      if (result.ok) {
        state = { revision: result.revision, base: sending, lastSyncAt: new Date().toISOString() };
        await save(state);
        setStatus({ kind: 'idle', lastSyncAt: state.lastSyncAt });
        return;
      }
      const remoteDoc = result.data ? migrate(result.data) : null;
      if (remoteDoc) absorb(state.base, remoteDoc);
      state = { ...state, revision: result.revision, base: remoteDoc ?? state.base };
    }
    throw new ApiError('Os dados mudaram várias vezes seguidas em outro aparelho. Tentaremos de novo em instantes.', 409);
  }

  const syncNow = (): Promise<void> => {
    if (running) {
      again = true;
      return running;
    }
    running = (async () => {
      do {
        again = false;
        try {
          await syncOnce();
        } catch (error) {
          console.warn('Sincronização falhou', error);
          setStatus({
            kind: 'error',
            message: error instanceof Error ? error.message : 'Erro desconhecido.',
            lastSyncAt: lastSyncAt(),
          });
          again = false;
        }
      } while (again);
    })().finally(() => {
      running = null;
    });
    return running;
  };

  // Show when the last sync happened from the very first render.
  userDataRepository.loadSyncState(userId).then(
    (state) => state?.lastSyncAt && status.kind === 'idle' && !status.lastSyncAt && setStatus({ kind: 'idle', lastSyncAt: state.lastSyncAt }),
    () => {},
  );

  return {
    syncNow,
    getStatus: () => status,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
