import { createContext, use, useEffect, useState, type ReactNode } from 'react';

import { authService } from '@/auth/service';
import {
  AuthError,
  type ProfilePatch,
  type Session,
  type SignInInput,
  type SignUpInput,
  type User,
} from '@/auth/types';
import { secureStorage } from '@/lib/storage';

/** SecureStore keys may only contain alphanumerics, `.`, `-` and `_`. */
const SESSION_KEY = 'mente.session';

type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

type AuthContextValue = {
  status: AuthStatus;
  user: User | null;
  /** Bearer token for API calls; `null` while signed out. */
  token: string | null;
  signIn: (input: SignInInput) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (patch: ProfilePatch) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function persist(session: Session | null) {
  await secureStorage.set(SESSION_KEY, session ? JSON.stringify(session) : null);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const raw = await secureStorage.get(SESSION_KEY);
      const stored = raw ? (JSON.parse(raw) as Session) : null;
      if (!stored) {
        if (!cancelled) setStatus('signedOut');
        return;
      }

      try {
        const user = await authService.restore(stored.token);
        if (cancelled) return;
        if (!user) {
          await persist(null);
          setStatus('signedOut');
          return;
        }
        const refreshed = { token: stored.token, user };
        await persist(refreshed);
        setSession(refreshed);
        setStatus('signedIn');
      } catch (error) {
        if (cancelled) return;
        // Offline launch: trust the cached session instead of locking the user out.
        if (error instanceof AuthError && error.code === 'network') {
          setSession(stored);
          setStatus('signedIn');
        } else {
          await persist(null);
          setStatus('signedOut');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const start = async (next: Session) => {
    await persist(next);
    setSession(next);
    setStatus('signedIn');
  };

  const value: AuthContextValue = {
    status,
    user: session?.user ?? null,
    token: session?.token ?? null,
    signIn: async (input) => start(await authService.signIn(input)),
    signUp: async (input) => start(await authService.signUp(input)),
    signOut: async () => {
      const token = session?.token;
      await persist(null);
      setSession(null);
      setStatus('signedOut');
      // Best effort: the local session is already gone even if the server call fails.
      if (token) await authService.signOut(token).catch(() => {});
    },
    updateProfile: async (patch) => {
      if (!session) return;
      const user = await authService.updateProfile(session.token, patch);
      await start({ token: session.token, user });
    },
  };

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthContextValue {
  const value = use(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider />');
  return value;
}
