import { firebaseAuthService } from '@/auth/firebase-auth-service';
import type { AuthService } from '@/auth/types';

/**
 * The single switch for the identity backend. Screens and `AuthProvider` only
 * talk to `AuthService`, so moving to another provider means writing one new
 * implementation and exporting it here — nothing else in the app changes.
 */
export const authService: AuthService = firebaseAuthService;
