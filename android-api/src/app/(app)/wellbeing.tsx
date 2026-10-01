import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { ChoiceChips, NumberField, parseNumberField } from '@/components/mente/fields';
import { Icon } from '@/components/mente/icon';
import { StackScreen } from '@/components/mente/stack-screen';
import { Button, Card, Chevron, Input, MIN_TOUCH, Pill, Spacer, TOUCH_SLOP, TopBar } from '@/components/mente/ui';
import { MenteRadius, MenteType } from '@/constants/mente-theme';
import { ASSESSMENTS } from '@/data/assessments';
import { allActivities, formatDecimal, goalProgress, PERIOD_NAMES, suggestionFor, techniqueRating, TOOL_NAMES } from '@/data/insights';
import type { AssessmentKind, Goal, GoalKind, GoalPeriod, ToolId } from '@/data/types';
import { useUserData } from '@/data/user-data-context';
import { formatNumericDate } from '@/lib/dates';
import { confirm } from '@/lib/dialogs';
import { makeStyles, useColors } from '@/theme';

const GOAL_KINDS: Record<GoalKind, string> = {
  practiceMinutes: 'Minutos de prática',
  practiceSessions: 'Sessões de prática',
  checkins: 'Dias com check-in',
  activityDays: 'Dias com atividade',
  custom: 'Personalizada',
};
const PERIODS: GoalPeriod[] = ['day', 'week', 'month'];
const PERIOD_LABELS: Record<GoalPeriod, string> = { day: 'Por dia', week: 'Por semana', month: 'Por mês' };
const TOOLS = Object.keys(TOOL_NAMES) as ToolId[];

function defaultTitle(kind: GoalKind, target: number, period: GoalPeriod, tool: ToolId, activity: string) {
  const per = { day: 'por dia', week: 'por semana', month: 'por mês' }[period];
  switch (kind) {
    case 'practiceMinutes':
      return `${TOOL_NAMES[tool]}: ${target} minutos ${per}`;
    case 'practiceSessions':
      return `${TOOL_NAMES[tool]}: ${target} ${target === 1 ? 'sessão' : 'sessões'} ${per}`;
    case 'checkins':
      return `Check-in em ${target} ${target === 1 ? 'dia' : 'dias'} ${per}`;
    case 'activityDays':
      return `${activity}: ${target} ${target === 1 ? 'dia' : 'dias'} ${per}`;
    case 'custom':
      return '';
  }
}

