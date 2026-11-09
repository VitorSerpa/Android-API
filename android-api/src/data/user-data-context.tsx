import { createContext, use, useCallback, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { Button } from '@/components/mente/ui';
import { MenteType } from '@/constants/mente-theme';
import { createDefaultUserData, migrate } from '@/data/defaults';
import { userDataRepository } from '@/data/repository';
import { createActions, type Recipe, type UserDataActions } from '@/data/user-data-actions';
import type { UserData } from '@/data/types';
import { notify } from '@/lib/dialogs';
import { setDeviceOfflineMode } from '@/lib/offline';
import { makeStyles } from '@/theme';

export type { DiaryDraft, UserDataActions } from '@/data/user-data-actions';



export type UserStore = {
  getSnapshot: () => UserData;
  subscribe: (listener: () => void) => () => void;
  /** Waits for pending saves; rejects if the latest change could not be written. */
  flush: () => Promise<void>;
  actions: UserDataActions;
};

const SAVE_ERROR_COOLDOWN_MS = 30_000;

/**
 * Holds one user's document outside React so actions always build on the
 * latest state, and chains saves so a slow write can never land after a newer
 * one. Every save writes the whole document, so a later successful save also
 * persists whatever an earlier failed one missed.
 */
function createUserStore(userId: string, initial: UserData): UserStore {
  let data = initial;
  let writes = Promise.resolve();
  let lastErrorAt = 0;
  let unsaved = false;
  const listeners = new Set<() => void>();

  const update = (recipe: Recipe) => {
    const next = recipe(data);
    if (next === data) return;
    data = next;
    listeners.forEach((listener) => listener());
    writes = writes
      .then(() => userDataRepository.save(userId, next))
      .then(() => {
        if (data === next) unsaved = false;
      })
      .catch(() => {
        unsaved = true;
        // The repository already logged it; tell the user, but not on every keystroke.
        if (Date.now() - lastErrorAt < SAVE_ERROR_COOLDOWN_MS) return;
        lastErrorAt = Date.now();
        notify(
          'Não foi possível salvar',
          'Sua última alteração ainda não foi gravada no aparelho. Tentaremos de novo na próxima alteração.',
        );
      });
  };

  return {
    getSnapshot: () => data,
    flush: () =>
      writes.then(() => {
        if (unsaved) throw new Error('Não foi possível gravar os dados no aparelho.');
      }),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    actions: createActions(update),
  };
}

const UserDataContext = createContext<UserStore | null>(null);

type LoadState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; store: UserStore };

/**
 * Loads the signed-in user's document and saves every change back. Mount it
 * with `key={user.id}` so switching accounts starts from a clean slate.
 */
export function UserDataProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    userDataRepository.load(userId).then(
      (stored) => {
        if (cancelled) return;
        setState({
          status: 'ready',
          store: createUserStore(userId, stored ? migrate(stored) : createDefaultUserData()),
        });
      },
      (error: unknown) => {
        // Never fall back to an empty account here: the first change would
        // overwrite the records we failed to read.
        if (cancelled) return;
        setState({ status: 'error', message: error instanceof Error ? error.message : 'Erro desconhecido.' });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [userId, attempt]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((value) => value + 1);
  }, []);

  if (state.status === 'loading') return <LoadingData />;
  if (state.status === 'error') return <LoadError message={state.message} onRetry={retry} />;

  return (
    <UserDataContext value={state.store}>
      <OfflineMirror />
      {children}
    </UserDataContext>
  );
}

/** Mirrors the offline-mode switch to a device flag the auth layer reads before any account data is open. */
function OfflineMirror() {
  const { data } = useUserData();
  const offline = data.settings.offlineMode;
  useEffect(() => {
    setDeviceOfflineMode(offline);
  }, [offline]);
  return null;
}

function LoadingData() {
  const styles = useStyles();
  return (
    <View style={styles.center}>
      <ActivityIndicator color={styles.title.color as string} />
    </View>
  );
}

function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  const styles = useStyles();
  return (
    <View style={styles.center} accessibilityRole="alert">
      <Text style={styles.title}>Não conseguimos abrir seus registros</Text>
      <Text style={styles.body}>
        {message} Nada foi apagado. Feche e abra o app ou tente novamente.
      </Text>
      <Button label="Tentar novamente" onPress={onRetry} style={styles.button} />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 32,
    backgroundColor: c.background,
  },
  title: {
    ...MenteType.sectionTitle,
    color: c.text,
    textAlign: 'center',
  },
  body: {
    ...MenteType.body,
    color: c.textMuted,
    textAlign: 'center',
  },
  button: {
    alignSelf: 'stretch',
  },
}));

export function useUserData() {
  const store = useUserStore();
  const data = useSyncExternalStore(store.subscribe, store.getSnapshot);
  return { data, actions: store.actions };
}

/** The store itself, for background work (sync) that must read the latest state without re-rendering. */
export function useUserStore(): UserStore {
  const store = use(UserDataContext);
  if (!store) throw new Error('useUserData must be used inside <UserDataProvider />');
  return store;
}
