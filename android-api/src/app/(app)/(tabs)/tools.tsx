import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/mente/icon';
import { Screen } from '@/components/mente/screen';
import { Button, Card, IconBubble, Input, Spacer, TopBar } from '@/components/mente/ui';
import { MenteColors, MenteRadius, MenteType } from '@/constants/mente-theme';
import { TOOL_NAMES, practiceSummary, practicesThisMonth } from '@/data/insights';
import type { ToolId } from '@/data/types';
import { useUserData } from '@/data/user-data-context';
import { formatShortDate } from '@/lib/dates';
import { notify } from '@/lib/dialogs';

const TOOLS: readonly {
  tool: ToolId;
  icon: IconName;
  title: string;
  detail: string;
  background: string;
  color: string;
}[] = [
  {
    tool: 'breathing',
    icon: 'wave',
    title: 'Técnica 4-7-8',
    detail: 'Acalma em 4 ciclos',
    background: MenteColors.background,
    color: MenteColors.accent,
  },
  {
    tool: 'meditation',
    icon: 'moon',
    title: 'Meditação guiada',
    detail: '8 trilhas de 3 a 15 min',
    background: MenteColors.purpleSurface,
    color: MenteColors.purpleText,
  },
  {
    tool: 'grounding',
    icon: 'anchor',
    title: 'Grounding 5-4-3-2-1',
    detail: 'Volte para o presente',
    background: MenteColors.greenSurface,
    color: MenteColors.greenText,
  },
  {
    tool: 'affirmations',
    icon: 'heart',
    title: 'Afirmações',
    detail: 'Frases para hoje',
    background: MenteColors.dangerSurface,
    color: MenteColors.dangerText,
  },
];

const STEPS = [
  { key: 'negative', label: 'Pensamento negativo', placeholder: '“Eu vou estragar a apresentação.”' },
  { key: 'feeling', label: 'Sentimento', placeholder: 'Ansiedade · 7/10' },
  {
    key: 'alternative',
    label: 'Pensamento alternativo',
    placeholder: '“Já me preparei e posso errar sem ser um fracasso.”',
  },
] as const;

type StepKey = (typeof STEPS)[number]['key'];
const EMPTY_THOUGHT: Record<StepKey, string> = { negative: '', feeling: '', alternative: '' };

