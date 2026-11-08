import { migrate } from '@/data/defaults';
import type { AchievementNote, Attachment, UserData } from '@/data/types';
import { toDayKey } from '@/lib/dates';
import { pickJsonText, shareJson } from '@/lib/files';
import { mediaFromBase64, mediaToBase64 } from '@/lib/media';

/**
 * Full backup in one JSON file (RF-38). Every record type is included (CA-04)
 * and photos/voice notes travel inside it as base64, so importing the file on
 * another phone restores everything.
 */

const APP_ID = 'mente-equilibrada';
const FORMAT = 1;

type BackupAttachment = Attachment & { base64?: string | null };
type BackupAchievement = AchievementNote & { base64?: string | null };

type BackupFile = {
  app: typeof APP_ID;
  format: typeof FORMAT;
  exportedAt: string;
  data: UserData;
};

/** Keeps the file's own extension: recordings are `.m4a`, or `.wav` when they were transcribed (RF-60). */
export function extensionOf(item: { uri: string; kind?: Attachment['kind'] }): string {
  const match = /\.([a-z0-9]{2,4})(?:[?#].*)?$/i.exec(item.uri);
  if (match) return match[1].toLowerCase();
  const mime = /^data:([^;]+);/.exec(item.uri)?.[1];
  if (mime === 'audio/wav' || mime === 'audio/x-wav') return 'wav';
  if (mime?.startsWith('audio/')) return 'm4a';
  return item.kind === 'photo' ? 'jpg' : 'm4a';
}

export async function exportBackup(data: UserData): Promise<void> {
  const diary = await Promise.all(
    data.diary.map(async (entry) => ({
      ...entry,
      attachments: await Promise.all(
        entry.attachments.map(async (attachment): Promise<BackupAttachment> => ({
          ...attachment,
          base64: await mediaToBase64(attachment.uri),
        })),
      ),
    })),
  );
  const achievements = await Promise.all(
    data.achievements.map(async (note): Promise<BackupAchievement> => ({ ...note, base64: await mediaToBase64(note.uri) })),
  );
  const file: BackupFile = {
    app: APP_ID,
    format: FORMAT,
    exportedAt: new Date().toISOString(),
    data: { ...data, diary, achievements },
  };
  await shareJson(JSON.stringify(file, null, 2), `mente-equilibrada-backup-${toDayKey()}.json`, 'Exportar meus dados');
}

export class BackupFormatError extends Error {}

/** Parses and validates a backup, restoring attachments. `null` when the user cancels. */
export async function readBackup(): Promise<UserData | null> {
  const text = await pickJsonText();
  if (text === null) return null;

  let parsed: Partial<BackupFile>;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new BackupFormatError('O arquivo não é um JSON válido.');
  }
  if (parsed.app !== APP_ID || !parsed.data || typeof parsed.data !== 'object') {
    throw new BackupFormatError('Este arquivo não é um backup do Mente Equilibrada.');
  }

  const data = migrate(parsed.data as unknown as Record<string, unknown>);
  return {
    ...data,
    diary: data.diary.map((entry) => ({
      ...entry,
      attachments: (entry.attachments as BackupAttachment[])
        .map(({ base64, ...attachment }) =>
          base64 ? { ...attachment, uri: mediaFromBase64(base64, extensionOf(attachment)) } : null,
        )
        .filter((item): item is Attachment => item !== null),
    })),
    achievements: (data.achievements as BackupAchievement[])
      .map(({ base64, ...note }) => (base64 ? { ...note, uri: mediaFromBase64(base64, extensionOf(note)) } : null))
      .filter((item): item is AchievementNote => item !== null),
  };
}
