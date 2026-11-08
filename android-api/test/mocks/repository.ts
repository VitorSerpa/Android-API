import type { StressTestResult, SyncState } from '../../src/data/repository-shared.ts';

/**
 * In-memory stand-in for the SQLite repository, so the sync engine can run in
 * Node. `failNextSyncSave` simulates a database error (RNF-07).
 */
const syncStates = new Map<string, SyncState>();
const documents = new Map<string, unknown>();
export const repositoryControl = {
  failNextSyncSave: false,
  reset() {
    syncStates.clear();
    documents.clear();
    this.failNextSyncSave = false;
  },
  syncState: (userId: string) => syncStates.get(userId) ?? null,
};

export const userDataRepository = {
  async load(userId: string) {
    return (documents.get(userId) as Record<string, unknown> | undefined) ?? null;
  },
  async save(userId: string, data: unknown) {
    documents.set(userId, structuredClone(data));
  },
  async loadSyncState(userId: string) {
    const state = syncStates.get(userId);
    return state ? structuredClone(state) : null;
  },
  async saveSyncState(userId: string, state: SyncState) {
    if (repositoryControl.failNextSyncSave) {
      repositoryControl.failNextSyncSave = false;
      throw new Error('database is locked');
    }
    syncStates.set(userId, structuredClone(state));
  },
  async stressTest(operations: number): Promise<StressTestResult> {
    return { operations, failures: 0, durationMs: 0 };
  },
};
