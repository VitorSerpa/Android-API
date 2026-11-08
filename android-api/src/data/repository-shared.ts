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
  /** RF-58: the last copy agreed with the server and its revision. `null` before the first sync. */
  loadSyncState(userId: string): Promise<SyncState | null>;
  saveSyncState(userId: string, state: SyncState): Promise<void>;
  /** US-21 CA-03: runs `operations` transactional writes on a scratch table and counts the failures. */
  stressTest?(operations: number): Promise<StressTestResult>;
}

/** What the device remembers about the server copy (RF-58). */
export type SyncState = {
  /** Server revision `base` corresponds to; 0 before anything was sent. */
  revision: number;
  /** The document as of that revision — the common ancestor of the three-way merge. */
  base: UserData | null;
  lastSyncAt: string | null;
};

export type StressTestResult = { operations: number; failures: number; durationMs: number };

export const syncKeyFor = (userId: string) => `mente:user:${userId}:sync`;

export function parseSyncState(raw: string | null): SyncState | null {
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<SyncState>;
    if (typeof parsed.revision !== 'number') return null;
    return { revision: parsed.revision, base: parsed.base ?? null, lastSyncAt: parsed.lastSyncAt ?? null };
  } catch {
    // A broken sync state only costs a full merge on the next sync, never data.
    return null;
  }
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
