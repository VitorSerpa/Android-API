import { createDefaultUserData } from '@/data/defaults';
import type { UserData } from '@/data/types';

/**
 * Three-way merge of the user's document (RF-58 / US-14). Pure domain logic,
 * no React and no I/O.
 *
 * - `base`: the copy both sides last agreed on (the last successful sync);
 * - `local`: this device now; `remote`: the server now.
 *
 * A side that did not change a value since `base` takes the other side's
 * value. Lists of records are merged by `id` (or `token`), so a check-in made
 * offline is added once, never twice (CA-01), and a record deleted on one side
 * stays deleted unless the other side edited it. When both sides edited the
 * same scalar, this device wins: it is what the user is looking at.
 */

type Json = unknown;
type JsonObject = Record<string, Json>;

const isObject = (value: Json): value is JsonObject =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

export function deepEqual(a: Json, b: Json): boolean {
  if (a === b) return true;
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    return a.every((item, index) => deepEqual(item, b[index]));
  }
  if (isObject(a)) {
    if (!isObject(b)) return false;
    const keys = Object.keys(a);
    if (keys.length !== Object.keys(b).length) return false;
    return keys.every((key) => Object.hasOwn(b, key) && deepEqual(a[key], b[key]));
  }
  return false;
}

function recordKey(item: Json): string | null {
  if (!isObject(item)) return null;
  if (typeof item.id === 'string' && item.id) return `id:${item.id}`;
  if (typeof item.token === 'string' && item.token) return `token:${item.token}`;
  return null;
}

const isRecordList = (list: readonly Json[]) => list.every((item) => recordKey(item) !== null);
const isPrimitiveList = (list: readonly Json[]) => list.every((item) => item === null || typeof item !== 'object');

function indexBy(list: readonly Json[]): Map<string, Json> {
  const map = new Map<string, Json>();
  for (const item of list) map.set(recordKey(item)!, item);
  return map;
}

function mergeRecordLists(base: readonly Json[], local: readonly Json[], remote: readonly Json[]): Json[] {
  const baseIndex = indexBy(base);
  const remoteIndex = indexBy(remote);
  const localKeys = new Set<string>();
  const result: Json[] = [];

  for (const item of local) {
    const key = recordKey(item)!;
    localKeys.add(key);
    const inBase = baseIndex.has(key);
    if (remoteIndex.has(key)) {
      result.push(merge3(baseIndex.get(key), item, remoteIndex.get(key)));
    } else if (!inBase || !deepEqual(baseIndex.get(key), item)) {
      // New here, or edited here while the other side deleted it: keep it.
      result.push(item);
    }
    // Otherwise it was deleted on the server and untouched here: drop it.
  }

  for (const item of remote) {
    const key = recordKey(item)!;
    if (localKeys.has(key)) continue;
    const inBase = baseIndex.has(key);
    // New on the server, or edited there while deleted here: bring it in.
    if (!inBase || !deepEqual(baseIndex.get(key), item)) result.push(item);
  }
  return result;
}

function mergePrimitiveLists(base: readonly Json[], local: readonly Json[], remote: readonly Json[]): Json[] {
  const inBase = (value: Json) => base.includes(value);
  const kept = local.filter((value) => remote.includes(value) || !inBase(value));
  const added = remote.filter((value) => !local.includes(value) && !inBase(value));
  return [...kept, ...added];
}

function mergeObjects(base: JsonObject, local: JsonObject, remote: JsonObject): JsonObject {
  const result: JsonObject = {};
  const keys = [...Object.keys(local), ...Object.keys(remote).filter((key) => !Object.hasOwn(local, key))];
  for (const key of keys) {
    const inLocal = Object.hasOwn(local, key);
    const inRemote = Object.hasOwn(remote, key);
    const inBase = Object.hasOwn(base, key);
    if (inLocal && inRemote) {
      result[key] = merge3(base[key], local[key], remote[key]);
    } else if (inLocal) {
      if (!inBase || !deepEqual(base[key], local[key])) result[key] = local[key];
    } else if (!inBase || !deepEqual(base[key], remote[key])) {
      result[key] = remote[key];
    }
  }
  return result;
}

export function merge3(base: Json, local: Json, remote: Json): Json {
  if (deepEqual(local, remote)) return local;
  if (base !== undefined && deepEqual(base, local)) return remote;
  if (base !== undefined && deepEqual(base, remote)) return local;

  if (Array.isArray(local) && Array.isArray(remote)) {
    const baseList = Array.isArray(base) ? base : [];
    if (isRecordList(local) && isRecordList(remote) && isRecordList(baseList)) {
      return mergeRecordLists(baseList, local, remote);
    }
    if (isPrimitiveList(local) && isPrimitiveList(remote)) return mergePrimitiveLists(baseList, local, remote);
    return local;
  }
  if (isObject(local) && isObject(remote)) return mergeObjects(isObject(base) ? base : {}, local, remote);
  return local;
}

/** Newest first, as the screens expect, for the lists whose order is chronological. */
const NEWEST_FIRST: Partial<Record<keyof UserData, string>> = {
  checkIns: 'at',
  diary: 'createdAt',
  practices: 'at',
  ratings: 'at',
  thoughts: 'at',
  assessments: 'at',
  crises: 'at',
  intakes: 'takenAt',
  achievements: 'createdAt',
};

/**
 * Merges two versions of the user's document. `base` is `null` on the first
 * sync of a device: then the base is a brand-new account, so records on both
 * sides are joined, a setting the device never touched takes the server's
 * value, and a default item deleted elsewhere stays deleted.
 */
export function mergeUserData(base: UserData | null, local: UserData, remote: UserData): UserData {
  const merged = merge3(base ?? createDefaultUserData(), local, remote) as UserData;
  const sorted = { ...merged } as Record<string, Json>;
  for (const [key, field] of Object.entries(NEWEST_FIRST)) {
    const list = sorted[key];
    if (!Array.isArray(list)) continue;
    sorted[key] = [...list].sort((a, b) => {
      const at = isObject(a) ? String(a[field!] ?? '') : '';
      const bt = isObject(b) ? String(b[field!] ?? '') : '';
      return bt.localeCompare(at);
    });
  }
  return { ...(sorted as UserData), version: local.version };
}
