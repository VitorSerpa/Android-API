import { Text, View } from 'react-native';

import { MenteType } from '@/constants/mente-theme';
import { fontSizeFor, type WordWeight } from '@/data/word-cloud';
import { makeStyles, useColors } from '@/theme';

/**
 * RF-63: a word cloud drawn with plain `Text` in a wrapping row — the size of
 * each word is proportional to how often it was written (US-16 CA-02). It
 * replaces react-native-word-cloud, which is unmaintained and does not run on
 * the New Architecture.
 */
export function WordCloud({ words }: { words: readonly WordWeight[] }) {
  const styles = useStyles();
  const c = useColors();
  if (!words.length) return null;

  const counts = words.map((item) => item.count);
  const lowest = Math.min(...counts);
  const highest = Math.max(...counts);
  // Alternate colours so neighbours are easy to tell apart; all are text tokens (≥ 4.5:1).
  const palette = [c.accent, c.purpleText, c.greenText, c.text, c.amberText];
  // Heaviest words in the middle reads more like a cloud than a sorted list.
  const ordered = words.map((item, index) => ({ ...item, rank: index })).sort((a, b) => (a.rank % 2) - (b.rank % 2) || a.rank - b.rank);
  const arranged = [...ordered.filter((_, index) => index % 2 === 1).reverse(), ...ordered.filter((_, index) => index % 2 === 0)];

  return (
    <View
      style={styles.cloud}
      accessible
      accessibilityLabel={`Palavras mais frequentes: ${words
        .slice(0, 10)
        .map((item) => `${item.word}, ${item.count} ${item.count === 1 ? 'vez' : 'vezes'}`)
        .join('; ')}`}>
      {arranged.map((item) => {
        const size = fontSizeFor(item.count, lowest, highest);
        return (
          <Text
            key={item.word}
            style={[
              styles.word,
              { fontSize: size, lineHeight: Math.round(size * 1.25), color: palette[item.rank % palette.length] },
              item.rank < 3 && styles.strong,
            ]}>
            {item.word}
          </Text>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles(() => ({
  cloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 12,
    rowGap: 4,
    paddingVertical: 8,
  },
  word: {
    ...MenteType.caption,
  },
  strong: {
    fontFamily: MenteType.captionStrong.fontFamily,
  },
}));
