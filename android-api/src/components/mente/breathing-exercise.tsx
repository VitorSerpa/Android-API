import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Text, View } from 'react-native';

import { Button, Card } from '@/components/mente/ui';
import { MenteType } from '@/constants/mente-theme';
import { makeStyles } from '@/theme';

/** RF-26 / CA-01: inspire 4 s, hold 7 s, exhale 8 s. */
export const BREATH_PHASES = [
  { label: 'Inspire', seconds: 4, scale: 1 },
  { label: 'Segure', seconds: 7, scale: 1 },
  { label: 'Solte o ar', seconds: 8, scale: 0.55 },
] as const;
export const BREATH_CYCLE = BREATH_PHASES.reduce((sum, phase) => sum + phase.seconds, 0);

export type BreathingMode = { kind: 'cycles'; cycles: number } | { kind: 'timed'; seconds: number };

/** Ticks once a second while `running`; returns elapsed whole seconds. */
export function useElapsed(running: boolean) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => clearInterval(id);
  }, [running]);
  return [elapsed, setElapsed] as const;
}

/** Runs `finish` once, the first render `reached` is true. */
export function useFinishAt(reached: boolean, finish: () => void) {
  const finished = useRef(false);
  useEffect(() => {
    if (reached && !finished.current) {
      finished.current = true;
      finish();
    }
  });
}

export function phaseAt(elapsed: number) {
  const inCycle = elapsed % BREATH_CYCLE;
  let index = 0;
  let start = 0;
  while (inCycle >= start + BREATH_PHASES[index].seconds) {
    start += BREATH_PHASES[index].seconds;
    index += 1;
  }
  return { index, phase: BREATH_PHASES[index], remaining: BREATH_PHASES[index].seconds - (inCycle - start) };
}

const STAGE = 200;

/**
 * Animated 4-7-8 breathing (RF-25/RF-26). The circle grows while inhaling,
 * holds, and shrinks while exhaling; the phase name and a countdown make the
 * instruction readable without relying on the animation.
 */
export function BreathingExercise({
  mode,
  autoStart = false,
  onComplete,
}: {
  mode: BreathingMode;
  autoStart?: boolean;
  onComplete: (durationSec: number) => void;
}) {
  const styles = useStyles();
  const [running, setRunning] = useState(autoStart);
  const [elapsed] = useElapsed(running);
  const [scale] = useState(() => new Animated.Value(0.55));

  const total = mode.kind === 'cycles' ? BREATH_CYCLE * mode.cycles : mode.seconds;
  const { index, phase, remaining } = phaseAt(elapsed);
  const left = total - elapsed;

  useFinishAt(elapsed >= total, () => {
    setRunning(false);
    onComplete(total);
  });

  // Restart the circle's animation at every phase boundary.
  const phaseKey = running ? `${Math.floor(elapsed / BREATH_CYCLE)}-${index}` : 'paused';
  useEffect(() => {
    if (!running) {
      scale.stopAnimation();
      return;
    }
    Animated.timing(scale, {
      toValue: phase.scale,
      duration: remaining * 1000,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: Platform.OS !== 'web',
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phaseKey]);

  const caption =
    mode.kind === 'cycles'
      ? `Ciclo ${Math.min(Math.floor(elapsed / BREATH_CYCLE) + 1, mode.cycles)} de ${mode.cycles} · inspire 4s, segure 7s, solte 8s`
      : `Faltam ${left} s · inspire 4s, segure 7s, solte 8s`;

  return (
    <>
      <Card style={styles.centerCard}>
        <View
          style={styles.stage}
          accessible
          accessibilityLiveRegion="polite"
          accessibilityLabel={running ? `${phase.label}, ${remaining} segundos` : 'Pronto para começar'}>
          <Animated.View style={[styles.circle, { transform: [{ scale }] }]} />
          <View style={styles.label}>
            <Text style={styles.phaseText}>{running || elapsed ? phase.label : 'Pronto?'}</Text>
            {running ? <Text style={styles.countText}>{remaining}</Text> : null}
          </View>
        </View>
        <Text style={styles.caption}>{caption}</Text>
      </Card>

      <Button label={running ? 'Pausar' : elapsed ? 'Continuar' : 'Começar'} onPress={() => setRunning((value) => !value)} />
      {mode.kind === 'cycles' && elapsed >= BREATH_CYCLE ? (
        <Button label="Encerrar e registrar" variant="secondary" onPress={() => onComplete(elapsed)} />
      ) : null}
    </>
  );
}

const useStyles = makeStyles((c) => ({
  centerCard: {
    alignItems: 'center',
    gap: 14,
    paddingVertical: 28,
  },
  stage: {
    width: STAGE,
    height: STAGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    position: 'absolute',
    width: STAGE,
    height: STAGE,
    borderRadius: STAGE / 2,
    backgroundColor: c.badgeBackground,
    borderWidth: 3,
    borderColor: c.primary,
  },
  label: {
    alignItems: 'center',
  },
  phaseText: {
    ...MenteType.button,
    color: c.accent,
  },
  countText: {
    ...MenteType.title,
    color: c.text,
  },
  caption: {
    ...MenteType.small,
    textAlign: 'center',
    color: c.textMuted,
  },
}));
