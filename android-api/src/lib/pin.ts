import * as Crypto from 'expo-crypto';

import { secureStorage } from '@/lib/storage';

/**
 * Security PIN (RF-36). Only a salted, stretched SHA-256 hash is stored — the
 * PIN itself never touches the disk (CA-02) — and it lives in the Android
 * Keystore through `expo-secure-store` (the Expo equivalent of
 * react-native-encrypted-storage).
 */

type StoredPin = { salt: string; hash: string; iterations: number };

const ITERATIONS = 1000;
export const PIN_LENGTH = { min: 4, max: 6 } as const;

/** Wrong attempts before a pause; each pause doubles (30 s, 1 min, 2 min…) up to the cap. */
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 30_000;
const MAX_LOCKOUT_MS = 60 * 60_000;

const safeId = (userId: string) => userId.replace(/[^A-Za-z0-9._-]/g, '_');
const keyFor = (userId: string) => `mente.pin.${safeId(userId)}`;
/** Failed attempts live in the Keystore too, so closing the app doesn't reset them. */
const attemptsKeyFor = (userId: string) => `mente.pin-attempts.${safeId(userId)}`;

const toHex = (bytes: Uint8Array) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

async function derive(pin: string, salt: string, iterations: number): Promise<string> {
  let hash = `${salt}:${pin}`;
  for (let round = 0; round < iterations; round += 1) {
    hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}${hash}`);
  }
  return hash;
}

/** `'corrupt'` when a PIN is stored but unreadable: that must lock, never unlock. */
async function read(userId: string): Promise<StoredPin | 'corrupt' | null> {
  const raw = await secureStorage.get(keyFor(userId));
  if (!raw) return null;
  try {
    const stored = JSON.parse(raw) as StoredPin;
    return stored && typeof stored.salt === 'string' && typeof stored.hash === 'string' && stored.iterations > 0 ? stored : 'corrupt';
  } catch {
    return 'corrupt';
  }
}

type Attempts = { failures: number; lockouts: number; lockedUntil: number };

async function readAttempts(userId: string): Promise<Attempts> {
  const empty = { failures: 0, lockouts: 0, lockedUntil: 0 };
  try {
    const raw = await secureStorage.get(attemptsKeyFor(userId));
    return raw ? { ...empty, ...(JSON.parse(raw) as Partial<Attempts>) } : empty;
  } catch {
    return empty;
  }
}

const writeAttempts = (userId: string, attempts: Attempts | null) =>
  secureStorage.set(attemptsKeyFor(userId), attempts ? JSON.stringify(attempts) : null);

export const isValidPin = (pin: string) =>
  new RegExp(`^\\d{${PIN_LENGTH.min},${PIN_LENGTH.max}}$`).test(pin);

export async function hasPin(userId: string): Promise<boolean> {
  return (await read(userId)) !== null;
}

export async function setPin(userId: string, pin: string): Promise<void> {
  if (!isValidPin(pin)) throw new Error(`O PIN deve ter de ${PIN_LENGTH.min} a ${PIN_LENGTH.max} números.`);
  const salt = toHex(Crypto.getRandomBytes(16));
  const hash = await derive(pin, salt, ITERATIONS);
  await secureStorage.set(keyFor(userId), JSON.stringify({ salt, hash, iterations: ITERATIONS } satisfies StoredPin));
}

export async function clearPin(userId: string): Promise<void> {
  await secureStorage.set(keyFor(userId), null);
  await writeAttempts(userId, null);
}

/** Message for a wrong PIN, with the wait in seconds or minutes after too many attempts. */
export function pinErrorMessage(retryInSec: number | null): string {
  if (!retryInSec) return 'PIN incorreto. Tente novamente.';
  const wait = retryInSec < 60 ? `${retryInSec} s` : `${Math.ceil(retryInSec / 60)} min`;
  return `Muitas tentativas. Aguarde ${wait}.`;
}

export type VerifyResult = { ok: true } | { ok: false; retryInSec: number | null };

export async function verifyPin(userId: string, pin: string): Promise<VerifyResult> {
  const attempts = await readAttempts(userId);
  if (Date.now() < attempts.lockedUntil) {
    return { ok: false, retryInSec: Math.ceil((attempts.lockedUntil - Date.now()) / 1000) };
  }
  const stored = await read(userId);
  if (!stored) return { ok: true };
  // Unreadable PIN record: only "Esqueci meu PIN" (signing in again) gets past it.
  if (stored === 'corrupt') return { ok: false, retryInSec: null };
  const hash = await derive(pin, stored.salt, stored.iterations);
  if (hash === stored.hash) {
    if (attempts.failures || attempts.lockouts) await writeAttempts(userId, null);
    return { ok: true };
  }
  const failures = attempts.failures + 1;
  if (failures >= MAX_ATTEMPTS) {
    const lockouts = attempts.lockouts + 1;
    const wait = Math.min(LOCKOUT_MS * 2 ** (lockouts - 1), MAX_LOCKOUT_MS);
    await writeAttempts(userId, { failures: 0, lockouts, lockedUntil: Date.now() + wait });
    return { ok: false, retryInSec: Math.ceil(wait / 1000) };
  }
  await writeAttempts(userId, { ...attempts, failures });
  return { ok: false, retryInSec: null };
}
