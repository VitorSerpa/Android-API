import type { UserData } from '@/data/types';
import { jsonStorage } from '@/lib/storage';

/**
 * Where a user's document is loaded from and saved to. The local version keeps
 * it on the device; a backend version would call the API with the session
 * token, and can wrap this one as an offline cache.
 */
export interface UserDataRepository {
  load(userId: string): Promise<Partial<UserData> | null>;
  save(userId: string, data: UserData): Promise<void>;
}

const keyFor = (userId: string) => `mente:user:${userId}:data`;

export const localUserDataRepository: UserDataRepository = {
  load: (userId) => jsonStorage.get<Partial<UserData>>(keyFor(userId)),
  save: (userId, data) => jsonStorage.set(keyFor(userId), data),
};

export const userDataRepository: UserDataRepository = localUserDataRepository;