export default function WellbeingScreen() {
  const styles = useStyles();
  const c = useColors();
  const router = useRouter();
  const { data } = useUserData();
  const [creating, setCreating] = useState(false);
  const suggestion = suggestionFor(data);

  return (
    <StackScreen>
      <TopBar title="Metas e avaliações" />

      <Card style={styles.card}>
        <View style={styles.header}>
          <Icon name="target" size={16} color={c.accent} />
          <Text style={styles.cardTitle}>Metas de bem-estar</Text>
          <Spacer />
          <Pressable accessibilityRole="button" hitSlop={TOUCH_SLOP} onPress={() => setCreating((value) => !value)}>
            <Text style={styles.link}>{creating ? 'Cancelar' : '+ Nova'}</Text>
          </Pressable>
        </View>
        {creating ? <GoalForm onDone={() => setCreating(false)} /> : null}
        {data.goals.map((goal) => (
          <GoalRow key={goal.id} goal={goal} />
        ))}
        {!data.goals.length && !creating ? <Text style={styles.detail}>Nenhuma meta ainda.</Text> : null}
      </Card>

      <Card style={styles.card}>
        <Text style={styles.eyebrow}>SUGESTÃO PELO SEU ÚLTIMO CHECK-IN</Text>
        <Text style={styles.body}>{suggestion.text}</Text>
        {suggestion.tool ? (
          <Button
            label={`Começar ${TOOL_NAMES[suggestion.tool].toLowerCase()}`}
            onPress={() =>
              router.push({ pathname: '/practice', params: { tool: suggestion.tool!, ...(suggestion.minutes ? { minutes: String(suggestion.minutes) } : {}) } })
            }
          />
        ) : null}
        <Text style={styles.detail}>Ao terminar uma prática, avalie de 1 a 5 estrelas. As técnicas mais bem avaliadas passam a ser sugeridas primeiro.</Text>
        <View style={styles.ratings}>
          {TOOLS.map((tool) => {
            const rating = techniqueRating(data, tool);
            return (
              <Pill key={tool} label={`${TOOL_NAMES[tool]} ${rating === null ? '· sem nota' : `★ ${formatDecimal(rating)}`}`} />
            );
          })}
        </View>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Autoavaliações</Text>
        {(Object.keys(ASSESSMENTS) as AssessmentKind[]).map((kind) => {
          const definition = ASSESSMENTS[kind];
          const results = data.assessments.filter((item) => item.kind === kind);
          const last = results[0];
          return (
            <View key={kind} style={styles.assessment}>
              <Pressable
                accessibilityRole="button"
                accessibilityHint={last ? 'Refazer avaliação' : 'Fazer avaliação'}
                onPress={() => router.push({ pathname: '/assessment', params: { kind } })}
                style={styles.assessmentMain}>
                <View style={styles.flex}>
                  <Text style={styles.title}>{definition.title}</Text>
                  <Text style={styles.detail}>
                    {definition.questions.length} perguntas · {last ? `última em ${formatNumericDate(new Date(last.at))}: ${definition.describe(last.score)}` : 'ainda não feita'}
                  </Text>
                </View>
                <Text style={styles.link}>{last ? 'Refazer' : 'Fazer'}</Text>
                <Chevron />
              </Pressable>
              {results.length ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push({ pathname: '/assessment-history', params: { kind } })}
                  style={styles.historyLink}>
                  <Text style={styles.link}>
                    Ver histórico ({results.length} {results.length === 1 ? 'resultado' : 'resultados'})
                  </Text>
                </Pressable>
              ) : null}
            </View>
          );
        })}
      </Card>
    </StackScreen>
  );
}

function GoalForm({ onDone }: { onDone: () => void }) {
  const styles = useStyles();
  const { data, actions } = useUserData();
  const [kind, setKind] = useState<GoalKind>('practiceMinutes');
  const [tool, setTool] = useState<ToolId>('meditation');
  const [activity, setActivity] = useState(allActivities(data)[0]);
  const [period, setPeriod] = useState<GoalPeriod>('day');
  const [target, setTarget] = useState('10');
  const [customTitle, setCustomTitle] = useState('');
  const value = parseNumberField(target, { min: 1, max: 1000, integer: true });
  const valid = typeof value === 'number' && !Number.isNaN(value) && (kind !== 'custom' || customTitle.trim());
  const title = kind === 'custom' ? customTitle.trim() : defaultTitle(kind, value && !Number.isNaN(value) ? value : 0, period, tool, activity);

  const add = () => {
    if (!valid || !value) return;
    actions.addGoal({
      kind,
      title,
      target: value,
      period,
      ...(kind === 'practiceMinutes' || kind === 'practiceSessions' ? { tool } : {}),
      ...(kind === 'activityDays' ? { activity } : {}),
    });
    onDone();
  };

  return (
    <View style={styles.editor}>
      <ChoiceChips label="Tipo de meta" options={Object.keys(GOAL_KINDS) as GoalKind[]} renderLabel={(item) => GOAL_KINDS[item]} selected={[kind]} onToggle={setKind} />
      {kind === 'practiceMinutes' || kind === 'practiceSessions' ? (
        <ChoiceChips label="Prática" options={TOOLS} renderLabel={(item) => TOOL_NAMES[item]} selected={[tool]} onToggle={setTool} />
      ) : null}
      {kind === 'activityDays' ? (
        <ChoiceChips label="Atividade" options={allActivities(data)} selected={[activity]} onToggle={setActivity} />
      ) : null}
      {kind === 'custom' ? (
        <Input accessibilityLabel="Nome da meta" placeholder="Meta (ex.: caminhar ao ar livre)" value={customTitle} onChangeText={setCustomTitle} />
      ) : null}
      <ChoiceChips label="Período" options={PERIODS} renderLabel={(item) => PERIOD_LABELS[item]} selected={[period]} onToggle={setPeriod} grow />
      <NumberField
        label={kind === 'practiceMinutes' ? 'Minutos' : 'Quantidade'}
        integer
        value={target}
        onChangeText={setTarget}
        error={target && Number.isNaN(value) ? 'Informe um número inteiro maior que zero.' : null}
      />
      {title ? <Text style={styles.detail}>Meta: {title}</Text> : null}
      <Button label="Adicionar meta" onPress={add} disabled={!valid} />
    </View>
  );
}

