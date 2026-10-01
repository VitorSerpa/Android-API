import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { KeyboardAvoidingView, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MIN_TOUCH } from '@/components/mente/ui';
import { MenteSpacing, MenteType } from '@/constants/mente-theme';
import { wordCount } from '@/data/insights';
import { useUserData } from '@/data/user-data-context';
import { useAutosave } from '@/hooks/use-autosave';
import { formatTime, toDayKey } from '@/lib/dates';
import { makeStyles, useColors } from '@/theme';

/**
 * RF-11: distraction-free writing. No status bar, tab bar or floating button;
 * a calm gradient, a large text area and a single way out. The same 30 s
 * autosave as the diary applies (RF-06).
 */
export default function DiaryFocusScreen() {
  const styles = useStyles();
  const c = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; profileId?: string }>();
  const { data, actions } = useUserData();

  const [entryId, setEntryId] = useState<string | null>(params.id ?? null);
  const entry = entryId ? data.diary.find((item) => item.id === entryId) : undefined;
  const [text, setText] = useState(entry?.text ?? '');
  const [dirty, setDirty] = useState(false);

  const persist = () => {
    if (!dirty || (!entryId && !text.trim())) return;
    const id = actions.saveDiaryEntry({
      id: entryId ?? undefined,
      day: entry?.day ?? toDayKey(),
      kind: 'free',
      profileId: entry?.profileId ?? (params.profileId || null),
      text,
      gratitude: null,
      dreamEmotion: null,
      attachments: entry?.attachments ?? [],
    });
    setEntryId(id);
    setDirty(false);
  };

  useAutosave(dirty, persist);

  const close = () => {
    persist();
    if (router.canGoBack()) router.back();
    else router.navigate('/diary');
  };

  return (
    <LinearGradient colors={c.calmGradient} style={styles.flex}>
      <StatusBar hidden />
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={styles.flex} behavior="padding">
          <View style={styles.header}>
            <Text style={styles.status} accessibilityLiveRegion="polite">
              {dirty ? 'Salvando automaticamente…' : entry ? `Salvo às ${formatTime(new Date(entry.updatedAt))}` : 'Modo foco'}
            </Text>
            <Pressable accessibilityRole="button" onPress={close} style={styles.done}>
              <Text style={styles.doneText}>Concluir</Text>
            </Pressable>
          </View>

          <TextInput
            multiline
            autoFocus
            accessibilityLabel="Texto do diário em tela cheia"
            placeholder="Respire fundo e escreva o que vier…"
            placeholderTextColor={c.textMuted}
            value={text}
            onChangeText={(value) => {
              setText(value);
              setDirty(true);
            }}
            style={styles.body}
          />

          <Text style={styles.count}>
            {wordCount(text)} {wordCount(text) === 1 ? 'palavra' : 'palavras'}
          </Text>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const useStyles = makeStyles((c) => ({
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: MenteSpacing.gutter,
  },
  status: {
    ...MenteType.small,
    color: c.textMuted,
  },
  done: {
    minHeight: MIN_TOUCH,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  doneText: {
    ...MenteType.captionStrong,
    color: c.accent,
  },
  body: {
    flex: 1,
    ...MenteType.body,
    fontSize: 18,
    lineHeight: 30,
    paddingHorizontal: MenteSpacing.gutter + 8,
    paddingTop: 16,
    textAlignVertical: 'top',
    color: c.text,
  },
  count: {
    ...MenteType.tiny,
    textAlign: 'center',
    paddingBottom: 10,
    color: c.textMuted,
  },
}));
