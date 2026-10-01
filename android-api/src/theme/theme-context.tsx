import { createContext, use, useEffect, useState, type ReactNode } from 'react';
import { Appearance, StyleSheet, useColorScheme } from 'react-native';

import { jsonStorage } from '@/lib/storage';
import { isWithinWindow } from '@/lib/time';
import { PALETTES, type ColorTokens, type PaletteId, type Scheme } from '@/theme/palettes';

/**
 * How dark mode is decided (RF-51):
 * - `system`: follow the phone's setting (React Native `Appearance`);
 * - `schedule`: dark between `nightStart` and `nightEnd`, switching by itself;
 * - `light` / `dark`: fixed.
 */
export type DarkModePreference = 'system' | 'schedule' | 'light' | 'dark';

export type AppearancePrefs = {
  palette: PaletteId;
  darkMode: DarkModePreference;
  /** `HH:MM`, local time. */
  nightStart: string;
  nightEnd: string;
};

export const DEFAULT_APPEARANCE: AppearancePrefs = {
  palette: 'sereno',
  darkMode: 'system',
  nightStart: '19:00',
  nightEnd: '07:00',
};

/**
 * Appearance is a device preference, not account data: the login screens are
 * themed too, and the choice must survive restarts (US-12 CA-01).
 */
const PREFS_KEY = 'mente:appearance';

type ThemeContextValue = {
  colors: ColorTokens;
  scheme: Scheme;
  prefs: AppearancePrefs;
  setPrefs: (patch: Partial<AppearancePrefs>) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** Re-renders once a minute so a `schedule` dark mode flips on its own. */
function useMinuteClock(enabled: boolean) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, [enabled]);
  return now;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefsState] = useState<AppearancePrefs | null>(null);
  const systemScheme = useColorScheme();
  const now = useMinuteClock(prefs?.darkMode === 'schedule');

  useEffect(() => {
    jsonStorage
      .get<Partial<AppearancePrefs>>(PREFS_KEY)
      .catch(() => null)
      .then((stored) => setPrefsState({ ...DEFAULT_APPEARANCE, ...stored }));
  }, []);

  const current = prefs ?? DEFAULT_APPEARANCE;
  const scheme: Scheme =
    current.darkMode === 'system'
      ? systemScheme === 'dark'
        ? 'dark'
        : 'light'
      : current.darkMode === 'schedule'
        ? isWithinWindow(now, current.nightStart, current.nightEnd)
          ? 'dark'
          : 'light'
        : current.darkMode;

  // Native pieces (alerts, keyboard, date pickers) follow the app's choice.
  useEffect(() => {
    // react-native-web has no `setColorScheme`; there the palette alone follows the choice.
    if (!prefs || typeof Appearance.setColorScheme !== 'function') return;
    Appearance.setColorScheme(prefs.darkMode === 'system' ? 'unspecified' : scheme);
  }, [prefs, scheme]);

  if (!prefs) return null;

  const value: ThemeContextValue = {
    colors: PALETTES[prefs.palette][scheme],
    scheme,
    prefs,
    setPrefs: (patch) => {
      setPrefsState((previous) => {
        const next = { ...(previous ?? DEFAULT_APPEARANCE), ...patch };
        jsonStorage.set(PREFS_KEY, next).catch((error) => console.warn('Falha ao salvar aparência', error));
        return next;
      });
    },
  };

  return <ThemeContext value={value}>{children}</ThemeContext>;
}

export function useTheme(): ThemeContextValue {
  const value = use(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside <ThemeProvider />');
  return value;
}

export const useColors = () => useTheme().colors;

/**
 * `StyleSheet.create` for themed styles: the factory runs once per palette and
 * scheme, and every component calling the returned hook shares the result.
 */
export function makeStyles<T extends StyleSheet.NamedStyles<T>>(factory: (c: ColorTokens) => T) {
  const cache = new WeakMap<ColorTokens, T>();
  return function useStyles(): T {
    const colors = useColors();
    let styles = cache.get(colors);
    if (!styles) {
      styles = StyleSheet.create(factory(colors));
      cache.set(colors, styles);
    }
    return styles;
  };
}
