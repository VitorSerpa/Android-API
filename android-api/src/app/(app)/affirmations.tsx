import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { StackScreen } from '@/components/mente/stack-screen';
import { Button, Card, Input, MIN_TOUCH, TopBar } from '@/components/mente/ui';
import { MenteRadius, MenteType } from '@/constants/mente-theme';
import { allAffirmations } from '@/data/phrases';
import type { UserPhrase } from '@/data/types';
import { useUserData } from '@/data/user-data-context';
import { confirm } from '@/lib/dialogs';
import { makeStyles } from '@/theme';

export default function AffirmationsScreen() {
  const styles = useStyles();
  const { data, actions } = useUserData();
  const affirmations = allAffirmations(data);
  const favorites = data.favoriteAffirmations
    .map((id) => affirmations.find((item) => item.id === id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return (
    <StackScreen>
      <TopBar title="Afirmações" />

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Minhas favoritas</Text>
        {favorites.length === 0 ? (
          <Text style={styles.detail}>Toque na ☆ de uma afirmação abaixo, ou em “Salvar como favorita” na prática de Afirmações, para salvá-la aqui.</Text>
        ) : null}
        {favorites.map((item) => (
          <View key={item.id} style={styles.row}>
            <Text style={styles.text}>★ {item.text}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remover “${item.text}” das favoritas`}
              onPress={() => actions.toggleFavoriteAffirmation(item.id)}
              style={styles.action}>
              <Text style={styles.danger}>Remover</Text>
            </Pressable>
          </View>
        ))}
      </Card>

      <PhraseSection kind="affirmation" title="Minhas afirmações" hint="Aparecem na prática de Afirmações junto com as do app." placeholder="Ex.: Eu sou capaz de atravessar este dia." />
      <PhraseSection
        kind="motivation"
        title="Minhas mensagens motivacionais"
        hint="Aparecem no resumo do dia, depois de cada check-in."
        placeholder="Ex.: Lembre-se do quanto você já caminhou."
      />

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Afirmações do app</Text>
        {affirmations
          .filter((item) => !item.custom)
          .map((item) => {
            const favorite = data.favoriteAffirmations.includes(item.id);
            return (
              <View key={item.id} style={styles.row}>
                <Text style={styles.text}>{item.text}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: favorite }}
                  accessibilityLabel={favorite ? 'Remover das favoritas' : 'Favoritar'}
                  onPress={() => actions.toggleFavoriteAffirmation(item.id)}
                  style={styles.action}>
                  <Text style={styles.link}>{favorite ? '★' : '☆'}</Text>
                </Pressable>
              </View>
            );
          })}
      </Card>
    </StackScreen>
  );
}

function PhraseSection({ kind, title, hint, placeholder }: { kind: UserPhrase['kind']; title: string; hint: string; placeholder: string }) {
  const styles = useStyles();
  const { data, actions } = useUserData();
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const phrases = data.phrases.filter((item) => item.kind === kind);

  const add = () => {
    if (!draft.trim()) return;
    actions.addPhrase(kind, draft.trim());
    setDraft('');
  };

  const remove = async (phrase: UserPhrase) => {
    if (await confirm('Apagar frase', `Apagar “${phrase.text}”?`, 'Apagar')) actions.removePhrase(phrase.id);
  };

  return (
    <Card style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.detail}>{hint}</Text>
      {phrases.map((phrase) =>
        editing?.id === phrase.id ? (
          <View key={phrase.id} style={styles.editor}>
            <Input accessibilityLabel="Editar frase" multiline value={editing.text} onChangeText={(text) => setEditing({ id: phrase.id, text })} />
            <View style={styles.buttons}>
              <Button
                label="Salvar"
                disabled={!editing.text.trim()}
                onPress={() => {
                  actions.updatePhrase(phrase.id, editing.text.trim());
                  setEditing(null);
                }}
                style={styles.flex}
              />
              <Button label="Cancelar" variant="secondary" onPress={() => setEditing(null)} style={styles.flex} />
            </View>
          </View>
        ) : (
          <View key={phrase.id} style={styles.row}>
            <Text style={styles.text}>{phrase.text}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Editar" onPress={() => setEditing({ id: phrase.id, text: phrase.text })} style={styles.action}>
              <Text style={styles.link}>Editar</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Apagar" onPress={() => remove(phrase)} style={styles.action}>
              <Text style={styles.danger}>Apagar</Text>
            </Pressable>
          </View>
        ),
      )}
      <Input accessibilityLabel={`Nova frase em ${title}`} multiline placeholder={placeholder} value={draft} onChangeText={setDraft} />
      <Button label="Adicionar" variant="secondary" onPress={add} disabled={!draft.trim()} />
    </Card>
  );
}

const useStyles = makeStyles((c) => ({
  flex: {
    flex: 1,
  },
  card: {
    gap: 10,
  },
  cardTitle: {
    ...MenteType.sectionTitle,
    color: c.text,
  },
  detail: {
    ...MenteType.small,
    color: c.textMuted,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  text: {
    ...MenteType.body,
    flex: 1,
    color: c.text,
  },
  action: {
    minWidth: MIN_TOUCH,
    minHeight: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  link: {
    ...MenteType.captionStrong,
    color: c.accent,
  },
  danger: {
    ...MenteType.captionStrong,
    color: c.dangerText,
  },
  editor: {
    gap: 8,
    padding: 10,
    borderRadius: MenteRadius.row,
    borderWidth: 1,
    borderColor: c.border,
  },
  buttons: {
    flexDirection: 'row',
    gap: 8,
  },
}));
