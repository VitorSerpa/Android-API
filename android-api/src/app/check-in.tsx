import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/mente/icon';
import { Card, Spacer, TopBar } from '@/components/mente/ui';
import { MenteColors, MenteRadius, MenteSpacing, MenteType } from '@/constants/mente-theme';

const MOODS = ['Muito mal', 'Mal', 'Neutro', 'Bem', 'Ótimo'] as const;
const ENERGY_LEVELS = [1, 2, 3, 4, 5] as const;
const SLEEP_QUALITY = ['Ruim', 'Regular', 'Boa', 'Ótima'] as const;
const SYMPTOMS = ['Dor de cabeça', 'Tensão', 'Cansaço'] as const;

const ANXIETY_MAX = 10;

/**
 * The five faces from the prototype's mood picker. The mouth is a single border
 * edge on a rounded box, so its curve follows the `curve` factor: negative
 * frowns, zero flattens, positive smiles.
 */
function MoodFace({ level, selected }: { level: number; selected: boolean }) {
  const curve = (level - 2) / 2;
  const color = selected ? MenteColors.accent : MenteColors.textMuted;

  // A flat mouth is its own 2px bar; a curved one is a single rounded border
  // edge, so only the two corners on that edge may be rounded.
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
  return (
    <View style={styles.eyes}>
      <View style={[styles.eye, { backgroundColor: color }]} />
      <View style={[styles.eye, { backgroundColor: color }]} />
    </View>
  );
}

