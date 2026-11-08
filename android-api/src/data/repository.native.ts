import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SQLite from 'expo-sqlite';

import {
  DataAccessError,
  legacyKeyFor,
  parseDocument,
  parseSyncState,
  type StressTestResult,
  type UserDataRepository,
} from '@/data/repository-shared';
import type { UserData } from '@/data/types';

export { DataAccessError } from '@/data/repository-shared';
export type { StressTestResult, SyncState, UserDataRepository } from '@/data/repository-shared';

/**
 * Android: each user's document lives in a SQLite row. Every query runs inside
 * try/catch and logs the error (RNF-07); writes run in an exclusive
 * transaction, so a failure rolls back instead of leaving a half-written
 * record (US-21 CA-02).
 */

const DATABASE = 'mente-equilibrada.db';

let database: Promise<SQLite.SQLiteDatabase> | null = null;

function open(): Promise<SQLite.SQLiteDatabase> {
  database ??= (async () => {
    const db = await SQLite.openDatabaseAsync(DATABASE);
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS user_data (
        user_id TEXT PRIMARY KEY NOT NULL,
        version INTEGER NOT NULL,
        json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS sync_state (
        user_id TEXT PRIMARY KEY NOT NULL,
        json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    return db;
  })().catch((error) => {
    // Let the next call try again instead of caching a failed open.
    database = null;
    throw error;
  });
  return database;
}

/**
 * Every write goes through this one queue. `withExclusiveTransactionAsync` opens
 * its own connection, so two exclusive transactions started together (e.g. the
 * user's document and the sync state, written in the same instant by a sync)
 * would fail with "database is locked"; queued, each waits for the previous one.
 */
let writes: Promise<unknown> = Promise.resolve();

function queued<T>(task: () => Promise<T>): Promise<T> {
  const next = writes.catch(() => {}).then(task);
  writes = next.catch(() => {});
  return next;
}

async function run<T>(label: string, task: (db: SQLite.SQLiteDatabase) => Promise<T>): Promise<T> {
  try {
    return await task(await open());
  } catch (error) {
    console.error(`SQLite: ${label}`, error);
    throw error instanceof DataAccessError ? error : new DataAccessError(label, error);
  }
}

function write(db: SQLite.SQLiteDatabase, userId: string, version: number, json: string) {
  return queued(() =>
    db.withExclusiveTransactionAsync(async (txn) => {
      await txn.runAsync(
        `INSERT INTO user_data (user_id, version, json, updated_at) VALUES (?, ?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET version = excluded.version, json = excluded.json, updated_at = excluded.updated_at`,
        userId,
        version,
        json,
        new Date().toISOString(),
      );
    }),
  );
}

export const userDataRepository: UserDataRepository = {
  load: (userId) =>
    run('Não foi possível ler seus dados.', async (db) => {
      const row = await db.getFirstAsync<{ json: string }>(
        'SELECT json FROM user_data WHERE user_id = ?',
        userId,
      );
      if (row) return parseDocument(row.json);

      // One-time move from the AsyncStorage document used before SQLite.
      const legacy = await AsyncStorage.getItem(legacyKeyFor(userId));
      if (legacy === null) return null;
      const document = parseDocument(legacy);
      await write(db, userId, Number(document.version ?? 1), legacy);
      await AsyncStorage.removeItem(legacyKeyFor(userId)).catch(() => {});
      return document;
    }),

  save: (userId, data: UserData) =>
    run('Não foi possível salvar seus dados.', (db) =>
      write(db, userId, data.version, JSON.stringify(data)),
    ),

  loadSyncState: (userId) =>
    run('Não foi possível ler o estado da sincronização.', async (db) => {
      const row = await db.getFirstAsync<{ json: string }>('SELECT json FROM sync_state WHERE user_id = ?', userId);
      return parseSyncState(row?.json ?? null);
    }),

  saveSyncState: (userId, state) =>
    run('Não foi possível salvar o estado da sincronização.', (db) =>
      queued(() =>
        db.withExclusiveTransactionAsync(async (txn) => {
          await txn.runAsync(
            `INSERT INTO sync_state (user_id, json, updated_at) VALUES (?, ?, ?)
             ON CONFLICT(user_id) DO UPDATE SET json = excluded.json, updated_at = excluded.updated_at`,
            userId,
            JSON.stringify(state),
            new Date().toISOString(),
          );
        }),
      ),
    ),

  /**
   * US-21 CA-03: a load test that exercises the same path as the real writes
   * (exclusive transaction + upsert + read-back) on a scratch table, so the
   * user's own records are never touched. Each operation that throws, or reads
   * back something other than what it wrote, counts as a failure.
   */
  stressTest: (operations) =>
    run('Não foi possível executar o teste do banco.', async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS stress_test (id INTEGER PRIMARY KEY NOT NULL, json TEXT NOT NULL);
        DELETE FROM stress_test;
      `);
      const started = Date.now();
      let failures = 0;
      for (let index = 0; index < operations; index += 1) {
        const json = JSON.stringify({ index, at: new Date().toISOString(), padding: 'x'.repeat(256) });
        try {
          // Queued like the real writes, so the app keeps saving normally while the test runs.
          await queued(() =>
            db.withExclusiveTransactionAsync(async (txn) => {
              await txn.runAsync(
                'INSERT INTO stress_test (id, json) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET json = excluded.json',
                index % 50,
                json,
              );
            }),
          );
          const row = await db.getFirstAsync<{ json: string }>('SELECT json FROM stress_test WHERE id = ?', index % 50);
          if (row?.json !== json) failures += 1;
        } catch (error) {
          console.error('SQLite: falha no teste de carga', error);
          failures += 1;
        }
      }
      const result: StressTestResult = { operations, failures, durationMs: Date.now() - started };
      await db.execAsync('DROP TABLE IF EXISTS stress_test;').catch(() => {});
      return result;
    }),
};
