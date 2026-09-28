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
  | 'invalid_email'
  | 'email_in_use'
  | 'weak_password'
  | 'too_many_requests'
  | 'user_disabled'
  | 'session_expired'
  | 'not_configured'
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
  /**
   * Validates a stored session on launch and returns it with a fresh token.
   * Resolve `null` when it is no longer valid; throw `AuthError('network')`
   * when that can't be checked right now.
   */
  restore(token: string): Promise<Session | null>;
  signOut(token: string): Promise<void>;
  updateProfile(token: string, patch: ProfilePatch): Promise<User>;
  /** Emails a password-reset link. Resolves even for unknown addresses. */
  resetPassword(email: string): Promise<void>;
}
