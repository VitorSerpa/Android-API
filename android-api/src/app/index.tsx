import { Redirect } from 'expo-router';

import { useAuth } from '@/auth';

/** Entry point: sends each visitor to their side of the auth gate. */
export default function Index() {
  const { status } = useAuth();
  return <Redirect href={status === 'signedIn' ? '/home' : '/sign-in'} />;
}
