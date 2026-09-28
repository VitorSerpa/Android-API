import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/mente/icon';
import { Screen } from '@/components/mente/screen';
import { Card, IconBubble, Spacer, TopBar } from '@/components/mente/ui';
import { MenteColors, MenteRadius, MenteType } from '@/constants/mente-theme';

const TOOLS: readonly {
  icon: IconName;
  title: string;
  detail: string;
  background: string;
  color: string;
}[] = [
  {
    icon: 'wave',
    title: 'Técnica 4-7-8',
    detail: 'Acalma em 4 ciclos',
    background: MenteColors.background,
    color: MenteColors.accent,
  },
  {
    icon: 'moon',
    title: 'Meditação guiada',
    detail: '8 trilhas de 3 a 15 min',
    background: MenteColors.purpleSurface,
    color: MenteColors.purpleText,
  },
  {
    icon: 'anchor',
    title: 'Grounding 5-4-3-2-1',
    detail: 'Volte para o presente',
    background: MenteColors.greenSurface,
    color: MenteColors.greenText,
  },
  {
    icon: 'heart',
    title: 'Afirmações',
    detail: 'Frases para hoje',
    background: MenteColors.dangerSurface,
    color: MenteColors.dangerText,
  },
];

const STEPS = [
  { label: 'Pensamento negativo', value: '“Eu vou estragar a apresentação.”' },
  { label: 'Sentimento', value: 'Ansiedade · 7/10' },
  { label: 'Pensamento alternativo', value: '“Já me preparei e posso errar sem ser um fracasso.”' },
] as const;

export default function ToolsScreen() {
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
        </View>

        {STEPS.map((step, index) => (
          <View key={step.label} style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>{index + 1}</Text>
            </View>
            <View style={styles.stepText}>
              <Text style={styles.stepLabel}>{step.label}</Text>
              <Text style={styles.stepValue}>{step.value}</Text>
            </View>
          </View>
        ))}
      </Card>

      <View style={styles.practiceRow}>
        <Icon name="chart" size={17} color={MenteColors.accent} />
        <View style={styles.practiceText}>
          <Text style={styles.practiceTitle}>12 práticas este mês</Text>
          <Text style={styles.practiceDetail}>Respiração 7 · Meditação 4 · Grounding 1</Text>
        </View>
        <Spacer />
        <Text style={styles.practiceLink}>Ver tudo</Text>
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
  stepValue: {
    ...MenteType.small,
    color: MenteColors.text,
  },
  practiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: MenteRadius.row,
    backgroundColor: MenteColors.surface,
  },
  practiceText: {
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
