import { Stack } from 'expo-router';

import { useAuth } from '@/auth';
import { PinGate } from '@/components/mente/app-gates';
// import { DigitalRestGate } from '@/components/mente/app-gates'; — descanso digital desativado
import { BackgroundTasks } from '@/components/mente/background-tasks';
import { UserDataProvider } from '@/data/user-data-context';

/**
 * Everything behind the login. The root layout only mounts this group while
 * signed in; `key` remounts the data provider when a different account signs in.
 * Order matters: the PIN comes before any data is shown (RF-36), and the
 * digital-rest gate (RF-53) is disabled for now — see the commented lines below.
 */
export default function AppLayout() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <PinGate key={user.id} userId={user.id}>
      <UserDataProvider key={user.id} userId={user.id}>
        <BackgroundTasks />
        {/* <DigitalRestGate> — descanso digital desativado; o Stack abaixo ficava dentro dele. */}
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="check-in" />
            <Stack.Screen name="day/[day]" />
            <Stack.Screen name="diary-focus" options={{ animation: 'fade' }} />
            <Stack.Screen name="emergency" />
            {/* Lembretes e medicamentos desativados (alertas removidos do app):
            <Stack.Screen name="reminders" />
            <Stack.Screen name="medications" />
            */}
            <Stack.Screen name="contacts" />
            <Stack.Screen name="practice" />
            <Stack.Screen name="wellbeing" />
            <Stack.Screen name="assessment" />
            <Stack.Screen name="assessment-history" />
            <Stack.Screen name="affirmations" />
            <Stack.Screen name="settings" />
            <Stack.Screen name="pin" />
            {/* Pessoa de confiança e integrações desativadas: <Stack.Screen name="community" /> */}
            <Stack.Screen name="group/[id]" />
          </Stack>
        {/* </DigitalRestGate> */}
      </UserDataProvider>
    </PinGate>
  );
}
