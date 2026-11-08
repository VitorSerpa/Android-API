import { createDefaultUserData } from '@/data/defaults';
import type { CheckIn, DailyHealth, DiaryEntry, Practice, UserData } from '@/data/types';
import { toDayKey } from '@/lib/dates';

/** A fresh account's document. */
export const freshData = (): UserData => createDefaultUserData();

let seq = 0;
const nextId = (prefix: string) => `${prefix}-${++seq}`;

/** Local noon of `day` (YYYY-MM-DD) plus `minutes`, as an ISO string. */
export function at(day: string, hour = 12, minute = 0): string {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d, hour, minute).toISOString();
}

export function checkIn(day: string, patch: Partial<CheckIn> = {}): CheckIn {
  return { id: nextId('c'), day, at: at(day, 9), mood: 2, anxiety: 3, anxietyNote: '', energy: 3, profileId: null, ...patch };
}

export function health(day: string, patch: Partial<DailyHealth> = {}): DailyHealth {
  return {
    day,
    sleepHours: null,
    awakenings: null,
    sleepQuality: null,
    sleepSource: null,
    symptoms: [],
    activities: [],
    weightKg: null,
    activityMinutes: null,
    updatedAt: at(day, 10),
    ...patch,
  };
}

export function diary(day: string, text: string, patch: Partial<DiaryEntry> = {}): DiaryEntry {
  return {
    id: nextId('d'),
    day,
    kind: 'free',
    profileId: null,
    text,
    gratitude: null,
    dreamEmotion: null,
    attachments: [],
    createdAt: at(day, 20),
    updatedAt: at(day, 20),
    ...patch,
  };
}

export function practice(when: Date, tool: Practice['tool'], durationSec = 60): Practice {
  return { id: nextId('p'), tool, at: when.toISOString(), durationSec };
}

export const today = () => toDayKey();

/** `count` days before today, as a day key. */
export function daysAgo(count: number): string {
  const date = new Date();
  date.setDate(date.getDate() - count);
  return toDayKey(date);
}
