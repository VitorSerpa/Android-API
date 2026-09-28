import { Tabs, usePathname } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { MenteTabBar } from '@/components/mente/mente-tab-bar';
import { ReliefFab } from '@/components/mente/relief-fab';

export default function TabsLayout() {
  const pathname = usePathname();

  return (
    <View style={styles.container}>
      <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <MenteTabBar {...props} />}>
        <Tabs.Screen name="home" options={{ title: 'Início' }} />
        <Tabs.Screen name="diary" options={{ title: 'Diário' }} />
        <Tabs.Screen name="history" options={{ title: 'Histórico' }} />
        <Tabs.Screen name="tools" options={{ title: 'Ferramentas' }} />
        <Tabs.Screen name="profile" options={{ title: 'Perfil' }} />
      </Tabs>

      {/* Ferramentas is the relief toolbox itself, so the shortcut is redundant there. */}
      {pathname !== '/tools' ? <ReliefFab /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
