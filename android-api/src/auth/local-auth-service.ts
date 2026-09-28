import { AuthError, type AuthService, type User } from '@/auth/types';
import { createId } from '@/lib/id';
import { jsonStorage } from '@/lib/storage';

/**
 * DEVELOPMENT STAND-IN for the real login system.
 *
 * Accounts and sessions live on this device only, and **passwords are neither
 * stored nor checked** — any password passes validation for a registered
 * e-mail. It exists so every screen can run end-to-end today; replace it with
 * an implementation that calls your backend (see `src/auth/index.ts`).
 */

const ACCOUNTS_KEY = 'mente:auth:accounts';
const SESSIONS_KEY = 'mente:auth:sessions';
/** Makes loading states visible during development, like a real request would. */
const LATENCY_MS = 350;

type Accounts = Record<string, User>;
type Sessions = Record<string, string>;

const wait = () => new Promise((resolve) => setTimeout(resolve, LATENCY_MS));
const normalise = (email: string) => email.trim().toLowerCase();

async function readAccounts() {
  return (await jsonStorage.get<Accounts>(ACCOUNTS_KEY)) ?? {};
}

async function openSession(user: User) {
  const token = `local-${createId()}-${createId()}`;
  const sessions = (await jsonStorage.get<Sessions>(SESSIONS_KEY)) ?? {};
  await jsonStorage.set(SESSIONS_KEY, { ...sessions, [token]: user.id });
  return { token, user };
}

async function userForToken(token: string) {
  const sessions = (await jsonStorage.get<Sessions>(SESSIONS_KEY)) ?? {};
  const userId = sessions[token];
  if (!userId) return null;
  const accounts = await readAccounts();
  return Object.values(accounts).find((account) => account.id === userId) ?? null;
}

export const localAuthService: AuthService = {
  async signIn({ email }) {
    await wait();
    const user = (await readAccounts())[normalise(email)];
    if (!user) throw new AuthError('invalid_credentials', 'E-mail ou senha incorretos.');
    return openSession(user);
  },

  async signUp({ name, email }) {
    await wait();
    const accounts = await readAccounts();
    const key = normalise(email);
    if (accounts[key]) {
      throw new AuthError('email_in_use', 'Já existe uma conta com este e-mail.');
    }
    const user: User = {
      id: createId(),
      name: name.trim(),
      email: key,
      createdAt: new Date().toISOString(),
    };
    await jsonStorage.set(ACCOUNTS_KEY, { ...accounts, [key]: user });
    return openSession(user);
  },

  async restore(token) {
    return userForToken(token);
  },

  async signOut(token) {
    const sessions = (await jsonStorage.get<Sessions>(SESSIONS_KEY)) ?? {};
    delete sessions[token];
    await jsonStorage.set(SESSIONS_KEY, sessions);
  },

  async updateProfile(token, patch) {
    await wait();
    const user = await userForToken(token);
    if (!user) throw new AuthError('session_expired', 'Sua sessão expirou. Entre novamente.');
    const updated = { ...user, ...patch };
    const accounts = await readAccounts();
    await jsonStorage.set(ACCOUNTS_KEY, { ...accounts, [user.email]: updated });
    return updated;
  },
};
