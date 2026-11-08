import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  DataAccessError,
  legacyKeyFor,
  parseDocument,
  parseSyncState,
  syncKeyFor,
  type UserDataRepository,
} from '@/data/repository-shared';

export { DataAccessError } from '@/data/repository-shared';
export type { StressTestResult, SyncState, UserDataRepository } from '@/data/repository-shared';

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
  async loadSyncState(userId) {
    try {
      return parseSyncState(await AsyncStorage.getItem(syncKeyFor(userId)));
    } catch (error) {
      console.error('Falha ao ler o estado da sincronização', error);
      return null;
    }
  },
  async saveSyncState(userId, state) {
    try {
      await AsyncStorage.setItem(syncKeyFor(userId), JSON.stringify(state));
    } catch (error) {
      console.error('Falha ao salvar o estado da sincronização', error);
      throw new DataAccessError('Não foi possível salvar o estado da sincronização.', error);
    }
  },
};
