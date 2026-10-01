import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SQLite from 'expo-sqlite';

import {
  DataAccessError,
  legacyKeyFor,
  parseDocument,
  type UserDataRepository,
} from '@/data/repository';
import type { UserData } from '@/data/types';

export { DataAccessError } from '@/data/repository';

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
    `);
    return db;
  })().catch((error) => {
    // Let the next call try again instead of caching a failed open.
    database = null;
    throw error;
  });
  return database;
}

async function run<T>(label: string, task: (db: SQLite.SQLiteDatabase) => Promise<T>): Promise<T> {
  try {
    return await task(await open());
  } catch (error) {
    console.error(`SQLite: ${label}`, error);
    throw error instanceof DataAccessError ? error : new DataAccessError(label, error);
  }
}

async function write(db: SQLite.SQLiteDatabase, userId: string, version: number, json: string) {
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync(
      `INSERT INTO user_data (user_id, version, json, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET version = excluded.version, json = excluded.json, updated_at = excluded.updated_at`,
      userId,
      version,
      json,
      new Date().toISOString(),
    );
  });
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
};
