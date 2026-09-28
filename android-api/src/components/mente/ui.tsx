import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { Icon, type IconName } from '@/components/mente/icon';
import { MenteColors, MenteRadius, MenteSpacing, MenteType } from '@/constants/mente-theme';

/** White rounded panel — the prototype's default container. */
export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/** Pushes whatever follows it to the far edge of a row. */
export function Spacer() {
  return <View style={styles.spacer} />;
}

/**
 * The prototype draws a back chevron on every inner screen. These screens are
 * tabs, so there is usually nothing to pop — fall back to the first tab.
 */
export function TopBar({ title, right }: { title: string; right?: ReactNode }) {
  const router = useRouter();

  return (
    <View style={styles.topBar}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Voltar"
        hitSlop={8}
        onPress={() => (router.canGoBack() ? router.back() : router.navigate('/home'))}
        style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
        <Icon name="chevronLeft" size={16} color={MenteColors.accent} />
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
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Spacer />
      {action ? (
        <Pressable accessibilityRole="button" hitSlop={8} onPress={onPressAction}>
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
      hitSlop={6}
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
  background = MenteColors.background,
  color = MenteColors.accent,
}: {
  name: IconName;
  size?: number;
  glyphSize?: number;
  background?: string;
  color?: string;
}) {
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
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value }}
      // react-native-web ignores `accessibilityState`; `aria-checked` reaches both platforms.
      aria-checked={value}
      hitSlop={6}
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
  style?: ViewStyle;
}) {
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
  return (
    <TextInput
      placeholderTextColor={MenteColors.textMuted}
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
  return <Text style={styles.eyebrow}>{children}</Text>;
}

export function Chevron() {
  return <Icon name="chevronRight" size={13} color={MenteColors.textMuted} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: MenteColors.surface,
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
    backgroundColor: MenteColors.surface,
  },
  topBarTitle: {
    ...MenteType.screenTitle,
    color: MenteColors.text,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  sectionTitle: {
    ...MenteType.sectionTitle,
    color: MenteColors.text,
  },
  link: {
    ...MenteType.link,
    color: MenteColors.accent,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: MenteRadius.pill,
    backgroundColor: MenteColors.background,
  },
  pillAccent: {
    backgroundColor: MenteColors.primary,
  },
  pillPositive: {
    backgroundColor: MenteColors.greenSurface,
  },
  pillText: {
    ...MenteType.tiny,
    color: MenteColors.textMuted,
  },
  pillTextAccent: {
    ...MenteType.tinyStrong,
    color: MenteColors.onPrimary,
  },
  pillTextPositive: {
    ...MenteType.tinyStrong,
    color: MenteColors.greenText,
  },
  bubble: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggle: {
    width: 42,
    height: 24,
    borderRadius: MenteRadius.pill,
    backgroundColor: MenteColors.border,
    justifyContent: 'center',
  },
  toggleOn: {
    backgroundColor: MenteColors.primary,
  },
  toggleKnob: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginLeft: 3,
    backgroundColor: MenteColors.surface,
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
    backgroundColor: MenteColors.primary,
  },
  buttonSecondary: {
    borderWidth: 1,
    borderColor: MenteColors.border,
    backgroundColor: MenteColors.surface,
  },
  buttonText: {
    ...MenteType.button,
    fontSize: 15,
    color: MenteColors.onPrimary,
  },
  buttonTextSecondary: {
    color: MenteColors.accent,
  },
  input: {
    ...MenteType.body,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: MenteRadius.chip,
    backgroundColor: MenteColors.background,
    color: MenteColors.text,
  },
  inputMultiline: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 4,
  },
  settingRowText: {
    flex: 1,
    gap: 1,
  },
  settingRowTitle: {
    ...MenteType.captionStrong,
    color: MenteColors.text,
  },
  settingRowSubtitle: {
    ...MenteType.tiny,
    color: MenteColors.textMuted,
  },
  eyebrow: {
    ...MenteType.sectionEyebrow,
    color: MenteColors.textMuted,
  },
});
