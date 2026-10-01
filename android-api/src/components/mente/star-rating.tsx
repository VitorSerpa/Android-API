import { Pressable, Text, View } from 'react-native';

import { MIN_TOUCH } from '@/components/mente/ui';
import { MenteType } from '@/constants/mente-theme';
import { makeStyles } from '@/theme';

/** 1–5 stars (RF-46). Each star is its own 44 pt target and reads as "N estrelas" in TalkBack. */
export function StarRating({ value, onChange, label }: { value: number; onChange: (stars: number) => void; label: string }) {
  const styles = useStyles();
  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Pressable
          key={star}
          accessibilityRole="radio"
          accessibilityLabel={`${star} ${star === 1 ? 'estrela' : 'estrelas'}`}
          accessibilityState={{ selected: value === star }}
          onPress={() => onChange(star)}
          style={styles.star}>
          <Text style={[styles.glyph, star <= value && styles.glyphOn]}>{star <= value ? '★' : '☆'}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  star: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    ...MenteType.metric,
    fontSize: 28,
    lineHeight: 34,
    color: c.textMuted,
  },
  glyphOn: {
    color: c.amberText,
  },
}));
