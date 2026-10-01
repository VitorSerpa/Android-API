import { useRouter } from 'expo-router';
import { Pressable, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/mente/icon';
import { MenteType } from '@/constants/mente-theme';
import { makeStyles, useColors } from '@/theme';

const SIZE = 56;
/** Tab bar: 12 top padding + 38 of content, plus its own bottom inset. */
const TAB_BAR_CONTENT = 50;
const GAP = 16;

/**
 * "Respirar agora" (RF-30): floats above the tab bar on every main screen and
 * starts a 60-second breathing session with a single tap (CA-03). The crisis
 * mode keeps its own button on Início ("Preciso de ajuda agora").
 */
export function ReliefFab() {
  const c = useColors();
  const styles = useStyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Respirar agora"
      accessibilityHint="Inicia uma sessão de respiração de 60 segundos"
      onPress={() => router.push({ pathname: '/practice', params: { tool: 'breathing', mini: '1' } })}
      style={({ pressed }) => [
        styles.fab,
        { bottom: TAB_BAR_CONTENT + Math.max(insets.bottom, 12) + GAP },
        pressed && styles.pressed,
      ]}>
      <Icon name="breath" size={22} color={c.onPrimary} />
      <Text style={styles.label}>Respirar agora</Text>
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  fab: {
    position: 'absolute',
    right: 18,
    height: SIZE,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: SIZE / 2,
    backgroundColor: c.primary,
    // Matches the soft drop shadow the FAB carries in Figma.
    // `boxShadow` works on native and web alike; the `shadow*` props warn on web.
    boxShadow: '0px 4px 10px rgba(27, 58, 87, 0.25)',
  },
  pressed: {
    opacity: 0.85,
  },
  label: {
    ...MenteType.captionStrong,
    color: c.onPrimary,
  },
}));