export default function CheckInScreen() {
  const router = useRouter();

  const [mood, setMood] = useState(3);
  const [anxiety, setAnxiety] = useState(3);
  const [energy, setEnergy] = useState(4);
  const [sleep, setSleep] = useState<string>('Boa');
  const [symptoms, setSymptoms] = useState<string[]>(['Tensão']);
  const [trackWidth, setTrackWidth] = useState(0);

  const toggleSymptom = (symptom: string) =>
    setSymptoms((current) =>
      current.includes(symptom)
        ? current.filter((item) => item !== symptom)
        : [...current, symptom],
    );

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <TopBar
            title="Check-in diário"
            right={
              <View style={styles.savedChip}>
                <View style={styles.savedDot} />
                <Text style={styles.savedText}>Salvo às 9:41</Text>
              </View>
            }
          />

          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Como você está se sentindo?</Text>
            <View style={styles.moodRow}>
              {MOODS.map((label, index) => (
                <Pressable
                  key={label}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: mood === index }}
                  onPress={() => setMood(index)}
                  style={styles.mood}>
                  <MoodFace level={index} selected={mood === index} />
                  <Text style={[styles.moodLabel, mood === index && styles.moodLabelSelected]}>
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Card>

          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Nível de ansiedade</Text>
              <Spacer />
              <View style={styles.valueChip}>
                <Text style={styles.valueChipText}>{anxiety} / 10</Text>
              </View>
            </View>

            <Pressable
              accessibilityRole="adjustable"
              accessibilityValue={{ min: 0, max: ANXIETY_MAX, now: anxiety }}
              onLayout={(event: LayoutChangeEvent) =>
                setTrackWidth(event.nativeEvent.layout.width)
              }
              onPress={(event) => {
                if (!trackWidth) return;
                const ratio = event.nativeEvent.locationX / trackWidth;
                setAnxiety(Math.round(Math.min(Math.max(ratio, 0), 1) * ANXIETY_MAX));
              }}
              style={styles.slider}>
              <View style={styles.sliderTrack} />
              <View style={[styles.sliderFill, { width: `${(anxiety / ANXIETY_MAX) * 100}%` }]} />
              <View
                style={[
                  styles.sliderKnob,
                  { left: `${(anxiety / ANXIETY_MAX) * 100}%`, marginLeft: -11 },
                ]}
              />
            </Pressable>

            <View style={styles.sliderLegend}>
              <Text style={styles.sliderLegendText}>Calma</Text>
              <Text style={styles.sliderLegendText}>Intensa</Text>
            </View>
          </Card>

          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Nível de energia</Text>
            <View style={styles.energyRow}>
              {ENERGY_LEVELS.map((level) => (
                <Pressable
                  key={level}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: energy === level }}
                  onPress={() => setEnergy(level)}
                  style={[styles.energyOption, energy === level && styles.energyOptionSelected]}>
                  <Text style={[styles.energyText, energy === level && styles.energyTextSelected]}>
                    {level}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Card>

          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Qualidade do sono</Text>
            <View style={styles.tagRow}>
              {SLEEP_QUALITY.map((quality) => (
                <Pressable
                  key={quality}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: sleep === quality }}
                  onPress={() => setSleep(quality)}
                  style={[styles.tag, styles.tagGrow, sleep === quality && styles.tagSelected]}>
                  <Text style={[styles.tagText, sleep === quality && styles.tagTextSelected]}>
                    {quality}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.divider} />

            <Text style={styles.cardTitle}>Sintomas físicos</Text>
            <View style={styles.tagRow}>
              {SYMPTOMS.map((symptom) => {
                const selected = symptoms.includes(symptom);
                return (
                  <Pressable
                    key={symptom}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    onPress={() => toggleSymptom(symptom)}
                    style={[styles.tag, selected && styles.tagSelected]}>
                    <Text style={[styles.tagText, selected && styles.tagTextSelected]}>
                      {symptom}
                    </Text>
                  </Pressable>
                );
              })}
              <Pressable accessibilityRole="button" accessibilityLabel="Adicionar sintoma" style={styles.tag}>
                <Text style={styles.tagText}>+</Text>
              </Pressable>
            </View>
          </Card>

          <View style={styles.extraRow}>
            <Card style={styles.extraCard}>
              <Text style={styles.extraLabel}>Atividade física</Text>
              <Text style={styles.extraValue}>30 min · Caminhada</Text>
            </Card>
            <Card style={styles.extraCard}>
              <Text style={styles.extraLabel}>Peso (opcional)</Text>
              <Text style={styles.extraValue}>62,4 kg</Text>
            </Card>
          </View>

          <View style={styles.insight}>
            <Icon name="tools" size={18} color={MenteColors.accent} />
            <Text style={styles.insightText}>
              Seu humor está melhor nos dias em que você dorme bem.
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace('/home')}
            style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}>
            <Text style={styles.saveButtonText}>Salvar e ver resumo do dia</Text>
          </Pressable>
        </ScrollView>
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
  content: {
    gap: 13,
    paddingHorizontal: MenteSpacing.gutter,
    paddingTop: 10,
    paddingBottom: 24,
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
    color: MenteColors.text,
  },
  savedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: MenteRadius.pill,
    backgroundColor: MenteColors.surface,
  },
  savedDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: MenteColors.mood,
  },
  savedText: {
    ...MenteType.tiny,
    color: MenteColors.textMuted,
  },
  moodRow: {
    flexDirection: 'row',
  },
  mood: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  face: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 21,
    backgroundColor: MenteColors.background,
  },
  faceSelected: {
    backgroundColor: MenteColors.badgeBackground,
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
    ...MenteType.micro,
    textAlign: 'center',
    color: MenteColors.textMuted,
  },
  moodLabelSelected: {
    fontFamily: MenteType.tinyStrong.fontFamily,
    color: MenteColors.accent,
  },
  valueChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: MenteRadius.pill,
    backgroundColor: MenteColors.background,
  },
  valueChipText: {
    ...MenteType.captionStrong,
    color: MenteColors.accent,
  },
  slider: {
    height: 22,
    justifyContent: 'center',
  },
  sliderTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: MenteColors.background,
  },
  sliderFill: {
    position: 'absolute',
    height: 8,
    borderRadius: 4,
    backgroundColor: MenteColors.primary,
  },
  sliderKnob: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 4,
    borderColor: MenteColors.primary,
    backgroundColor: MenteColors.surface,
  },
  sliderLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderLegendText: {
    ...MenteType.tiny,
    color: MenteColors.textMuted,
  },
  energyRow: {
    flexDirection: 'row',
    gap: 8,
  },
  energyOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: MenteRadius.chip,
    backgroundColor: MenteColors.background,
  },
  energyOptionSelected: {
    backgroundColor: MenteColors.primary,
  },
  energyText: {
    ...MenteType.button,
    color: MenteColors.textMuted,
  },
  energyTextSelected: {
    color: MenteColors.onPrimary,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  tag: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: MenteRadius.chip,
    backgroundColor: MenteColors.background,
  },
  tagGrow: {
    flex: 1,
  },
  tagSelected: {
    backgroundColor: MenteColors.primary,
  },
  tagText: {
    ...MenteType.caption,
    color: MenteColors.textMuted,
  },
  tagTextSelected: {
    ...MenteType.captionStrong,
    color: MenteColors.onPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: MenteColors.border,
  },
  extraRow: {
    flexDirection: 'row',
    gap: 11,
  },
  extraCard: {
    flex: 1,
    gap: 8,
  },
  extraLabel: {
    ...MenteType.link,
    color: MenteColors.textMuted,
  },
  extraValue: {
    ...MenteType.captionStrong,
    color: MenteColors.text,
  },
  insight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: MenteRadius.row,
    backgroundColor: MenteColors.surface,
  },
  insightText: {
    ...MenteType.small,
    flex: 1,
    color: MenteColors.textMuted,
  },
  saveButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: MenteRadius.button,
    backgroundColor: MenteColors.primary,
  },
  saveButtonText: {
    ...MenteType.button,
    color: MenteColors.onPrimary,
  },
  pressed: {
    opacity: 0.75,
  },
});
