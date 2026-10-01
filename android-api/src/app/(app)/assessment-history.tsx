import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { StackScreen } from '@/components/mente/stack-screen';
import { Button, Card, Spacer, TopBar } from '@/components/mente/ui';
import { MenteRadius, MenteType } from '@/constants/mente-theme';
import { ASSESSMENTS } from '@/data/assessments';
import type { AssessmentKind } from '@/data/types';
import { useUserData } from '@/data/user-data-context';
import { formatShortDate, formatTime } from '@/lib/dates';
import { makeStyles } from '@/theme';

const isKind = (value: unknown): value is AssessmentKind => typeof value === 'string' && value in ASSESSMENTS;

/** RF-48 / CA-04: every score with its date, the change from the previous one and a simple bar per result. */
export default function AssessmentHistoryScreen() {
  const styles = useStyles();
  const router = useRouter();
  const params = useLocalSearchParams<{ kind?: string }>();
  const definition = ASSESSMENTS[isKind(params.kind) ? params.kind : 'wellbeing'];
  const { data } = useUserData();
  const results = data.assessments.filter((item) => item.kind === definition.kind);
  const chronological = [...results].reverse();

  return (
    <StackScreen>
      <TopBar title="Histórico" />
      <Text style={styles.subtitle}>{definition.title}</Text>

      {chronological.length ? (
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Evolução</Text>
          <View style={styles.chart} accessible accessibilityLabel={`Pontuações: ${chronological.map((item) => item.score).join(', ')}`}>
            {chronological.slice(-12).map((item) => (
              <View key={item.id} style={styles.column}>
                <Text style={styles.barValue}>{item.score}</Text>
                <View style={[styles.bar, { height: 8 + (item.score / definition.maxScore) * 80 }]} />
                <Text style={styles.barLabel}>{formatShortDate(new Date(item.at))}</Text>
              </View>
            ))}
          </View>
        </Card>
      ) : (
        <Text style={styles.detail}>Nenhum resultado ainda.</Text>
      )}

      {results.map((item, index) => {
        const previous = results[index + 1];
        const delta = previous ? Math.round((item.score - previous.score) * 10) / 10 : null;
        return (
          <Card key={item.id} style={styles.row}>
            <View style={styles.flex}>
              <Text style={styles.cardTitle}>{definition.describe(item.score)}</Text>
              <Text style={styles.detail}>
                {formatShortDate(new Date(item.at))} às {formatTime(new Date(item.at))} · {item.score} de {definition.maxScore}
              </Text>
            </View>
            <Spacer />
            {delta !== null ? (
              <View style={styles.delta}>
                <Text style={styles.deltaText}>
                  {delta > 0 ? '+' : ''}
                  {String(delta).replace('.', ',')} vs. anterior
                </Text>
              </View>
            ) : null}
          </Card>
        );
      })}

      <Button label="Fazer de novo" onPress={() => router.push({ pathname: '/assessment', params: { kind: definition.kind } })} />
    </StackScreen>
  );
}

const useStyles = makeStyles((c) => ({
  flex: {
    flex: 1,
  },
  subtitle: {
    ...MenteType.sectionTitle,
    color: c.text,
  },
  card: {
    gap: 12,
  },
  cardTitle: {
    ...MenteType.captionStrong,
    color: c.text,
  },
  detail: {
    ...MenteType.small,
    color: c.textMuted,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  column: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  bar: {
    width: '70%',
    borderRadius: 6,
    backgroundColor: c.primary,
  },
  barValue: {
    ...MenteType.tinyStrong,
    color: c.text,
  },
  barLabel: {
    ...MenteType.tiny,
    color: c.textMuted,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  delta: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: MenteRadius.pill,
    backgroundColor: c.background,
  },
  deltaText: {
    ...MenteType.tinyStrong,
    color: c.accent,
  },
}));
