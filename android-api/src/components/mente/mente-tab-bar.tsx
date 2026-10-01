import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/mente/icon';
import { MenteType } from '@/constants/mente-theme';
import { makeStyles, useColors } from '@/theme';

/**
 * `@react-navigation/bottom-tabs` is vendored inside expo-router rather than
 * installed, so take the tab bar's props from the `Tabs` component itself.
 */
type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

/** Route name → glyph, in the order the prototype lays the tabs out. */
const TAB_ICONS: Record<string, IconName> = {
  home: 'home',
  diary: 'diary',
  history: 'chart',
  tools: 'tools',
  profile: 'user',
};

/**
 * The prototype's bottom navigation: a white bar with a hairline top border,
 * a 19px glyph and a 10px label that turns semibold + accent when selected.
 */
export function MenteTabBar({ state, descriptors, navigation }: TabBarProps) {
  const c = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = options.title ?? route.name;
        const focused = state.index === index;
        const color = focused ? c.accent : c.textMuted;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={label}
            onPress={onPress}
            onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
            style={styles.tab}>
            <Icon name={TAB_ICONS[route.name] ?? 'home'} size={19} color={color} />
            <Text style={[styles.label, focused && styles.labelFocused, { color }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    paddingHorizontal: 6,
    backgroundColor: c.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
  },
  label: {
    ...MenteType.tiny,
  },
  labelFocused: {
    ...MenteType.tinyStrong,
  },
}));
