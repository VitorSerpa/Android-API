import AsyncStorage from '@react-native-async-storage/async-storage';

import type { UserData } from '@/data/types';

/**
 * Where a user's document is loaded from and saved to.
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

/** Web: IndexedDB-backed AsyncStorage. Android uses SQLite (`repository.native.ts`). */
export const userDataRepository: UserDataRepository = {
  async load(userId) {
    let raw: string | null;
    try {
      raw = await AsyncStorage.getItem(legacyKeyFor(userId));
    } catch (error) {
      console.error('Falha ao ler dados do usuário', error);
      throw new DataAccessError('Não foi possível ler seus dados.', error);
    }
    return raw === null ? null : parseDocument(raw);
  },
  async save(userId, data) {
    try {
      await AsyncStorage.setItem(legacyKeyFor(userId), JSON.stringify(data));
    } catch (error) {
      console.error('Falha ao salvar dados do usuário', error);
      throw new DataAccessError('Não foi possível salvar seus dados.', error);
    }
  },
};
