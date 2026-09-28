import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/mente/icon';
import { Button, Card, Chevron, Input, Pill, Spacer, Toggle, TopBar } from '@/components/mente/ui';
import { MenteColors, MenteRadius, MenteSpacing, MenteType } from '@/constants/mente-theme';
import { ASSESSMENTS } from '@/data/assessments';
import { goalProgress } from '@/data/insights';
import type { AssessmentKind } from '@/data/types';
import { useUserData } from '@/data/user-data-context';
import { formatNumericDate, toDayKey } from '@/lib/dates';
import { confirm } from '@/lib/dialogs';

const RATINGS = ['Sim', 'Mais ou menos', 'Não'] as const;

const ASSESSMENT_COLORS: Record<AssessmentKind, string> = {
  stress: MenteColors.anxiety,
  wellbeing: MenteColors.primary,
  resilience: MenteColors.mood,
};

export default function RemindersScreen() {
  const router = useRouter();
  const { data, actions } = useUserData();
  const today = toDayKey();

  const [reminderForm, setReminderForm] = useState<{ title: string; schedule: string } | null>(null);
  const [goalForm, setGoalForm] = useState<{ title: string; target: string } | null>(null);

  const addReminder = () => {
    if (!reminderForm?.title.trim()) return;
    actions.addReminder(reminderForm.title.trim(), reminderForm.schedule.trim() || 'Sem horário');
    setReminderForm(null);
  };

  const goalTarget = Number.parseInt(goalForm?.target ?? '', 10);
  const canAddGoal = Boolean(goalForm?.title.trim()) && goalTarget > 0;
  const addGoal = () => {
    if (!goalForm || !canAddGoal) return;
    actions.addGoal(goalForm.title.trim(), goalTarget);
    setGoalForm(null);
  };

  const removeReminder = async (id: string, title: string) => {
    if (await confirm('Remover lembrete', `Remover “${title}”?`, 'Remover')) actions.removeReminder(id);
  };

  const removeGoal = async (id: string, title: string) => {
    if (await confirm('Remover meta', `Remover “${title}”?`, 'Remover')) actions.removeGoal(id);
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.safeArea}
          // Android is edge-to-edge (targetSdk 35+), where `adjustResize` no longer
          // shrinks the window, so pad on both platforms.
          behavior="padding">
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <TopBar title="Rotina e evolução" />

          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <Icon name="bell" size={16} color={MenteColors.accent} />
              <Text style={styles.cardTitle}>Lembretes</Text>
              <Spacer />
              <Pressable
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => setReminderForm(reminderForm ? null : { title: '', schedule: '' })}>
                <Text style={styles.link}>{reminderForm ? 'Cancelar' : '+ Novo'}</Text>
              </Pressable>
            </View>

            {reminderForm ? (
              <View style={styles.form}>
                <Input
                  autoFocus
                  placeholder="Título (ex.: Medicação)"
                  value={reminderForm.title}
                  onChangeText={(title) => setReminderForm({ ...reminderForm, title })}
                />
                <Input
                  placeholder="Quando (ex.: 8:00 e 20:00)"
                  value={reminderForm.schedule}
                  onChangeText={(schedule) => setReminderForm({ ...reminderForm, schedule })}
                  onSubmitEditing={addReminder}
                />
                <Button label="Adicionar lembrete" onPress={addReminder} disabled={!reminderForm.title.trim()} />
              </View>
            ) : null}

            {data.reminders.length === 0 ? (
              <Text style={styles.rowDetail}>Nenhum lembrete. Toque em “+ Novo” para criar.</Text>
            ) : null}

            {data.reminders.map((reminder) => {
              const done = reminder.doneOn === today;
              return (
                <View key={reminder.id} style={styles.row}>
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: done }}
                    accessibilityHint="Toque para marcar como feito hoje, segure para remover"
                    onPress={() => actions.toggleReminderDone(reminder.id)}
                    onLongPress={() => removeReminder(reminder.id, reminder.title)}
                    style={styles.rowPressable}>
                    <View style={styles.rowText}>
                      <Text style={[styles.rowTitle, !reminder.enabled && styles.muted]}>
                        {reminder.title}
                      </Text>
                      <Text style={styles.rowDetail}>{reminder.schedule}</Text>
                    </View>
                    {done ? (
                      <View style={styles.donePill}>
                        <Text style={styles.donePillText}>Feito hoje</Text>
                      </View>
                    ) : null}
                  </Pressable>
                  <Toggle
                    accessibilityLabel={`Lembrete ${reminder.title}`}
                    value={reminder.enabled}
                    onValueChange={() => actions.toggleReminder(reminder.id)}
                  />
                </View>
              );
            })}

            <View style={styles.divider} />

            <View style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>Período noturno sem notificações</Text>
                <Text style={styles.rowDetail}>22:00 — 07:00</Text>
              </View>
              <Toggle
                accessibilityLabel="Período noturno sem notificações"
                value={data.settings.quietHours}
                onValueChange={(quietHours) => actions.updateSettings({ quietHours })}
              />
            </View>

            <Text style={styles.note}>
              Os avisos no celular chegam numa próxima versão; por enquanto, marque aqui o que já fez.
            </Text>
          </Card>

          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <Icon name="target" size={16} color={MenteColors.accent} />
              <Text style={styles.cardTitle}>Metas de bem-estar</Text>
              <Spacer />
              <Pressable
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => setGoalForm(goalForm ? null : { title: '', target: '' })}>
                <Text style={styles.link}>{goalForm ? 'Cancelar' : '+ Nova'}</Text>
              </Pressable>
            </View>

            {goalForm ? (
              <View style={styles.form}>
                <Input
                  autoFocus
                  placeholder="Meta (ex.: Caminhar 3x por semana)"
                  value={goalForm.title}
                  onChangeText={(title) => setGoalForm({ ...goalForm, title })}
                />
                <Input
                  placeholder="Quantas vezes? (ex.: 3)"
                  inputMode="numeric"
                  value={goalForm.target}
                  onChangeText={(target) => setGoalForm({ ...goalForm, target: target.replace(/\D/g, '') })}
                  onSubmitEditing={addGoal}
                />
                <Button label="Adicionar meta" onPress={addGoal} disabled={!canAddGoal} />
              </View>
            ) : null}

            {data.goals.map((goal) => {
              const progress = Math.min(goalProgress(data, goal), goal.target);
              return (
                <Pressable
                  key={goal.id}
                  accessibilityHint="Segure para remover"
                  onLongPress={() => removeGoal(goal.id, goal.title)}
                  style={styles.goal}>
                  <View style={styles.goalHeader}>
                    <Text style={styles.goalTitle}>{goal.title}</Text>
                    <Spacer />
                    <Text style={styles.goalProgress}>
                      {progress} de {goal.target}
                    </Text>
                    {goal.kind === 'custom' && progress < goal.target ? (
                      <Pill label="+1" tone="accent" onPress={() => actions.incrementGoal(goal.id)} />
                    ) : null}
                  </View>
                  <View style={styles.goalTrack}>
                    <View style={[styles.goalFill, { width: `${(progress / goal.target) * 100}%` }]} />
                  </View>
                </Pressable>
              );
            })}
          </Card>

          <Card style={styles.card}>
            <Text style={styles.eyebrow}>Sugestão para esta semana</Text>
            <Text style={styles.suggestion}>
              Caminhar 20 minutos depois do almoço nos dias de reunião.
            </Text>

            <View style={styles.ratingRow}>
              <Text style={styles.rowDetail}>Foi útil?</Text>
              <Spacer />
              {RATINGS.map((option) => {
                const selected = data.suggestionRating === option;
                return (
                  <Pressable
                    key={option}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    onPress={() => actions.setSuggestionRating(selected ? null : option)}
                    style={[styles.ratingChip, selected && styles.ratingChipSelected]}>
                    <Text style={[styles.ratingText, selected && styles.ratingTextSelected]}>
                      {option}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>

          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Avaliações</Text>
            </View>

            {(Object.keys(ASSESSMENTS) as AssessmentKind[]).map((kind) => {
              const definition = ASSESSMENTS[kind];
              const last = data.assessments.find((item) => item.kind === kind);
              return (
                <Pressable
                  key={kind}
                  accessibilityRole="button"
                  accessibilityHint={last ? 'Refazer avaliação' : 'Fazer avaliação'}
                  onPress={() => router.push({ pathname: '/assessment', params: { kind } })}
                  style={({ pressed }) => [styles.assessment, pressed && styles.pressed]}>
                  <View style={[styles.assessmentBar, { backgroundColor: ASSESSMENT_COLORS[kind] }]} />
                  <View style={styles.rowText}>
                    <Text style={styles.assessmentTitle}>{definition.title}</Text>
                    <Text style={styles.rowDetail}>
                      {last ? `Última: ${formatNumericDate(new Date(last.at))}` : 'Ainda não feita'}
                    </Text>
                  </View>
                  <Text style={styles.assessmentValue}>
                    {last ? definition.describe(last.score) : 'Fazer'}
                  </Text>
                  <Chevron />
                </Pressable>
              );
            })}
          </Card>
        </ScrollView>
        </KeyboardAvoidingView>
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
    gap: 8,
  },
  cardTitle: {
    ...MenteType.sectionTitle,
    color: MenteColors.text,
  },
  link: {
    ...MenteType.link,
    color: MenteColors.accent,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowPressable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  muted: {
    color: MenteColors.textMuted,
  },
  form: {
    gap: 8,
  },
  note: {
    ...MenteType.tiny,
    color: MenteColors.textMuted,
  },
  pressed: {
    opacity: 0.75,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    ...MenteType.captionStrong,
    fontSize: 14,
    color: MenteColors.text,
  },
  rowDetail: {
    ...MenteType.small,
    color: MenteColors.textMuted,
  },
  donePill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: MenteRadius.pill,
    backgroundColor: MenteColors.greenSurface,
  },
  donePillText: {
    ...MenteType.micro,
    color: MenteColors.greenText,
  },
  divider: {
    height: 1,
    backgroundColor: MenteColors.border,
  },
  goal: {
    gap: 7,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  goalTitle: {
    ...MenteType.small,
    flexShrink: 1,
    color: MenteColors.text,
  },
  goalProgress: {
    ...MenteType.small,
    color: MenteColors.textMuted,
  },
  goalTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: MenteColors.background,
  },
  goalFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: MenteColors.primary,
  },
  eyebrow: {
    ...MenteType.link,
    color: MenteColors.textMuted,
  },
  suggestion: {
    ...MenteType.body,
    color: MenteColors.text,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  ratingChip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: MenteRadius.pill,
    backgroundColor: MenteColors.background,
  },
  ratingChipSelected: {
    backgroundColor: MenteColors.primary,
  },
  ratingText: {
    ...MenteType.link,
    color: MenteColors.textMuted,
  },
  ratingTextSelected: {
    fontFamily: MenteType.captionStrong.fontFamily,
    color: MenteColors.onPrimary,
  },
  assessment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  assessmentBar: {
    width: 3,
    height: 28,
    borderRadius: 2,
  },
  assessmentTitle: {
    ...MenteType.caption,
    fontFamily: MenteType.captionStrong.fontFamily,
    color: MenteColors.text,
  },
  assessmentValue: {
    ...MenteType.caption,
    color: MenteColors.accent,
  },
});
