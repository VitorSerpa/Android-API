import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { MIN_TOUCH } from '@/components/mente/ui';
import { MenteRadius, MenteType } from '@/constants/mente-theme';
import { fontSizeFor, type WordWeight } from '@/data/word-cloud';
import {
  entryRowLabel,
  findWordEntries,
  timesLabel,
  wordUsageSummary,
  type WordCloudEntry,
} from '@/data/word-cloud-ui';
import { makeStyles, useColors } from '@/theme';

export type WordCloudProps = {
  words: readonly WordWeight[];
  /** Diary texts to search when a word is tapped (see `diaryWordEntries`). Without it the panel only shows the count. */
  entries?: readonly WordCloudEntry[];
  /** Called when a day in the panel is tapped; rows are only pressable when given. */
  onPressDay?: (day: string) => void;
  /** Called whenever the selection changes (`null` when cleared). */
  onSelectWord?: (word: string | null) => void;
};

const MAX_ROWS = 5;

/**
 * RF-63: a word cloud drawn with plain `Text` in a wrapping row — the size of
 * each word is proportional to how often it was written (US-16 CA-02). Each
 * word is a chip: tapping it highlights it and opens a panel with how often it
 * appears and the latest diary entries that contain it; tapping again clears.
 */
export function WordCloud({ words, entries, onPressDay, onSelectWord }: WordCloudProps) {
  const styles = useStyles();
  const c = useColors();
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  if (!words.length) return null;

  // A word that left the cloud (e.g. the period changed) is no longer selected.
  const selected = selectedWord ? (words.find((item) => item.word === selectedWord) ?? null) : null;
  const select = (word: string | null) => {
    setSelectedWord(word);
    onSelectWord?.(word);
  };

  const counts = words.map((item) => item.count);
  const lowest = Math.min(...counts);
  const highest = Math.max(...counts);
  // Alternate colours so neighbours are easy to tell apart; all are text tokens (≥ 4.5:1).
  const palette = [c.accent, c.purpleText, c.greenText, c.text, c.amberText];
  // Heaviest words in the middle reads more like a cloud than a sorted list.
  const ordered = words.map((item, index) => ({ ...item, rank: index })).sort((a, b) => (a.rank % 2) - (b.rank % 2) || a.rank - b.rank);
  const arranged = [...ordered.filter((_, index) => index % 2 === 1).reverse(), ...ordered.filter((_, index) => index % 2 === 0)];

  const matches = selected && entries ? findWordEntries(entries, selected.word, { limit: MAX_ROWS }) : [];

  return (
    <View>
      <View style={styles.cloud}>
        {arranged.map((item, index) => {
          const size = fontSizeFor(item.count, lowest, highest);
          const isSelected = selected?.word === item.word;
          const color = palette[item.rank % palette.length];
          return (
            <Animated.View
              key={item.word}
              entering={FadeIn.delay(Math.min(index * 18, 360)).duration(260)}
              style={[styles.chipWrap, { transform: [{ scale: isSelected ? 1.08 : 1 }] }, styles.scaleTransition]}>
              <Pressable
                onPress={() => select(isSelected ? null : item.word)}
                accessibilityRole="button"
                accessibilityLabel={`${item.word}, ${timesLabel(item.count)}`}
                accessibilityHint={isSelected ? 'Toque para limpar a seleção' : 'Toque para ver os registros com esta palavra'}
                accessibilityState={{ selected: isSelected }}
                style={({ pressed }) => [
                  styles.chip,
                  isSelected && { backgroundColor: c.background, borderColor: color },
                  pressed && styles.pressed,
                ]}>
                <Text
                  style={[
                    styles.word,
                    { fontSize: size, lineHeight: Math.round(size * 1.25), color },
                    (item.rank < 3 || isSelected) && styles.strong,
                  ]}>
                  {item.word}
                </Text>
              </Pressable>
            </Animated.View>
          );
        })}
      </View>

      {selected ? (
        <Animated.View key={selected.word} entering={FadeInDown.duration(220)} style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle} accessibilityLiveRegion="polite" accessibilityRole="header">
              {wordUsageSummary(selected.word, selected.count)}
            </Text>
            <Pressable
              onPress={() => select(null)}
              accessibilityRole="button"
              accessibilityLabel="Limpar seleção"
              hitSlop={8}
              style={({ pressed }) => [styles.clear, pressed && styles.pressed]}>
              <Text style={styles.clearText}>Limpar</Text>
            </Pressable>
          </View>

          {entries ? (
            matches.length ? (
              matches.map((match, index) => {
                const label = entryRowLabel(match);
                const content = (
                  <>
                    <View style={styles.rowTop}>
                      <Text style={styles.rowDate}>{label}</Text>
                      {match.count > 1 ? <Text style={styles.rowCount}>{timesLabel(match.count)}</Text> : null}
                    </View>
                    {match.snippet ? (
                      <Text style={styles.rowSnippet} numberOfLines={2}>
                        {match.snippet}
                      </Text>
                    ) : null}
                  </>
                );
                const key = match.id ?? `${match.day}-${index}`;
                return onPressDay ? (
                  <Pressable
                    key={key}
                    onPress={() => onPressDay(match.day)}
                    accessibilityRole="button"
                    accessibilityLabel={`${label}: ${match.snippet}`}
                    accessibilityHint="Abre este dia"
                    style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
                    {content}
                  </Pressable>
                ) : (
                  <View key={key} style={styles.row} accessible accessibilityLabel={`${label}: ${match.snippet}`}>
                    {content}
                  </View>
                );
              })
            ) : (
              <Text style={styles.empty}>Nenhum registro deste período contém esta palavra.</Text>
            )
          ) : null}
        </Animated.View>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  cloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 2,
    rowGap: 0,
    paddingVertical: 8,
  },
  chipWrap: {
    borderRadius: MenteRadius.chip,
  },
  scaleTransition: {
    transitionProperty: 'transform',
    transitionDuration: 160,
  },
  chip: {
    minHeight: MIN_TOUCH,
    minWidth: MIN_TOUCH,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: MenteRadius.chip,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  pressed: {
    opacity: 0.6,
  },
  word: {
    ...MenteType.caption,
  },
  strong: {
    fontFamily: MenteType.captionStrong.fontFamily,
  },
  panel: {
    marginTop: 4,
    marginBottom: 8,
    padding: 12,
    gap: 4,
    borderRadius: MenteRadius.tinted,
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.border,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  panelTitle: {
    ...MenteType.sectionTitle,
    color: c.text,
    flex: 1,
  },
  clear: {
    minHeight: MIN_TOUCH,
    minWidth: MIN_TOUCH,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearText: {
    ...MenteType.label,
    color: c.accent,
  },
  row: {
    minHeight: MIN_TOUCH,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: MenteRadius.row,
    backgroundColor: c.surface,
    justifyContent: 'center',
    gap: 2,
  },
  rowPressed: {
    opacity: 0.7,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  rowDate: {
    ...MenteType.smallStrong,
    color: c.text,
  },
  rowCount: {
    ...MenteType.small,
    color: c.textMuted,
  },
  rowSnippet: {
    ...MenteType.small,
    color: c.textMuted,
  },
  empty: {
    ...MenteType.small,
    color: c.textMuted,
  },
}));
