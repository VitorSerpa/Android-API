import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  useGlobalSearchParams,
  useRootNavigationState,
  useRoute,
  useRouter,
  useSegments,
  type Href,
} from 'expo-router';
import { createContext, use, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollView } from 'react-native';

/**
 * RF-59 / US-14 CA-03: the app reopens on the screen, the scroll position and
 * the half-filled fields the user left.
 *
 * Per account, one small JSON document in AsyncStorage holds the current route,
 * each screen's scroll offset and a few form drafts. It is written a moment
 * after every change and right away when the app goes to the background — the
 * last chance Android gives before it may kill the process.
 */

type SavedRoute = { pathname: string; params: Record<string, string> };

type Snapshot = {
  route: SavedRoute | null;
  scroll: Record<string, number>;
  values: Record<string, unknown>;
};

const EMPTY: Snapshot = { route: null, scroll: {}, values: {} };
const WRITE_DELAY_MS = 800;
const RESTORE_TIMEOUT_MS = 3_000;
/** Screens the app must not reopen on by itself. */
const NOT_RESTORED = new Set(['/home', '/', '/pin']);

const keyFor = (userId: string) => `mente:user:${userId}:screen-state`;

type ScreenStateStore = {
  /** Scroll offsets of the previous session; each one is used once. */
  takeScroll: (key: string) => number | null;
  setScroll: (key: string, y: number) => void;
  getValue: <T>(key: string) => T | undefined;
  setValue: (key: string, value: unknown) => void;
  setRoute: (route: SavedRoute) => void;
  /** Route the previous session ended on, or `null`; returned once. */
  takeInitialRoute: () => SavedRoute | null;
};

function createScreenStateStore(userId: string, loaded: Snapshot): ScreenStateStore {
  const current: Snapshot = { route: loaded.route, scroll: { ...loaded.scroll }, values: { ...loaded.values } };
  const previousScroll = new Map(Object.entries(loaded.scroll));
  let initialRoute = loaded.route;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const flush = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    AsyncStorage.setItem(keyFor(userId), JSON.stringify(current)).catch((error) =>
      console.warn('Falha ao salvar o estado das telas', error),
    );
  };
  const schedule = () => {
    if (!timer) timer = setTimeout(flush, WRITE_DELAY_MS);
  };

  AppState.addEventListener('change', (next) => next !== 'active' && flush());

  return {
    takeScroll: (key) => {
      const y = previousScroll.get(key);
      previousScroll.delete(key);
      return y ?? null;
    },
    setScroll: (key, y) => {
      if (current.scroll[key] === y) return;
      current.scroll[key] = y;
      schedule();
    },
    getValue: <T,>(key: string) => current.values[key] as T | undefined,
    setValue: (key, value) => {
      if (value === undefined) delete current.values[key];
      else current.values[key] = value;
      schedule();
    },
    setRoute: (route) => {
      current.route = route;
      schedule();
    },
    takeInitialRoute: () => {
      const route = initialRoute;
      initialRoute = null;
      return route;
    },
  };
}

const ScreenStateContext = createContext<ScreenStateStore | null>(null);

async function load(userId: string): Promise<Snapshot> {
  try {
    const raw = await AsyncStorage.getItem(keyFor(userId));
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<Snapshot>;
    return { route: parsed.route ?? null, scroll: parsed.scroll ?? {}, values: parsed.values ?? {} };
  } catch {
    return EMPTY;
  }
}

/** Route file path without groups: `['(app)', 'day', '[day]']` → `/day/[day]`. */
function pathnameOf(segments: readonly string[]): string {
  const visible = segments.filter((segment) => !(segment.startsWith('(') && segment.endsWith(')')));
  return `/${visible.join('/')}`;
}

