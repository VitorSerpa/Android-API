import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Icon } from '@/components/mente/icon';
import { LineChart } from '@/components/mente/line-chart';
import { RadarChart } from '@/components/mente/radar-chart';
import { Screen } from '@/components/mente/screen';
import { Card, MIN_TOUCH, Spacer, TopBar } from '@/components/mente/ui';
import { MenteRadius, MenteType } from '@/constants/mente-theme';
import {
  activityCorrelations,
  dayAverages,
  dayMood,
  formatDecimal,
  MIN_CORRELATION_DAYS,
  moodTrend,
  otherInsights,
  wellbeingIndicators,
} from '@/data/insights';
import { MOODS } from '@/data/types';
import { useUserData } from '@/data/user-data-context';
import { MONTHS, WEEKDAYS_SHORT, fromDayKey, lastDays, toDayKey } from '@/lib/dates';
import { makeStyles, useColors } from '@/theme';

const PERIODS = [
  { label: '30 dias', days: 30 },
  { label: '7 dias', days: 7 },
] as const;

/** Monday-first, as pt-BR calendars read. */
const CALENDAR_HEADINGS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'] as const;

const CHART_HEIGHT = 96;

const formatScore = (value: number | null) => (value === null ? '–' : `${formatDecimal(value)} / 5`);
const formatDelta = (delta: number | null) => (delta === null ? null : `${delta > 0 ? '+' : ''}${delta}%`);

