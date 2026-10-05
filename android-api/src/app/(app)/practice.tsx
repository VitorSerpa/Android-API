import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { BreathingExercise, useElapsed, useFinishAt } from '@/components/mente/breathing-exercise';
import { Icon } from '@/components/mente/icon';
import { StackScreen } from '@/components/mente/stack-screen';
import { StarRating } from '@/components/mente/star-rating';
import { Button, Card, Input, MIN_TOUCH, Toggle, TopBar } from '@/components/mente/ui';
import { MenteRadius, MenteType } from '@/constants/mente-theme';
import { TOOL_NAMES } from '@/data/insights';
import { randomAffirmation } from '@/data/phrases';
import type { ToolId } from '@/data/types';
import { useUserData } from '@/data/user-data-context';
import { makeStyles, useColors } from '@/theme';

const TITLES: Record<ToolId, string> = {
  breathing: 'Respiração 4-7-8',
  meditation: 'Meditação guiada',
  grounding: 'Grounding 5-4-3-2-1',
  affirmations: 'Afirmações',
};

/** RF-30: the "Respirar agora" shortcut starts this many seconds with one tap. */
const MINI_SESSION_SECONDS = 60;

const isTool = (value: unknown): value is ToolId => typeof value === 'string' && value in TITLES;

const formatClock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

export default function PracticeScreen() {
  const styles = useStyles();
  const c = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ tool?: string; mini?: string; minutes?: string }>();
  const tool: ToolId = isTool(params.tool) ? params.tool : 'breathing';
  const mini = params.mini === '1';
  const { actions } = useUserData();
  const [done, setDone] = useState(false);
  const [logged, setLogged] = useState(false);
  const [stars, setStars] = useState(0);
  const [ratingId, setRatingId] = useState<string | undefined>();

  // RF-28 / CA-02: every finished session goes to the history with date, type and duration.
  const complete = (durationSec: number) => {
    if (durationSec > 0) actions.logPractice(tool, durationSec);
    setLogged(durationSec > 0);
    setDone(true);
  };

  // Changing the stars corrects this session's rating instead of adding another.
  const rate = (value: number) => {
    setStars(value);
    setRatingId(actions.rateTechnique(tool, value, ratingId));
  };

  return (
    <StackScreen>
      <TopBar title={mini ? 'Respirar agora' : TITLES[tool]} />

      {done ? (
        <Card style={styles.doneCard}>
          <Icon name="heart" size={30} color={c.greenText} />
          <Text style={styles.doneTitle}>{logged ? 'Prática registrada' : 'Prática encerrada'}</Text>
          <Text style={styles.doneText}>Que bom que você reservou esse momento para você.</Text>
          <Text style={styles.question}>Quão útil foi {TOOL_NAMES[tool].toLowerCase()} agora?</Text>
          <StarRating value={stars} onChange={rate} label={`Avaliar ${TOOL_NAMES[tool]}`} />
          {stars ? <Text style={styles.caption}>Obrigado! Isso ajuda a priorizar suas sugestões.</Text> : null}
          <Button
            label="Voltar"
            onPress={() => (router.canGoBack() ? router.back() : router.navigate('/tools'))}
            style={styles.stretch}
          />
        </Card>
      ) : tool === 'breathing' ? (
        <BreathingExercise
          mode={mini ? { kind: 'timed', seconds: MINI_SESSION_SECONDS } : { kind: 'cycles', cycles: 4 }}
          autoStart={mini}
          onComplete={complete}
        />
      ) : tool === 'meditation' ? (
        <Meditation initialMinutes={Number(params.minutes) || 5} onComplete={complete} />
      ) : tool === 'grounding' ? (
        <Grounding onComplete={complete} />
      ) : (
        <Affirmations onComplete={complete} />
      )}
    </StackScreen>
  );
}

type PracticeProps = { onComplete: (durationSec: number) => void };

const MEDITATION_MINUTES = [3, 5, 10, 15] as const;

const MEDITATION_PROMPTS = [
  'Sente-se confortavelmente e, se quiser, feche os olhos.',
  'Observe o ar entrando e saindo, sem tentar mudá-lo.',
  'Quando um pensamento surgir, apenas note-o e volte à respiração.',
  'Perceba o peso do seu corpo e os pontos de apoio.',
  'Solte os ombros, a mandíbula e a testa.',
  'Inspire devagar, contando até quatro. Solte o ar sem pressa.',
];
const PROMPT_EVERY_SEC = 45;

/**
 * The end bell gets its own player: finishing unmounts the meditation (and any
 * player created with a hook) at once, so it frees itself after ringing instead.
 */
function ringBell() {
  const player = createAudioPlayer(require('@/assets/audio/bell.wav'));
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    subscription.remove();
    player.remove();
  };
  const subscription = player.addListener('playbackStatusUpdate', (status) => status.didJustFinish && release());
  setTimeout(release, 15_000);
  player.play();
}

/**
 * RF-27: guided by pre-loaded audio — a bundled ambient track plays in a loop
 * while a pt-BR voice reads the guidance, all without internet. A soft bell
 * marks the end of the countdown.
 */
