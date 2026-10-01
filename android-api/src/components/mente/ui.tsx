import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, Text, TextInput, View, type TextInputProps, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, type IconName } from '@/components/mente/icon';
import { MenteRadius, MenteSpacing, MenteType } from '@/constants/mente-theme';
import { makeStyles, useColors } from '@/theme';

/** Android's minimum touch target, in points (RNF-04). */
export const MIN_TOUCH = 44;

/** Extra reach for small text links and pills so they reach ~44 pt. */
export const TOUCH_SLOP = { top: 14, bottom: 14, left: 10, right: 10 } as const;

/** White rounded panel — the prototype's default container. */
export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const styles = useStyles();
  return <View style={[styles.card, style]}>{children}</View>;
}

/** Pushes whatever follows it to the far edge of a row. */
export function Spacer() {
  const styles = useStyles();
  return <View style={styles.spacer} />;
}

/**
 * The prototype draws a back chevron on every inner screen. These screens are
 * tabs, so there is usually nothing to pop — fall back to the first tab.
 */
export function TopBar({ title, right }: { title: string; right?: ReactNode }) {
  const c = useColors();
  const styles = useStyles();
  const router = useRouter();

  return (
    <View style={styles.topBar}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Voltar"
        hitSlop={8}
        onPress={() => (router.canGoBack() ? router.back() : router.navigate('/home'))}
        style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
        <Icon name="chevronLeft" size={16} color={c.accent} />
      </Pressable>

      <Text style={styles.topBarTitle}>{title}</Text>
      <Spacer />
      {right}
    </View>
  );
}

/** Row of "<title> …………… <action>" that heads most cards and lists. */
export function SectionHeader({
  title,
  action,
  onPressAction,
}: {
  title: string;
  action?: string;
  onPressAction?: () => void;
}) {
  const styles = useStyles();
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Spacer />
      {action ? (
        <Pressable accessibilityRole="button" hitSlop={TOUCH_SLOP} onPress={onPressAction}>
          <Text style={styles.link}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Small rounded pill used for tags, statuses and counters. */
export function Pill({
  label,
  tone = 'muted',
  onPress,
}: {
  label: string;
  tone?: 'muted' | 'accent' | 'positive';
  onPress?: () => void;
}) {
  const styles = useStyles();
  const pillStyle = [
    styles.pill,
    tone === 'accent' && styles.pillAccent,
    tone === 'positive' && styles.pillPositive,
  ];
  const text = (
    <Text
      style={[
        styles.pillText,
        tone === 'accent' && styles.pillTextAccent,
        tone === 'positive' && styles.pillTextPositive,
      ]}>
      {label}
    </Text>
  );

  if (!onPress) return <View style={pillStyle}>{text}</View>;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={TOUCH_SLOP}
      onPress={onPress}
      style={({ pressed }) => [...pillStyle, pressed && styles.pressed]}>
      {text}
    </Pressable>
  );
}

/** Tinted circle behind a glyph, as used by the settings rows and tool cards. */
export function IconBubble({
  name,
  size = 29,
  glyphSize = 15,
  background,
  color,
}: {
  name: IconName;
  size?: number;
  glyphSize?: number;
  background?: string;
  color?: string;
}) {
  const styles = useStyles();
  const c = useColors();
  background ??= c.background;
  color ??= c.accent;
  return (
    <View
      style={[
        styles.bubble,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: background },
      ]}>
      <Icon name={name} size={glyphSize} color={color} cutColor={background} />
    </View>
  );
}

/** Controlled switch matching the prototype's 42×24 toggle. */
export function Toggle({
  value,
  onValueChange,
  accessibilityLabel,
}: {
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel?: string;
}) {
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value }}
      // react-native-web ignores `accessibilityState`; `aria-checked` reaches both platforms.
      aria-checked={value}
      // 42×24 visually, 44×44 to the finger (RNF-04).
      hitSlop={{ top: 10, bottom: 10, left: 1, right: 1 }}
      onPress={() => onValueChange(!value)}
      style={[styles.toggle, value && styles.toggleOn]}>
      <View style={[styles.toggleKnob, value && styles.toggleKnobOn]} />
    </Pressable>
  );
}

