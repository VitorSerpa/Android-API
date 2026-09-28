import { FirebaseError } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';

import { getFirebaseAuth } from '@/auth/firebase-auth';
import { AuthError, type AuthErrorCode, type AuthService, type Session, type User } from '@/auth/types';
import { isFirebaseConfigured } from '@/lib/firebase';

/**
 * Email/password login backed by Firebase Authentication. Firebase keeps its
 * own session (see `firebase-auth.ts`); `Session.token` is the user's Firebase
 * ID token, which a backend can verify with the Admin SDK.
 */

const ERRORS: Record<string, [AuthErrorCode, string]> = {
  // Newer projects answer every bad login with `invalid-credential` so that
  // attackers can't probe which e-mails have accounts.
  'auth/invalid-credential': ['invalid_credentials', 'E-mail ou senha incorretos.'],
  'auth/invalid-login-credentials': ['invalid_credentials', 'E-mail ou senha incorretos.'],
  'auth/wrong-password': ['invalid_credentials', 'E-mail ou senha incorretos.'],
  'auth/user-not-found': ['invalid_credentials', 'E-mail ou senha incorretos.'],
  'auth/invalid-email': ['invalid_email', 'E-mail inválido.'],
  'auth/missing-email': ['invalid_email', 'Informe seu e-mail.'],
  'auth/email-already-in-use': ['email_in_use', 'Já existe uma conta com este e-mail.'],
  'auth/weak-password': ['weak_password', 'Escolha uma senha mais forte.'],
  'auth/too-many-requests': [
    'too_many_requests',
    'Muitas tentativas seguidas. Aguarde alguns minutos e tente novamente.',
  ],
  'auth/user-disabled': ['user_disabled', 'Esta conta foi desativada.'],
  'auth/user-token-expired': ['session_expired', 'Sua sessão expirou. Entre novamente.'],
  'auth/requires-recent-login': ['session_expired', 'Sua sessão expirou. Entre novamente.'],
  'auth/network-request-failed': ['network', 'Sem conexão. Verifique sua internet e tente novamente.'],
  'auth/operation-not-allowed': [
    'not_configured',
    'Login por e-mail e senha não está ativado no projeto Firebase.',
  ],
  'auth/invalid-api-key': ['not_configured', 'Configuração do Firebase inválida.'],
  'auth/api-key-not-valid.-please-pass-a-valid-api-key.': [
    'not_configured',
    'Configuração do Firebase inválida.',
  ],
};

function toAuthError(error: unknown): AuthError {
  if (error instanceof AuthError) return error;
  if (error instanceof FirebaseError) {
    const known = ERRORS[error.code];
    if (known) return new AuthError(known[0], known[1]);
    console.warn('Firebase Auth:', error.code, error.message);
  } else {
    console.warn('Firebase Auth:', error);
  }
  return new AuthError('unknown', 'Não foi possível concluir. Tente novamente.');
}

/** Runs a Firebase call, turning every failure into an `AuthError` the screens can show. */
async function attempt<T>(run: () => Promise<T>): Promise<T> {
  if (!isFirebaseConfigured) {
    throw new AuthError('not_configured', 'Login indisponível: o Firebase não está configurado.');
  }
  try {
    return await run();
  } catch (error) {
    throw toAuthError(error);
  }
}

function toUser(user: FirebaseUser, name = user.displayName): User {
  const created = user.metadata.creationTime ? new Date(user.metadata.creationTime) : new Date();
  return {
    id: user.uid,
    name: name?.trim() || user.email?.split('@')[0] || 'Você',
    email: user.email ?? '',
    createdAt: created.toISOString(),
  };
}

async function toSession(user: FirebaseUser, name?: string): Promise<Session> {
  return { token: await user.getIdToken(), user: toUser(user, name) };
}

export const firebaseAuthService: AuthService = {
  signIn: ({ email, password }) =>
    attempt(async () => {
      const { user } = await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
      return toSession(user);
    }),

  signUp: ({ name, email, password }) =>
    attempt(async () => {
      const { user } = await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
      // The account already exists at this point, so a failed display-name write
      // mustn't fail the sign-up; the name can still be set later in Perfil.
      await updateProfile(user, { displayName: name }).catch((error) =>
        console.warn('Firebase Auth: displayName', error),
      );
      return toSession(user, name);
    }),

  restore: () =>
    attempt(async () => {
      const auth = getFirebaseAuth();
      // Resolves once Firebase has read its persisted session; works offline.
      await auth.authStateReady();
      return auth.currentUser ? toSession(auth.currentUser) : null;
    }),

  signOut: () => attempt(() => signOut(getFirebaseAuth())),

  updateProfile: (_token, patch) =>
    attempt(async () => {
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new AuthError('session_expired', 'Sua sessão expirou. Entre novamente.');
      if (patch.name !== undefined) await updateProfile(user, { displayName: patch.name });
      return toUser(user);
    }),

  resetPassword: (email) =>
    attempt(async () => {
      try {
        await sendPasswordResetEmail(getFirebaseAuth(), email);
      } catch (error) {
        // Projects without e-mail enumeration protection report unknown
        // addresses; answer as if the e-mail went out so nobody can probe accounts.
        if (error instanceof FirebaseError && error.code === 'auth/user-not-found') return;
        throw error;
      }
    }),
};
