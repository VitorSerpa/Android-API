import { startOfPeriod } from '@/data/insights';
import { buildWeeklyReport, reportLines } from '@/data/report';
import type { SupporterInvite, UserData } from '@/data/types';
import type { UserDataActions } from '@/data/user-data-context';
import { ApiError, createInvite, putInviteSummary, revokeInvite } from '@/lib/api';
import { toDayKey } from '@/lib/dates';
import { secureStorage } from '@/lib/storage';

/**
 * Supporter invites (RF-55). The link opens a page on the server with an
 * anonymous weekly summary — no name, e-mail or diary text ever leaves the
 * phone, only the aggregated lines of `reportLines`. The key that manages the
 * invite stays in the Keystore.
 */

const ownerKeyFor = (token: string) => `mente.invite.${token.replace(/[^A-Za-z0-9._-]/g, '_')}`;

/** Monday of the current week, as a day key: each week is sent once. */
export const weekKey = (date: Date = new Date()) => toDayKey(startOfPeriod(date, 'week'));

async function sendSummary(invite: SupporterInvite, data: UserData) {
  const ownerKey = await secureStorage.get(ownerKeyFor(invite.token));
  if (!ownerKey) return false;
  const report = buildWeeklyReport(data);
  await putInviteSummary(invite.token, ownerKey, {
    periodLabel: report.periodLabel,
    generatedAt: new Date().toISOString(),
    lines: report.hasData ? reportLines(report) : ['Ainda não há registros nesta semana.'],
  });
  return true;
}

export async function createSupporterInvite(label: string, data: UserData, actions: UserDataActions): Promise<SupporterInvite> {
  const created = await createInvite();
  await secureStorage.set(ownerKeyFor(created.token), created.ownerKey);
  const invite: SupporterInvite = {
    token: created.token,
    url: created.url,
    label: label.trim() || 'Pessoa de confiança',
    createdAt: new Date().toISOString(),
    lastSentWeek: null,
  };
  actions.addInvite(invite);
  if (await sendSummary(invite, data).catch(() => false)) actions.markInviteSent(invite.token, weekKey());
  return invite;
}

/** Sends this week's summary to every invite that hasn't got it yet. Failures retry on the next launch. */
export async function pushWeeklySummaries(data: UserData, actions: UserDataActions) {
  const week = weekKey();
  for (const invite of data.invites.filter((item) => item.lastSentWeek !== week)) {
    try {
      if (await sendSummary(invite, data)) actions.markInviteSent(invite.token, week);
    } catch (error) {
      console.warn('Resumo semanal não enviado', error);
    }
  }
}

/** CA-02: revoking kills the link on the server; the local entry goes only after that succeeds. */
export async function revokeSupporterInvite(invite: SupporterInvite, actions: UserDataActions) {
  const ownerKey = await secureStorage.get(ownerKeyFor(invite.token));
  if (ownerKey) {
    await revokeInvite(invite.token, ownerKey).catch((error: unknown) => {
      // Already gone on the server: nothing left to revoke.
      if (!(error instanceof ApiError && (error.status === 404 || error.status === 410))) throw error;
    });
  }
  await secureStorage.set(ownerKeyFor(invite.token), null);
  actions.removeInvite(invite.token);
}
