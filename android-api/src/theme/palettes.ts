/**
 * Colour tokens for every palette × scheme. Screens never hard-code a colour:
 * they read these through `useColors()` / `makeStyles()`, so switching the
 * palette or the dark mode repaints the whole app at once (US-12).
 *
 * Every text/background pair used by the UI is checked for a contrast of at
 * least 4.5:1 by `npm run check:contrast` (RNF-04 / US-28).
 */

export type ColorTokens = {
  /** Page background; also the fill of inputs and chips that sit on cards. */
  background: string;
  /** Cards, sheets and the tab bar. */
  surface: string;
  /** Headings, labels and body copy. */
  text: string;
  /** Secondary copy, placeholders and inactive icons. */
  textMuted: string;
  /** Links, selected states and icon strokes. */
  accent: string;
  /** Filled buttons, selected chips. */
  primary: string;
  onPrimary: string;
  /** Hairlines and decorative outlines (not text). */
  border: string;
  badgeBackground: string;
  badgeDot: string;
  heroGradient: readonly [string, string];
  /** Calm backdrop of the full-screen diary and the digital-rest screen. */
  calmGradient: readonly [string, string];

  /** Chart accents (graphics, never text). */
  mood: string;
  anxiety: string;
  energy: string;
  barIdle: string;
  barToday: string;

  /** Tinted cards: each surface pairs with its own foreground. */
  greenSurface: string;
  greenText: string;
  purpleSurface: string;
  purpleText: string;
  amberSurface: string;
  amberText: string;
  dangerSurface: string;
  dangerBorder: string;
  dangerText: string;

  /** Calendar fill per mood level (0 = muito triste … 4 = muito feliz) and the day number on it. */
  moodScale: readonly [string, string, string, string, string];
  onMoodScale: string;

  /** Translucent layer behind modal sheets. */
  scrim: string;
  /** Glyph colour of the system status bar. */
  statusBar: 'dark' | 'light';
};

export type PaletteId = 'sereno' | 'pastel' | 'neutro';
export type Scheme = 'light' | 'dark';

export const PALETTE_NAMES: Record<PaletteId, string> = {
  sereno: 'Sereno',
  pastel: 'Tons pastel',
  neutro: 'Tons neutros',
};

const sereno: Record<Scheme, ColorTokens> = {
  light: {
    background: '#E9F1F8',
    surface: '#FFFFFF',
    text: '#1B3A57',
    textMuted: '#4D6478',
    accent: '#35607F',
    primary: '#3F6C8F',
    onPrimary: '#FFFFFF',
    border: '#D5E2ED',
    badgeBackground: '#D9E6F0',
    badgeDot: '#5F9B74',
    heroGradient: ['#EDF5F0', '#D9E5F2'],
    calmGradient: ['#E4EEF6', '#DCEBE3'],
    mood: '#6FAE86',
    anxiety: '#D9A93B',
    energy: '#9585C4',
    barIdle: 'rgba(63, 108, 143, 0.35)',
    barToday: '#35607F',
    greenSurface: '#DDEBE2',
    greenText: '#2F5A41',
    purpleSurface: '#E4DEF0',
    purpleText: '#4C3F6B',
    amberSurface: '#F5EACB',
    amberText: '#6A4E0C',
    dangerSurface: '#F4DCD5',
    dangerBorder: 'rgba(169, 80, 63, 0.45)',
    dangerText: '#8E3B2C',
    moodScale: ['#F2C9BF', '#F5DDB0', '#D6E3EE', '#CFE6D6', '#A9D6B8'],
    onMoodScale: '#1B3A57',
    scrim: 'rgba(15, 30, 45, 0.45)',
    statusBar: 'dark',
  },
  dark: {
    background: '#0E1A25',
    surface: '#172634',
    text: '#E6EEF5',
    textMuted: '#A7BACB',
    accent: '#93BEDF',
    primary: '#93BEDF',
    onPrimary: '#0E1A25',
    border: '#2A3C4D',
    badgeBackground: '#233647',
    badgeDot: '#7FC199',
    heroGradient: ['#13222E', '#1A2C3B'],
    calmGradient: ['#0F1C27', '#13241F'],
    mood: '#7FC199',
    anxiety: '#E3B955',
    energy: '#AFA1DD',
    barIdle: 'rgba(147, 190, 223, 0.35)',
    barToday: '#93BEDF',
    greenSurface: '#1D3327',
    greenText: '#A9DDBC',
    purpleSurface: '#2A2440',
    purpleText: '#CFC4F0',
    amberSurface: '#3A3016',
    amberText: '#F0D48C',
    dangerSurface: '#3D211C',
    dangerBorder: 'rgba(240, 160, 140, 0.45)',
    dangerText: '#F4B3A4',
    moodScale: ['#5C2E27', '#5A4521', '#2B3E50', '#274634', '#2F6A45'],
    onMoodScale: '#F2F6FA',
    scrim: 'rgba(0, 0, 0, 0.6)',
    statusBar: 'light',
  },
};

