import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { MIN_TOUCH } from '@/components/mente/ui';
import { MenteRadius, MenteType } from '@/constants/mente-theme';
import { dayTimeline, type TimelineEvent, type TimelineKind } from '@/data/timeline';
import { useUserData } from '@/data/user-data-context';
import { formatTime } from '@/lib/dates';
import { confirm } from '@/lib/dialogs';
import { makeStyles, useColors, type ColorTokens } from '@/theme';

const KIND_LABELS: Record<TimelineKind, string> = {
  checkin: 'Check-in',
  health: 'Saúde',
  diary: 'Diário',
  practice: 'Prática',
  crisis: 'Crise',
  achievement: 'Conquista',
  assessment: 'Teste',
  thought: 'Pensamento',
};

const dotColor = (c: ColorTokens, kind: TimelineKind) =>
  ({
    checkin: c.mood,
    health: c.energy,
    diary: c.accent,
    practice: c.greenText,
    crisis: c.dangerText,
    achievement: c.amberText,
    assessment: c.purpleText,
    thought: c.amberText,
  })[kind];

/**
 * RF-62 / US-16 CA-01: the day's events in time order. Tapping one opens the
 * full record — diary entries in their own screen, the rest right in place.
 */
export function DayTimeline({ day }: { day: string }) {
  const styles = useStyles();
  const { data } = useUserData();
  const events = dayTimeline(data, day);
  const [open, setOpen] = useState<string | null>(null);

  if (!events.length) return <Text style={styles.empty}>Nenhum evento registrado neste dia.</Text>;

  return (
    <View accessibilityRole="list">
      {events.map((event, index) => (
        <TimelineRow
          key={event.id}
          event={event}
          last={index === events.length - 1}
          open={open === event.id}
          onToggle={() => setOpen((current) => (current === event.id ? null : event.id))}
        />
      ))}
    </View>
  );
}

function TimelineRow({ event, last, open, onToggle }: { event: TimelineEvent; last: boolean; open: boolean; onToggle: () => void }) {
  const styles = useStyles();
  const c = useColors();
  const router = useRouter();
  const { actions } = useUserData();
  const time = formatTime(new Date(event.at));

  const press = () => {
    if (event.diaryEntryId) router.push({ pathname: '/diary-focus', params: { id: event.diaryEntryId } });
    else onToggle();
  };

  const removeCheckIn = async () => {
    if (await confirm('Apagar check-in', 'Este registro será removido do dia.', 'Apagar')) {
      actions.deleteCheckIn(event.id.replace(/^checkin:/, ''));
    }
  };

  return (
    <View style={styles.row}>
      <View style={styles.rail}>
        <View style={[styles.dot, { backgroundColor: dotColor(c, event.kind) }]} />
        {!last ? <View style={styles.line} /> : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${time}, ${KIND_LABELS[event.kind]}: ${event.title}. ${event.summary}`}
        accessibilityHint={event.diaryEntryId ? 'Abre a entrada do diário' : open ? 'Fecha os detalhes' : 'Mostra o registro completo'}
        accessibilityState={{ expanded: event.diaryEntryId ? undefined : open }}
        onPress={press}
        style={({ pressed }) => [styles.body, open && styles.bodyOpen, pressed && styles.pressed]}>
        <View style={styles.header}>
          <Text style={styles.time}>{time}</Text>
          <Text style={styles.kind}>{KIND_LABELS[event.kind].toUpperCase()}</Text>
        </View>
        <Text style={styles.title}>{event.title}</Text>
        {!open ? (
          <Text style={styles.summary} numberOfLines={2}>
            {event.summary}
          </Text>
        ) : (
          <View style={styles.details}>
            {event.details.map((line, index) => (
              <Text key={`${index}-${line}`} style={styles.detailLine}>
                {line}
              </Text>
            ))}
            {event.kind === 'checkin' ? (
              <Pressable accessibilityRole="button" onPress={removeCheckIn} style={styles.action}>
                <Text style={styles.danger}>Apagar check-in</Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  empty: {
    ...MenteType.small,
    color: c.textMuted,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  rail: {
    width: 14,
    alignItems: 'center',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 16,
  },
  line: {
    flex: 1,
    width: 2,
    marginTop: 4,
    backgroundColor: c.border,
  },
  body: {
    flex: 1,
    gap: 3,
    minHeight: MIN_TOUCH,
    marginBottom: 8,
    padding: 10,
    borderRadius: MenteRadius.row,
    backgroundColor: c.background,
  },
  bodyOpen: {
    borderWidth: 1,
    borderColor: c.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  time: {
    ...MenteType.captionStrong,
    color: c.accent,
  },
  kind: {
    ...MenteType.badge,
    color: c.textMuted,
  },
  title: {
    ...MenteType.captionStrong,
    color: c.text,
  },
  summary: {
    ...MenteType.small,
    color: c.textMuted,
  },
  details: {
    gap: 4,
    marginTop: 2,
  },
  detailLine: {
    ...MenteType.small,
    color: c.text,
  },
  action: {
    minHeight: MIN_TOUCH,
    justifyContent: 'center',
  },
  danger: {
    ...MenteType.captionStrong,
    color: c.dangerText,
  },
  pressed: {
    opacity: 0.75,
  },
}));
