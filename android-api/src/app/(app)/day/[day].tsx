import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { DayTimeline } from '@/components/mente/day-timeline';
import { StackScreen } from '@/components/mente/stack-screen';
import { Button, Card, Pill, Spacer, TopBar } from '@/components/mente/ui';
import { MenteRadius, MenteType } from '@/constants/mente-theme';
import {
  checkInsOn,
  dayActivities,
  dayAverages,
  // dosesOn, — medicamentos desativados
  formatDecimal,
  incentiveFor,
} from '@/data/insights';
import { MOODS } from '@/data/types';
import { useUserData } from '@/data/user-data-context';
import { formatDayMonth, formatTime, fromDayKey, toDayKey, WEEKDAYS_LONG } from '@/lib/dates';
import { makeStyles } from '@/theme';

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export default function DayScreen() {
  const styles = useStyles();
  const router = useRouter();
  const params = useLocalSearchParams<{ day?: string; saved?: string }>();
  const day = params.day && DAY_PATTERN.test(params.day) ? params.day : toDayKey();
  const isToday = day === toDayKey();
  const { data } = useUserData();
  const [seed] = useState(() => Date.now());

  const date = fromDayKey(day);
  const averages = dayAverages(data, day);
  const checkIns = checkInsOn(data, day);
  const health = data.health[day];
  const activities = dayActivities(data, day);
  // Medicamentos desativados: const doses = dosesOn(data, day).filter((dose) => dose.takenAt);
  const water = data.water[day] ?? 0;
  const diary = data.diary.filter((entry) => entry.day === day);
  const crises = data.crises.filter((item) => toDayKey(new Date(item.at)) === day);
  const practices = data.practices.filter((item) => toDayKey(new Date(item.at)) === day);

  const hasAnything = checkIns.length || health || water || diary.length || crises.length || practices.length;

  return (
    <StackScreen>
      <TopBar title={isToday ? 'Resumo do dia' : formatDayMonth(date)} />
      <Text style={styles.date}>
        {WEEKDAYS_LONG[date.getDay()]}, {formatDayMonth(date)}
      </Text>

      {params.saved ? (
        <View style={styles.savedBanner} accessibilityLiveRegion="polite">
          <Text style={styles.savedText}>✓ Check-in salvo às {checkIns.at(-1) ? formatTime(new Date(checkIns.at(-1)!.at)) : ''}</Text>
        </View>
      ) : null}

      <Card style={styles.card}>
        <Text style={styles.eyebrow}>HUMOR MÉDIO DO DIA</Text>
        <View style={styles.bigRow}>
          <Text style={styles.big}>{averages.mood === null ? '–' : formatDecimal(averages.mood)}</Text>
          <Text style={styles.scale}>/ 5</Text>
          <Spacer />
          {averages.mood !== null ? <Pill label={MOODS[Math.round(averages.mood) - 1]} tone="positive" /> : null}
        </View>
        <Text style={styles.detail}>
          {averages.count} {averages.count === 1 ? 'check-in' : 'check-ins'}
          {averages.anxiety !== null ? ` · ansiedade média ${formatDecimal(averages.anxiety)}/10` : ''}
          {averages.energy !== null ? ` · energia média ${formatDecimal(averages.energy)}/5` : ''}
        </Text>
        <View style={styles.incentive}>
          <Text style={styles.incentiveText}>{incentiveFor(data, averages.mood, seed)}</Text>
        </View>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Atividades feitas</Text>
        {activities.length ? (
          <View style={styles.wrap}>
            {activities.map((activity) => (
              <Pill key={activity} label={activity} />
            ))}
          </View>
        ) : (
          <Text style={styles.detail}>Nenhuma atividade registrada neste dia.</Text>
        )}
      </Card>

      {/* RF-62 / US-16: every event of the day in time order; tap one for the full record. */}
      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Linha do tempo</Text>
        <DayTimeline day={day} />
      </Card>

      {health || water ? (
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Saúde</Text>
          {health ? (
            <>
              <Text style={styles.detail}>
                Sono: {health.sleepHours === null ? '–' : `${formatDecimal(health.sleepHours)} h`}
                {health.awakenings !== null ? ` · ${health.awakenings} despertares` : ''}
                {health.sleepQuality ? ` · ${health.sleepQuality.toLowerCase()}` : ''}
              </Text>
              {health.symptoms.length ? <Text style={styles.detail}>Sintomas: {health.symptoms.join(', ')}</Text> : null}
              {health.activityMinutes !== null ? <Text style={styles.detail}>Atividade física: {health.activityMinutes} min</Text> : null}
              {health.weightKg !== null ? <Text style={styles.detail}>Peso: {formatDecimal(health.weightKg)} kg</Text> : null}
            </>
          ) : null}
          {water ? <Text style={styles.detail}>Água: {water} {water === 1 ? 'copo' : 'copos'}</Text> : null}
          {/* Medicamentos desativados.
          {doses.length ? (
            <Text style={styles.detail}>
              Medicamentos: {doses.map((dose) => `${dose.name} (${formatTime(new Date(dose.takenAt!))})`).join(', ')}
            </Text>
          ) : null}
          */}
        </Card>
      ) : null}

      {!hasAnything ? <Text style={styles.empty}>Nenhum registro neste dia.</Text> : null}

      {isToday ? <Button label="Fazer outro check-in" variant="secondary" onPress={() => router.push('/check-in')} /> : null}
      <Button label="Ir para o início" onPress={() => router.navigate('/home')} />
    </StackScreen>
  );
}

const useStyles = makeStyles((c) => ({
  date: {
    ...MenteType.subtitle,
    color: c.textMuted,
  },
  savedBanner: {
    padding: 12,
    borderRadius: MenteRadius.row,
    backgroundColor: c.greenSurface,
  },
  savedText: {
    ...MenteType.captionStrong,
    color: c.greenText,
  },
  card: {
    gap: 10,
  },
  eyebrow: {
    ...MenteType.sectionEyebrow,
    color: c.textMuted,
  },
  bigRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  big: {
    ...MenteType.title,
    fontSize: 40,
    lineHeight: 46,
    color: c.text,
  },
  scale: {
    ...MenteType.subtitle,
    color: c.textMuted,
  },
  cardTitle: {
    ...MenteType.sectionTitle,
    color: c.text,
  },
  detail: {
    ...MenteType.small,
    color: c.textMuted,
  },
  incentive: {
    padding: 12,
    borderRadius: MenteRadius.row,
    backgroundColor: c.purpleSurface,
  },
  incentiveText: {
    ...MenteType.body,
    color: c.purpleText,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  entry: {
    flexDirection: 'row',
    gap: 12,
    minHeight: 44,
    paddingVertical: 4,
  },
  time: {
    ...MenteType.captionStrong,
    width: 44,
    color: c.accent,
  },
  entryText: {
    flex: 1,
    gap: 2,
  },
  entryTitle: {
    ...MenteType.caption,
    color: c.text,
  },
  empty: {
    ...MenteType.body,
    textAlign: 'center',
    color: c.textMuted,
  },
}));