const pastel: Record<Scheme, ColorTokens> = {
  light: {
    background: '#F7F0F5',
    surface: '#FFFFFF',
    text: '#3B2740',
    textMuted: '#67546C',
    accent: '#7A4B7F',
    primary: '#83508A',
    onPrimary: '#FFFFFF',
    border: '#EADDE8',
    badgeBackground: '#F0E1EC',
    badgeDot: '#6FA88A',
    heroGradient: ['#FBEFF3', '#EEE6F7'],
    calmGradient: ['#F8EEF3', '#ECF2EE'],
    mood: '#7DB897',
    anxiety: '#E0A962',
    energy: '#A58CD1',
    barIdle: 'rgba(131, 80, 138, 0.3)',
    barToday: '#7A4B7F',
    greenSurface: '#E1F0E7',
    greenText: '#2F5C43',
    purpleSurface: '#EDE3F6',
    purpleText: '#4D3869',
    amberSurface: '#FBEBD6',
    amberText: '#6B4712',
    dangerSurface: '#F9DEDC',
    dangerBorder: 'rgba(156, 64, 64, 0.45)',
    dangerText: '#8C3535',
    moodScale: ['#F5C8CC', '#F8DDB9', '#E8DDEF', '#D3EBDD', '#B2DDC4'],
    onMoodScale: '#3B2740',
    scrim: 'rgba(40, 20, 45, 0.45)',
    statusBar: 'dark',
  },
  dark: {
    background: '#1B1320',
    surface: '#261C2C',
    text: '#F3E9F3',
    textMuted: '#C2B0C5',
    accent: '#DDB1E0',
    primary: '#DDB1E0',
    onPrimary: '#1B1320',
    border: '#3D2F43',
    badgeBackground: '#35283B',
    badgeDot: '#8DCBA8',
    heroGradient: ['#221828', '#281E33'],
    calmGradient: ['#1E1523', '#172420'],
    mood: '#8DCBA8',
    anxiety: '#EDBF7E',
    energy: '#BCA6E6',
    barIdle: 'rgba(221, 177, 224, 0.3)',
    barToday: '#DDB1E0',
    greenSurface: '#1E3328',
    greenText: '#AEE0C2',
    purpleSurface: '#30234A',
    purpleText: '#D8C8F2',
    amberSurface: '#3B2E1A',
    amberText: '#F3D39B',
    dangerSurface: '#3E1F22',
    dangerBorder: 'rgba(240, 160, 160, 0.45)',
    dangerText: '#F5B5B5',
    moodScale: ['#5E2B33', '#5B4424', '#3A2F48', '#284536', '#2E6647'],
    onMoodScale: '#FAF3FA',
    scrim: 'rgba(0, 0, 0, 0.6)',
    statusBar: 'light',
  },
};

