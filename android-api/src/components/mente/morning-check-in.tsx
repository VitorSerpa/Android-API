import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { morningQuestionDue } from '@/data/insights';
import { useUserStore } from '@/data/user-data-context';
import { toDayKey } from '@/lib/dates';

/** Lets a restored screen (RF-59) settle first, so the check-in opens on top of it. */
const OPEN_DELAY_MS = 600;

/**
 * RF-70 / US-19: when the option is on, the first time the user comes to the
 * phone in the morning window the app asks "como você está?" by opening the
 * check-in — once per day (CA-01), and only if there is no check-in yet.
 *
 * Android only tells apps about a screen unlock (`ACTION_USER_PRESENT`) while
 * they keep a process running in the background, which would cost battery
 * all day (RNF-06). So the moment used is the first time the app is opened or
 * brought back to the foreground in the morning after the phone is unlocked.
 * Mounted behind the PIN, so the question never shows over a locked app.
 */
export function MorningCheckInPrompt() {
  const router = useRouter();
  const store = useUserStore();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const check = () => {
      const now = new Date();
      const due = morningQuestionDue(store.getSnapshot(), now);
      if (due === 'none') return;
      // Asked once per day — even when a check-in was already done today, so it never pops up later.
      store.actions.markMorningAsked(toDayKey(now));
      if (due === 'mark') return;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => router.push({ pathname: '/check-in', params: { morning: '1' } }), OPEN_DELAY_MS);
    };

    check();
    const subscription = AppState.addEventListener('change', (next) => next === 'active' && check());
    return () => {
      subscription.remove();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [router, store]);

  return null;
}
