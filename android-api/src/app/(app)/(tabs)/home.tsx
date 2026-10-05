import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { useAuth } from '@/auth';
import { CrisisQuickLog } from '@/components/mente/crisis-quick-log';
import { Icon } from '@/components/mente/icon';
import { Screen } from '@/components/mente/screen';
import { Card, MIN_TOUCH, SectionHeader, Spacer } from '@/components/mente/ui';
import { MenteRadius, MenteType } from '@/constants/mente-theme';
import {
  dayAverages,
  // dosesOn, — medicamentos desativados
  formatDecimal,
  latestCheckIn,
  moodState,
  suggestionFor,
  TOOL_NAMES,
} from '@/data/insights';
import { useUserData } from '@/data/user-data-context';
import { WEEKDAY_INITIALS, formatLongDate, fromDayKey, lastDays, toDayKey } from '@/lib/dates';
// import { dismissNotification, medicationNotificationId } from '@/lib/notifications';
import { makeStyles, useColors } from '@/theme';

/** Tallest bar in the 7-day chart, in points — a 5/5 mood. */
const BAR_MAX = 52;
const BAR_EMPTY = 4;
const WATER_GOAL = 8;

export default function HomeScreen() {
  const styles = useStyles();
  const c = useColors();
  const router = useRouter();
  const { user } = useAuth();
  const { data, actions } = useUserData();
  const today = toDayKey();

  const averages = dayAverages(data, today);
  const latest = latestCheckIn(data);
  const health = data.health[today];
  const water = data.water[today] ?? 0;
  const suggestion = suggestionFor(data);
  // Medicamentos desativados: const doses = dosesOn(data, today);
  const firstName = user?.name.split(' ')[0] ?? '';

  const metrics = [
    { label: 'Humor', value: averages.mood, scale: '/5', color: c.mood },
    { label: 'Ansiedade', value: averages.anxiety, scale: '/10', color: c.anxiety },
    { label: 'Energia', value: averages.energy, scale: '/5', color: c.energy },
  ];

  const week = lastDays(7).map((day, index) => {
    const mood = dayAverages(data, day).mood;
    return {
      day,
      initial: WEEKDAY_INITIALS[fromDayKey(day).getDay()],
      height: mood === null ? BAR_EMPTY : (mood / 5) * BAR_MAX,
      mood,
      today: index === 6,
    };
  });

  // Medicamentos desativados:
  // const takeDose = (medicationId: string, time: string) => {
  //   actions.recordIntake(medicationId, today, time);
  //   dismissNotification(medicationNotificationId(medicationId, time)).catch(() => {});
  // };

  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Olá, {firstName}</Text>
          <Text style={styles.date}>{formatLongDate()}</Text>
        </View>
        <Spacer />
        <View style={styles.statePill}>
          <View style={styles.stateDot} />
          <Text style={styles.stateText}>{latest?.day === today ? moodState(latest) : 'SEM CHECK-IN'}</Text>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityHint="Abre o modo de emergência com contatos de apoio e seu plano de ação"
        onPress={() => router.push('/emergency')}
        style={({ pressed }) => [styles.helpButton, pressed && styles.pressed]}>
        <Icon name="alert" size={17} color={c.dangerText} cutColor={c.dangerSurface} />
        <Text style={styles.helpButtonText}>Preciso de ajuda agora</Text>
      </Pressable>

      <Card style={styles.summaryCard}>
        <SectionHeader title="Resumo de hoje" action="Ver dia" onPressAction={() => router.push({ pathname: '/day/[day]', params: { day: today } })} />

        <View style={styles.metricRow}>
          {metrics.map((metric) => (
            <View key={metric.label} style={styles.metric}>
              <View style={styles.metricValueRow}>
                <Text style={styles.metricValue}>{metric.value === null ? '–' : formatDecimal(metric.value)}</Text>
                <Text style={styles.metricScale}>{metric.scale}</Text>
              </View>
              <Text style={styles.metricLabel}>{metric.label}</Text>
              <View style={[styles.metricBar, { backgroundColor: metric.color }]} />
            </View>
          ))}
        </View>

        <View
          style={styles.chart}
          accessible
          accessibilityLabel={`Humor dos últimos 7 dias: ${week.map((entry) => (entry.mood === null ? 'sem registro' : formatDecimal(entry.mood))).join(', ')}`}>
          {week.map((entry) => (
            <View key={entry.day} style={styles.chartColumn}>
              <View style={[styles.chartBar, { height: entry.height, backgroundColor: entry.today ? c.barToday : c.barIdle }]} />
              <Text style={styles.chartLabel}>{entry.initial}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Pressable accessibilityRole="button" onPress={() => router.push('/check-in')} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
        <Text style={styles.primaryButtonText}>{averages.count ? 'Novo check-in' : 'Fazer check-in'}</Text>
      </Pressable>

      <View style={styles.habitRow}>
        <Pressable accessibilityRole="button" onPress={() => router.push('/check-in')} style={styles.habit}>
          <View style={[styles.habitDot, { backgroundColor: c.energy }]} />
          <Text style={styles.habitValue} numberOfLines={1}>
            {health?.sleepHours != null ? `${formatDecimal(health.sleepHours)} h` : (health?.sleepQuality ?? '–')}
          </Text>
          <Text style={styles.habitLabel}>Sono</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.push('/check-in')} style={styles.habit}>
          <View style={[styles.habitDot, { backgroundColor: c.mood }]} />
          <Text style={styles.habitValue} numberOfLines={1}>
            {health?.activityMinutes != null ? `${health.activityMinutes} min` : health?.activities.length ? `${health.activities.length} ativ.` : '–'}
          </Text>
          <Text style={styles.habitLabel}>Atividade</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Água: ${water} de ${WATER_GOAL} copos. Toque para adicionar um copo, segure para remover.`}
          onPress={() => actions.addWater(1)}
          onLongPress={() => actions.addWater(-1)}
          style={styles.habit}>
          <View style={[styles.habitDot, { backgroundColor: c.primary }]} />
          <Text style={styles.habitValue}>
            {water}/{WATER_GOAL} copos
          </Text>
          <Text style={styles.habitLabel}>Água · toque +1</Text>
        </Pressable>
      </View>

      {/* Medicamentos desativados (RF-17/RF-18). Para reativar, descomente este card, `doses`, `takeDose` e os imports.
      {doses.length ? (
        <Card style={styles.dosesCard}>
          <SectionHeader title="Medicamentos de hoje" action="Gerenciar" onPressAction={() => router.push('/medications')} />
          {doses.map((dose) => (
            <View key={`${dose.medicationId}-${dose.time}`} style={styles.doseRow}>
              <Text style={styles.doseTime}>{dose.time}</Text>
              <View style={styles.flex}>
                <Text style={styles.habitValue}>{dose.name}</Text>
                {dose.dosage ? <Text style={styles.habitLabel}>{dose.dosage}</Text> : null}
              </View>
              {dose.takenAt ? (
                <Text style={styles.taken}>Tomei às {formatTime(new Date(dose.takenAt))}</Text>
              ) : (
                <Pressable accessibilityRole="button" accessibilityLabel={`Tomei ${dose.name} das ${dose.time}`} onPress={() => takeDose(dose.medicationId, dose.time)} style={styles.takeButton}>
                  <Text style={styles.takeButtonText}>Tomei</Text>
                </Pressable>
              )}
            </View>
          ))}
        </Card>
      ) : null}
      */}

      <View style={styles.suggestionCard}>
        <View style={styles.suggestionHeader}>
          <Icon name="breath" size={16} color={c.greenText} />
          <Text style={styles.suggestionTitle}>Sugestão para agora</Text>
        </View>
        <Text style={styles.suggestionBody}>{suggestion.text}</Text>
        {suggestion.tool ? (
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              router.push({
                pathname: '/practice',
                params: { tool: suggestion.tool!, ...(suggestion.minutes ? { minutes: String(suggestion.minutes) } : {}) },
              })
            }
            style={styles.suggestionButton}>
            <Text style={styles.suggestionButtonText}>Começar {TOOL_NAMES[suggestion.tool].toLowerCase()}</Text>
          </Pressable>
        ) : (
          <Pressable accessibilityRole="button" onPress={() => router.push('/check-in')} style={styles.suggestionButton}>
            <Text style={styles.suggestionButtonText}>Fazer check-in</Text>
          </Pressable>
        )}
      </View>

      <CrisisQuickLog />
    </Screen>
  );
}

const useStyles = makeStyles((c) => ({
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  greeting: {
    ...MenteType.heading,
    color: c.text,
  },
  date: {
    ...MenteType.small,
    color: c.textMuted,
  },
  statePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: MenteRadius.pill,
    backgroundColor: c.badgeBackground,
  },
  stateDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: c.badgeDot,
  },
  stateText: {
    ...MenteType.badge,
    letterSpacing: 0.6,
    color: c.accent,
  },
  summaryCard: {
    gap: 14,
  },
  metricRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metric: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderRadius: MenteRadius.chip,
    backgroundColor: c.background,
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 1,
  },
  metricValue: {
    ...MenteType.metric,
    color: c.text,
  },
  metricScale: {
    ...MenteType.link,
    fontFamily: MenteType.tiny.fontFamily,
    color: c.textMuted,
  },
  metricLabel: {
    ...MenteType.tiny,
    fontFamily: MenteType.label.fontFamily,
    color: c.textMuted,
  },
  metricBar: {
    width: 34,
    height: 4,
    borderRadius: 2,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 9,
  },
  chartColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  chartBar: {
    width: 20,
    borderRadius: 6,
  },
  chartLabel: {
    ...MenteType.tiny,
    color: c.textMuted,
  },
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    borderRadius: MenteRadius.button,
    backgroundColor: c.primary,
  },
  primaryButtonText: {
    ...MenteType.button,
    color: c.onPrimary,
  },
  pressed: {
    opacity: 0.75,
  },
  habitRow: {
    flexDirection: 'row',
    gap: 10,
  },
  habit: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    minHeight: MIN_TOUCH,
    paddingHorizontal: 10,
    paddingVertical: 11,
    borderRadius: MenteRadius.chip,
    backgroundColor: c.surface,
  },
  habitDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  habitValue: {
    ...MenteType.captionStrong,
    color: c.text,
  },
  habitLabel: {
    ...MenteType.tiny,
    color: c.textMuted,
  },
  dosesCard: {
    gap: 10,
  },
  doseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  doseTime: {
    ...MenteType.captionStrong,
    width: 44,
    color: c.accent,
  },
  taken: {
    ...MenteType.smallStrong,
    color: c.greenText,
  },
  takeButton: {
    minHeight: MIN_TOUCH,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: MenteRadius.pill,
    backgroundColor: c.primary,
  },
  takeButtonText: {
    ...MenteType.captionStrong,
    color: c.onPrimary,
  },
  suggestionCard: {
    gap: 8,
    padding: 16,
    borderRadius: MenteRadius.card,
    backgroundColor: c.greenSurface,
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  suggestionTitle: {
    ...MenteType.smallStrong,
    color: c.greenText,
  },
  suggestionBody: {
    ...MenteType.caption,
    lineHeight: 19,
    color: c.greenText,
  },
  suggestionButton: {
    alignSelf: 'flex-start',
    minHeight: MIN_TOUCH,
    justifyContent: 'center',
  },
  suggestionButtonText: {
    ...MenteType.captionStrong,
    color: c.greenText,
    textDecorationLine: 'underline',
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    minHeight: 52,
    borderRadius: MenteRadius.button,
    borderWidth: 1,
    borderColor: c.dangerBorder,
    backgroundColor: c.dangerSurface,
  },
  helpButtonText: {
    ...MenteType.body,
    fontFamily: MenteType.captionStrong.fontFamily,
    color: c.dangerText,
  },
}));
