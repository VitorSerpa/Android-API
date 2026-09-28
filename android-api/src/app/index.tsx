import { Link, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BotanicalHero } from '@/components/mente/botanical-hero';
import { TextField } from '@/components/mente/text-field';
import { MenteColors, MenteRadius, MenteType } from '@/constants/mente-theme';

export default function LoginScreen() {
  const router = useRouter();

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
              <Text style={styles.subtitle}>Respire fundo e recupere o seu bem-estar diário.</Text>
            </View>

            <View style={styles.form}>
              <TextField
                label="E-mail"
                placeholder="seuemail@exemplo.com.br"
                autoCapitalize="none"
                autoComplete="email"
                inputMode="email"
              />
              <TextField
                label="Senha"
                placeholder="••••••••"
                secure
                autoCapitalize="none"
                autoComplete="current-password"
              />
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => router.replace('/home')}
              style={({ pressed }) => [styles.submit, pressed && styles.pressed]}>
              <Text style={styles.submitText}>Entrar</Text>
            </Pressable>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Não tem uma conta?</Text>
              <Link href="/home" style={styles.footerLink}>
                Criar conta
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
  submit: {
    alignItems: 'center',
    justifyContent: 'center',
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