export default function HistoryScreen() {
  const styles = useStyles();
  const c = useColors();
  const router = useRouter();
  const { data } = useUserData();
  const [periodIndex, setPeriodIndex] = useState(0);
  const [chartWidth, setChartWidth] = useState(0);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // CA-01: exactly the last N days, one point per day; days without check-in are gaps (null).
  const period = PERIODS[periodIndex];
  const days = lastDays(period.days);
  const perDay = days.map((day) => dayAverages(data, day));
  const hasData = perDay.some((item) => item.count > 0);
  const labels =
    period.days === 7
      ? days.map((day) => WEEKDAYS_SHORT[fromDayKey(day).getDay()])
      : days.filter((_, index) => index % 7 === 0 || index === days.length - 1).map((day) => String(fromDayKey(day).getDate()));

  const weekly = moodTrend(data, 7);
  const monthly = moodTrend(data, 30);
  const averages = [
    { label: 'Média semanal', ...weekly, previousLabel: 'na semana anterior' },
    { label: 'Média mensal', ...monthly, previousLabel: 'nos 30 dias anteriores' },
  ];

  const wellbeing = wellbeingIndicators(data);
  const axes = [
    { label: 'Humor', percent: wellbeing.mood },
    { label: 'Sono', percent: wellbeing.sleep },
    { label: 'Ansiedade', percent: wellbeing.anxiety },
    { label: 'Estresse', percent: wellbeing.stress },
    { label: 'Atividade', percent: wellbeing.activity },
  ];

  const correlation = activityCorrelations(data);
  const extra = otherInsights(data);

  const now = new Date();
  const isCurrentMonth = month.getFullYear() === now.getFullYear() && month.getMonth() === now.getMonth();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const leadingBlanks = (month.getDay() + 6) % 7;
  const calendar = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
  const today = toDayKey();
  const shiftMonth = (amount: number) => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));

  return (
    <Screen>
      <TopBar title="Histórico" />

      <View style={styles.periodToggle} accessibilityRole="tablist">
        {PERIODS.map((option, index) => {
          const selected = periodIndex === index;
          return (
            <Pressable
              key={option.label}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => setPeriodIndex(index)}
              style={[styles.periodOption, selected && styles.periodOptionSelected]}>
              <Text style={[styles.periodText, selected && styles.periodTextSelected]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Card style={styles.card}>
        <View style={styles.chartHeader}>
          <Text style={styles.cardTitle}>Variação do humor</Text>
          <Spacer />
          <View style={styles.legend}>
            <View style={[styles.legendDot, { backgroundColor: c.mood }]} />
            <Text style={styles.legendText}>Humor</Text>
          </View>
          <View style={styles.legend}>
            <View style={[styles.legendDot, { backgroundColor: c.anxiety }]} />
            <Text style={styles.legendText}>Ansiedade</Text>
          </View>
        </View>

        <View
          onLayout={(event) => setChartWidth(event.nativeEvent.layout.width)}
          accessible
          accessibilityLabel={`Gráfico de linha dos últimos ${period.days} dias. ${perDay.filter((item) => item.count).length} dias com registro.`}>
          {chartWidth > 0 ? (
            <LineChart
              width={chartWidth}
              height={CHART_HEIGHT}
              series={[
                { values: perDay.map((item) => (item.anxiety === null ? null : item.anxiety / 10)), color: c.anxiety },
                { values: perDay.map((item) => (item.mood === null ? null : (item.mood - 1) / 4)), color: c.mood, dots: true },
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
        <Text style={styles.caption}>Dias sem registro aparecem como lacuna na linha.</Text>
      </Card>

      <View style={styles.averageRow}>
        {averages.map((average) => (
          <View key={average.label} style={styles.averageCard}>
            <Text style={styles.averageLabel}>{average.label}</Text>
            <View style={styles.averageValueRow}>
              <Text style={styles.averageValue}>{formatScore(average.current)}</Text>
              {formatDelta(average.delta) ? (
                // Mood: a drop is shown as a warning, not in the "good" green.
                <View style={[styles.deltaPill, average.delta! < 0 && styles.deltaPillDown]}>
                  <Text style={[styles.deltaText, average.delta! < 0 && styles.deltaTextDown]}>{formatDelta(average.delta)}</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.caption}>
              {average.previous === null ? `Sem dados ${average.previousLabel}` : `${formatScore(average.previous)} ${average.previousLabel}`}
            </Text>
          </View>
        ))}
      </View>

      <Card style={[styles.card, styles.calendarCard]}>
        <View style={styles.monthHeader}>
          <Pressable accessibilityRole="button" accessibilityLabel="Mês anterior" onPress={() => shiftMonth(-1)} style={styles.monthButton}>
            <Icon name="chevronLeft" size={13} color={c.accent} />
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
            onPress={() => shiftMonth(1)}
            style={[styles.monthButton, isCurrentMonth && styles.disabled]}>
            <Icon name="chevronRight" size={13} color={c.accent} />
          </Pressable>
        </View>
        <Text style={styles.caption}>Humor por dia · toque em um dia para ver os registros</Text>


        <View style={styles.calendarRow}>
          {CALENDAR_HEADINGS.map((initial, index) => (
            <Text key={`${initial}-${index}`} style={styles.calendarHeading}>
              {initial}
            </Text>
          ))}
        </View>

        <View style={styles.calendarGrid}>
          {calendar.map((day, index) => {
            if (day === null) return <View key={`blank-${index}`} style={styles.calendarCell} />;
            const key = toDayKey(new Date(month.getFullYear(), month.getMonth(), day));
            const mood = dayMood(data, key);
            const level = mood === null ? null : Math.round(mood) - 1;
            return (
              <View key={key} style={styles.calendarCell}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${day} de ${MONTHS[month.getMonth()]}: ${level === null ? 'sem registro' : MOODS[level]}`}
                  onPress={() => router.push({ pathname: '/day/[day]', params: { day: key } })}
                  style={[
                    styles.calendarDay,
                    level !== null && { backgroundColor: c.moodScale[level] },
                    key === today && styles.calendarToday,
                  ]}>
                  <Text style={[styles.calendarDayText, level !== null && styles.calendarDayTextFilled]}>{day}</Text>
                </Pressable>
              </View>
            );
          })}
        </View>

        {/* CA-04: every colour is explained, and each fill keeps ≥ 4.5:1 with its number. */}
        <View style={styles.scaleLegend}>
          {MOODS.map((label, index) => (
            <View key={label} style={styles.scaleItem}>
              <View style={[styles.scaleSwatch, { backgroundColor: c.moodScale[index] }]} />
              <Text style={styles.legendText}>{label}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Indicadores de bem-estar</Text>
        <RadarChart axes={axes} />
        <Text style={styles.caption}>
          Últimos 30 dias. Ansiedade e estresse: quanto maior, mais intensos. Estresse vem do teste rápido de estresse.
        </Text>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Atividades e humor</Text>
        {correlation.status === 'insufficient' ? (
          <Text style={styles.insightText}>
            Ainda não há correlações disponíveis. Com pelo menos {MIN_CORRELATION_DAYS} dias de check-in mostramos como suas
            atividades se relacionam com o humor ({correlation.days} de {MIN_CORRELATION_DAYS}).
          </Text>
        ) : (
          correlation.messages.map((message) => (
            <View key={message} style={styles.insight}>
              <View style={styles.insightDot} />
              <Text style={styles.insightText}>{message}</Text>
            </View>
          ))
        )}
        {extra.map((message) => (
          <View key={message} style={styles.insight}>
            <View style={styles.insightDot} />
            <Text style={styles.insightText}>{message}</Text>
          </View>
        ))}
      </Card>
    </Screen>
  );
}

const useStyles = makeStyles((c) => ({
  periodToggle: {
    flexDirection: 'row',
    padding: 4,
    gap: 4,
    borderRadius: MenteRadius.button,
    backgroundColor: c.surface,
  },
  periodOption: {
    flex: 1,
    minHeight: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: MenteRadius.chip,
  },
  periodOptionSelected: {
    backgroundColor: c.primary,
  },
  periodText: {
    ...MenteType.caption,
    color: c.textMuted,
  },
  periodTextSelected: {
    ...MenteType.captionStrong,
    color: c.onPrimary,
  },
  card: {
    gap: 12,
  },
  cardTitle: {
    ...MenteType.sectionTitle,
    color: c.text,
  },
  caption: {
    ...MenteType.small,
    color: c.textMuted,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    ...MenteType.tiny,
    color: c.textMuted,
  },
  chartEmpty: {
    ...({ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const),
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartEmptyText: {
    ...MenteType.caption,
    color: c.textMuted,
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weekday: {
    ...MenteType.tiny,
    color: c.textMuted,
  },
  averageRow: {
    flexDirection: 'row',
    gap: 11,
  },
  averageCard: {
    flex: 1,
    gap: 6,
    padding: 14,
    borderRadius: MenteRadius.card,
    backgroundColor: c.surface,
  },
  averageLabel: {
    ...MenteType.small,
    color: c.textMuted,
  },
  averageValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  averageValue: {
    ...MenteType.metric,
    fontSize: 18,
    color: c.text,
  },
  deltaPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: MenteRadius.pill,
    backgroundColor: c.greenSurface,
  },
  deltaText: {
    ...MenteType.tinyStrong,
    color: c.greenText,
  },
  deltaPillDown: {
    backgroundColor: c.dangerSurface,
  },
  deltaTextDown: {
    color: c.dangerText,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthButton: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.35,
  },
  calendarCard: {
    paddingHorizontal: 8,
  },
  calendarRow: {
    flexDirection: 'row',
  },
  calendarHeading: {
    ...MenteType.tiny,
    flex: 1,
    textAlign: 'center',
    color: c.textMuted,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarCell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    paddingVertical: 2,
  },
  // Full cell width up to 44 pt: 44 × 7 fits from ~370 dp wide screens.
  calendarDay: {
    width: '100%',
    maxWidth: MIN_TOUCH,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: MIN_TOUCH / 2,
  },
  calendarToday: {
    borderWidth: 2,
    borderColor: c.accent,
  },
  calendarDayText: {
    ...MenteType.caption,
    color: c.textMuted,
  },
  calendarDayTextFilled: {
    ...MenteType.captionStrong,
    color: c.onMoodScale,
  },
  scaleLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 12,
    rowGap: 6,
  },
  scaleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  scaleSwatch: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  insight: {
    flexDirection: 'row',
    gap: 10,
  },
  insightDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
    backgroundColor: c.accent,
  },
  insightText: {
    ...MenteType.body,
    flex: 1,
    color: c.text,
  },
}));
