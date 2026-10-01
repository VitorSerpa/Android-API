import { useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { LayoutChangeEvent, Pressable, Text, View } from 'react-native';

import { AddChip, ChoiceChips, NumberField, parseNumberField } from '@/components/mente/fields';
import { Icon } from '@/components/mente/icon';
import { StackScreen } from '@/components/mente/stack-screen';
import { Card, Input, MIN_TOUCH, Spacer, TopBar } from '@/components/mente/ui';
import { MenteRadius, MenteType } from '@/constants/mente-theme';
import { activityCorrelations, allActivities, todayCheckIns } from '@/data/insights';
import {
  ANXIETY_MAX,
  ANXIETY_MIN,
  DEFAULT_SYMPTOMS,
  ENERGY_MAX,
  ENERGY_MIN,
  MOODS,
  SLEEP_QUALITY,
  type SleepQuality,
} from '@/data/types';
import { useUserData } from '@/data/user-data-context';
import { toDayKey } from '@/lib/dates';
import { makeStyles, useColors } from '@/theme';

const ENERGY_LEVELS = Array.from({ length: ENERGY_MAX - ENERGY_MIN + 1 }, (_, index) => ENERGY_MIN + index);

/** US-03 CA-02: only valid, positive numbers are accepted. */
const LIMITS = {
  sleepHours: { min: 0.5, max: 24, message: 'Informe entre 0,5 e 24 horas.' },
  awakenings: { min: 0, max: 30, integer: true, message: 'Informe um número inteiro entre 0 e 30.' },
  weightKg: { min: 20, max: 350, message: 'Informe um peso entre 20 e 350 kg.' },
  activityMinutes: { min: 0, max: 1440, integer: true, message: 'Informe entre 0 e 1440 minutos.' },
} as const;

type NumericKey = keyof typeof LIMITS;

const show = (value: number | null | undefined) => (value === null || value === undefined ? '' : String(value).replace('.', ','));

/**
 * The prototype's five mood faces. The mouth is a single border edge on a
 * rounded box, so its curve follows the `curve` factor: negative frowns, zero
 * flattens, positive smiles.
 */
function MoodFace({ level, selected }: { level: number; selected: boolean }) {
  const c = useColors();
  const styles = useStyles();
  const curve = (level - 2) / 2;
  const color = selected ? c.accent : c.textMuted;

  if (curve === 0) {
    return (
      <View style={[styles.face, selected && styles.faceSelected]}>
        <Eyes color={color} />
        <View style={[styles.mouth, styles.mouthFlat, { backgroundColor: color }]} />
      </View>
    );
  }

  const smiling = curve > 0;
  const height = 4 + Math.abs(curve) * 4;
  return (
    <View style={[styles.face, selected && styles.faceSelected]}>
      <Eyes color={color} />
      <View
        style={[
          styles.mouth,
          {
            height,
            borderColor: color,
            borderBottomWidth: smiling ? 2 : 0,
            borderTopWidth: smiling ? 0 : 2,
            borderBottomLeftRadius: smiling ? height : 0,
            borderBottomRightRadius: smiling ? height : 0,
            borderTopLeftRadius: smiling ? 0 : height,
            borderTopRightRadius: smiling ? 0 : height,
          },
        ]}
      />
    </View>
  );
}

function Eyes({ color }: { color: string }) {
  const styles = useStyles();
  return (
    <View style={styles.eyes}>
      <View style={[styles.eye, { backgroundColor: color }]} />
      <View style={[styles.eye, { backgroundColor: color }]} />
    </View>
  );
}

function Section({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  const styles = useStyles();
  return (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} accessibilityRole="header">
          {title}
        </Text>
        <Spacer />
        {right}
      </View>
      {children}
    </Card>
  );
}

export default function CheckInScreen() {
  const styles = useStyles();
  const c = useColors();
  const router = useRouter();
  const { data, actions } = useUserData();
  const today = toDayKey();
  const health = data.health[today];
  const earlier = todayCheckIns(data);
  const last = earlier.at(-1);

  // A new check-in always starts neutral: several a day feed the circadian view (RF-03).
  const [mood, setMood] = useState(2);
  const [anxiety, setAnxiety] = useState(3);
  const [anxietyNote, setAnxietyNote] = useState('');
  const [energy, setEnergy] = useState(3);
  const [profileId, setProfileId] = useState<string | null>(last?.profileId ?? null);
  const [trackWidth, setTrackWidth] = useState(0);

  // The day's health record is edited in place.
  const [sleepQuality, setSleepQuality] = useState<SleepQuality | null>(health?.sleepQuality ?? null);
  const [symptoms, setSymptoms] = useState<string[]>(health?.symptoms ?? []);
  const [activities, setActivities] = useState<string[]>(health?.activities ?? []);
  const [numbers, setNumbers] = useState<Record<NumericKey, string>>({
    sleepHours: show(health?.sleepHours),
    awakenings: show(health?.awakenings),
    weightKg: show(health?.weightKg),
    activityMinutes: show(health?.activityMinutes),
  });
  const [errors, setErrors] = useState<Partial<Record<NumericKey, string>>>({});

  const symptomOptions = [...DEFAULT_SYMPTOMS, ...data.customSymptoms];
  const correlation = activityCorrelations(data);
  const insight =
    correlation.status === 'ready'
      ? correlation.messages[0]
      : `Com ${7 - correlation.days} ${7 - correlation.days === 1 ? 'dia' : 'dias'} a mais de check-in, mostramos como suas atividades influenciam o humor.`;

  const toggle = (list: string[], value: string) =>
    list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

  const setAnxietyFrom = (x: number) => {
    if (!trackWidth) return;
    const ratio = Math.min(Math.max(x / trackWidth, 0), 1);
    setAnxiety(Math.round(ratio * ANXIETY_MAX));
  };

  const save = () => {
    const parsed = {} as Record<NumericKey, number | null>;
    const nextErrors: Partial<Record<NumericKey, string>> = {};
    for (const key of Object.keys(LIMITS) as NumericKey[]) {
      const value = parseNumberField(numbers[key], LIMITS[key]);
      if (Number.isNaN(value)) nextErrors[key] = LIMITS[key].message;
      parsed[key] = value;
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    // CA-01: mood, anxiety and energy land in one record with date and time.
    actions.saveCheckIn({ mood, anxiety, anxietyNote: anxietyNote.trim(), energy, profileId });
    const sleepChanged = parsed.sleepHours !== (health?.sleepHours ?? null);
    actions.saveHealth(today, {
      sleepHours: parsed.sleepHours,
      awakenings: parsed.awakenings,
      sleepQuality,
      sleepSource: sleepChanged ? (parsed.sleepHours === null ? null : 'manual') : (health?.sleepSource ?? null),
      symptoms,
      activities,
      weightKg: parsed.weightKg,
      activityMinutes: parsed.activityMinutes,
    });
    // CA-05: straight to the day's summary with the recalculated average.
    router.replace({ pathname: '/day/[day]', params: { day: today, saved: '1' } });
  };

  return (
    <StackScreen>
      <TopBar
        title="Check-in"
        right={
          <View style={styles.savedChip}>
            <View style={[styles.savedDot, !earlier.length && styles.savedDotIdle]} />
            <Text style={styles.savedText}>
              {earlier.length ? `${earlier.length} hoje` : 'Primeiro de hoje'}
            </Text>
          </View>
        }
      />

      <Section title="Como você está se sentindo?">
        <View style={styles.moodRow} accessibilityRole="radiogroup" accessibilityLabel="Humor">
          {MOODS.map((label, index) => (
            <Pressable
              key={label}
              accessibilityRole="radio"
              accessibilityLabel={label}
              accessibilityState={{ selected: mood === index }}
              onPress={() => setMood(index)}
              style={styles.mood}>
              <MoodFace level={index} selected={mood === index} />
              <Text style={[styles.moodLabel, mood === index && styles.moodLabelSelected]}>{label}</Text>
            </Pressable>
          ))}
        </View>
      </Section>

      <Section
        title="Nível de ansiedade"
        right={
          <View style={styles.valueChip}>
            <Text style={styles.valueChipText}>
              {anxiety} / {ANXIETY_MAX}
            </Text>
          </View>
        }>
        <View
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel="Nível de ansiedade"
          accessibilityValue={{ min: ANXIETY_MIN, max: ANXIETY_MAX, now: anxiety }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(event) =>
            setAnxiety((value) =>
              Math.min(Math.max(value + (event.nativeEvent.actionName === 'increment' ? 1 : -1), ANXIETY_MIN), ANXIETY_MAX),
            )
          }
          onLayout={(event: LayoutChangeEvent) => setTrackWidth(event.nativeEvent.layout.width)}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderTerminationRequest={() => false}
          onResponderGrant={(event) => setAnxietyFrom(event.nativeEvent.locationX)}
          onResponderMove={(event) => setAnxietyFrom(event.nativeEvent.locationX)}
          style={styles.slider}>
          <View style={styles.sliderTrack} />
          <View style={[styles.sliderFill, { width: `${(anxiety / ANXIETY_MAX) * 100}%` }]} />
          <View style={[styles.sliderKnob, { left: `${(anxiety / ANXIETY_MAX) * 100}%`, marginLeft: -11 }]} />
        </View>
        <View style={styles.sliderLegend}>
          <Text style={styles.legendText}>0 · Calma</Text>
          <Text style={styles.legendText}>10 · Intensa</Text>
        </View>
        <Input
          multiline
          accessibilityLabel="Observações sobre a ansiedade (opcional)"
          placeholder="Observações (opcional): o que está por trás da ansiedade?"
          value={anxietyNote}
          onChangeText={setAnxietyNote}
        />
      </Section>

      <Section title="Nível de energia">
        <ChoiceChips
          label="Energia de 1 a 5"
          options={ENERGY_LEVELS}
          selected={[energy]}
          onToggle={setEnergy}
          grow
        />
        <View style={styles.sliderLegend}>
          <Text style={styles.legendText}>1 · Exausto(a)</Text>
          <Text style={styles.legendText}>5 · Com muita energia</Text>
        </View>
      </Section>

      {data.profiles.length ? (
        <Section title="Em qual área da vida?">
          <ChoiceChips
            label="Perfil de vida"
            options={data.profiles.map((profile) => profile.id)}
            renderLabel={(id) => data.profiles.find((profile) => profile.id === id)?.name ?? id}
            selected={profileId ? [profileId] : []}
            onToggle={(id) => setProfileId((current) => (current === id ? null : id))}
          />
        </Section>
      ) : null}

      <Text style={styles.sectionHeading} accessibilityRole="header">
        Saúde de hoje
      </Text>

      <Section
        title="Sono"
        right={
          health?.sleepSource === 'health-connect' ? <Text style={styles.source}>Importado do Health Connect</Text> : undefined
        }>
        <View style={styles.row}>
          <NumberField
            label="Horas dormidas"
            unit="h"
            placeholder="7,5"
            value={numbers.sleepHours}
            onChangeText={(sleepHours) => setNumbers((value) => ({ ...value, sleepHours }))}
            error={errors.sleepHours}
            style={styles.flex}
          />
          <NumberField
            label="Despertares"
            integer
            placeholder="0"
            value={numbers.awakenings}
            onChangeText={(awakenings) => setNumbers((value) => ({ ...value, awakenings }))}
            error={errors.awakenings}
            style={styles.flex}
          />
        </View>
        <Text style={styles.fieldLabel}>Como você avalia o sono?</Text>
        <ChoiceChips
          label="Qualidade do sono"
          options={SLEEP_QUALITY}
          selected={sleepQuality ? [sleepQuality] : []}
          onToggle={(quality) => setSleepQuality((current) => (current === quality ? null : quality))}
          grow
        />
      </Section>

      <Section title="Sintomas físicos">
        <ChoiceChips
          multiple
          label="Sintomas físicos"
          options={symptomOptions}
          selected={symptoms}
          onToggle={(symptom) => setSymptoms((list) => toggle(list, symptom))}>
          <AddChip
            label="Novo sintoma"
            onAdd={(symptom) => {
              actions.addCustomSymptom(symptom);
              setSymptoms((list) => (list.includes(symptom) ? list : [...list, symptom]));
            }}
          />
        </ChoiceChips>
      </Section>

      <Section title="Atividades do dia">
        <ChoiceChips
          multiple
          label="Atividades do dia"
          options={allActivities(data)}
          selected={activities}
          onToggle={(activity) => setActivities((list) => toggle(list, activity))}>
          <AddChip
            label="Nova atividade"
            onAdd={(activity) => {
              actions.addCustomActivity(activity);
              setActivities((list) => (list.includes(activity) ? list : [...list, activity]));
            }}
          />
        </ChoiceChips>
        <View style={styles.row}>
          <NumberField
            label="Atividade física"
            unit="min"
            integer
            placeholder="30"
            value={numbers.activityMinutes}
            onChangeText={(activityMinutes) => setNumbers((value) => ({ ...value, activityMinutes }))}
            error={errors.activityMinutes}
            style={styles.flex}
          />
          <NumberField
            label="Peso (opcional)"
            unit="kg"
            placeholder="62,4"
            value={numbers.weightKg}
            onChangeText={(weightKg) => setNumbers((value) => ({ ...value, weightKg }))}
            error={errors.weightKg}
            style={styles.flex}
          />
        </View>
      </Section>

      <View style={styles.insight}>
        <Icon name="bulb" size={18} color={c.accent} />
        <Text style={styles.insightText}>{insight}</Text>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={save}
        style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}>
        <Text style={styles.saveButtonText}>Salvar e ver resumo do dia</Text>
      </Pressable>
      {Object.keys(errors).length ? (
        <Text style={styles.errorText} accessibilityLiveRegion="polite">
          Corrija os campos destacados para salvar.
        </Text>
      ) : null}
    </StackScreen>
  );
}

const useStyles = makeStyles((c) => ({
  flex: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    gap: 11,
  },
  card: {
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    ...MenteType.sectionTitle,
    color: c.text,
  },
  sectionHeading: {
    ...MenteType.sectionTitle,
    color: c.text,
    marginTop: 6,
  },
  fieldLabel: {
    ...MenteType.captionStrong,
    color: c.text,
  },
  source: {
    ...MenteType.tiny,
    color: c.greenText,
  },
  savedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: MenteRadius.pill,
    backgroundColor: c.surface,
  },
  savedDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: c.mood,
  },
  savedDotIdle: {
    backgroundColor: c.border,
  },
  savedText: {
    ...MenteType.tiny,
    color: c.textMuted,
  },
  moodRow: {
    flexDirection: 'row',
  },
  mood: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    minHeight: MIN_TOUCH,
    paddingVertical: 2,
  },
  face: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 22,
    backgroundColor: c.background,
  },
  faceSelected: {
    backgroundColor: c.badgeBackground,
  },
  eyes: {
    flexDirection: 'row',
    gap: 8,
  },
  eye: {
    width: 3.5,
    height: 3.5,
    borderRadius: 1.75,
  },
  mouth: {
    width: 16,
  },
  mouthFlat: {
    height: 2,
    borderRadius: 1,
  },
  moodLabel: {
    ...MenteType.tiny,
    textAlign: 'center',
    color: c.textMuted,
  },
  moodLabelSelected: {
    fontFamily: MenteType.tinyStrong.fontFamily,
    color: c.accent,
  },
  valueChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: MenteRadius.pill,
    backgroundColor: c.background,
  },
  valueChipText: {
    ...MenteType.captionStrong,
    color: c.accent,
  },
  slider: {
    height: MIN_TOUCH,
    justifyContent: 'center',
  },
  sliderTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: c.background,
  },
  sliderFill: {
    position: 'absolute',
    height: 8,
    borderRadius: 4,
    backgroundColor: c.primary,
  },
  sliderKnob: {
    position: 'absolute',
    pointerEvents: 'none',
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 4,
    borderColor: c.primary,
    backgroundColor: c.surface,
  },
  sliderLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  legendText: {
    ...MenteType.tiny,
    color: c.textMuted,
  },
  insight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: MenteRadius.row,
    backgroundColor: c.surface,
  },
  insightText: {
    ...MenteType.small,
    flex: 1,
    color: c.textMuted,
  },
  saveButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    borderRadius: MenteRadius.button,
    backgroundColor: c.primary,
  },
  saveButtonText: {
    ...MenteType.button,
    color: c.onPrimary,
  },
  errorText: {
    ...MenteType.small,
    textAlign: 'center',
    color: c.dangerText,
  },
  pressed: {
    opacity: 0.75,
  },
}));
