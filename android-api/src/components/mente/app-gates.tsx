import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/auth';
import { BreathingExercise } from '@/components/mente/breathing-exercise';
import { PinPad } from '@/components/mente/pin-pad';
import { Button, MIN_TOUCH } from '@/components/mente/ui';
import { MenteSpacing, MenteType } from '@/constants/mente-theme';
import type { Settings } from '@/data/types';
import { useUserData } from '@/data/user-data-context';
import { toDayKey, addDays } from '@/lib/dates';
import { confirm } from '@/lib/dialogs';
import { call } from '@/lib/phone';
import { clearPin, hasPin, pinErrorMessage, verifyPin } from '@/lib/pin';
import { isWithinWindow, minutesOf, toMinutes } from '@/lib/time';
import { makeStyles, useColors } from '@/theme';

/* ------------------------------------------------------------------ */
/* PIN (RF-36 / CA-01)                                                 */
/* ------------------------------------------------------------------ */

/** Coming back after this long in the background asks for the PIN again. */
const RELOCK_AFTER_MS = 60_000;

/**
 * Nothing behind the login — diary, check-ins, personal data — renders until
 * the correct PIN is typed. The short grace period keeps the camera or file
 * picker (which briefly background the app) from locking the user out mid-task.
 *
 * Relocking later covers the app instead of replacing it: the screens stay
 * mounted underneath, so a half-written diary entry or an open form is still
 * there after the PIN.
 */
export function PinGate({ userId, children }: { userId: string; children: ReactNode }) {
  const [state, setState] = useState<'checking' | 'locked' | 'open'>('checking');
  const [unlockedOnce, setUnlockedOnce] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pinEnabled = useRef(false);
  const { signOut } = useAuth();
  const styles = useStyles();

  useEffect(() => {
    hasPin(userId).then(
      (enabled) => {
        pinEnabled.current = enabled;
        setState(enabled ? 'locked' : 'open');
        if (!enabled) setUnlockedOnce(true);
      },
      () => setState('locked'),
    );
  }, [userId]);

  useEffect(() => {
    let backgroundedAt: number | null = null;
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'background') {
        backgroundedAt = Date.now();
        // Read now (the PIN may have been set or removed meanwhile), so coming
        // back can lock at once instead of showing the data while it checks.
        hasPin(userId).then(
          (enabled) => (pinEnabled.current = enabled),
          () => (pinEnabled.current = true),
        );
      }
      if (next === 'active' && backgroundedAt !== null) {
        const away = Date.now() - backgroundedAt;
        backgroundedAt = null;
        if (away >= RELOCK_AFTER_MS && pinEnabled.current) setState('locked');
      }
    });
    return () => subscription.remove();
  }, [userId]);

  // While the PIN covers the app, Android's back button must not navigate the screens underneath.
  useEffect(() => {
    if (state !== 'locked' || !unlockedOnce) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => subscription.remove();
  }, [state, unlockedOnce]);

  if (state === 'checking') return <View style={styles.fill} />;
  const submit = async (pin: string) => {
    setBusy(true);
    const result = await verifyPin(userId, pin);
    setBusy(false);
    if (result.ok) {
      setError(null);
      setState('open');
      setUnlockedOnce(true);
    } else {
      setError(pinErrorMessage(result.retryInSec));
    }
  };

  const forgot = async () => {
    const ok = await confirm(
      'Esqueci meu PIN',
      'Para criar um novo PIN, entre de novo com seu e-mail e senha. Seus registros continuam guardados neste aparelho.',
      'Sair e entrar de novo',
    );
    if (!ok) return;
    await clearPin(userId);
    await signOut();
  };

  const pad = (
    <SafeAreaView style={styles.fill}>
      <View style={styles.center}>
        <PinPad title="Digite seu PIN" subtitle="Seus registros estão protegidos." error={error} busy={busy} onSubmit={submit} />
        <Pressable accessibilityRole="button" onPress={forgot} style={styles.link}>
          <Text style={styles.linkText}>Esqueci meu PIN</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );

  const locked = state === 'locked';
  if (locked && !unlockedOnce) return pad;

  // One shape whether open or locked, so React keeps the screens mounted; they
  // are hidden from TalkBack while the opaque PIN screen covers them.
  return (
    <>
      <View
        style={styles.flex}
        importantForAccessibility={locked ? 'no-hide-descendants' : 'auto'}
        accessibilityElementsHidden={locked}>
        {children}
      </View>
      {locked ? <View style={styles.overlay}>{pad}</View> : null}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Descanso digital (RF-53 / CA-03)                                    */
/* ------------------------------------------------------------------ */

/**
 * The day a rest window "belongs" to: a 21:30 → 07:00 window started today
 * before midnight, or yesterday when it is already past midnight.
 */
function restKey(now: Date, start: string) {
  return toDayKey(minutesOf(now) >= toMinutes(start) ? now : addDays(now, -1));
}

export function isRestActive(rest: Settings['digitalRest'], now: Date = new Date()) {
  return rest.enabled && isWithinWindow(now, rest.start, rest.end) && rest.skippedOn !== restKey(now, rest.start);
}

/** Re-evaluates every 30 s so the rest period starts and ends by itself. */
function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    const subscription = AppState.addEventListener('change', (next) => next === 'active' && setNow(new Date()));
    return () => {
      clearInterval(id);
      subscription.remove();
    };
  }, [intervalMs]);
  return now;
}

