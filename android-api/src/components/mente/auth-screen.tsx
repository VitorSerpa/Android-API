import { Link, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BotanicalHero } from '@/components/mente/botanical-hero';
import { MenteColors, MenteRadius, MenteType } from '@/constants/mente-theme';

/**
 * Shared chrome for Entrar / Criar conta: hero, badge, title, the form fields
 * passed as children, a submit button with a busy state, and a footer link.
 */
export function AuthScreen({
  subtitle,
  submitLabel,
  onSubmit,
  busy,
  error,
  footerText,
  footerLink,
  footerHref,
  children,
}: {
  subtitle: string;
  submitLabel: string;
  onSubmit: () => void;
  busy: boolean;
  /** Form-level error, e.g. rejected credentials. */
  error: string | null;
  footerText: string;
  footerLink: string;
  footerHref: Href;
  children: ReactNode;
}) {
  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          // Android is edge-to-edge (targetSdk 35+), where `adjustResize` no longer
          // shrinks the window, so pad on both platforms.
          behavior="padding">
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <BotanicalHero />

            <View style={styles.badgeRow}>
              <View style={styles.badge}>
                <View style={styles.badgeDot} />
                <Text style={styles.badgeText}>ESPAÇO DE PAZ</Text>
              </View>
            </View>

            <View style={styles.header}>
              <Text style={styles.title}>Mente Equilibrada</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>

            <View style={styles.form}>{children}</View>

            {error ? (
              <View style={styles.errorBox} accessibilityLiveRegion="polite">
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ busy, disabled: busy }}
              disabled={busy}
              onPress={onSubmit}
              style={({ pressed }) => [styles.submit, (pressed || busy) && styles.pressed]}>
              {busy ? (
                <ActivityIndicator color={MenteColors.onPrimary} />
              ) : (
                <Text style={styles.submitText}>{submitLabel}</Text>
              )}
            </Pressable>

            <View style={styles.footer}>
              <Text style={styles.footerText}>{footerText}</Text>
              <Link href={footerHref} replace style={styles.footerLink}>
                {footerLink}
              </Link>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: MenteColors.background,
  },
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: 22,
    paddingHorizontal: 28,
    paddingTop: 18,
    paddingBottom: 28,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: MenteRadius.pill,
    backgroundColor: MenteColors.badgeBackground,
  },
  badgeDot: {
    width: 9,
    height: 9,
    borderRadius: '50%',
    backgroundColor: MenteColors.badgeDot,
  },
  badgeText: {
    ...MenteType.badge,
    color: MenteColors.accent,
  },
  header: {
    alignItems: 'center',
    gap: 8,
  },
  title: {
    ...MenteType.title,
    color: MenteColors.text,
    textAlign: 'center',
  },
  subtitle: {
    ...MenteType.subtitle,
    color: MenteColors.textMuted,
    textAlign: 'center',
    maxWidth: 310,
  },
  form: {
    gap: 16,
  },
  errorBox: {
    padding: 12,
    borderRadius: MenteRadius.chip,
    borderWidth: 1,
    borderColor: MenteColors.dangerBorder,
    backgroundColor: MenteColors.dangerSurface,
  },
  errorText: {
    ...MenteType.caption,
    color: MenteColors.dangerText,
    textAlign: 'center',
  },
  submit: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    paddingVertical: 17,
    borderRadius: MenteRadius.button,
    backgroundColor: MenteColors.primary,
  },
  pressed: {
    opacity: 0.85,
  },
  submitText: {
    ...MenteType.button,
    color: MenteColors.onPrimary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
  },
  footerText: {
    ...MenteType.caption,
    color: MenteColors.textMuted,
  },
  footerLink: {
    ...MenteType.captionStrong,
    color: MenteColors.accent,
  },
});
