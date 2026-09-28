import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Icon } from '@/components/mente/icon';
import { Screen } from '@/components/mente/screen';
import { Card, SectionHeader, Spacer, TopBar } from '@/components/mente/ui';
import { MenteColors, MenteRadius, MenteType } from '@/constants/mente-theme';
import { wordCount } from '@/data/insights';
import {
  COLLECTIONS,
  LIFE_PROFILES,
  type Collection,
  type DiaryEntry,
  type LifeProfile,
} from '@/data/types';
import { useUserData } from '@/data/user-data-context';
import { formatDayMonth, formatShortDate, fromDayKey, toDayKey } from '@/lib/dates';
import { comingSoon, confirm } from '@/lib/dialogs';

const AUTOSAVE_MS = 700;
const RECENT_COUNT = 3;

const COLLECTION_STYLE: Record<Collection, { background: string; color: string }> = {
  Gratidão: { background: MenteColors.greenSurface, color: MenteColors.greenText },
  Sonhos: { background: MenteColors.purpleSurface, color: MenteColors.purpleText },
};

const PROFILE_COLOR: Record<LifeProfile, string> = {
  Trabalho: MenteColors.primary,
  Lazer: MenteColors.mood,
  Família: MenteColors.energy,
};

type Target = { id: string | null; day: string; profile: LifeProfile };
type SaveStatus = 'idle' | 'saving' | 'saved';

