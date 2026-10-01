import { Stack } from 'expo-router';

import { useAuth } from '@/auth';
import { DigitalRestGate, PinGate } from '@/components/mente/app-gates';
import { BackgroundTasks } from '@/components/mente/background-tasks';
import { UserDataProvider } from '@/data/user-data-context';

/**
 * Everything behind the login. The root layout only mounts this group while
 * signed in; `key` remounts the data provider when a different account signs in.
 * Order matters: the PIN comes before any data is shown (RF-36), and the
 * digital-rest period replaces the whole app with the breathing screen (RF-53).
 */
export default function AppLayout() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <PinGate key={user.id} userId={user.id}>
      <UserDataProvider key={user.id} userId={user.id}>
        <BackgroundTasks />
        <DigitalRestGate>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="check-in" />
            <Stack.Screen name="day/[day]" />
            <Stack.Screen name="diary-focus" options={{ animation: 'fade' }} />
            <Stack.Screen name="emergency" />
            <Stack.Screen name="reminders" />
            <Stack.Screen name="medications" />
            <Stack.Screen name="contacts" />
            <Stack.Screen name="practice" />
            <Stack.Screen name="wellbeing" />
            <Stack.Screen name="assessment" />
            <Stack.Screen name="assessment-history" />
            <Stack.Screen name="affirmations" />
            <Stack.Screen name="settings" />
            <Stack.Screen name="pin" />
            <Stack.Screen name="community" />
            <Stack.Screen name="group/[id]" />
          </Stack>
        </DigitalRestGate>
      </UserDataProvider>
    </PinGate>
  );
}
