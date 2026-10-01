import { migrate } from '@/data/defaults';
import type { Attachment, UserData } from '@/data/types';
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

type BackupFile = {
  app: typeof APP_ID;
  format: typeof FORMAT;
  exportedAt: string;
  data: UserData;
};

const extensionOf = (attachment: Attachment) => (attachment.kind === 'audio' ? 'm4a' : 'jpg');

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
  const file: BackupFile = { app: APP_ID, format: FORMAT, exportedAt: new Date().toISOString(), data: { ...data, diary } };
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
  };
}
