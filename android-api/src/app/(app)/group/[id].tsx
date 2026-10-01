import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/auth';
import { MIN_TOUCH, TopBar } from '@/components/mente/ui';
import { MenteRadius, MenteSpacing, MenteType } from '@/constants/mente-theme';
import { useUserData } from '@/data/user-data-context';
import { formatShortDate, formatTime, toDayKey } from '@/lib/dates';
import { confirm } from '@/lib/dialogs';
import { setJoinedGroups, useGroupChat, type ChatStatus } from '@/lib/group-chat';
import { makeStyles, useColors } from '@/theme';

const STATUS: Record<ChatStatus, string> = {
  connecting: 'Conectando…',
  online: 'Em tempo real',
  offline: 'Sem conexão · as mensagens serão enviadas quando a internet voltar',
  disabled: 'Modo offline completo ativo · mensagens ficam guardadas até você desativá-lo',
};

/** RF-54 / CA-01: nobody's name is shown — only "Você" on this device's own messages and "Anônimo" on the rest. */
export default function GroupScreen() {
  const styles = useStyles();
  const c = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; name?: string }>();
  const groupId = params.id;
  const name = params.name ?? 'Grupo de apoio';
  const { user } = useAuth();
  const { data } = useUserData();
  const chat = useGroupChat(user?.id ?? '', groupId, data.settings.offlineMode);
  const [draft, setDraft] = useState('');
  const scroll = useRef<ScrollView>(null);

  useEffect(() => {
    if (!user) return;
    setJoinedGroups(user.id, (joined) => (joined.some((item) => item.id === groupId) ? joined : [...joined, { id: groupId, name }]));
  }, [user, groupId, name]);

  const send = () => {
    chat.send(draft);
    setDraft('');
  };

  const leave = async () => {
    if (!user || !(await confirm('Sair do grupo', 'O grupo sai da sua lista. Você pode entrar de novo quando quiser.', 'Sair'))) return;
    await setJoinedGroups(user.id, (joined) => joined.filter((item) => item.id !== groupId));
    router.back();
  };

  const today = toDayKey();

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={styles.flex} behavior="padding">
          <View style={styles.header}>
            <TopBar
              title={name}
              right={
                <Pressable accessibilityRole="button" onPress={leave} style={styles.leave}>
                  <Text style={styles.leaveText}>Sair</Text>
                </Pressable>
              }
            />
            <Text style={[styles.status, chat.status === 'online' && styles.statusOnline]} accessibilityLiveRegion="polite">
              {STATUS[chat.status]}
            </Text>
          </View>

          <ScrollView ref={scroll} contentContainerStyle={styles.messages} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}>
            {chat.items.length === 0 && chat.ready ? (
              <Text style={styles.empty}>Ninguém escreveu ainda. Compartilhe como você está — seu nome nunca aparece.</Text>
            ) : null}
            {chat.items.map((item) => {
              const at = new Date(item.createdAt);
              return (
                <View key={item.key} style={[styles.bubble, item.mine ? styles.mine : styles.theirs]}>
                  <Text style={[styles.author, item.mine && styles.authorMine]}>{item.mine ? 'Você' : 'Anônimo'}</Text>
                  <Text style={[styles.text, item.mine && styles.textMine]}>{item.text}</Text>
                  <Text style={[styles.time, item.mine && styles.authorMine]}>
                    {toDayKey(at) === today ? formatTime(at) : `${formatShortDate(at)} ${formatTime(at)}`}
                    {item.pending ? ' · aguardando envio' : ''}
                  </Text>
                </View>
              );
            })}
          </ScrollView>

          <View style={styles.composer}>
            <TextInput
              accessibilityLabel="Mensagem anônima"
              placeholder="Escreva uma mensagem anônima…"
              placeholderTextColor={c.textMuted}
              multiline
              maxLength={1000}
              value={draft}
              onChangeText={setDraft}
              style={styles.input}
            />
            <Pressable accessibilityRole="button" accessibilityLabel="Enviar" onPress={send} disabled={!draft.trim()} style={[styles.send, !draft.trim() && styles.disabled]}>
              <Text style={styles.sendText}>Enviar</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: {
    flex: 1,
    backgroundColor: c.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    gap: 6,
    paddingHorizontal: MenteSpacing.gutter,
    paddingTop: 10,
  },
  leave: {
    minHeight: MIN_TOUCH,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  leaveText: {
    ...MenteType.captionStrong,
    color: c.dangerText,
  },
  status: {
    ...MenteType.small,
    color: c.textMuted,
  },
  statusOnline: {
    color: c.greenText,
  },
  messages: {
    gap: 8,
    padding: MenteSpacing.gutter,
  },
  empty: {
    ...MenteType.body,
    textAlign: 'center',
    color: c.textMuted,
  },
  bubble: {
    maxWidth: '82%',
    gap: 3,
    padding: 12,
    borderRadius: MenteRadius.row,
  },
  mine: {
    alignSelf: 'flex-end',
    backgroundColor: c.primary,
  },
  theirs: {
    alignSelf: 'flex-start',
    backgroundColor: c.surface,
  },
  author: {
    ...MenteType.tinyStrong,
    color: c.textMuted,
  },
  authorMine: {
    color: c.onPrimary,
  },
  text: {
    ...MenteType.body,
    color: c.text,
  },
  textMine: {
    color: c.onPrimary,
  },
  time: {
    ...MenteType.tiny,
    color: c.textMuted,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: 12,
    backgroundColor: c.surface,
  },
  input: {
    ...MenteType.body,
    flex: 1,
    minHeight: MIN_TOUCH,
    maxHeight: 120,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: MenteRadius.chip,
    backgroundColor: c.background,
    color: c.text,
  },
  send: {
    minHeight: MIN_TOUCH,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: MenteRadius.pill,
    backgroundColor: c.primary,
  },
  sendText: {
    ...MenteType.captionStrong,
    color: c.onPrimary,
  },
  disabled: {
    opacity: 0.5,
  },
}));