function Meditation({ initialMinutes, onComplete }: PracticeProps & { initialMinutes: number }) {
  const styles = useStyles();
  const c = useColors();
  const [minutes, setMinutes] = useState<number>(
    MEDITATION_MINUTES.includes(initialMinutes as (typeof MEDITATION_MINUTES)[number]) ? initialMinutes : 5,
  );
  const [running, setRunning] = useState(false);
  const [voice, setVoice] = useState(true);
  const [elapsed] = useElapsed(running);
  // Created once and configured up front: a looping, softer ambient track.
  const [ambient] = useState(() => {
    const player = createAudioPlayer(require('@/assets/audio/meditation-ambient.wav'));
    player.loop = true;
    player.volume = 0.5;
    return player;
  });
  const total = minutes * 60;
  const started = elapsed > 0 || running;
  const promptIndex = Math.floor(elapsed / PROMPT_EVERY_SEC) % MEDITATION_PROMPTS.length;

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
    return () => ambient.remove();
  }, [ambient]);

  useEffect(() => {
    if (running) ambient.play();
    else ambient.pause();
  }, [running, ambient]);

  // Speak each prompt as it comes up.
  useEffect(() => {
    if (!running || !voice) return;
    Speech.speak(MEDITATION_PROMPTS[promptIndex], { language: 'pt-BR', rate: 0.85 });
  }, [promptIndex, running, voice]);

  useEffect(
    () => () => {
      Speech.stop();
    },
    [],
  );

  useFinishAt(elapsed >= total, () => {
    setRunning(false);
    Speech.stop();
    ringBell();
    onComplete(total);
  });

  return (
    <>
      {!started ? (
        <View style={styles.chipRow} accessibilityRole="radiogroup" accessibilityLabel="Duração">
          {MEDITATION_MINUTES.map((value) => {
            const selected = minutes === value;
            return (
              <Pressable
                key={value}
                accessibilityRole="radio"
                accessibilityLabel={`${value} minutos`}
                accessibilityState={{ selected }}
                onPress={() => setMinutes(value)}
                style={[styles.chip, selected && styles.chipSelected]}>
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{value} min</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <Card style={styles.centerCard}>
        <Icon name="moon" size={40} color={c.purpleText} />
        <Text style={styles.clock} accessibilityLabel={`Faltam ${formatClock(total - elapsed)}`}>
          {formatClock(total - elapsed)}
        </Text>
        <Text style={styles.prompt}>{started ? MEDITATION_PROMPTS[promptIndex] : 'Escolha a duração e comece quando quiser.'}</Text>
      </Card>

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Voz guia</Text>
        <Toggle accessibilityLabel="Voz guia" value={voice} onValueChange={setVoice} />
      </View>

      <Button label={running ? 'Pausar' : started ? 'Continuar' : 'Começar'} onPress={() => setRunning((value) => !value)} />
      {started ? (
        <Button
          label="Encerrar e registrar"
          variant="secondary"
          onPress={() => {
            setRunning(false);
            Speech.stop();
            onComplete(elapsed);
          }}
        />
      ) : null}
    </>
  );
}

const GROUNDING_STEPS = [
  { count: 5, sense: 'coisas que você consegue ver', placeholder: 'ex.: a janela' },
  { count: 4, sense: 'coisas que você consegue tocar', placeholder: 'ex.: o tecido da roupa' },
  { count: 3, sense: 'sons que você consegue ouvir', placeholder: 'ex.: um carro ao longe' },
  { count: 2, sense: 'cheiros que você consegue sentir', placeholder: 'ex.: café' },
  { count: 1, sense: 'sabor que você consegue perceber', placeholder: 'ex.: menta' },
] as const;

/**
 * RF-29 / CA-04: one sense at a time. Each item is ticked (and optionally
 * written) as the user names it; the next sense unlocks once all are ticked.
 */
function Grounding({ onComplete }: PracticeProps) {
  const styles = useStyles();
  const [step, setStep] = useState(0);
  const [ticked, setTicked] = useState<boolean[]>(() => Array(GROUNDING_STEPS[0].count).fill(false));
  const [notes, setNotes] = useState<string[]>(() => Array(GROUNDING_STEPS[0].count).fill(''));
  const [startedAt] = useState(() => Date.now());
  const current = GROUNDING_STEPS[step];
  const last = step === GROUNDING_STEPS.length - 1;
  const allTicked = ticked.every(Boolean);

  const goTo = (next: number) => {
    setStep(next);
    setTicked(Array(GROUNDING_STEPS[next].count).fill(false));
    setNotes(Array(GROUNDING_STEPS[next].count).fill(''));
  };

  return (
    <>
      <Card style={styles.centerCard}>
        <Text style={styles.stepLabel}>
          Etapa {step + 1} de {GROUNDING_STEPS.length}
        </Text>
        <Text style={styles.bigNumber}>{current.count}</Text>
        <Text style={styles.prompt}>
          Nomeie, em voz alta ou mentalmente, {current.count} {current.sense}. Toque em cada item ao nomeá-lo.
        </Text>
        <View style={styles.dots}>
          {GROUNDING_STEPS.map((item, index) => (
            <View key={item.count} style={[styles.dot, index <= step && styles.dotActive]} />
          ))}
        </View>
      </Card>

      {ticked.map((isTicked, index) => (
        <View key={`${step}-${index}`} style={styles.groundingRow}>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityLabel={`Item ${index + 1}`}
            accessibilityState={{ checked: isTicked }}
            onPress={() => setTicked((value) => value.map((item, i) => (i === index ? !item : item)))}
            style={[styles.tick, isTicked && styles.tickOn]}>
            <Text style={[styles.tickText, isTicked && styles.tickTextOn]}>{isTicked ? '✓' : index + 1}</Text>
          </Pressable>
          <Input
            placeholder={current.placeholder}
            value={notes[index]}
            onChangeText={(text) => {
              setNotes((value) => value.map((item, i) => (i === index ? text : item)));
              if (text.trim()) setTicked((value) => value.map((item, i) => (i === index ? true : item)));
            }}
            style={styles.flex}
          />
        </View>
      ))}

      <Button
        label={last ? 'Concluir' : 'Próximo sentido'}
        disabled={!allTicked}
        onPress={() => (last ? onComplete(Math.round((Date.now() - startedAt) / 1000)) : goTo(step + 1))}
      />
      {step > 0 ? <Button label="Voltar um passo" variant="secondary" onPress={() => goTo(step - 1)} /> : null}
    </>
  );
}

function Affirmations({ onComplete }: PracticeProps) {
  const styles = useStyles();
  const c = useColors();
  const { data, actions } = useUserData();
  const [current, setCurrent] = useState(() => randomAffirmation(data));
  const [startedAt] = useState(() => Date.now());
  const favorite = data.favoriteAffirmations.includes(current.id);

  return (
    <>
      <Card style={styles.centerCard}>
        <Icon name="heart" size={30} color={c.dangerText} />
        <Text style={styles.affirmation}>{current.text}</Text>
        <Text style={styles.caption}>Leia devagar, algumas vezes, e note como se sente.</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: favorite }}
          onPress={() => actions.toggleFavoriteAffirmation(current.id)}
          style={styles.favorite}>
          <Text style={styles.favoriteText}>{favorite ? '★ Favorita' : '☆ Salvar como favorita'}</Text>
        </Pressable>
      </Card>

      <Button label="Outra afirmação" variant="secondary" onPress={() => setCurrent(randomAffirmation(data, current.id))} />
      <Button label="Concluir" onPress={() => onComplete(Math.max(1, Math.round((Date.now() - startedAt) / 1000)))} />
    </>
  );
}

const useStyles = makeStyles((c) => ({
  flex: {
    flex: 1,
  },
  stretch: {
    alignSelf: 'stretch',
  },
  centerCard: {
    alignItems: 'center',
    gap: 14,
    paddingVertical: 28,
  },
  caption: {
    ...MenteType.small,
    textAlign: 'center',
    color: c.textMuted,
  },
  clock: {
    ...MenteType.title,
    fontSize: 44,
    lineHeight: 52,
    color: c.text,
  },
  prompt: {
    ...MenteType.body,
    textAlign: 'center',
    color: c.textMuted,
    maxWidth: 300,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MIN_TOUCH,
    borderRadius: MenteRadius.chip,
    backgroundColor: c.surface,
  },
  chipSelected: {
    backgroundColor: c.primary,
  },
  chipText: {
    ...MenteType.caption,
    color: c.textMuted,
  },
  chipTextSelected: {
    ...MenteType.captionStrong,
    color: c.onPrimary,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  toggleLabel: {
    ...MenteType.label,
    color: c.text,
  },
  stepLabel: {
    ...MenteType.captionStrong,
    color: c.greenText,
  },
  bigNumber: {
    ...MenteType.title,
    fontSize: 56,
    lineHeight: 64,
    color: c.greenText,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: c.border,
  },
  dotActive: {
    backgroundColor: c.mood,
  },
  groundingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tick: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    borderRadius: MIN_TOUCH / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surface,
    borderWidth: 2,
    borderColor: c.greenText,
  },
  tickOn: {
    backgroundColor: c.greenText,
  },
  tickText: {
    ...MenteType.captionStrong,
    color: c.greenText,
  },
  tickTextOn: {
    color: c.surface,
  },
  affirmation: {
    ...MenteType.heading,
    fontSize: 20,
    lineHeight: 28,
    textAlign: 'center',
    color: c.text,
  },
  favorite: {
    minHeight: MIN_TOUCH,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  favoriteText: {
    ...MenteType.captionStrong,
    color: c.accent,
  },
  doneCard: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 28,
  },
  doneTitle: {
    ...MenteType.heading,
    fontSize: 20,
    color: c.text,
  },
  doneText: {
    ...MenteType.body,
    textAlign: 'center',
    color: c.textMuted,
    marginBottom: 6,
  },
  question: {
    ...MenteType.label,
    textAlign: 'center',
    color: c.text,
  },
}));
