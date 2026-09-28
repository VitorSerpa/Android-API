import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { LineChart } from '@/components/mente/line-chart';
import { Screen } from '@/components/mente/screen';
import { Card, SectionHeader, Spacer, TopBar } from '@/components/mente/ui';
import { MenteColors, MenteRadius, MenteType } from '@/constants/mente-theme';

const PERIODS = ['Semana', 'Mês'] as const;

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'] as const;
const WEEKDAY_INITIALS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'] as const;

/** Normalised from the point positions in the Figma line chart. */
const MOOD = [0.295, 0.43, 0.218, 0.564, 0.488, 0.699, 0.738];
const ANXIETY = [0.635, 0.55, 0.6, 0.42, 0.45, 0.2, 0.029];

const AVERAGES = [
  { label: 'Média semanal', value: '4,1 / 5', delta: '+12%' },
  { label: 'Média mensal', value: '3,7 / 5', delta: '+4%' },
] as const;

const INDICATORS = [
  { label: 'Humor', percent: 85, color: MenteColors.mood },
  { label: 'Sono', percent: 60, color: MenteColors.primary },
  { label: 'Energia', percent: 90, color: MenteColors.energy },
  { label: 'Calma', percent: 55, color: MenteColors.accent },
  { label: 'Rotina', percent: 75, color: MenteColors.anxiety },
] as const;

const INSIGHTS = [
  'Nas últimas 4 semanas, seu humor médio aumentou 12%.',
  'Dias com exercício apresentam ansiedade 27% menor.',
] as const;

/** October 2025 starts on a Wednesday, so the grid opens with two blanks. */
const CALENDAR_DAYS = [
  ...Array.from({ length: 2 }, () => null),
  ...Array.from({ length: 30 }, (_, index) => index + 1),
];

/** Per-day mood tint; `null` leaves the cell untinted. */
const DAY_TINTS: Record<number, string> = {
  3: MenteColors.mood,
  5: MenteColors.anxiety,
  8: MenteColors.mood,
  11: MenteColors.energy,
  14: MenteColors.mood,
  16: MenteColors.anxiety,
  19: MenteColors.energy,
  21: MenteColors.mood,
  23: MenteColors.mood,
  24: MenteColors.primary,
  27: MenteColors.energy,
  29: MenteColors.mood,
};

const RADAR_SIZE = 96;

