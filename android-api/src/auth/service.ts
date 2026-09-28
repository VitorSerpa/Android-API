import { localAuthService } from '@/auth/local-auth-service';
import type { AuthService } from '@/auth/types';

/**
 * The single switch for the identity backend. When the real login system is
 * ready, implement `AuthService` against it (e.g. `api-auth-service.ts`) and
 * export that here instead. Nothing else in the app needs to change.
 */
export const authService: AuthService = localAuthService;
