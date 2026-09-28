import { Stack } from 'expo-router';

import { useAuth } from '@/auth';
import { UserDataProvider } from '@/data/user-data-context';

/**
 * Everything behind the login. The root layout only mounts this group while
 * signed in; `key` remounts the data provider when a different account signs in.
 */
export default function AppLayout() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <UserDataProvider key={user.id} userId={user.id}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="check-in" />
        <Stack.Screen name="emergency" />
        <Stack.Screen name="reminders" />
        <Stack.Screen name="contacts" />
        <Stack.Screen name="practice" />
        <Stack.Screen name="assessment" />
      </Stack>
    </UserDataProvider>
  );
}
