import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/mente/icon';
import { Screen } from '@/components/mente/screen';
import { Button, Card, IconBubble, Input, MIN_TOUCH, SectionHeader, Spacer, TopBar } from '@/components/mente/ui';
import { MenteRadius, MenteType } from '@/constants/mente-theme';
import { formatDecimal, practicesThisMonth, practiceSummary, techniqueRating, TOOL_NAMES } from '@/data/insights';
import { analyseThought } from '@/data/thoughts';
import type { ToolId } from '@/data/types';
import { useUserData } from '@/data/user-data-context';
import { formatShortDate, formatTime } from '@/lib/dates';
import { confirm, notify } from '@/lib/dialogs';
import { makeStyles, useColors, type ColorTokens } from '@/theme';

const TOOLS: readonly {
  tool: ToolId;
  icon: IconName;
  title: string;
  detail: string;
  tone: (c: ColorTokens) => { background: string; color: string };
}[] = [
  { tool: 'breathing', icon: 'wave', title: 'Técnica 4-7-8', detail: 'Acalma em 4 ciclos', tone: (c) => ({ background: c.background, color: c.accent }) },
  { tool: 'meditation', icon: 'moon', title: 'Meditação guiada', detail: 'Áudio e voz, 3 a 15 min', tone: (c) => ({ background: c.purpleSurface, color: c.purpleText }) },
  { tool: 'grounding', icon: 'anchor', title: 'Grounding 5-4-3-2-1', detail: 'Pelos cinco sentidos', tone: (c) => ({ background: c.greenSurface, color: c.greenText }) },
  { tool: 'affirmations', icon: 'heart', title: 'Afirmações', detail: 'Frases para hoje', tone: (c) => ({ background: c.dangerSurface, color: c.dangerText }) },
];

type Thought = { negative: string; feeling: string; alternative: string };
const EMPTY_THOUGHT: Thought = { negative: '', feeling: '', alternative: '' };