function Radar() {
  const center = RADAR_SIZE / 2;

  return (
    <View style={styles.radar}>
      {[1, 0.66, 0.33].map((ratio) => {
        const size = RADAR_SIZE * ratio;
        return (
          <View
            key={ratio}
            style={[
              styles.radarRing,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                left: center - size / 2,
                top: center - size / 2,
              },
            ]}
          />
        );
      })}

      {INDICATORS.map((indicator, index) => {
        // Start at 12 o'clock and step a fifth of a turn per indicator.
        const angle = (index / INDICATORS.length) * 2 * Math.PI - Math.PI / 2;
        const radius = (indicator.percent / 100) * (RADAR_SIZE / 2 - 4);

        return (
          <View
            key={indicator.label}
            style={[
              styles.radarDot,
              {
                left: center + Math.cos(angle) * radius - 4,
                top: center + Math.sin(angle) * radius - 4,
                backgroundColor: indicator.color,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

export default function HistoryScreen() {
  const [period, setPeriod] = useState<string>(PERIODS[0]);

  return (
    <Screen>
      <TopBar title="Histórico" />

      <View style={styles.periodToggle}>
        {PERIODS.map((name) => {
          const selected = period === name;
          return (
            <Pressable
              key={name}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setPeriod(name)}
              style={[styles.periodOption, selected && styles.periodOptionSelected]}>
              <Text style={[styles.periodText, selected && styles.periodTextSelected]}>{name}</Text>
            </Pressable>
          );
        })}
      </View>

      <Card style={styles.card}>
        <View style={styles.chartHeader}>
          <Text style={styles.cardTitle}>Evolução</Text>
          <Spacer />
          <View style={styles.legend}>
            <View style={[styles.legendDot, { backgroundColor: MenteColors.mood }]} />
            <Text style={styles.legendText}>Humor</Text>
          </View>
          <View style={styles.legend}>
            <View style={[styles.legendDot, { backgroundColor: MenteColors.anxiety }]} />
            <Text style={styles.legendText}>Ansiedade</Text>
          </View>
        </View>

        <LineChart
          width={306}
          height={76}
          series={[
            { values: ANXIETY, color: MenteColors.anxiety },
            { values: MOOD, color: MenteColors.mood, dots: true },
          ]}
        />

        <View style={styles.weekdayRow}>
          {WEEKDAYS.map((day) => (
            <Text key={day} style={styles.weekday}>
              {day}
            </Text>
          ))}
        </View>
      </Card>

      <View style={styles.averageRow}>
        {AVERAGES.map((average) => (
          <View key={average.label} style={styles.averageCard}>
            <Text style={styles.averageLabel}>{average.label}</Text>
            <View style={styles.averageValueRow}>
              <Text style={styles.averageValue}>{average.value}</Text>
              <View style={styles.deltaPill}>
                <Text style={styles.deltaText}>{average.delta}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      <Card style={styles.card}>
        <SectionHeader title="Outubro" />
        <Text style={styles.calendarCaption}>Humor por dia</Text>

        <View style={styles.calendarRow}>
          {WEEKDAY_INITIALS.map((initial, index) => (
            <Text key={`${initial}-${index}`} style={styles.calendarHeading}>
              {initial}
            </Text>
          ))}
        </View>

        <View style={styles.calendarGrid}>
          {CALENDAR_DAYS.map((day, index) => (
            <View
              key={day ?? `blank-${index}`}
              style={[
                styles.calendarDay,
                day !== null && DAY_TINTS[day] ? { backgroundColor: `${DAY_TINTS[day]}55` } : null,
              ]}>
              <Text style={styles.calendarDayText}>{day ?? ''}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Indicadores de bem-estar</Text>

        <View style={styles.radarRow}>
          <Radar />
          <View style={styles.indicatorList}>
            {INDICATORS.map((indicator) => (
              <View key={indicator.label} style={styles.indicator}>
                <View style={[styles.legendDot, { backgroundColor: indicator.color }]} />
                <Text style={styles.indicatorLabel}>{indicator.label}</Text>
                <View style={styles.indicatorTrack}>
                  <View
                    style={[
                      styles.indicatorFill,
                      { width: `${indicator.percent}%`, backgroundColor: indicator.color },
                    ]}
                  />
                </View>
                <Text style={styles.indicatorPercent}>{indicator.percent}%</Text>
              </View>
            ))}
          </View>
        </View>
      </Card>

      <View style={styles.insights}>
        {INSIGHTS.map((insight) => (
          <View key={insight} style={styles.insight}>
            <View style={styles.insightDot} />
            <Text style={styles.insightText}>{insight}</Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 12,
  },
  cardTitle: {
    ...MenteType.sectionTitle,
    color: MenteColors.text,
  },
  periodToggle: {
    flexDirection: 'row',
    gap: 8,
    padding: 4,
    borderRadius: MenteRadius.row,
    backgroundColor: MenteColors.surface,
  },
  periodOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 12,
  },
  periodOptionSelected: {
    backgroundColor: MenteColors.primary,
  },
  periodText: {
    ...MenteType.label,
    color: MenteColors.textMuted,
  },
  periodTextSelected: {
    ...MenteType.captionStrong,
    color: MenteColors.onPrimary,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  legendText: {
    ...MenteType.tiny,
    color: MenteColors.textMuted,
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weekday: {
    ...MenteType.micro,
    color: MenteColors.textMuted,
  },
  averageRow: {
    flexDirection: 'row',
    gap: 10,
  },
  averageCard: {
    flex: 1,
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: MenteRadius.row,
    backgroundColor: MenteColors.surface,
  },
  averageLabel: {
    ...MenteType.tiny,
    color: MenteColors.textMuted,
  },
  averageValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  averageValue: {
    ...MenteType.metric,
    fontSize: 17,
    color: MenteColors.text,
  },
  deltaPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: MenteRadius.pill,
    backgroundColor: MenteColors.greenSurface,
  },
  deltaText: {
    ...MenteType.tinyStrong,
    color: MenteColors.greenText,
  },
  calendarCaption: {
    ...MenteType.tiny,
    marginTop: -8,
    color: MenteColors.textMuted,
  },
  calendarRow: {
    flexDirection: 'row',
  },
  calendarHeading: {
    ...MenteType.micro,
    flex: 1,
    textAlign: 'center',
    color: MenteColors.textMuted,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 4,
  },
  calendarDay: {
    // Not `100 / 7`: the repeating decimal rounds past 100% and wraps a day early.
    width: '14.28%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 3,
    borderRadius: 8,
  },
  calendarDayText: {
    ...MenteType.tiny,
    color: MenteColors.text,
  },
  radarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  radar: {
    width: RADAR_SIZE,
    height: RADAR_SIZE,
  },
  radarRing: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: MenteColors.border,
  },
  radarDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  indicatorList: {
    flex: 1,
    gap: 6,
  },
  indicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  indicatorLabel: {
    ...MenteType.tiny,
    width: 46,
    color: MenteColors.text,
  },
  indicatorTrack: {
    flex: 1,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: MenteColors.background,
  },
  indicatorFill: {
    height: 5,
    borderRadius: 2.5,
  },
  indicatorPercent: {
    ...MenteType.tiny,
    width: 30,
    textAlign: 'right',
    color: MenteColors.textMuted,
  },
  insights: {
    gap: 8,
    paddingHorizontal: 4,
  },
  insight: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  insightDot: {
    width: 6,
    height: 6,
    marginTop: 6,
    borderRadius: 3,
    backgroundColor: MenteColors.primary,
  },
  insightText: {
    ...MenteType.small,
    flex: 1,
    color: MenteColors.textMuted,
  },
});
