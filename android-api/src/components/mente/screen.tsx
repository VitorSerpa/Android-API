import type { ReactNode } from 'react';
import { KeyboardAvoidingView, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MenteSpacing } from '@/constants/mente-theme';
import { useScrollRestoration } from '@/lib/screen-state';
import { makeStyles } from '@/theme';

/**
 * Page chrome shared by the tab screens: the prototype's background, the top
 * safe-area inset (the bottom one belongs to the tab bar) and the 20px gutter.
 */
export function Screen({ children }: { children: ReactNode }) {
  const styles = useStyles();
  // RF-59: reopening the app comes back to the same scroll position.
  const [scrollRef, scroll] = useScrollRestoration();
  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Diário and Ferramentas have text fields; keep them above the keyboard. */}
        <KeyboardAvoidingView style={styles.safeArea} behavior="padding">
          <ScrollView
            ref={scrollRef}
            {...scroll}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
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
  safeArea: {
    flex: 1,
  },
  content: {
    gap: 13,
    paddingHorizontal: MenteSpacing.gutter,
    paddingTop: 10,
    // Room for the floating "Respirar agora" button above the tab bar.
    paddingBottom: 96,
  },
}));
