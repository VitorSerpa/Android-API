import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/mente/icon';
import { LineChart } from '@/components/mente/line-chart';
import { Screen } from '@/components/mente/screen';
import { Card, Spacer, TopBar } from '@/components/mente/ui';
import { MenteColors, MenteRadius, MenteType } from '@/constants/mente-theme';
import { checkInsFor, historyInsights, moodTrend, wellbeingIndicators } from '@/data/insights';
import type { CheckIn } from '@/data/types';
import { useUserData } from '@/data/user-data-context';
import { MONTHS, WEEKDAYS_SHORT, fromDayKey, lastDays, toDayKey } from '@/lib/dates';

const PERIODS = [
  { label: 'Semana', days: 7 },
  { label: 'Mês', days: 30 },
] as const;

/** Monday-first, as the prototype's calendar header reads. */
const CALENDAR_HEADINGS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'] as const;

const CHART_HEIGHT = 76;
const RADAR_SIZE = 96;

type Indicator = { label: string; percent: number | null; color: string };

/** Calendar tint per mood: good days green, neutral blue, hard days amber. */
function tintFor(checkIn: CheckIn | undefined) {
  if (!checkIn) return null;
  if (checkIn.mood >= 3) return MenteColors.mood;
  if (checkIn.mood === 2) return MenteColors.primary;
  return MenteColors.anxiety;
}

const formatScore = (value: number | null) =>
  value === null ? '–' : `${value.toFixed(1).replace('.', ',')} / 5`;

const formatDelta = (delta: number | null) =>
  delta === null ? null : `${delta > 0 ? '+' : ''}${delta}%`;

