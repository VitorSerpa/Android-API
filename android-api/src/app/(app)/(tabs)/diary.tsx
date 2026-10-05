import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { AudioClip, AudioRecorderPanel } from '@/components/mente/audio';
import { ChoiceChips } from '@/components/mente/fields';
import { Icon } from '@/components/mente/icon';
import { Screen } from '@/components/mente/screen';
import { Button, Card, Input, MIN_TOUCH, SectionHeader, Spacer, TopBar } from '@/components/mente/ui';
import { MenteRadius, MenteType } from '@/constants/mente-theme';
import { wordCount } from '@/data/insights';
import { DREAM_EMOTIONS, type DiaryEntry, type DiaryKind, type DreamEmotion } from '@/data/types';
import { useUserData } from '@/data/user-data-context';
import { useAutosave } from '@/hooks/use-autosave';
import { formatDayMonth, formatShortDate, formatTime, fromDayKey, toDayKey } from '@/lib/dates';
import { choose, confirm } from '@/lib/dialogs';
import { deleteMediaFile, keepRecording, pickPhoto } from '@/lib/media';
import { makeStyles, useColors } from '@/theme';

const RECENT_COUNT = 4;

const KINDS: readonly { kind: DiaryKind; label: string }[] = [
  { kind: 'free', label: 'Escrita livre' },
  { kind: 'gratitude', label: 'Gratidão' },
  { kind: 'dream', label: 'Sonhos' },
];

const KIND_LABEL: Record<DiaryKind, string> = { free: 'Livre', gratitude: 'Gratidão', dream: 'Sonho' };

