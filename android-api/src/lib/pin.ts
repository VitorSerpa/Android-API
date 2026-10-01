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

/** Wrong attempts before a pause, and how long it lasts. */
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 30_000;

const keyFor = (userId: string) => `mente.pin.${userId.replace(/[^A-Za-z0-9._-]/g, '_')}`;

const toHex = (bytes: Uint8Array) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

async function derive(pin: string, salt: string, iterations: number): Promise<string> {
  let hash = `${salt}:${pin}`;
  for (let round = 0; round < iterations; round += 1) {
    hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}${hash}`);
  }
  return hash;
}

async function read(userId: string): Promise<StoredPin | null> {
  const raw = await secureStorage.get(keyFor(userId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredPin;
  } catch {
    return null;
  }
}

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
}

let failures = 0;
let lockedUntil = 0;

export type VerifyResult = { ok: true } | { ok: false; retryInSec: number | null };

export async function verifyPin(userId: string, pin: string): Promise<VerifyResult> {
  if (Date.now() < lockedUntil) return { ok: false, retryInSec: Math.ceil((lockedUntil - Date.now()) / 1000) };
  const stored = await read(userId);
  if (!stored) return { ok: true };
  const hash = await derive(pin, stored.salt, stored.iterations);
  if (hash === stored.hash) {
    failures = 0;
    return { ok: true };
  }
  failures += 1;
  if (failures >= MAX_ATTEMPTS) {
    failures = 0;
    lockedUntil = Date.now() + LOCKOUT_MS;
    return { ok: false, retryInSec: LOCKOUT_MS / 1000 };
  }
  return { ok: false, retryInSec: null };
}
