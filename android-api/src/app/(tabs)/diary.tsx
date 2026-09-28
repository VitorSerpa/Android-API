import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/mente/icon';
import { Screen } from '@/components/mente/screen';
import { Card, SectionHeader, Spacer, TopBar } from '@/components/mente/ui';
import { MenteColors, MenteRadius, MenteType } from '@/constants/mente-theme';

const LIFE_PROFILES = ['Trabalho', 'Família', 'Lazer'] as const;

const COLLECTIONS = [
  {
    title: 'Gratidão',
    detail: '3 registros hoje',
    background: MenteColors.greenSurface,
    color: MenteColors.greenText,
  },
  {
    title: 'Sonhos',
    detail: '1 registro',
    background: MenteColors.purpleSurface,
    color: MenteColors.purpleText,
  },
] as const;

const ENTRIES = [
  {
    date: '23 Out',
    tag: 'Trabalho',
    excerpt: 'Consegui terminar o relatório sem me cobrar tanto.',
    color: MenteColors.primary,
  },
  {
    date: '22 Out',
    tag: 'Lazer',
    excerpt: 'Caminhada no parque com a Bia. Dia leve.',
    color: MenteColors.mood,
  },
  {
    date: '21 Out',
    tag: 'Família',
    excerpt: 'Conversa difícil, mas necessária, com a minha mãe.',
    color: MenteColors.energy,
  },
] as const;

export default function DiaryScreen() {
  const [profile, setProfile] = useState<string>(LIFE_PROFILES[0]);

  return (
    <Screen>
      <TopBar
        title="Diário"
        right={
          <View style={styles.fullscreenChip}>
            <Icon name="expand" size={14} color={MenteColors.accent} />
            <Text style={styles.fullscreenText}>Tela cheia</Text>
          </View>
        }
      />

      <View style={styles.profileRow}>
        {LIFE_PROFILES.map((name) => {
          const selected = profile === name;
          return (
            <Pressable
              key={name}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setProfile(name)}
              style={[styles.profileTag, selected && styles.profileTagSelected]}>
              <Text style={[styles.profileTagText, selected && styles.profileTagTextSelected]}>
                {name}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Card style={styles.editorCard}>
        <View style={styles.editorHeader}>
          <Text style={styles.editorDate}>Hoje, 24 de Outubro</Text>
          <Spacer />
          <View style={styles.savingRow}>
            <View style={styles.savingDot} />
            <Text style={styles.savingText}>Salvando…</Text>
          </View>
        </View>

        <Text style={styles.editorBody}>
          Hoje a reunião me deixou tensa, mas consegui respirar antes de responder. Percebi que estou
          conseguindo separar o que é meu do que é do trabalho.
        </Text>

        <View style={styles.caret} />
        <View style={styles.divider} />

        <View style={styles.attachmentRow}>
          <View style={styles.attachment}>
            <Icon name="photo" size={15} color={MenteColors.accent} cutColor={MenteColors.background} />
            <Text style={styles.attachmentText}>Foto</Text>
          </View>
          <View style={styles.attachment}>
            <Icon name="mic" size={15} color={MenteColors.accent} />
            <Text style={styles.attachmentText}>Áudio</Text>
          </View>
          <Spacer />
          <Text style={styles.wordCount}>248 palavras</Text>
        </View>
      </Card>

      <View style={styles.collectionRow}>
        {COLLECTIONS.map((collection) => (
          <View
            key={collection.title}
            style={[styles.collection, { backgroundColor: collection.background }]}>
            <Text style={[styles.collectionTitle, { color: collection.color }]}>
              {collection.title}
            </Text>
            <Text style={[styles.collectionDetail, { color: collection.color }]}>
              {collection.detail}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.entries}>
        <SectionHeader title="Entradas recentes" action="Ver todas" />

        {ENTRIES.map((entry) => (
          <View key={entry.date} style={styles.entry}>
            <View style={[styles.entryBar, { backgroundColor: entry.color }]} />
            <View style={styles.entryText}>
              <View style={styles.entryMeta}>
                <Text style={styles.entryDate}>{entry.date}</Text>
                <View style={styles.entryTag}>
                  <Text style={styles.entryTagText}>{entry.tag}</Text>
                </View>
              </View>
              <Text style={styles.entryExcerpt}>{entry.excerpt}</Text>
            </View>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  savingText: {
    ...MenteType.tiny,
    color: MenteColors.mood,
  },
  editorBody: {
    ...MenteType.body,
    lineHeight: 22,
    color: MenteColors.text,
  },
  /** The blinking text caret, drawn as a static bar in the prototype. */
  caret: {
    width: 2,
    height: 20,
    backgroundColor: MenteColors.primary,
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
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: MenteRadius.row,
    backgroundColor: MenteColors.surface,
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