/** Full-width button in the prototype's two weights. */
export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'secondary' && styles.buttonSecondary,
        (pressed || disabled) && styles.pressed,
        style,
      ]}>
      <Text style={[styles.buttonText, variant === 'secondary' && styles.buttonTextSecondary]}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Compact text input for forms that live inside a card. */
export function Input({ style, ...props }: TextInputProps) {
  const c = useColors();
  const styles = useStyles();
  return (
    <TextInput
      placeholderTextColor={c.textMuted}
      style={[styles.input, props.multiline && styles.inputMultiline, style]}
      {...props}
    />
  );
}

/** Icon + title + optional subtitle + trailing slot. The settings-list workhorse. */
export function SettingRow({
  icon,
  title,
  subtitle,
  trailing,
  onPress,
}: {
  icon: IconName;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  onPress?: () => void;
}) {
  const styles = useStyles();
  const content = (
    <>
      <IconBubble name={icon} />
      <View style={styles.settingRowText}>
        <Text style={styles.settingRowTitle}>{title}</Text>
        {subtitle ? <Text style={styles.settingRowSubtitle}>{subtitle}</Text> : null}
      </View>
      {trailing}
    </>
  );

  if (!onPress) {
    return <View style={styles.settingRow}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.settingRow, pressed && styles.pressed]}>
      {content}
    </Pressable>
  );
}

/** Uppercase header that opens each settings section. */
export function SectionEyebrow({ children }: { children: string }) {
  const styles = useStyles();
  return <Text style={styles.eyebrow}>{children}</Text>;
}

export function Chevron() {
  const c = useColors();
  return <Icon name="chevronRight" size={13} color={c.textMuted} />;
}

const useStyles = makeStyles((c) => ({
  card: {
    backgroundColor: c.surface,
    borderRadius: MenteRadius.card,
    padding: MenteSpacing.cardPadding,
  },
  spacer: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    padding: 9,
    borderRadius: MenteRadius.pill,
    backgroundColor: c.surface,
  },
  topBarTitle: {
    ...MenteType.screenTitle,
    color: c.text,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  sectionTitle: {
    ...MenteType.sectionTitle,
    color: c.text,
  },
  link: {
    ...MenteType.link,
    color: c.accent,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: MenteRadius.pill,
    backgroundColor: c.background,
  },
  pillAccent: {
    backgroundColor: c.primary,
  },
  pillPositive: {
    backgroundColor: c.greenSurface,
  },
  pillText: {
    ...MenteType.tiny,
    color: c.textMuted,
  },
  pillTextAccent: {
    ...MenteType.tinyStrong,
    color: c.onPrimary,
  },
  pillTextPositive: {
    ...MenteType.tinyStrong,
    color: c.greenText,
  },
  bubble: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggle: {
    width: 42,
    height: 24,
    borderRadius: MenteRadius.pill,
    backgroundColor: c.border,
    justifyContent: 'center',
  },
  toggleOn: {
    backgroundColor: c.primary,
  },
  toggleKnob: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginLeft: 3,
    backgroundColor: c.surface,
  },
  toggleKnobOn: {
    marginLeft: 21,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: MenteRadius.button,
    backgroundColor: c.primary,
  },
  buttonSecondary: {
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
  },
  buttonText: {
    ...MenteType.button,
    fontSize: 15,
    color: c.onPrimary,
  },
  buttonTextSecondary: {
    color: c.accent,
  },
  input: {
    ...MenteType.body,
    minHeight: MIN_TOUCH,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: MenteRadius.chip,
    backgroundColor: c.background,
    color: c.text,
  },
  inputMultiline: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    minHeight: MIN_TOUCH,
    paddingVertical: 4,
  },
  settingRowText: {
    flex: 1,
    gap: 1,
  },
  settingRowTitle: {
    ...MenteType.captionStrong,
    color: c.text,
  },
  settingRowSubtitle: {
    ...MenteType.tiny,
    color: c.textMuted,
  },
  eyebrow: {
    ...MenteType.sectionEyebrow,
    color: c.textMuted,
  },
}));
