import type { ReactNode } from 'react';
import { KeyboardAvoidingView, ScrollView, View, type ScrollViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MenteSpacing } from '@/constants/mente-theme';
import { makeStyles } from '@/theme';

/**
 * Page chrome for the screens pushed on top of the tabs: both safe-area
 * insets, keyboard avoidance and the 20 px gutter.
 */
export function StackScreen({
  children,
  scrollRef,
  onScroll,
}: {
  children: ReactNode;
  scrollRef?: React.Ref<ScrollView>;
  onScroll?: ScrollViewProps['onScroll'];
}) {
  const styles = useStyles();
  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        {/* Android is edge-to-edge, where `adjustResize` no longer shrinks the window. */}
        <KeyboardAvoidingView style={styles.flex} behavior="padding">
          <ScrollView
            ref={scrollRef}
            onScroll={onScroll}
            scrollEventThrottle={100}
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
  flex: {
    flex: 1,
  },
  content: {
    gap: 13,
    paddingHorizontal: MenteSpacing.gutter,
    paddingTop: 10,
    paddingBottom: 28,
  },
}));
