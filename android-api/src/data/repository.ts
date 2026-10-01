import AsyncStorage from '@react-native-async-storage/async-storage';

import { DataAccessError, legacyKeyFor, parseDocument, type UserDataRepository } from '@/data/repository-shared';

export { DataAccessError } from '@/data/repository-shared';
export type { UserDataRepository } from '@/data/repository-shared';

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
