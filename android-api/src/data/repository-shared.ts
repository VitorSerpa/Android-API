import type { UserData } from '@/data/types';

/**
 * Where a user's document is loaded from and saved to. Shared by the web
 * (`repository.ts`) and Android (`repository.native.ts`) implementations; it has
 * no platform variant, so `repository.native.ts` can import it without resolving
 * back to itself.
 *
 * `load` resolves `null` only when the user has no data yet. Any failure to
 * read — including a document that no longer parses — rejects with
 * `DataAccessError`, so the app never mistakes "couldn't read" for "empty" and
 * overwrites real records with a blank account (RNF-07 / US-21).
 */
export interface UserDataRepository {
  load(userId: string): Promise<Record<string, unknown> | null>;
  save(userId: string, data: UserData): Promise<void>;
}

export class DataAccessError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'DataAccessError';
  }
}

export const legacyKeyFor = (userId: string) => `mente:user:${userId}:data`;

export function parseDocument(raw: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new DataAccessError('Os dados salvos estão corrompidos.', error);
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new DataAccessError('Os dados salvos estão em um formato inesperado.');
  }
  return parsed as Record<string, unknown>;
}