export default function DiaryScreen() {
  const { data, actions } = useUserData();
  const today = toDayKey();

  const findToday = (profile: LifeProfile) =>
    data.diary.find((entry) => entry.day === today && entry.profile === profile);

  const [target, setTarget] = useState<Target>(() => ({
    id: findToday(LIFE_PROFILES[0])?.id ?? null,
    day: today,
    profile: LIFE_PROFILES[0],
  }));
  const initial = target.id ? data.diary.find((entry) => entry.id === target.id) : undefined;
  const [text, setText] = useState(initial?.text ?? '');
  const [collections, setCollections] = useState<Collection[]>(initial?.collections ?? []);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [focusMode, setFocusMode] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** The save waiting on the debounce, so switching entries can flush it first. */
  const pending = useRef<(() => void) | null>(null);

  const persist = (nextText: string, nextCollections: Collection[], at: Target) => {
    // Don't create empty entries just because the editor was focused.
    if (!at.id && !nextText.trim()) {
      setStatus('idle');
      return;
    }
    const id = actions.saveDiaryEntry({
      id: at.id ?? undefined,
      day: at.day,
      profile: at.profile,
      text: nextText,
      collections: nextCollections,
    });
    if (!at.id) setTarget((current) => (current === at ? { ...at, id } : current));
    setStatus('saved');
  };

  const schedule = (nextText: string, nextCollections: Collection[]) => {
    setStatus('saving');
    if (timer.current) clearTimeout(timer.current);
    const at = target;
    pending.current = () => persist(nextText, nextCollections, at);
    timer.current = setTimeout(() => {
      pending.current?.();
      pending.current = null;
    }, AUTOSAVE_MS);
  };

  const flush = () => {
    if (timer.current) clearTimeout(timer.current);
    pending.current?.();
    pending.current = null;
  };

  // Leaving the tab must not drop the last few keystrokes.
  useEffect(() => flush, []);

  const open = (entry: DiaryEntry | undefined, profile: LifeProfile) => {
    flush();
    setTarget({ id: entry?.id ?? null, day: entry?.day ?? today, profile: entry?.profile ?? profile });
    setText(entry?.text ?? '');
    setCollections(entry?.collections ?? []);
    setStatus('idle');
  };

  const onChangeText = (value: string) => {
    setText(value);
    schedule(value, collections);
  };

  const toggleCollection = (collection: Collection) => {
    const next = collections.includes(collection)
      ? collections.filter((item) => item !== collection)
      : [...collections, collection];
    setCollections(next);
    schedule(text, next);
  };

  const remove = async (entry: DiaryEntry) => {
    const ok = await confirm('Apagar entrada', 'Esta entrada do diário será apagada.', 'Apagar');
    if (!ok) return;
    actions.deleteDiaryEntry(entry.id);
    if (entry.id === target.id) open(undefined, target.profile);
  };

  const isToday = target.day === today;
  const heading = isToday
    ? `Hoje, ${formatDayMonth(fromDayKey(today))}`
    : formatDayMonth(fromDayKey(target.day));

  const entries = [...data.diary]
    .filter((entry) => entry.text.trim())
    .sort((a, b) => b.day.localeCompare(a.day) || b.updatedAt.localeCompare(a.updatedAt));
  const visibleEntries = showAll ? entries : entries.slice(0, RECENT_COUNT);

  return (
    <Screen>
      <TopBar
        title="Diário"
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: focusMode }}
            onPress={() => setFocusMode((value) => !value)}
            style={({ pressed }) => [styles.fullscreenChip, pressed && styles.pressed]}>
            <Icon name="expand" size={14} color={MenteColors.accent} />
            <Text style={styles.fullscreenText}>{focusMode ? 'Sair' : 'Tela cheia'}</Text>
          </Pressable>
        }
      />

      {!focusMode ? (
        <View style={styles.profileRow}>
          {LIFE_PROFILES.map((name) => {
            const selected = target.profile === name;
            return (
              <Pressable
                key={name}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => !selected && open(findToday(name), name)}
                style={[styles.profileTag, selected && styles.profileTagSelected]}>
                <Text style={[styles.profileTagText, selected && styles.profileTagTextSelected]}>
                  {name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <Card style={styles.editorCard}>
        <View style={styles.editorHeader}>
          <Text style={styles.editorDate}>{heading}</Text>
          <Spacer />
          {status !== 'idle' ? (
            <View style={styles.savingRow}>
              <View style={[styles.savingDot, status === 'saving' && styles.savingDotBusy]} />
              <Text style={[styles.savingText, status === 'saving' && styles.savingTextBusy]}>
                {status === 'saving' ? 'Salvando…' : 'Salvo'}
              </Text>
            </View>
          ) : null}
        </View>

        <TextInput
          multiline
          accessibilityLabel="Texto do diário"
          placeholder="Como foi o seu dia? Escreva livremente…"
          placeholderTextColor={MenteColors.textMuted}
          value={text}
          onChangeText={onChangeText}
          onBlur={flush}
          style={[styles.editorBody, focusMode && styles.editorBodyFocus]}
        />

        <View style={styles.divider} />

        <View style={styles.attachmentRow}>
          <Pressable
            accessibilityRole="button"
            onPress={() => comingSoon('Anexar foto')}
            style={({ pressed }) => [styles.attachment, pressed && styles.pressed]}>
            <Icon name="photo" size={15} color={MenteColors.accent} cutColor={MenteColors.background} />
            <Text style={styles.attachmentText}>Foto</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => comingSoon('Gravar áudio')}
            style={({ pressed }) => [styles.attachment, pressed && styles.pressed]}>
            <Icon name="mic" size={15} color={MenteColors.accent} />
            <Text style={styles.attachmentText}>Áudio</Text>
          </Pressable>
          <Spacer />
          <Text style={styles.wordCount}>
            {wordCount(text)} {wordCount(text) === 1 ? 'palavra' : 'palavras'}
          </Text>
        </View>

        {!isToday ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => open(findToday(target.profile), target.profile)}
            hitSlop={8}>
            <Text style={styles.backToToday}>← Voltar para a entrada de hoje</Text>
          </Pressable>
        ) : null}
      </Card>

      {!focusMode ? (
        <>
          <View style={styles.collectionRow}>
            {COLLECTIONS.map((collection) => {
              const style = COLLECTION_STYLE[collection];
              const selected = collections.includes(collection);
              const count = data.diary.filter((entry) => entry.collections.includes(collection)).length;
              return (
                <Pressable
                  key={collection}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  accessibilityHint="Marca a entrada aberta com esta coleção"
                  onPress={() => toggleCollection(collection)}
                  style={({ pressed }) => [
                    styles.collection,
                    { backgroundColor: style.background },
                    selected && { borderColor: style.color },
                    pressed && styles.pressed,
                  ]}>
                  <Text style={[styles.collectionTitle, { color: style.color }]}>
                    {selected ? '✓ ' : ''}
                    {collection}
                  </Text>
                  <Text style={[styles.collectionDetail, { color: style.color }]}>
                    {count} {count === 1 ? 'registro' : 'registros'}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.entries}>
            <SectionHeader
              title="Entradas recentes"
              action={entries.length > RECENT_COUNT ? (showAll ? 'Ver menos' : 'Ver todas') : undefined}
              onPressAction={() => setShowAll((value) => !value)}
            />

            {visibleEntries.length === 0 ? (
              <Text style={styles.empty}>Suas entradas aparecem aqui assim que você escrever.</Text>
            ) : null}

            {visibleEntries.map((entry) => (
              <Pressable
                key={entry.id}
                accessibilityRole="button"
                accessibilityHint="Toque para abrir, segure para apagar"
                onPress={() => open(entry, entry.profile)}
                onLongPress={() => remove(entry)}
                style={({ pressed }) => [
                  styles.entry,
                  entry.id === target.id && styles.entryActive,
                  pressed && styles.pressed,
                ]}>
                <View style={[styles.entryBar, { backgroundColor: PROFILE_COLOR[entry.profile] }]} />
                <View style={styles.entryText}>
                  <View style={styles.entryMeta}>
                    <Text style={styles.entryDate}>{formatShortDate(fromDayKey(entry.day))}</Text>
                    <View style={styles.entryTag}>
                      <Text style={styles.entryTagText}>{entry.profile}</Text>
                    </View>
                  </View>
                  <Text style={styles.entryExcerpt} numberOfLines={2}>
                    {entry.text.trim()}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.75,
  },
  fullscreenChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderRadius: MenteRadius.pill,
    backgroundColor: MenteColors.surface,
  },
  fullscreenText: {
    ...MenteType.link,
    color: MenteColors.accent,
  },
  profileRow: {
    flexDirection: 'row',
    gap: 8,
  },
  profileTag: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: MenteRadius.pill,
    backgroundColor: MenteColors.surface,
  },
  profileTagSelected: {
    backgroundColor: MenteColors.primary,
  },
  profileTagText: {
    ...MenteType.small,
    color: MenteColors.textMuted,
  },
  profileTagTextSelected: {
    ...MenteType.smallStrong,
    color: MenteColors.onPrimary,
  },
  editorCard: {
    gap: 10,
    paddingTop: 16,
    paddingBottom: 14,
  },
  editorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editorDate: {
    ...MenteType.smallStrong,
    color: MenteColors.textMuted,
  },
  savingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  savingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: MenteColors.mood,
  },
  savingDotBusy: {
    backgroundColor: MenteColors.anxiety,
  },
  savingText: {
    ...MenteType.tiny,
    color: MenteColors.mood,
  },
  savingTextBusy: {
    color: MenteColors.textMuted,
  },
  editorBody: {
    ...MenteType.body,
    lineHeight: 22,
    minHeight: 110,
    padding: 0,
    textAlignVertical: 'top',
    color: MenteColors.text,
  },
  editorBodyFocus: {
    minHeight: 380,
  },
  backToToday: {
    ...MenteType.link,
    color: MenteColors.accent,
  },
  divider: {
    height: 1,
    backgroundColor: MenteColors.border,
  },
  attachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  attachment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: MenteRadius.pill,
    backgroundColor: MenteColors.background,
  },
  attachmentText: {
    ...MenteType.link,
    color: MenteColors.accent,
  },
  wordCount: {
    ...MenteType.tiny,
    color: MenteColors.textMuted,
  },
  collectionRow: {
    flexDirection: 'row',
    gap: 11,
  },
  collection: {
    flex: 1,
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: MenteRadius.tinted,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  collectionTitle: {
    ...MenteType.captionStrong,
  },
  collectionDetail: {
    ...MenteType.link,
    fontFamily: MenteType.tiny.fontFamily,
    fontSize: 11,
  },
  entries: {
    gap: 9,
  },
  empty: {
    ...MenteType.small,
    color: MenteColors.textMuted,
  },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: MenteRadius.row,
    backgroundColor: MenteColors.surface,
  },
  entryActive: {
    borderWidth: 1,
    borderColor: MenteColors.primary,
  },
  entryBar: {
    width: 3,
    height: 34,
    borderRadius: 2,
  },
  entryText: {
    flex: 1,
    gap: 3,
  },
  entryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  entryDate: {
    ...MenteType.link,
    fontFamily: MenteType.captionStrong.fontFamily,
    color: MenteColors.text,
  },
  entryTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: MenteRadius.pill,
    backgroundColor: MenteColors.background,
  },
  entryTagText: {
    ...MenteType.micro,
    color: MenteColors.textMuted,
  },
  entryExcerpt: {
    ...MenteType.small,
    lineHeight: 16,
    color: MenteColors.textMuted,
  },
});
