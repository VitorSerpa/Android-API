import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { Icon } from '@/components/mente/icon';
import { MenteType } from '@/constants/mente-theme';
import { PIN_LENGTH } from '@/lib/pin';
import { makeStyles, useColors } from '@/theme';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'back', '0', 'ok'] as const;

/**
 * Numeric keypad with masked dots. Keys are 64 pt, well above the 44 pt minimum
 * (RNF-04), and each one is labelled for TalkBack.
 */
export function PinPad({
  title,
  subtitle,
  error,
  busy = false,
  onSubmit,
}: {
  title: string;
  subtitle?: string;
  error?: string | null;
  busy?: boolean;
  /** Called with the typed PIN; the pad clears itself afterwards. */
  onSubmit: (pin: string) => void;
}) {
  const styles = useStyles();
  const c = useColors();
  const [pin, setPin] = useState('');

  const press = (key: (typeof KEYS)[number]) => {
    if (busy) return;
    if (key === 'back') return setPin((value) => value.slice(0, -1));
    if (key === 'ok') {
      if (pin.length < PIN_LENGTH.min) return;
      onSubmit(pin);
      setPin('');
      return;
    }
    // Submitted outside the state updater, which React may run more than once.
    const next = pin.length < PIN_LENGTH.max ? pin + key : pin;
    if (next.length === PIN_LENGTH.max) {
      setPin('');
      onSubmit(next);
      return;
    }
    setPin(next);
  };

  return (
    <View style={styles.container}>
      <Icon name="lock" size={28} color={c.accent} cutColor={c.background} />
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

      <View
        style={styles.dots}
        accessible
        accessibilityLabel={`${pin.length} de ${PIN_LENGTH.max} dígitos digitados`}>
        {Array.from({ length: PIN_LENGTH.max }, (_, index) => (
          <View key={index} style={[styles.dot, index < pin.length && styles.dotFilled]} />
        ))}
      </View>

      <View style={styles.status}>
        {busy ? (
          <ActivityIndicator color={c.accent} />
        ) : error ? (
          <Text style={styles.error} accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}
      </View>

      <View style={styles.grid}>
        {KEYS.map((key) => (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityLabel={key === 'back' ? 'Apagar' : key === 'ok' ? 'Confirmar' : key}
            accessibilityState={{ disabled: key === 'ok' && pin.length < PIN_LENGTH.min }}
            onPress={() => press(key)}
            style={({ pressed }) => [styles.key, key === 'ok' && styles.keyOk, pressed && styles.pressed]}>
            {key === 'back' ? (
              <Icon name="chevronLeft" size={18} color={c.text} />
            ) : (
              <Text style={[styles.keyText, key === 'ok' && styles.keyOkText]}>{key === 'ok' ? 'OK' : key}</Text>
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const KEY = 64;

const useStyles = makeStyles((c) => ({
  container: {
    alignItems: 'center',
    gap: 10,
    width: '100%',
    maxWidth: 320,
    alignSelf: 'center',
  },
  title: {
    ...MenteType.heading,
    fontSize: 22,
    color: c.text,
    textAlign: 'center',
  },
  subtitle: {
    ...MenteType.body,
    color: c.textMuted,
    textAlign: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 10,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: c.accent,
  },
  dotFilled: {
    backgroundColor: c.accent,
  },
  status: {
    minHeight: 24,
    justifyContent: 'center',
  },
  error: {
    ...MenteType.caption,
    color: c.dangerText,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    width: KEY * 3 + 16 * 2,
  },
  key: {
    width: KEY,
    height: KEY,
    borderRadius: KEY / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surface,
  },
  keyOk: {
    backgroundColor: c.primary,
  },
  keyText: {
    ...MenteType.metric,
    color: c.text,
  },
  keyOkText: {
    ...MenteType.button,
    color: c.onPrimary,
  },
  pressed: {
    opacity: 0.7,
  },
}));