function Radar({ indicators }: { indicators: readonly Indicator[] }) {
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

      {indicators.map((indicator, index) => {
        if (indicator.percent === null) return null;
        // Start at 12 o'clock and step a fifth of a turn per indicator.
        const angle = (index / indicators.length) * 2 * Math.PI - Math.PI / 2;
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
  const { data } = useUserData();
  const [periodIndex, setPeriodIndex] = useState(0);
  const [chartWidth, setChartWidth] = useState(0);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const period = PERIODS[periodIndex];
  const days = lastDays(period.days);
  const checkIns = checkInsFor(data, days);
  const hasData = checkIns.some(Boolean);

  // Week: every weekday. Month: roughly one label per week.
  const labels =
    period.days === 7
      ? days.map((day) => WEEKDAYS_SHORT[fromDayKey(day).getDay()])
      : days.filter((_, index) => index % 7 === 0 || index === days.length - 1).map((day) => String(fromDayKey(day).getDate()));

  const weekly = moodTrend(data, 7);
  const monthly = moodTrend(data, 30);
  const averages = [
    { label: 'Média semanal', value: formatScore(weekly.current), delta: formatDelta(weekly.delta) },
    { label: 'Média mensal', value: formatScore(monthly.current), delta: formatDelta(monthly.delta) },
  ];

  const wellbeing = wellbeingIndicators(data);
  const indicators: Indicator[] = [
    { label: 'Humor', percent: wellbeing.mood, color: MenteColors.mood },
    { label: 'Sono', percent: wellbeing.sleep, color: MenteColors.primary },
    { label: 'Energia', percent: wellbeing.energy, color: MenteColors.energy },
    { label: 'Calma', percent: wellbeing.calm, color: MenteColors.accent },
    { label: 'Rotina', percent: wellbeing.routine, color: MenteColors.anxiety },
  ];

  const insights = historyInsights(data);

  const now = new Date();
  const isCurrentMonth = month.getFullYear() === now.getFullYear() && month.getMonth() === now.getMonth();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const leadingBlanks = (month.getDay() + 6) % 7;
  const calendar = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
  const today = toDayKey();
  const shiftMonth = (amount: number) =>
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));

  return (
    <Screen>
      <TopBar title="Histórico" />

      <View style={styles.periodToggle}>
        {PERIODS.map((option, index) => {
          const selected = periodIndex === index;
          return (
            <Pressable
              key={option.label}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setPeriodIndex(index)}
              style={[styles.periodOption, selected && styles.periodOptionSelected]}>
              <Text style={[styles.periodText, selected && styles.periodTextSelected]}>
                {option.label}
              </Text>
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

        <View onLayout={(event) => setChartWidth(event.nativeEvent.layout.width)}>
          {chartWidth > 0 ? (
            <LineChart
              width={chartWidth}
              height={CHART_HEIGHT}
              series={[
                { values: checkIns.map((item) => (item ? item.anxiety / 10 : null)), color: MenteColors.anxiety },
                {
                  values: checkIns.map((item) => (item ? item.mood / 4 : null)),
                  color: MenteColors.mood,
                  dots: true,
                },
              ]}
            />
          ) : (
            <View style={{ height: CHART_HEIGHT }} />
          )}
          {!hasData ? (
            <View style={styles.chartEmpty}>
              <Text style={styles.chartEmptyText}>Sem check-ins neste período</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.weekdayRow}>
          {labels.map((label, index) => (
            <Text key={`${label}-${index}`} style={styles.weekday}>
              {label}
            </Text>
          ))}
        </View>
      </Card>

      <View style={styles.averageRow}>
        {averages.map((average) => (
          <View key={average.label} style={styles.averageCard}>
            <Text style={styles.averageLabel}>{average.label}</Text>
            <View style={styles.averageValueRow}>
              <Text style={styles.averageValue}>{average.value}</Text>
              {average.delta ? (
                <View style={styles.deltaPill}>
                  <Text style={styles.deltaText}>{average.delta}</Text>
                </View>
              ) : null}
            </View>
          </View>
        ))}
      </View>

      <Card style={styles.card}>
        <View style={styles.monthHeader}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mês anterior"
            hitSlop={10}
            onPress={() => shiftMonth(-1)}>
            <Icon name="chevronLeft" size={13} color={MenteColors.accent} />
          </Pressable>
          <Text style={styles.cardTitle}>
            {MONTHS[month.getMonth()]}
            {month.getFullYear() !== now.getFullYear() ? ` ${month.getFullYear()}` : ''}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Próximo mês"
            accessibilityState={{ disabled: isCurrentMonth }}
            disabled={isCurrentMonth}
            hitSlop={10}
            onPress={() => shiftMonth(1)}
            style={isCurrentMonth && styles.disabled}>
            <Icon name="chevronRight" size={13} color={MenteColors.accent} />
          </Pressable>
        </View>
        <Text style={styles.calendarCaption}>Humor por dia</Text>

        <View style={styles.calendarRow}>
          {CALENDAR_HEADINGS.map((initial, index) => (
            <Text key={`${initial}-${index}`} style={styles.calendarHeading}>
              {initial}
            </Text>
          ))}
        </View>

        <View style={styles.calendarGrid}>
          {calendar.map((day, index) => {
            const key = day === null ? null : toDayKey(new Date(month.getFullYear(), month.getMonth(), day));
            const tint = key ? tintFor(data.checkIns[key]) : null;
            return (
              <View
                key={key ?? `blank-${index}`}
                style={[
                  styles.calendarDay,
                  tint ? { backgroundColor: `${tint}55` } : null,
                  key === today && styles.calendarToday,
                ]}>
                <Text style={styles.calendarDayText}>{day ?? ''}</Text>
              </View>
            );
          })}
        </View>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Indicadores de bem-estar</Text>

        <View style={styles.radarRow}>
          <Radar indicators={indicators} />
          <View style={styles.indicatorList}>
            {indicators.map((indicator) => (
              <View key={indicator.label} style={styles.indicator}>
                <View style={[styles.legendDot, { backgroundColor: indicator.color }]} />
                <Text style={styles.indicatorLabel}>{indicator.label}</Text>
                <View style={styles.indicatorTrack}>
                  <View
                    style={[
                      styles.indicatorFill,
                      { width: `${indicator.percent ?? 0}%`, backgroundColor: indicator.color },
                    ]}
                  />
                </View>
                <Text style={styles.indicatorPercent}>
                  {indicator.percent === null ? '–' : `${indicator.percent}%`}
                </Text>
              </View>
            ))}
          </View>
        </View>
        <Text style={styles.calendarCaption}>Últimos 30 dias</Text>
      </Card>

      <View style={styles.insights}>
        {(insights.length ? insights : ['Faça check-ins por alguns dias para ver seus padrões aqui.']).map(
          (insight) => (
            <View key={insight} style={styles.insight}>
              <View style={styles.insightDot} />
              <Text style={styles.insightText}>{insight}</Text>
            </View>
          ),
        )}
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
  chartEmpty: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartEmptyText: {
    ...MenteType.small,
    color: MenteColors.textMuted,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  disabled: {
    opacity: 0.3,
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
    marginTop: -6,
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
  calendarToday: {
    borderWidth: 1,
    borderColor: MenteColors.accent,
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