function GoalRow({ goal }: { goal: Goal }) {
  const styles = useStyles();
  const { data, actions } = useUserData();
  const progress = goalProgress(data, goal);
  const ratio = Math.min(progress / goal.target, 1);
  const done = progress >= goal.target;

  const remove = async () => {
    if (await confirm('Remover meta', `Remover “${goal.title}”?`, 'Remover')) actions.removeGoal(goal.id);
  };

  return (
    <Pressable accessibilityRole="summary" accessibilityHint="Segure para remover" onLongPress={remove} style={styles.goal}>
      <View style={styles.header}>
        <Text style={styles.title}>{goal.title}</Text>
        <Spacer />
        <Text style={[styles.progressText, done && styles.done]}>
          {done ? '✓ ' : ''}
          {Math.min(progress, goal.target)} de {goal.target}
        </Text>
      </View>
      <View style={styles.track} accessible accessibilityLabel={`${Math.round(ratio * 100)}% ${PERIOD_NAMES[goal.period]}`}>
        <View style={[styles.fill, { width: `${ratio * 100}%` }]} />
      </View>
      <View style={styles.header}>
        <Text style={styles.detail}>Progresso {PERIOD_NAMES[goal.period]}</Text>
        <Spacer />
        {goal.kind === 'custom' && !done ? (
          <Pressable accessibilityRole="button" accessibilityLabel={`Registrar +1 em ${goal.title}`} onPress={() => actions.incrementGoal(goal.id)} style={styles.plusOne}>
            <Text style={styles.plusOneText}>+1</Text>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  flex: {
    flex: 1,
  },
  card: {
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    ...MenteType.sectionTitle,
    color: c.text,
  },
  eyebrow: {
    ...MenteType.sectionEyebrow,
    color: c.textMuted,
  },
  body: {
    ...MenteType.body,
    color: c.text,
  },
  title: {
    ...MenteType.captionStrong,
    flexShrink: 1,
    color: c.text,
  },
  detail: {
    ...MenteType.small,
    color: c.textMuted,
  },
  link: {
    ...MenteType.captionStrong,
    color: c.accent,
  },
  ratings: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  goal: {
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  progressText: {
    ...MenteType.smallStrong,
    color: c.accent,
  },
  done: {
    color: c.greenText,
  },
  track: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: c.background,
  },
  fill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: c.mood,
  },
  plusOne: {
    minWidth: MIN_TOUCH,
    minHeight: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: MenteRadius.pill,
    backgroundColor: c.primary,
  },
  plusOneText: {
    ...MenteType.captionStrong,
    color: c.onPrimary,
  },
  editor: {
    gap: 10,
    padding: 12,
    borderRadius: MenteRadius.row,
    borderWidth: 1,
    borderColor: c.border,
  },
  assessment: {
    gap: 2,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  assessmentMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: MIN_TOUCH,
  },
  historyLink: {
    minHeight: MIN_TOUCH,
    justifyContent: 'center',
  },
}));
