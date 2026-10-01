import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, type ReactNode } from 'react';

import { AuthProvider, useAuth } from '@/auth';
import { ThemeProvider, useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Keep the native splash up until Inter is ready, otherwise the login screen
  // flashes in the system font. `RootNavigator` hides it once the session is known.
  if (!fontsLoaded && !fontError) return null;

  return (
    <ThemeProvider>
      <AuthProvider>
        <ThemedNavigation>
          <RootNavigator />
        </ThemedNavigation>
      </AuthProvider>
    </ThemeProvider>
  );
}

/** React Navigation's own colours (screen backgrounds, transitions) follow the chosen palette. */
function ThemedNavigation({ children }: { children: ReactNode }) {
  const { colors, scheme } = useTheme();
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  return (
    <NavigationThemeProvider
      value={{
        ...base,
        colors: {
          ...base.colors,
          background: colors.background,
          card: colors.surface,
          text: colors.text,
          border: colors.border,
          primary: colors.accent,
        },
      }}>
      <StatusBar style={colors.statusBar} />
      {children}
    </NavigationThemeProvider>
  );
}

/**
 * `Stack.Protected` is the auth gate: when `status` flips, screens whose guard
 * turns false become unreachable and the router falls back to `index`, which
 * redirects to the right side of the wall.
 */
function RootNavigator() {
  const { status } = useAuth();

  useEffect(() => {
    if (status !== 'loading') SplashScreen.hideAsync();
  }, [status]);

  // Still reading the stored session: keep the splash up rather than flashing
  // the login screen at someone who is already signed in.
  if (status === 'loading') return null;

  const signedIn = status === 'signedIn';

  // No animated overlay on top of the first screen: the template's Reanimated
  // `entering` splash crashed Fabric on Android on ~1 in 5 cold starts.
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />

      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="sign-up" />
      </Stack.Protected>

      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
    </Stack>
  );
}