export function DigitalRestGate({ children }: { children: ReactNode }) {
  const { data, actions } = useUserData();
  const now = useNow(30_000);
  const rest = data.settings.digitalRest;
  if (!isRestActive(rest, now)) return children;

  const endToday = async () => {
    const ok = await confirm(
      'Encerrar o descanso de hoje?',
      'As outras funções do app voltam a ficar disponíveis até o próximo período de descanso.',
      'Encerrar',
    );
    if (ok) actions.updateSettings({ digitalRest: { ...rest, skippedOn: restKey(new Date(), rest.start) } });
  };

  return <DigitalRestScreen until={rest.end} onEndToday={endToday} />;
}

function DigitalRestScreen({ until, onEndToday }: { until: string; onEndToday: () => void }) {
  const styles = useStyles();
  const c = useColors();
  const { actions } = useUserData();
  const [key, setKey] = useState(0);
  return (
    <LinearGradient colors={c.calmGradient} style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <ScrollView contentContainerStyle={styles.restContent}>
          <Text style={styles.restEyebrow}>DESCANSO DIGITAL</Text>
          <Text style={styles.restTitle}>Hora de desacelerar</Text>
          <Text style={styles.restBody}>Até {until}, só a respiração fica disponível. Aproveite para descansar a mente.</Text>

          <BreathingExercise
            key={key}
            mode={{ kind: 'cycles', cycles: 4 }}
            onComplete={(seconds) => {
              actions.logPractice('breathing', seconds);
              setKey((value) => value + 1);
            }}
          />

          <Button label="Encerrar o descanso de hoje" variant="secondary" onPress={onEndToday} />
          {/* Safety: a crisis line stays one tap away even while everything else is paused. */}
          <Pressable accessibilityRole="button" accessibilityHint="Liga para o CVV, 188" onPress={() => call('188')} style={styles.link}>
            <Text style={styles.linkText}>Precisa de ajuda agora? Ligar para o CVV (188)</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const useStyles = makeStyles((c) => ({
  fill: {
    flex: 1,
    backgroundColor: c.background,
  },
  flex: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    gap: 16,
    padding: MenteSpacing.gutter,
  },
  link: {
    minHeight: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkText: {
    ...MenteType.captionStrong,
    color: c.accent,
    textAlign: 'center',
  },
  restContent: {
    gap: 13,
    padding: MenteSpacing.gutter,
    paddingTop: 32,
  },
  restEyebrow: {
    ...MenteType.badge,
    color: c.accent,
  },
  restTitle: {
    ...MenteType.title,
    color: c.text,
  },
  restBody: {
    ...MenteType.body,
    color: c.textMuted,
  },
}));