/** Mount around the logged-in navigator. Renders nothing until the saved state is read. */
export function ScreenStateProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [store, setStore] = useState<ScreenStateStore | null>(null);

  useEffect(() => {
    let cancelled = false;
    load(userId).then((snapshot) => !cancelled && setStore(createScreenStateStore(userId, snapshot)));
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (!store) return null;
  return (
    <ScreenStateContext value={store}>
      {children}
      <RouteTracker store={store} />
    </ScreenStateContext>
  );
}

/** Remembers the current route and, on launch, goes back to the one the last session ended on. */
function RouteTracker({ store }: { store: ScreenStateStore }) {
  const router = useRouter();
  const segments = useSegments();
  const params = useGlobalSearchParams();
  const navigationReady = Boolean(useRootNavigationState()?.key);
  const restored = useRef(false);
  const pathname = pathnameOf(segments);
  const paramsKey = JSON.stringify(params);

  useEffect(() => {
    if (!navigationReady || restored.current) return;
    restored.current = true;
    const route = store.takeInitialRoute();
    if (route && !NOT_RESTORED.has(route.pathname) && route.pathname !== pathname) {
      router.push({ pathname: route.pathname, params: route.params } as unknown as Href);
    }
  }, [navigationReady, pathname, router, store]);

  useEffect(() => {
    // Wait for the restore above, or the launch screen would overwrite the saved one.
    if (!restored.current) return;
    const clean: Record<string, string> = {};
    for (const [key, value] of Object.entries(JSON.parse(paramsKey) as Record<string, string | string[]>)) {
      if (typeof value === 'string') clean[key] = value;
    }
    store.setRoute({ pathname, params: clean });
  }, [pathname, paramsKey, store, navigationReady]);

  return null;
}

/** A stable key for the screen this hook is called in: route name plus its params. */
function useScreenKey(): string {
  const route = useRoute();
  const params = (route.params ?? {}) as Record<string, unknown>;
  const stable = Object.keys(params)
    .sort()
    .map((key) => `${key}=${String(params[key])}`)
    .join('&');
  return `${route.name}?${stable}`;
}

/**
 * Scroll restoration for a screen's main `ScrollView`: records the offset as
 * the user scrolls and, the first time the screen opens after a relaunch,
 * scrolls back once the content is tall enough to get there.
 */
export function useScrollRestoration() {
  const store = use(ScreenStateContext);
  const key = useScreenKey();
  const ref = useRef<ScrollView>(null);
  const [target] = useState(() => store?.takeScroll(key) ?? null);
  const pending = useRef(target !== null && target > 0);
  const viewport = useRef(0);

  // Content that never grows tall enough (e.g. fewer entries now) gets as close as it can.
  useEffect(() => {
    if (!pending.current) return;
    const id = setTimeout(() => (pending.current = false), RESTORE_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, []);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    viewport.current = event.nativeEvent.layout.height;
  }, []);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (pending.current) return;
      store?.setScroll(key, Math.round(event.nativeEvent.contentOffset.y));
    },
    [key, store],
  );

  const onContentSizeChange = useCallback(
    (_width: number, height: number) => {
      if (!pending.current || target === null) return;
      ref.current?.scrollTo({ y: target, animated: false });
      if (viewport.current > 0 && height - viewport.current >= target) pending.current = false;
    },
    [target],
  );

  // The ref travels apart from the handlers so spreading them never reads a ref during render.
  return [ref, { onLayout, onScroll, onContentSizeChange, scrollEventThrottle: 100 }] as const;
}

/**
 * `useState` whose value survives closing the app (RF-59): form drafts, the
 * selected tab of a screen. `key` must be unique in the app. Clear it with
 * `reset()` once the draft is saved.
 */
export function usePersistedState<T>(key: string, initial: T | (() => T)) {
  const store = use(ScreenStateContext);
  const [value, setValue] = useState<T>(() => {
    const saved = store?.getValue<T>(key);
    if (saved !== undefined) return saved;
    return typeof initial === 'function' ? (initial as () => T)() : initial;
  });

  const set = useCallback(
    (next: T | ((current: T) => T)) => {
      setValue((current) => {
        const resolved = typeof next === 'function' ? (next as (current: T) => T)(current) : next;
        store?.setValue(key, resolved);
        return resolved;
      });
    },
    [key, store],
  );

  const reset = useCallback(
    (to: T) => {
      store?.setValue(key, undefined);
      setValue(to);
    },
    [key, store],
  );

  return [value, set, reset] as const;
}
