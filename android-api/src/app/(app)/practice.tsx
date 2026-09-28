import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/mente/icon';
import { Button, Card, TopBar } from '@/components/mente/ui';
import { MenteColors, MenteRadius, MenteSpacing, MenteType } from '@/constants/mente-theme';
import type { ToolId } from '@/data/types';
import { useUserData } from '@/data/user-data-context';

const TITLES: Record<ToolId, string> = {
  breathing: 'Respiração 4-7-8',
  meditation: 'Meditação guiada',
  grounding: 'Grounding 5-4-3-2-1',
  affirmations: 'Afirmações',
};

const isTool = (value: unknown): value is ToolId =>
  typeof value === 'string' && value in TITLES;

/** Ticks once a second while `running`; returns elapsed whole seconds. */
function useElapsed(running: boolean) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => clearInterval(id);
  }, [running]);
  return [elapsed, setElapsed] as const;
}

/** Runs `finish` once, the first render `reached` is true. */
function useFinishAt(reached: boolean, finish: () => void) {
  const finished = useRef(false);
  useEffect(() => {
    if (reached && !finished.current) {
      finished.current = true;
      finish();
    }
  });
}

const formatClock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

export default function PracticeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tool?: string }>();
  const tool: ToolId = isTool(params.tool) ? params.tool : 'breathing';
  const { actions } = useUserData();
  const [done, setDone] = useState(false);

  const complete = (durationSec: number) => {
    if (durationSec > 0) actions.logPractice(tool, durationSec);
    setDone(true);
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <TopBar title={TITLES[tool]} />

          {done ? (
            <Card style={styles.doneCard}>
              <Icon name="heart" size={30} color={MenteColors.greenText} />
              <Text style={styles.doneTitle}>Prática registrada</Text>
              <Text style={styles.doneText}>
                Que bom que você reservou esse momento para você.
              </Text>
              <Button
                label="Voltar"
                onPress={() => (router.canGoBack() ? router.back() : router.navigate('/tools'))}
                style={styles.stretch}
              />
            </Card>
          ) : tool === 'breathing' ? (
            <Breathing onComplete={complete} />
          ) : tool === 'meditation' ? (
            <Meditation onComplete={complete} />
          ) : tool === 'grounding' ? (
            <Grounding onComplete={complete} />
          ) : (
            <Affirmations onComplete={complete} />
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

type PracticeProps = { onComplete: (durationSec: number) => void };

const BREATH_PHASES = [
  { label: 'Inspire', seconds: 4, scale: 1 },
  { label: 'Segure', seconds: 7, scale: 1 },
  { label: 'Solte o ar', seconds: 8, scale: 0.55 },
] as const;
const CYCLE = BREATH_PHASES.reduce((sum, phase) => sum + phase.seconds, 0);
const CYCLES = 4;

function Breathing({ onComplete }: PracticeProps) {
  const [running, setRunning] = useState(false);
  const [elapsed] = useElapsed(running);
  const [scale] = useState(() => new Animated.Value(0.55));

  const total = CYCLE * CYCLES;
  const inCycle = elapsed % CYCLE;
  let phaseIndex = 0;
  let phaseStart = 0;
  while (inCycle >= phaseStart + BREATH_PHASES[phaseIndex].seconds) {
    phaseStart += BREATH_PHASES[phaseIndex].seconds;
    phaseIndex += 1;
  }
  const phase = BREATH_PHASES[phaseIndex];
  const remaining = phase.seconds - (inCycle - phaseStart);
  const cycle = Math.min(Math.floor(elapsed / CYCLE) + 1, CYCLES);

  useFinishAt(elapsed >= total, () => {
    setRunning(false);
    onComplete(total);
  });

  // Restart the circle's animation at every phase boundary.
  const phaseKey = running ? `${Math.floor(elapsed / CYCLE)}-${phaseIndex}` : 'paused';
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

  return (
    <>
      <Card style={styles.centerCard}>
        <View style={styles.breathStage}>
          <Animated.View style={[styles.breathCircle, { transform: [{ scale }] }]} />
          <View style={styles.breathLabel}>
            <Text style={styles.phaseText}>{running || elapsed ? phase.label : 'Pronto?'}</Text>
            {running ? <Text style={styles.countText}>{remaining}</Text> : null}
          </View>
        </View>
        <Text style={styles.caption}>
          Ciclo {cycle} de {CYCLES} · inspire 4s, segure 7s, solte 8s
        </Text>
      </Card>

      <Button
        label={running ? 'Pausar' : elapsed ? 'Continuar' : 'Começar'}
        onPress={() => setRunning((value) => !value)}
      />
      {elapsed >= CYCLE ? (
        <Button label="Encerrar e registrar" variant="secondary" onPress={() => onComplete(elapsed)} />
      ) : null}
    </>
  );
}

const MEDITATION_MINUTES = [3, 5, 10, 15] as const;

const MEDITATION_PROMPTS = [
  'Sente-se confortavelmente e feche os olhos, se quiser.',
  'Observe o ar entrando e saindo, sem tentar mudá-lo.',
  'Quando um pensamento surgir, apenas note-o e volte à respiração.',
  'Perceba o peso do seu corpo e os pontos de apoio.',
  'Solte os ombros, a mandíbula e a testa.',
];

function Meditation({ onComplete }: PracticeProps) {
  const [minutes, setMinutes] = useState<number>(5);
  const [running, setRunning] = useState(false);
  const [elapsed] = useElapsed(running);
  const total = minutes * 60;
  const started = elapsed > 0;

  useFinishAt(elapsed >= total, () => {
    setRunning(false);
    onComplete(total);
  });

  const prompt = MEDITATION_PROMPTS[Math.floor(elapsed / 45) % MEDITATION_PROMPTS.length];

  return (
    <>
      {!started ? (
        <View style={styles.chipRow}>
          {MEDITATION_MINUTES.map((value) => {
            const selected = minutes === value;
            return (
              <Pressable
                key={value}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => setMinutes(value)}
                style={[styles.chip, selected && styles.chipSelected]}>
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                  {value} min
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <Card style={styles.centerCard}>
        <Icon name="moon" size={40} color={MenteColors.purpleText} />
        <Text style={styles.clock}>{formatClock(total - elapsed)}</Text>
        <Text style={styles.prompt}>{started ? prompt : 'Escolha a duração e comece quando quiser.'}</Text>
      </Card>

      <Button
        label={running ? 'Pausar' : started ? 'Continuar' : 'Começar'}
        onPress={() => setRunning((value) => !value)}
      />
      {started ? (
        <Button label="Encerrar e registrar" variant="secondary" onPress={() => onComplete(elapsed)} />
      ) : null}
    </>
  );
}

const GROUNDING_STEPS = [
  { count: 5, sense: 'coisas que você consegue ver' },
  { count: 4, sense: 'coisas que você consegue tocar' },
  { count: 3, sense: 'sons que você consegue ouvir' },
  { count: 2, sense: 'cheiros que você consegue sentir' },
  { count: 1, sense: 'sabor que você consegue perceber' },
] as const;

function Grounding({ onComplete }: PracticeProps) {
  const [step, setStep] = useState(0);
  const [startedAt] = useState(() => Date.now());
  const current = GROUNDING_STEPS[step];
  const last = step === GROUNDING_STEPS.length - 1;

  return (
    <>
      <Card style={styles.centerCard}>
        <Text style={styles.bigNumber}>{current.count}</Text>
        <Text style={styles.prompt}>
          Nomeie, em voz alta ou mentalmente, {current.count} {current.sense}.
        </Text>
        <View style={styles.dots}>
          {GROUNDING_STEPS.map((item, index) => (
            <View key={item.count} style={[styles.dot, index <= step && styles.dotActive]} />
          ))}
        </View>
      </Card>

      <Button
        label={last ? 'Concluir' : 'Próximo'}
        onPress={() =>
          last
            ? onComplete(Math.round((Date.now() - startedAt) / 1000))
            : setStep((value) => value + 1)
        }
      />
      {step > 0 ? (
        <Button label="Voltar um passo" variant="secondary" onPress={() => setStep((value) => value - 1)} />
      ) : null}
    </>
  );
}

const AFFIRMATIONS = [
  'Eu mereço cuidado, inclusive o meu.',
  'Posso ir devagar e ainda assim chegar.',
  'Meus sentimentos são válidos, e eles passam.',
  'Já superei dias difíceis antes.',
  'Estou fazendo o melhor que posso com o que tenho hoje.',
  'Não preciso ser perfeito(a) para ter valor.',
  'Respirar fundo também é uma forma de seguir em frente.',
];

function Affirmations({ onComplete }: PracticeProps) {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * AFFIRMATIONS.length));
  const [startedAt] = useState(() => Date.now());

  return (
    <>
      <Card style={styles.centerCard}>
        <Icon name="heart" size={30} color={MenteColors.dangerText} />
        <Text style={styles.affirmation}>{AFFIRMATIONS[index]}</Text>
        <Text style={styles.caption}>Leia devagar, algumas vezes, e note como se sente.</Text>
      </Card>

      <Button
        label="Outra afirmação"
        variant="secondary"
        onPress={() => setIndex((value) => (value + 1) % AFFIRMATIONS.length)}
      />
      <Button
        label="Concluir"
        onPress={() => onComplete(Math.max(1, Math.round((Date.now() - startedAt) / 1000)))}
      />
    </>
  );
}

const STAGE = 200;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: MenteColors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    gap: 13,
    paddingHorizontal: MenteSpacing.gutter,
    paddingTop: 10,
    paddingBottom: 24,
  },
  stretch: {
    alignSelf: 'stretch',
  },
  centerCard: {
    alignItems: 'center',
    gap: 14,
    paddingVertical: 28,
  },
  breathStage: {
    width: STAGE,
    height: STAGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breathCircle: {
    position: 'absolute',
    width: STAGE,
    height: STAGE,
    borderRadius: STAGE / 2,
    backgroundColor: MenteColors.badgeBackground,
    borderWidth: 3,
    borderColor: MenteColors.primary,
  },
  breathLabel: {
    alignItems: 'center',
  },
  phaseText: {
    ...MenteType.button,
    color: MenteColors.accent,
  },
  countText: {
    ...MenteType.title,
    color: MenteColors.text,
  },
  caption: {
    ...MenteType.small,
    textAlign: 'center',
    color: MenteColors.textMuted,
  },
  clock: {
    ...MenteType.title,
    fontSize: 44,
    lineHeight: 52,
    color: MenteColors.text,
  },
  prompt: {
    ...MenteType.body,
    textAlign: 'center',
    color: MenteColors.textMuted,
    maxWidth: 280,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: MenteRadius.chip,
    backgroundColor: MenteColors.surface,
  },
  chipSelected: {
    backgroundColor: MenteColors.primary,
  },
  chipText: {
    ...MenteType.caption,
    color: MenteColors.textMuted,
  },
  chipTextSelected: {
    ...MenteType.captionStrong,
    color: MenteColors.onPrimary,
  },
  bigNumber: {
    ...MenteType.title,
    fontSize: 56,
    lineHeight: 64,
    color: MenteColors.greenText,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: MenteColors.border,
  },
  dotActive: {
    backgroundColor: MenteColors.mood,
  },
  affirmation: {
    ...MenteType.heading,
    fontSize: 20,
    lineHeight: 28,
    textAlign: 'center',
    color: MenteColors.text,
  },
  doneCard: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 28,
  },
  doneTitle: {
    ...MenteType.heading,
    fontSize: 20,
    color: MenteColors.text,
  },
  doneText: {
    ...MenteType.body,
    textAlign: 'center',
    color: MenteColors.textMuted,
    marginBottom: 6,
  },
});