const neutro: Record<Scheme, ColorTokens> = {
  light: {
    background: '#F1F0EC',
    surface: '#FFFFFF',
    text: '#262522',
    textMuted: '#5A5852',
    accent: '#4A5A4F',
    primary: '#4E5E53',
    onPrimary: '#FFFFFF',
    border: '#E2E0D9',
    badgeBackground: '#E6E4DE',
    badgeDot: '#6C9A7A',
    heroGradient: ['#F3F2EE', '#E8E7E1'],
    calmGradient: ['#F0EFEA', '#E7EDE8'],
    mood: '#779F82',
    anxiety: '#C9A052',
    energy: '#8E8AAE',
    barIdle: 'rgba(78, 94, 83, 0.3)',
    barToday: '#4A5A4F',
    greenSurface: '#E2EBE4',
    greenText: '#2E4F38',
    purpleSurface: '#E6E4EE',
    purpleText: '#433F5E',
    amberSurface: '#F1E8D3',
    amberText: '#5F4613',
    dangerSurface: '#F2E0DA',
    dangerBorder: 'rgba(140, 60, 45, 0.45)',
    dangerText: '#83392B',
    moodScale: ['#EBCFC7', '#EEDFBF', '#E3E2DC', '#D3E2D6', '#B5D2BD'],
    onMoodScale: '#262522',
    scrim: 'rgba(20, 20, 18, 0.45)',
    statusBar: 'dark',
  },
  dark: {
    background: '#161614',
    surface: '#22221F',
    text: '#EEEDE8',
    textMuted: '#B9B7AE',
    accent: '#B7C8BB',
    primary: '#B7C8BB',
    onPrimary: '#161614',
    border: '#383833',
    badgeBackground: '#2E2E2A',
    badgeDot: '#8FB89A',
    heroGradient: ['#1C1C19', '#23241F'],
    calmGradient: ['#191916', '#18211B'],
    mood: '#8FB89A',
    anxiety: '#D9B56D',
    energy: '#AAA6CB',
    barIdle: 'rgba(183, 200, 187, 0.3)',
    barToday: '#B7C8BB',
    greenSurface: '#1F2E24',
    greenText: '#B3D6BD',
    purpleSurface: '#2A2838',
    purpleText: '#D0CCE6',
    amberSurface: '#352D1B',
    amberText: '#E9D29F',
    dangerSurface: '#3A221D',
    dangerBorder: 'rgba(230, 160, 140, 0.45)',
    dangerText: '#EDB7A9',
    moodScale: ['#55302A', '#524427', '#33332F', '#2A4131', '#355C41'],
    onMoodScale: '#F5F4EF',
    scrim: 'rgba(0, 0, 0, 0.6)',
    statusBar: 'light',
  },
};

export const PALETTES: Record<PaletteId, Record<Scheme, ColorTokens>> = { sereno, pastel, neutro };

/**
 * Pairs of [foreground, background] tokens the UI actually draws text with.
 * `check-contrast` walks this list for every palette and scheme.
 */
export const TEXT_PAIRS: readonly (readonly [keyof ColorTokens, keyof ColorTokens])[] = [
  ['text', 'background'],
  ['text', 'surface'],
  ['textMuted', 'background'],
  ['textMuted', 'surface'],
  ['accent', 'background'],
  ['accent', 'surface'],
  ['onPrimary', 'primary'],
  ['greenText', 'greenSurface'],
  ['purpleText', 'purpleSurface'],
  ['amberText', 'amberSurface'],
  ['dangerText', 'dangerSurface'],
  ['dangerText', 'surface'],
  ['greenText', 'surface'],
  ['amberText', 'surface'],
  ['purpleText', 'surface'],
  ['onPrimary', 'dangerText'],
  ['text', 'amberSurface'],
  ['text', 'badgeBackground'],
  ['accent', 'badgeBackground'],
];
