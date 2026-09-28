export type User = {
  id: string;
  name: string;
  email: string;
  /** ISO timestamp — drives "Com você há N dias" in Perfil. */
  createdAt: string;
};

export type Session = {
  /** Opaque bearer token. Persisted in secure storage and sent to the API. */
  token: string;
  user: User;
};

export type SignInInput = { email: string; password: string };
export type SignUpInput = { name: string; email: string; password: string };
export type ProfilePatch = Partial<Pick<User, 'name'>>;

export type AuthErrorCode =
  | 'invalid_credentials'
  | 'email_in_use'
  | 'session_expired'
  | 'network'
  | 'unknown';

export class AuthError extends Error {
  constructor(
    public readonly code: AuthErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Everything the app needs from an identity backend. The screens and
 * `AuthProvider` only talk to this interface, so plugging in the real login
 * system means writing one new implementation and exporting it from
 * `src/auth/index.ts` — no screen changes.
 */
export interface AuthService {
  signIn(input: SignInInput): Promise<Session>;
  signUp(input: SignUpInput): Promise<Session>;
  /** Validates a stored token on launch. Resolve `null` when it is no longer valid. */
  restore(token: string): Promise<User | null>;
  signOut(token: string): Promise<void>;
  updateProfile(token: string, patch: ProfilePatch): Promise<User>;
}