export default function DiaryScreen() {
  const styles = useStyles();
  const [kind, setKind] = useState<DiaryKind>('free');

  return (
    <Screen>
      <TopBar title="Diário" />
      <View style={styles.segmented} accessibilityRole="tablist">
        {KINDS.map((item) => {
          const selected = item.kind === kind;
          return (
            <Pressable
              key={item.kind}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => setKind(item.kind)}
              style={[styles.segment, selected && styles.segmentOn]}>
              <Text style={[styles.segmentText, selected && styles.segmentTextOn]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {kind === 'free' ? <FreeWriting /> : kind === 'gratitude' ? <GratitudeForm /> : <DreamForm />}
      <RecentEntries />
    </Screen>
  );
}

/* ------------------------------------------------------------------ */
/* Escrita livre (RF-06, RF-09, RF-10, RF-11)                          */
/* ------------------------------------------------------------------ */

function latestFreeToday(entries: DiaryEntry[]) {
  const today = toDayKey();
  return entries
    .filter((entry) => entry.kind === 'free' && entry.day === today)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
}

function FreeWriting() {
  const styles = useStyles();
  const c = useColors();
  const router = useRouter();
  const { data, actions } = useUserData();

  // CA-02: reopening the app brings back the entry written last.
  const [entryId, setEntryId] = useState<string | null>(() => latestFreeToday(data.diary)?.id ?? null);
  const entry = entryId ? data.diary.find((item) => item.id === entryId) : undefined;
  const [text, setText] = useState(entry?.text ?? '');
  const [profileId, setProfileId] = useState<string | null>(entry?.profileId ?? data.profiles[0]?.id ?? null);
  const [dirty, setDirty] = useState(false);
  const [recording, setRecording] = useState(false);

  // The open entry was deleted (e.g. from "Entradas recentes"): start blank
  // instead of letting the next keystroke or autosave write it back.
  const deleted = entryId !== null && !entry;
  if (deleted) {
    setEntryId(null);
    setText('');
    setDirty(false);
  }

  /** Persists the text; creates the entry the first time. Returns its id. */
  const persist = useCallback(
    (force = false) => {
      // A deleted entry is never saved again; forced saves start a new one.
      const currentId = entry ? entryId : null;
      if (!force && (!dirty || deleted)) return currentId;
      if (!currentId && !text.trim() && !force) return null;
      const id = actions.saveDiaryEntry({
        id: currentId ?? undefined,
        day: entry?.day ?? toDayKey(),
        kind: 'free',
        profileId,
        text,
        gratitude: null,
        dreamEmotion: null,
        attachments: entry?.attachments ?? [],
      });
      setEntryId(id);
      setDirty(false);
      return id;
    },
    [actions, deleted, dirty, entry, entryId, profileId, text],
  );

  useAutosave(dirty, () => persist());

  // Coming back from the full-screen editor: show what was written there.
  useFocusEffect(
    useCallback(() => {
      if (!dirty && entry && entry.text !== text) setText(entry.text);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [entry?.updatedAt]),
  );

  // A blank editor that sent the user to full screen: pick up the entry that
  // was created there, so typing here doesn't start a second one.
  const current = useRef({ dirty, entryId, text, diary: data.diary });
  useEffect(() => {
    current.current = { dirty, entryId, text, diary: data.diary };
  });
  const leftAt = useRef<string | null>(null);
  useFocusEffect(
    useCallback(() => {
      const since = leftAt.current;
      const now = current.current;
      if (since && !now.dirty && !now.entryId && !now.text.trim()) {
        const created = latestFreeToday(now.diary);
        if (created && created.createdAt >= since) {
          setEntryId(created.id);
          setText(created.text);
          setProfileId(created.profileId);
        }
      }
      return () => {
        leftAt.current = new Date().toISOString();
      };
    }, []),
  );

  const open = (next: DiaryEntry | null) => {
    persist();
    setEntryId(next?.id ?? null);
    setText(next?.text ?? '');
    setProfileId(next?.profileId ?? data.profiles[0]?.id ?? null);
    setDirty(false);
  };

  const ensureEntry = () => persist(true) as string;

  const addPhoto = async () => {
    const source = await choose('Anexar foto', [
      { value: 'camera', label: 'Tirar foto' },
      { value: 'library', label: 'Escolher da galeria' },
    ]);
    if (!source) return;
    const attachment = await pickPhoto(source).catch(() => null);
    if (attachment) actions.addAttachment(ensureEntry(), attachment);
  };

  const removeAttachment = async (attachmentId: string, uri: string) => {
    if (!entryId) return;
    if (!(await confirm('Remover anexo', 'O anexo será removido deste registro.', 'Remover'))) return;
    actions.removeAttachment(entryId, attachmentId);
    deleteMediaFile(uri);
  };

  const heading = entry && entry.day !== toDayKey() ? formatDayMonth(fromDayKey(entry.day)) : `Hoje, ${formatDayMonth(new Date())}`;

  return (
    <>
      <ChoiceChips
        label="Perfil de vida da entrada"
        options={data.profiles.map((profile) => profile.id)}
        renderLabel={(id) => data.profiles.find((profile) => profile.id === id)?.name ?? id}
        selected={profileId ? [profileId] : []}
        onToggle={(id) => {
          setProfileId(id);
          setDirty(true);
        }}
      />

      <Card style={styles.editorCard}>
        <View style={styles.editorHeader}>
          <Text style={styles.editorDate}>{heading}</Text>
          <Spacer />
          <Text style={[styles.savingText, dirty && styles.savingTextBusy]} accessibilityLiveRegion="polite">
            {dirty ? 'Salvamento automático em até 30 s' : entry ? `Salvo às ${formatTime(new Date(entry.updatedAt))}` : ''}
          </Text>
        </View>

        <TextInput
          multiline
          accessibilityLabel="Texto do diário"
          placeholder="Como foi o seu dia? Escreva livremente…"
          placeholderTextColor={c.textMuted}
          value={text}
          onChangeText={(value) => {
            setText(value);
            setDirty(true);
          }}
          onBlur={() => persist()}
          style={styles.editorBody}
        />

        {entry?.attachments.length ? (
          <View style={styles.attachments}>
            {entry.attachments.map((attachment) =>
              attachment.kind === 'photo' ? (
                <View key={attachment.id} style={styles.photoWrap}>
                  <Image source={{ uri: attachment.uri }} style={styles.photo} contentFit="cover" accessibilityLabel="Foto anexada" />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Remover foto"
                    onPress={() => removeAttachment(attachment.id, attachment.uri)}
                    style={styles.photoRemove}>
                    <View style={styles.photoRemoveBadge}>
                      <Icon name="close" size={10} color={c.onPrimary} />
                    </View>
                  </Pressable>
                </View>
              ) : (
                <AudioClip
                  key={attachment.id}
                  uri={attachment.uri}
                  durationSec={attachment.durationSec}
                  onRemove={() => removeAttachment(attachment.id, attachment.uri)}
                />
              ),
            )}
          </View>
        ) : null}

        {recording ? (
          <AudioRecorderPanel
            onRecorded={(uri, duration) => {
              setRecording(false);
              actions.addAttachment(ensureEntry(), keepRecording(uri, duration));
            }}
            onCancel={() => setRecording(false)}
          />
        ) : null}

        <View style={styles.divider} />

        <View style={styles.attachmentRow}>
          <Pressable accessibilityRole="button" onPress={addPhoto} style={({ pressed }) => [styles.attachment, pressed && styles.pressed]}>
            <Icon name="photo" size={15} color={c.accent} cutColor={c.background} />
            <Text style={styles.attachmentText}>Foto</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => setRecording(true)}
            disabled={recording}
            style={({ pressed }) => [styles.attachment, pressed && styles.pressed]}>
            <Icon name="mic" size={15} color={c.accent} />
            <Text style={styles.attachmentText}>Áudio</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityHint="Abre o modo de escrita em tela cheia"
            onPress={() => {
              const id = persist(Boolean(text.trim()));
              router.push({ pathname: '/diary-focus', params: id ? { id } : { profileId: profileId ?? '' } });
            }}
            style={({ pressed }) => [styles.attachment, pressed && styles.pressed]}>
            <Icon name="expand" size={14} color={c.accent} />
            <Text style={styles.attachmentText}>Tela cheia</Text>
          </Pressable>
          <Spacer />
          <Text style={styles.wordCount}>
            {wordCount(text)} {wordCount(text) === 1 ? 'palavra' : 'palavras'}
          </Text>
        </View>

        {entry ? (
          <Pressable accessibilityRole="button" onPress={() => open(null)} style={styles.linkButton}>
            <Text style={styles.link}>+ Nova entrada</Text>
          </Pressable>
        ) : null}
      </Card>

    </>
  );
}

/* ------------------------------------------------------------------ */
/* Gratidão (RF-07 / CA-03)                                            */
/* ------------------------------------------------------------------ */

function GratitudeForm() {
  const styles = useStyles();
  const { data, actions } = useUserData();
  const today = toDayKey();
  const existing = data.diary.find((entry) => entry.kind === 'gratitude' && entry.day === today);
  const [items, setItems] = useState<[string, string, string]>(existing?.gratitude ?? ['', '', '']);
  const [saved, setSaved] = useState(false);
  const complete = items.every((item) => item.trim().length > 0);

  const save = () => {
    if (!complete) return;
    actions.saveDiaryEntry({
      id: existing?.id,
      day: today,
      kind: 'gratitude',
      profileId: null,
      text: items.map((item) => item.trim()).join('\n'),
      gratitude: items.map((item) => item.trim()) as [string, string, string],
      dreamEmotion: null,
      attachments: existing?.attachments ?? [],
    });
    setSaved(true);
  };

  return (
    <Card style={styles.card}>
      <Text style={styles.cardTitle}>Três coisas boas de hoje</Text>
      <Text style={styles.detail}>Pequenas ou grandes — o que fez seu dia um pouco melhor?</Text>
      {items.map((item, index) => (
        <Input
          key={index}
          accessibilityLabel={`Coisa boa ${index + 1}`}
          placeholder={`${index + 1}. ${['Um momento', 'Uma pessoa', 'Algo que aprendi'][index]}…`}
          value={item}
          onChangeText={(value) => {
            setSaved(false);
            setItems((current) => current.map((old, i) => (i === index ? value : old)) as [string, string, string]);
          }}
        />
      ))}
      <Button label={existing ? 'Atualizar gratidão de hoje' : 'Salvar gratidão'} onPress={save} disabled={!complete} />
      <Text style={[styles.detail, saved && styles.success]} accessibilityLiveRegion="polite">
        {saved ? '✓ Gratidão salva.' : complete ? '' : 'Preencha os três campos para salvar.'}
      </Text>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Sonhos (RF-08)                                                      */
/* ------------------------------------------------------------------ */

function DreamForm() {
  const styles = useStyles();
  const { data, actions } = useUserData();
  const [text, setText] = useState('');
  const [emotion, setEmotion] = useState<DreamEmotion | null>(null);
  const canSave = text.trim().length > 0 && emotion !== null;

  const save = () => {
    if (!canSave) return;
    actions.saveDiaryEntry({
      day: toDayKey(),
      kind: 'dream',
      profileId: null,
      text: text.trim(),
      gratitude: null,
      dreamEmotion: emotion,
      attachments: [],
    });
    setText('');
    setEmotion(null);
  };

  const dreams = data.diary.filter((entry) => entry.kind === 'dream').length;

  return (
    <Card style={styles.card}>
      <Text style={styles.cardTitle}>Diário de sonhos</Text>
      <Input multiline accessibilityLabel="Descrição do sonho" placeholder="Com o que você sonhou?" value={text} onChangeText={setText} />
      <Text style={styles.fieldLabel}>Que emoção o sonho trouxe?</Text>
      <ChoiceChips label="Emoção do sonho" options={DREAM_EMOTIONS} selected={emotion ? [emotion] : []} onToggle={setEmotion} />
      <Button label="Salvar sonho" onPress={save} disabled={!canSave} />
      <Text style={styles.detail}>
        {canSave ? '' : 'Descreva o sonho e escolha uma emoção para salvar.'} {dreams ? `${dreams} ${dreams === 1 ? 'sonho registrado' : 'sonhos registrados'}.` : ''}
      </Text>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Entradas recentes                                                   */
/* ------------------------------------------------------------------ */

function RecentEntries() {
  const styles = useStyles();
  const router = useRouter();
  const { data, actions } = useUserData();
  const [showAll, setShowAll] = useState(false);

  const entries = [...data.diary]
    .filter((entry) => entry.text.trim() || entry.attachments.length)
    .sort((a, b) => b.day.localeCompare(a.day) || b.updatedAt.localeCompare(a.updatedAt));
  const visible = showAll ? entries : entries.slice(0, RECENT_COUNT);

  const remove = async (entry: DiaryEntry) => {
    if (!(await confirm('Apagar entrada', 'Esta entrada do diário e seus anexos serão apagados.', 'Apagar'))) return;
    entry.attachments.forEach((attachment) => deleteMediaFile(attachment.uri));
    actions.deleteDiaryEntry(entry.id);
  };

  return (
    <View style={styles.entries}>
      <SectionHeader
        title="Entradas recentes"
        action={entries.length > RECENT_COUNT ? (showAll ? 'Ver menos' : 'Ver todas') : undefined}
        onPressAction={() => setShowAll((value) => !value)}
      />
      {visible.length === 0 ? <Text style={styles.detail}>Suas entradas aparecem aqui assim que você escrever.</Text> : null}
      {visible.map((entry) => (
        <Pressable
          key={entry.id}
          accessibilityRole="button"
          accessibilityHint={entry.kind === 'free' ? 'Toque para abrir em tela cheia, segure para apagar' : 'Segure para apagar'}
          onPress={() => entry.kind === 'free' && router.push({ pathname: '/diary-focus', params: { id: entry.id } })}
          onLongPress={() => remove(entry)}
          style={({ pressed }) => [styles.entry, pressed && styles.pressed]}>
          <View style={styles.entryText}>
            <View style={styles.entryMeta}>
              <Text style={styles.entryDate}>{formatShortDate(fromDayKey(entry.day))}</Text>
              <View style={styles.entryTag}>
                <Text style={styles.entryTagText}>
                  {KIND_LABEL[entry.kind]}
                  {entry.dreamEmotion ? ` · ${entry.dreamEmotion}` : ''}
                  {entry.profileId ? ` · ${data.profiles.find((profile) => profile.id === entry.profileId)?.name ?? ''}` : ''}
                </Text>
              </View>
              {entry.attachments.length ? (
                <Text style={styles.entryDate}>
                  {entry.attachments.length} anexo{entry.attachments.length > 1 ? 's' : ''}
                </Text>
              ) : null}
            </View>
            <Text style={styles.entryExcerpt} numberOfLines={2}>
              {entry.kind === 'gratitude' ? entry.gratitude?.join(' · ') : entry.text.trim()}
            </Text>
            {entry.attachments.length ? (
              <View style={styles.attachments}>
                {entry.attachments.map((attachment) =>
                  attachment.kind === 'photo' ? (
                    <Image
                      key={attachment.id}
                      source={{ uri: attachment.uri }}
                      style={styles.entryPhoto}
                      contentFit="cover"
                      accessibilityLabel="Foto anexada"
                    />
                  ) : (
                    <View key={attachment.id} style={styles.entryAudio}>
                      <AudioClip uri={attachment.uri} durationSec={attachment.durationSec} />
                    </View>
                  ),
                )}
              </View>
            ) : null}
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const PHOTO = 88;
const ENTRY_PHOTO = 64;

const useStyles = makeStyles((c) => ({
  segmented: {
    flexDirection: 'row',
    padding: 4,
    gap: 4,
    borderRadius: MenteRadius.button,
    backgroundColor: c.surface,
  },
  segment: {
    flex: 1,
    minHeight: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: MenteRadius.chip,
  },
  segmentOn: {
    backgroundColor: c.primary,
  },
  segmentText: {
    ...MenteType.caption,
    color: c.textMuted,
  },
  segmentTextOn: {
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
  fieldLabel: {
    ...MenteType.captionStrong,
    color: c.text,
  },
  detail: {
    ...MenteType.small,
    color: c.textMuted,
  },
  success: {
    color: c.greenText,
  },
  editorCard: {
    gap: 12,
  },
  editorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editorDate: {
    ...MenteType.label,
    color: c.accent,
  },
  savingText: {
    ...MenteType.tiny,
    color: c.greenText,
  },
  savingTextBusy: {
    color: c.textMuted,
  },
  editorBody: {
    ...MenteType.body,
    minHeight: 140,
    padding: 0,
    textAlignVertical: 'top',
    color: c.text,
  },
  attachments: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoWrap: {
    width: PHOTO,
    height: PHOTO,
  },
  photo: {
    width: PHOTO,
    height: PHOTO,
    borderRadius: MenteRadius.chip,
  },
  photoRemove: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    padding: 6,
  },
  photoRemoveBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.primary,
  },
  divider: {
    height: 1,
    backgroundColor: c.border,
  },
  attachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  attachment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: MIN_TOUCH,
    paddingHorizontal: 12,
    borderRadius: MenteRadius.chip,
    backgroundColor: c.background,
  },
  attachmentText: {
    ...MenteType.captionStrong,
    color: c.accent,
  },
  wordCount: {
    ...MenteType.tiny,
    color: c.textMuted,
  },
  linkButton: {
    minHeight: MIN_TOUCH,
    justifyContent: 'center',
  },
  link: {
    ...MenteType.captionStrong,
    color: c.accent,
  },
  entries: {
    gap: 9,
  },
  entry: {
    flexDirection: 'row',
    minHeight: MIN_TOUCH,
    padding: 12,
    borderRadius: MenteRadius.row,
    backgroundColor: c.surface,
  },
  entryText: {
    flex: 1,
    gap: 5,
  },
  entryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  entryDate: {
    ...MenteType.tiny,
    color: c.textMuted,
  },
  entryTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: MenteRadius.pill,
    backgroundColor: c.background,
  },
  entryTagText: {
    ...MenteType.tiny,
    color: c.accent,
  },
  entryExcerpt: {
    ...MenteType.caption,
    color: c.text,
  },
  entryPhoto: {
    width: ENTRY_PHOTO,
    height: ENTRY_PHOTO,
    borderRadius: MenteRadius.chip,
  },
  entryAudio: {
    width: '100%',
  },
  pressed: {
    opacity: 0.75,
  },
}));
