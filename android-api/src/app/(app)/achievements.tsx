import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AudioClip, AudioRecorderPanel } from '@/components/mente/audio';
import { Icon } from '@/components/mente/icon';
import { StackScreen } from '@/components/mente/stack-screen';
import { Button, Card, Input, MIN_TOUCH, TopBar } from '@/components/mente/ui';
import { MenteRadius, MenteType } from '@/constants/mente-theme';
import type { AchievementNote } from '@/data/types';
import { useUserData } from '@/data/user-data-context';
import { formatDayMonth, formatTime, fromDayKey, toDayKey, WEEKDAYS_LONG } from '@/lib/dates';
import { confirm, notify } from '@/lib/dialogs';
import { deleteMediaFile, keepAudioFile } from '@/lib/media';
import { makeStyles, useColors } from '@/theme';

/**
 * RF-61 / US-15: short voice notes about the day's small wins. Each note is
 * transcribed when possible (RF-60), its text becomes an editable caption, and
 * the list is grouped by date, newest first, with playback (CA-03).
 */
export default function AchievementsScreen() {
  const styles = useStyles();
  const c = useColors();
  const { data, actions } = useUserData();
  const [recording, setRecording] = useState(false);

  const byDay = new Map<string, AchievementNote[]>();
  for (const note of [...data.achievements].sort((a, b) => b.createdAt.localeCompare(a.createdAt))) {
    byDay.set(note.day, [...(byDay.get(note.day) ?? []), note]);
  }
  const today = toDayKey();
  const todayCount = byDay.get(today)?.length ?? 0;

  const remove = async (note: AchievementNote) => {
    if (!(await confirm('Apagar conquista', 'Esta nota de voz será apagada.', 'Apagar'))) return;
    actions.deleteAchievement(note.id);
    deleteMediaFile(note.uri);
  };

  return (
    <StackScreen>
      <TopBar title="Minhas conquistas" />

      <Card style={styles.intro}>
        <Icon name="heart" size={26} color={c.greenText} />
        <Text style={styles.introTitle}>Celebre as pequenas vitórias</Text>
        <Text style={styles.detail}>
          Grave até 30 segundos sobre algo que deu certo hoje — levantar cedo, uma conversa difícil, um passo a mais. Ouvir essas
          notas em dias pesados ajuda a lembrar do seu progresso.
        </Text>
        {recording ? (
          <AudioRecorderPanel
            title="Conte sua conquista (até 30 s)"
            onCancel={() => setRecording(false)}
            onRecorded={(result) => {
              setRecording(false);
              actions.addAchievement({
                uri: keepAudioFile(result.uri),
                durationSec: Math.round(result.durationSec),
                title: result.transcript,
                transcriptStatus: result.transcriptStatus,
              });
              if (result.transcriptStatus !== 'done') {
                notify('Conquista salva', `${result.problem ?? 'Não foi possível transcrever o áudio.'} Você pode dar um título a ela na lista.`);
              }
            }}
          />
        ) : (
          <Button label={todayCount ? 'Gravar outra conquista' : 'Gravar conquista de hoje'} onPress={() => setRecording(true)} />
        )}
      </Card>

      {byDay.size === 0 ? <Text style={styles.empty}>Suas conquistas aparecem aqui, organizadas por dia.</Text> : null}

      {[...byDay.entries()].map(([day, notes]) => {
        const date = fromDayKey(day);
        return (
          <View key={day} style={styles.group}>
            <Text style={styles.dayTitle} accessibilityRole="header">
              {day === today ? 'Hoje' : `${WEEKDAYS_LONG[date.getDay()]}, ${formatDayMonth(date)}`}
            </Text>
            {notes.map((note) => (
              <AchievementRow key={note.id} note={note} onRemove={() => remove(note)} />
            ))}
          </View>
        );
      })}
    </StackScreen>
  );
}

function AchievementRow({ note, onRemove }: { note: AchievementNote; onRemove: () => void }) {
  const styles = useStyles();
  const { actions } = useUserData();
  const [title, setTitle] = useState(note.title);

  return (
    <View style={styles.row}>
      <View style={styles.rowHeader}>
        <Text style={styles.time}>{formatTime(new Date(note.createdAt))}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Apagar conquista" onPress={onRemove} style={styles.remove}>
          <Text style={styles.removeText}>Apagar</Text>
        </Pressable>
      </View>
      <AudioClip uri={note.uri} durationSec={note.durationSec} />
      <Input
        multiline
        accessibilityLabel="Título da conquista"
        placeholder="Dê um título a esta conquista"
        value={title}
        onChangeText={setTitle}
        onBlur={() => title !== note.title && actions.renameAchievement(note.id, title.trim())}
      />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  intro: {
    gap: 10,
  },
  introTitle: {
    ...MenteType.sectionTitle,
    color: c.text,
  },
  detail: {
    ...MenteType.small,
    color: c.textMuted,
  },
  empty: {
    ...MenteType.body,
    textAlign: 'center',
    color: c.textMuted,
  },
  group: {
    gap: 8,
  },
  dayTitle: {
    ...MenteType.label,
    color: c.accent,
  },
  row: {
    gap: 8,
    padding: 12,
    borderRadius: MenteRadius.row,
    backgroundColor: c.surface,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  time: {
    ...MenteType.captionStrong,
    color: c.text,
  },
  remove: {
    minHeight: MIN_TOUCH,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  removeText: {
    ...MenteType.captionStrong,
    color: c.dangerText,
  },
}));
