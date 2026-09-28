import { useRouter } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/mente/icon';
import { MenteColors } from '@/constants/mente-theme';

const SIZE = 56;
/** Tab bar: 12 top padding + 38 of content, plus its own bottom inset. */
const TAB_BAR_CONTENT = 50;
const GAP = 16;

/**
 * The prototype's floating "Alívio rápido" button. It rides above the tab bar
 * on every tab but Ferramentas, which already is the relief toolbox.
 */
export function ReliefFab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Alívio rápido"
      onPress={() => router.push('/emergency')}
      style={({ pressed }) => [
        styles.fab,
        { bottom: TAB_BAR_CONTENT + Math.max(insets.bottom, 12) + GAP },
        pressed && styles.pressed,
      ]}>
      <Icon name="breath" size={26} color={MenteColors.onPrimary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 18,
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: SIZE / 2,
    backgroundColor: MenteColors.accent,
    // Matches the soft drop shadow the FAB carries in Figma.
    // `boxShadow` works on native and web alike; the `shadow*` props warn on web.
    boxShadow: '0px 4px 10px rgba(27, 58, 87, 0.25)',
  },
  pressed: {
    opacity: 0.85,
  },
});