export default function ToolsScreen() {
  const router = useRouter();
  const { data, actions } = useUserData();
  const [thought, setThought] = useState(EMPTY_THOUGHT);
  const [showPractices, setShowPractices] = useState(false);

  const summary = practiceSummary(data);
  const monthPractices = practicesThisMonth(data);
  const canSaveThought = thought.negative.trim() && thought.alternative.trim();

  const start = (tool: ToolId) => router.push({ pathname: '/practice', params: { tool } });

  const saveThought = () => {
    actions.saveThought({
      negative: thought.negative.trim(),
      feeling: thought.feeling.trim(),
      alternative: thought.alternative.trim(),
    });
    setThought(EMPTY_THOUGHT);
    notify('Registro salvo', 'Reescrever um pensamento é um treino — cada vez fica mais fácil.');
  };

  return (
    <Screen>
      <TopBar title="Ferramentas" />

      <Card style={styles.breathCard}>
        <View style={styles.breathCircle}>
          <Icon name="breath" size={56} color={MenteColors.primary} />
        </View>

        <View style={styles.breathText}>
          <Text style={styles.breathTitle}>Respiração guiada</Text>
          <Text style={styles.breathDetail}>
            Inspire, segure e solte no ritmo do círculo. 2 minutos.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => start('breathing')}
            style={({ pressed }) => [styles.breathButton, pressed && styles.pressed]}>
            <Text style={styles.breathButtonText}>Começar agora</Text>
          </Pressable>
        </View>
      </Card>

      <View style={styles.toolGrid}>
        {TOOLS.map((tool) => (
          <Pressable
            key={tool.title}
            accessibilityRole="button"
            onPress={() => start(tool.tool)}
            style={({ pressed }) => [styles.toolCard, pressed && styles.pressed]}>
            <IconBubble
              name={tool.icon}
              size={34}
              glyphSize={18}
              background={tool.background}
              color={tool.color}
            />
            <Text style={styles.toolTitle}>{tool.title}</Text>
            <Text style={styles.toolDetail}>{tool.detail}</Text>
          </Pressable>
        ))}
      </View>

      <Card style={styles.restructureCard}>
        <View style={styles.restructureHeader}>
          <Icon name="bulb" size={18} color={MenteColors.anxiety} />
          <Text style={styles.restructureTitle}>Reestruturação de pensamentos</Text>
          {data.thoughts.length ? (
            <Text style={styles.practiceDetail}>{data.thoughts.length} salvos</Text>
          ) : null}
        </View>

        {STEPS.map((step, index) => (
          <View key={step.key} style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>{index + 1}</Text>
            </View>
            <View style={styles.stepText}>
              <Text style={styles.stepLabel}>{step.label}</Text>
              <Input
                multiline={step.key !== 'feeling'}
                placeholder={step.placeholder}
                value={thought[step.key]}
                onChangeText={(value) => setThought((current) => ({ ...current, [step.key]: value }))}
                style={styles.stepInput}
              />
            </View>
          </View>
        ))}

        <Button label="Salvar registro" onPress={saveThought} disabled={!canSaveThought} />
      </Card>

      <View style={styles.practiceCard}>
        <View style={styles.practiceRow}>
          <Icon name="chart" size={17} color={MenteColors.accent} />
          <View style={styles.practiceText}>
            <Text style={styles.practiceTitle}>
              {summary.total} {summary.total === 1 ? 'prática' : 'práticas'} este mês
            </Text>
            <Text style={styles.practiceDetail}>
              {summary.counts.length
                ? summary.counts.map((item) => `${TOOL_NAMES[item.tool]} ${item.count}`).join(' · ')
                : 'Nenhuma prática ainda'}
            </Text>
          </View>
          <Spacer />
          {monthPractices.length ? (
            <Pressable accessibilityRole="button" hitSlop={8} onPress={() => setShowPractices((v) => !v)}>
              <Text style={styles.practiceLink}>{showPractices ? 'Ocultar' : 'Ver tudo'}</Text>
            </Pressable>
          ) : null}
        </View>

        {showPractices
          ? monthPractices.map((practice) => (
              <View key={practice.id} style={styles.practiceItem}>
                <Text style={styles.practiceItemText}>{TOOL_NAMES[practice.tool]}</Text>
                <Spacer />
                <Text style={styles.practiceDetail}>
                  {formatShortDate(new Date(practice.at))} · {Math.max(1, Math.round(practice.durationSec / 60))} min
                </Text>
              </View>
            ))
          : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.75,
  },
  breathCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  breathCircle: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 36,
    backgroundColor: MenteColors.background,
  },
  breathText: {
    flex: 1,
    gap: 6,
  },
  breathTitle: {
    ...MenteType.button,
    color: MenteColors.text,
  },
  breathDetail: {
    ...MenteType.small,
    color: MenteColors.textMuted,
  },
  breathButton: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: MenteRadius.pill,
    backgroundColor: MenteColors.primary,
  },
  breathButtonText: {
    ...MenteType.link,
    fontFamily: MenteType.captionStrong.fontFamily,
    color: MenteColors.onPrimary,
  },
  toolGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  toolCard: {
    // Two per row, accounting for the 12pt gap between them.
    width: '48%',
    flexGrow: 1,
    gap: 7,
    padding: 14,
    borderRadius: MenteRadius.card,
    backgroundColor: MenteColors.surface,
  },
  toolTitle: {
    ...MenteType.captionStrong,
    color: MenteColors.text,
  },
  toolDetail: {
    ...MenteType.link,
    fontFamily: MenteType.tiny.fontFamily,
    color: MenteColors.textMuted,
  },
  restructureCard: {
    gap: 10,
  },
  restructureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  restructureTitle: {
    ...MenteType.sectionTitle,
    flex: 1,
    color: MenteColors.text,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: MenteRadius.chip,
    backgroundColor: MenteColors.background,
  },
  stepNumber: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: MenteColors.surface,
  },
  stepNumberText: {
    ...MenteType.tinyStrong,
    color: MenteColors.accent,
  },
  stepText: {
    flex: 1,
    gap: 2,
  },
  stepLabel: {
    ...MenteType.link,
    color: MenteColors.textMuted,
  },
  stepInput: {
    ...MenteType.small,
    minHeight: 0,
    paddingHorizontal: 0,
    paddingVertical: 2,
    backgroundColor: 'transparent',
  },
  practiceCard: {
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: MenteRadius.row,
    backgroundColor: MenteColors.surface,
  },
  practiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  practiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: MenteColors.border,
  },
  practiceItemText: {
    ...MenteType.small,
    color: MenteColors.text,
  },
  practiceText: {
    flexShrink: 1,
    gap: 2,
  },
  practiceTitle: {
    ...MenteType.captionStrong,
    color: MenteColors.text,
  },
  practiceDetail: {
    ...MenteType.link,
    fontFamily: MenteType.tiny.fontFamily,
    color: MenteColors.textMuted,
  },
  practiceLink: {
    ...MenteType.link,
    color: MenteColors.accent,
  },
});