export default function ToolsScreen() {
  const styles = useStyles();
  const c = useColors();
  const router = useRouter();
  const { data, actions } = useUserData();
  const [thought, setThought] = useState(EMPTY_THOUGHT);
  const [showPractices, setShowPractices] = useState(false);

  const summary = practiceSummary(data);
  const monthPractices = practicesThisMonth(data);
  const analysis = analyseThought(thought.negative);
  const showSuggestions = thought.negative.trim().length >= 6;
  const canSaveThought = thought.negative.trim() && thought.alternative.trim();

  const start = (tool: ToolId) => router.push({ pathname: '/practice', params: { tool } });

  const saveThought = () => {
    actions.saveThought({
      negative: thought.negative.trim(),
      feeling: thought.feeling.trim(),
      alternative: thought.alternative.trim(),
      distortions: analysis.distortions.map((item) => item.id),
    });
    setThought(EMPTY_THOUGHT);
    notify('Registro salvo', 'Reescrever um pensamento é um treino — cada vez fica mais fácil.');
  };

  const removeThought = async (id: string) => {
    if (await confirm('Apagar registro', 'Este pensamento será removido.', 'Apagar')) actions.deleteThought(id);
  };

  return (
    <Screen>
      <TopBar title="Ferramentas" />

      <Card style={styles.breathCard}>
        <View style={styles.breathCircle}>
          <Icon name="breath" size={56} color={c.primary} />
        </View>
        <View style={styles.breathText}>
          <Text style={styles.breathTitle}>Respiração guiada</Text>
          <Text style={styles.breathDetail}>Inspire, segure e solte no ritmo do círculo.</Text>
          <Pressable accessibilityRole="button" onPress={() => start('breathing')} style={({ pressed }) => [styles.breathButton, pressed && styles.pressed]}>
            <Text style={styles.breathButtonText}>Começar agora</Text>
          </Pressable>
        </View>
      </Card>

      <View style={styles.toolGrid}>
        {TOOLS.map((item) => {
          const tone = item.tone(c);
          const rating = techniqueRating(data, item.tool);
          return (
            <Pressable
              key={item.title}
              accessibilityRole="button"
              accessibilityHint={rating ? `Sua nota média: ${formatDecimal(rating)} estrelas` : undefined}
              onPress={() => start(item.tool)}
              style={({ pressed }) => [styles.toolCard, pressed && styles.pressed]}>
              <IconBubble name={item.icon} size={34} glyphSize={18} background={tone.background} color={tone.color} />
              <Text style={styles.toolTitle}>{item.title}</Text>
              <Text style={styles.toolDetail}>{item.detail}</Text>
              {rating ? <Text style={styles.rating}>★ {formatDecimal(rating)}</Text> : null}
            </Pressable>
          );
        })}
      </View>

      <Pressable accessibilityRole="button" onPress={() => router.push('/affirmations')} style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}>
        <Icon name="heart" size={16} color={c.accent} />
        <Text style={styles.linkRowText}>Minhas afirmações, favoritas e mensagens</Text>
        <Spacer />
        <Icon name="chevronRight" size={13} color={c.textMuted} />
      </Pressable>

      <Card style={styles.restructureCard}>
        <View style={styles.restructureHeader}>
          <Icon name="bulb" size={18} color={c.amberText} />
          <Text style={styles.restructureTitle}>Reestruturação de pensamentos</Text>
          {data.thoughts.length ? <Text style={styles.muted}>{data.thoughts.length} salvos</Text> : null}
        </View>

        <Step number={1} label="Pensamento negativo automático">
          <Input
            multiline
            accessibilityLabel="Pensamento negativo"
            placeholder="“Eu vou estragar a apresentação.”"
            value={thought.negative}
            onChangeText={(negative) => setThought((current) => ({ ...current, negative }))}
          />
        </Step>

        {showSuggestions ? (
          <View style={styles.analysis} accessibilityLiveRegion="polite">
            {analysis.distortions.length ? (
              analysis.distortions.map((item) => (
                <Text key={item.id} style={styles.analysisText}>
                  <Text style={styles.analysisStrong}>{item.name}: </Text>
                  {item.explanation}
                </Text>
              ))
            ) : (
              <Text style={styles.analysisText}>Vamos olhar para esse pensamento de outro ângulo.</Text>
            )}
            <Text style={styles.analysisStrong}>Sugestões de pensamento alternativo (toque para usar):</Text>
            {analysis.suggestions.map((suggestion) => (
              <Pressable
                key={suggestion}
                accessibilityRole="button"
                onPress={() => setThought((current) => ({ ...current, alternative: suggestion }))}
                style={({ pressed }) => [styles.suggestion, pressed && styles.pressed]}>
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <Step number={2} label="Sentimento">
          <Input
            accessibilityLabel="Sentimento"
            placeholder="Ansiedade · 7/10"
            value={thought.feeling}
            onChangeText={(feeling) => setThought((current) => ({ ...current, feeling }))}
          />
        </Step>
        <Step number={3} label="Pensamento alternativo, mais realista">
          <Input
            multiline
            accessibilityLabel="Pensamento alternativo"
            placeholder="“Já me preparei e posso errar sem ser um fracasso.”"
            value={thought.alternative}
            onChangeText={(alternative) => setThought((current) => ({ ...current, alternative }))}
          />
        </Step>

        <Button label="Salvar registro" onPress={saveThought} disabled={!canSaveThought} />

        {data.thoughts.slice(0, 3).map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityHint="Segure para apagar"
            onLongPress={() => removeThought(item.id)}
            style={styles.savedThought}>
            <Text style={styles.muted}>{formatShortDate(new Date(item.at))}</Text>
            <Text style={styles.thoughtNegative}>“{item.negative}”</Text>
            <Text style={styles.thoughtAlternative}>→ {item.alternative}</Text>
          </Pressable>
        ))}
      </Card>

      <View style={styles.practiceCard}>
        <SectionHeader
          title={`${summary.total} ${summary.total === 1 ? 'prática' : 'práticas'} este mês`}
          action={monthPractices.length ? (showPractices ? 'Ocultar' : 'Ver histórico') : undefined}
          onPressAction={() => setShowPractices((value) => !value)}
        />
        <Text style={styles.muted}>
          {summary.counts.length ? summary.counts.map((item) => `${TOOL_NAMES[item.tool]} ${item.count}`).join(' · ') : 'Nenhuma prática ainda'}
        </Text>
        {showPractices
          ? monthPractices.map((practice) => (
              <View key={practice.id} style={styles.practiceItem}>
                <Text style={styles.practiceItemText}>{TOOL_NAMES[practice.tool]}</Text>
                <Spacer />
                <Text style={styles.muted}>
                  {formatShortDate(new Date(practice.at))} {formatTime(new Date(practice.at))} ·{' '}
                  {practice.durationSec < 60 ? `${practice.durationSec} s` : `${Math.round(practice.durationSec / 60)} min`}
                </Text>
              </View>
            ))
          : null}
      </View>
    </Screen>
  );
}

function Step({ number, label, children }: { number: number; label: string; children: React.ReactNode }) {
  const styles = useStyles();
  return (
    <View style={styles.step}>
      <View style={styles.stepNumber}>
        <Text style={styles.stepNumberText}>{number}</Text>
      </View>
      <View style={styles.stepText}>
        <Text style={styles.stepLabel}>{label}</Text>
        {children}
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  pressed: {
    opacity: 0.75,
  },
  muted: {
    ...MenteType.small,
    color: c.textMuted,
  },
  breathCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  breathCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.background,
  },
  breathText: {
    flex: 1,
    gap: 6,
  },
  breathTitle: {
    ...MenteType.sectionTitle,
    color: c.text,
  },
  breathDetail: {
    ...MenteType.small,
    color: c.textMuted,
  },
  breathButton: {
    alignSelf: 'flex-start',
    minHeight: MIN_TOUCH,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: MenteRadius.pill,
    backgroundColor: c.primary,
  },
  breathButtonText: {
    ...MenteType.captionStrong,
    color: c.onPrimary,
  },
  toolGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 11,
  },
  toolCard: {
    flexBasis: '47%',
    flexGrow: 1,
    gap: 6,
    padding: 14,
    borderRadius: MenteRadius.card,
    backgroundColor: c.surface,
  },
  toolTitle: {
    ...MenteType.captionStrong,
    color: c.text,
  },
  toolDetail: {
    ...MenteType.tiny,
    color: c.textMuted,
  },
  rating: {
    ...MenteType.tinyStrong,
    color: c.amberText,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: MIN_TOUCH + 4,
    paddingHorizontal: 14,
    borderRadius: MenteRadius.row,
    backgroundColor: c.surface,
  },
  linkRowText: {
    ...MenteType.captionStrong,
    color: c.text,
  },
  restructureCard: {
    gap: 12,
  },
  restructureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  restructureTitle: {
    ...MenteType.sectionTitle,
    flex: 1,
    color: c.text,
  },
  step: {
    flexDirection: 'row',
    gap: 10,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.amberSurface,
  },
  stepNumberText: {
    ...MenteType.tinyStrong,
    color: c.amberText,
  },
  stepText: {
    flex: 1,
    gap: 6,
  },
  stepLabel: {
    ...MenteType.captionStrong,
    color: c.text,
  },
  analysis: {
    gap: 8,
    padding: 12,
    borderRadius: MenteRadius.row,
    backgroundColor: c.amberSurface,
  },
  analysisText: {
    ...MenteType.small,
    color: c.amberText,
  },
  analysisStrong: {
    ...MenteType.smallStrong,
    color: c.amberText,
  },
  suggestion: {
    minHeight: MIN_TOUCH,
    justifyContent: 'center',
    padding: 10,
    borderRadius: MenteRadius.chip,
    backgroundColor: c.surface,
  },
  suggestionText: {
    ...MenteType.caption,
    color: c.text,
  },
  savedThought: {
    gap: 3,
    padding: 12,
    borderRadius: MenteRadius.row,
    backgroundColor: c.background,
  },
  thoughtNegative: {
    ...MenteType.caption,
    color: c.textMuted,
  },
  thoughtAlternative: {
    ...MenteType.captionStrong,
    color: c.text,
  },
  practiceCard: {
    gap: 8,
    padding: 16,
    borderRadius: MenteRadius.card,
    backgroundColor: c.surface,
  },
  practiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 32,
  },
  practiceItemText: {
    ...MenteType.caption,
    color: c.text,
  },
}));
