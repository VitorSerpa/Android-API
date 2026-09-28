/**
 * Design tokens for the "Mente Equilibrada" screens.
 *
 * Extracted from the Figma prototype:
 * https://www.figma.com/design/sgqzZjsxHZ3EtNB9UtI6Uv/
 *
 * These live next to `theme.ts` (the Expo starter tokens) rather than inside it,
 * because the prototype has a fixed light palette and its own type scale.
 */

export const MenteColors = {
  /** Page background */
  background: '#E9F1F8',
  /** Headings, labels, status bar glyphs */
  text: '#1B3A57',
  /** Body copy, placeholders, inactive icons */
  textMuted: '#7C99AE',
  /** Links and badge copy */
  accent: '#4F7A9B',
  /** Primary button */
  primary: '#86ABC9',
  onPrimary: '#FFFFFF',
  surface: '#FFFFFF',
  border: '#DEE9F2',
  badgeBackground: '#D9E6F0',
  badgeDot: '#8FBFA0',
  heroGradient: ['#EDF5F0', '#D9E5F2'] as const,

  /** Metric / chart accents, in the order the dashboard uses them. */
  mood: '#8FBFA0',
  anxiety: '#E9C97F',
  energy: '#B6A8D6',
  /** 7-day bar chart: inactive bars are the primary at 55%, today is solid. */
  barIdle: 'rgba(134, 171, 201, 0.55)',
  barToday: '#4F7A9B',

  /** Tinted cards. Each pairs a background with its own foreground. */
  greenSurface: '#DDEBE2',
  greenText: '#3E6B51',
  purpleSurface: '#E4DEF0',
  purpleText: '#4C3F6B',
  dangerSurface: '#F4DCD5',
  dangerBorder: 'rgba(217, 140, 126, 0.5)',
  dangerText: '#A9503F',
} as const;

export const MenteFonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

/** Figma uses unitless line heights; these are the resolved pixel values. */
export const MenteType = {
  title: { fontFamily: MenteFonts.bold, fontSize: 30, lineHeight: 36 },
  /** Dashboard greeting. */
  heading: { fontFamily: MenteFonts.bold, fontSize: 24, lineHeight: 34 },
  /** Top bar title on the inner screens. */
  screenTitle: { fontFamily: MenteFonts.bold, fontSize: 19, lineHeight: 27 },
  sectionTitle: { fontFamily: MenteFonts.semiBold, fontSize: 15, lineHeight: 21 },
  cardTitle: { fontFamily: MenteFonts.semiBold, fontSize: 13, lineHeight: 18 },
  subtitle: { fontFamily: MenteFonts.regular, fontSize: 14, lineHeight: 20 },
  label: { fontFamily: MenteFonts.medium, fontSize: 13, lineHeight: 18 },
  body: { fontFamily: MenteFonts.regular, fontSize: 14, lineHeight: 20 },
  button: { fontFamily: MenteFonts.semiBold, fontSize: 16, lineHeight: 22 },
  caption: { fontFamily: MenteFonts.regular, fontSize: 13, lineHeight: 18 },
  captionStrong: { fontFamily: MenteFonts.semiBold, fontSize: 13, lineHeight: 18 },
  /** Metadata under a row title, chip values, "Ver tudo" links. */
  small: { fontFamily: MenteFonts.regular, fontSize: 12, lineHeight: 17 },
  smallStrong: { fontFamily: MenteFonts.semiBold, fontSize: 12, lineHeight: 17 },
  link: { fontFamily: MenteFonts.medium, fontSize: 11, lineHeight: 15 },
  tiny: { fontFamily: MenteFonts.regular, fontSize: 10, lineHeight: 14 },
  tinyStrong: { fontFamily: MenteFonts.semiBold, fontSize: 10, lineHeight: 14 },
  /** Weekday initials under the bar chart. */
  micro: { fontFamily: MenteFonts.regular, fontSize: 9, lineHeight: 13 },
  metric: { fontFamily: MenteFonts.bold, fontSize: 20, lineHeight: 28 },
  badge: {
    fontFamily: MenteFonts.semiBold,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0.8,
  },
  /** Uppercase section headers in Perfil. */
  sectionEyebrow: {
    fontFamily: MenteFonts.semiBold,
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 0.7,
  },
} as const;

export const MenteRadius = {
  input: 14,
  chip: 14,
  button: 16,
  row: 16,
  card: 20,
  tinted: 18,
  hero: 24,
  pill: 99,
} as const;

/** Horizontal page gutter used by every screen in the prototype. */
export const MenteSpacing = {
  gutter: 20,
  cardPadding: 16,
} as const;
