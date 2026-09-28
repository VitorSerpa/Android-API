import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/auth';
import { Icon } from '@/components/mente/icon';
import { Screen } from '@/components/mente/screen';
import { Card, SectionHeader, Spacer } from '@/components/mente/ui';
import { MenteColors, MenteRadius, MenteType } from '@/constants/mente-theme';
import { moodScore, moodState, suggestionFor, todayCheckIn } from '@/data/insights';
import type { ToolId } from '@/data/types';
import { useUserData } from '@/data/user-data-context';
import { WEEKDAY_INITIALS, formatLongDate, fromDayKey, lastDays } from '@/lib/dates';

/** Tallest bar in the 7-day chart, in points — a 5/5 mood. */
const BAR_MAX = 52;
const BAR_EMPTY = 4;
const WATER_GOAL = 8;

const SHORTCUTS: readonly { icon: 'breath' | 'moon'; title: string; duration: string; tool: ToolId }[] = [
  { icon: 'breath', title: 'Respiração', duration: '2 min', tool: 'breathing' },
  { icon: 'moon', title: 'Meditação', duration: '5 min', tool: 'meditation' },
];

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { data, actions } = useUserData();

  const today = todayCheckIn(data);
  const firstName = user?.name.split(' ')[0] ?? '';
  const water = data.water[lastDays(1)[0]] ?? 0;

  const metrics = [
    { label: 'Humor', value: today ? String(moodScore(today)) : '–', scale: '/5', color: MenteColors.mood },
    { label: 'Ansiedade', value: today ? String(today.anxiety) : '–', scale: '/10', color: MenteColors.anxiety },
    { label: 'Energia', value: today ? String(today.energy) : '–', scale: '/5', color: MenteColors.energy },
  ];

  const week = lastDays(7).map((day, index) => {
    const checkIn = data.checkIns[day];
    return {
      day,
      initial: WEEKDAY_INITIALS[fromDayKey(day).getDay()],
      height: checkIn ? (moodScore(checkIn) / 5) * BAR_MAX : BAR_EMPTY,
      today: index === 6,
    };
  });

  const habits = [
    { key: 'sleep', value: today?.sleep ?? '–', label: 'Sono', color: MenteColors.energy },
    {
      key: 'activity',
      value: today?.activity.trim() ? today.activity.split('·')[0].trim() : '–',
      label: 'Atividade',
      color: MenteColors.mood,
    },
  ];

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
          <Text style={styles.stateText}>{moodState(today)}</Text>
        </View>
      </View>

      <Card style={styles.summaryCard}>
        <SectionHeader
          title="Resumo de hoje"
          action="Ver histórico"
          onPressAction={() => router.navigate('/history')}
        />

        <View style={styles.metricRow}>
          {metrics.map((metric) => (
            <View key={metric.label} style={styles.metric}>
              <View style={styles.metricValueRow}>
                <Text style={styles.metricValue}>{metric.value}</Text>
                <Text style={styles.metricScale}>{metric.scale}</Text>
              </View>
              <Text style={styles.metricLabel}>{metric.label}</Text>
              <View style={[styles.metricBar, { backgroundColor: metric.color }]} />
            </View>
          ))}
        </View>

        <View style={styles.chart} accessibilityLabel="Humor dos últimos 7 dias">
          {week.map((entry) => (
            <View key={entry.day} style={styles.chartColumn}>
              <View
                style={[
                  styles.chartBar,
                  {
                    height: entry.height,
                    backgroundColor: entry.today ? MenteColors.barToday : MenteColors.barIdle,
                  },
                ]}
              />
              <Text style={styles.chartLabel}>{entry.initial}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/check-in')}
        style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
        <Text style={styles.primaryButtonText}>
          {today ? 'Atualizar check-in de hoje' : 'Fazer check-in'}
        </Text>
      </Pressable>

      <View style={styles.habitRow}>
        {habits.map((habit) => (
          <Pressable
            key={habit.key}
            accessibilityRole="button"
            onPress={() => router.push('/check-in')}
            style={({ pressed }) => [styles.habit, pressed && styles.pressed]}>
            <View style={[styles.habitDot, { backgroundColor: habit.color }]} />
            <Text style={styles.habitValue} numberOfLines={1}>
              {habit.value}
            </Text>
            <Text style={styles.habitLabel}>{habit.label}</Text>
          </Pressable>
        ))}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Água: ${water} de ${WATER_GOAL} copos. Toque para adicionar um copo, segure para remover.`}
          onPress={() => actions.addWater(1)}
          onLongPress={() => actions.addWater(-1)}
          style={({ pressed }) => [styles.habit, pressed && styles.pressed]}>
          <View style={[styles.habitDot, { backgroundColor: MenteColors.primary }]} />
          <Text style={styles.habitValue}>
            {water}/{WATER_GOAL} copos
          </Text>
          <Text style={styles.habitLabel}>Água · toque +1</Text>
        </Pressable>
      </View>

      <View style={styles.suggestionCard}>
        <View style={styles.suggestionHeader}>
          <Icon name="breath" size={16} color={MenteColors.greenText} />
          <Text style={styles.suggestionTitle}>Sugestão para agora</Text>
        </View>
        <Text style={styles.suggestionBody}>{suggestionFor(today)}</Text>
      </View>

      <View style={styles.shortcutRow}>
        {SHORTCUTS.map((shortcut) => (
          <Pressable
            key={shortcut.title}
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/practice', params: { tool: shortcut.tool } })}
            style={({ pressed }) => [styles.shortcut, pressed && styles.pressed]}>
            <Icon name={shortcut.icon} size={20} color={MenteColors.accent} />
            <View>
              <Text style={styles.shortcutTitle}>{shortcut.title}</Text>
              <Text style={styles.shortcutDuration}>{shortcut.duration}</Text>
            </View>
          </Pressable>
        ))}
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/emergency')}
        style={({ pressed }) => [styles.helpButton, pressed && styles.pressed]}>
        <Icon name="alert" size={17} color={MenteColors.dangerText} cutColor={MenteColors.dangerSurface} />
        <Text style={styles.helpButtonText}>Preciso de ajuda agora</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  greeting: {
    ...MenteType.heading,
    color: MenteColors.text,
  },
  date: {
    ...MenteType.small,
    color: MenteColors.textMuted,
  },
  statePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: MenteRadius.pill,
    backgroundColor: MenteColors.badgeBackground,
  },
  stateDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: MenteColors.badgeDot,
  },
  stateText: {
    ...MenteType.badge,
    letterSpacing: 0.6,
    color: MenteColors.accent,
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
    backgroundColor: MenteColors.background,
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 1,
  },
  metricValue: {
    ...MenteType.metric,
    color: MenteColors.text,
  },
  metricScale: {
    ...MenteType.link,
    fontFamily: MenteType.tiny.fontFamily,
    color: MenteColors.textMuted,
  },
  metricLabel: {
    ...MenteType.tiny,
    fontFamily: MenteType.label.fontFamily,
    color: MenteColors.textMuted,
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
    ...MenteType.micro,
    color: MenteColors.textMuted,
  },
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: MenteRadius.button,
    backgroundColor: MenteColors.primary,
  },
  primaryButtonText: {
    ...MenteType.button,
    color: MenteColors.onPrimary,
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
    paddingHorizontal: 10,
    paddingVertical: 11,
    borderRadius: MenteRadius.chip,
    backgroundColor: MenteColors.surface,
  },
  habitDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  habitValue: {
    ...MenteType.captionStrong,
    color: MenteColors.text,
  },
  habitLabel: {
    ...MenteType.tiny,
    color: MenteColors.textMuted,
  },
  suggestionCard: {
    gap: 8,
    padding: 16,
    borderRadius: MenteRadius.card,
    backgroundColor: MenteColors.greenSurface,
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  suggestionTitle: {
    ...MenteType.smallStrong,
    color: MenteColors.greenText,
  },
  suggestionBody: {
    ...MenteType.caption,
    lineHeight: 19,
    color: MenteColors.greenText,
  },
  shortcutRow: {
    flexDirection: 'row',
    gap: 10,
  },
  shortcut: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 13,
    borderRadius: MenteRadius.button,
    backgroundColor: MenteColors.surface,
  },
  shortcutTitle: {
    ...MenteType.captionStrong,
    color: MenteColors.text,
  },
  shortcutDuration: {
    ...MenteType.tiny,
    color: MenteColors.textMuted,
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    paddingVertical: 14,
    borderRadius: MenteRadius.button,
    borderWidth: 1,
    borderColor: MenteColors.dangerBorder,
    backgroundColor: MenteColors.dangerSurface,
  },
  helpButtonText: {
    ...MenteType.body,
    fontFamily: MenteType.captionStrong.fontFamily,
    color: MenteColors.dangerText,
  },
});
