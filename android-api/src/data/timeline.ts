import { ASSESSMENTS } from '@/data/assessments';
import { TOOL_NAMES } from '@/data/insights';
import { MOODS, type UserData } from '@/data/types';
import { toDayKey } from '@/lib/dates';

/**
 * RF-62 / US-16: every event recorded on a day, in chronological order (CA-01).
 * Pure domain logic: the screen only draws what this returns.
 *
 * Activities and symptoms are part of the day's health record, which has no
 * time of its own per item, so they appear at the moment that record was last
 * saved — the time the user actually registered them.
 */

export type TimelineKind = 'checkin' | 'health' | 'diary' | 'practice' | 'crisis' | 'achievement' | 'assessment' | 'thought';

export type TimelineEvent = {
  id: string;
  at: string;
  kind: TimelineKind;
  title: string;
  /** One-line summary under the title. */
  summary: string;
  /** Everything else, shown when the event is opened. */
  details: string[];
  /** Diary entries open in their own screen. */
  diaryEntryId?: string;
};

const KIND_TITLES = { free: 'Diário', gratitude: 'Gratidão', dream: 'Sonho' } as const;

export function dayTimeline(data: UserData, day: string): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const profileName = (id: string | null) => data.profiles.find((profile) => profile.id === id)?.name;
  const onDay = (iso: string) => toDayKey(new Date(iso)) === day;

  for (const item of data.checkIns.filter((checkIn) => checkIn.day === day)) {
    const profile = profileName(item.profileId);
    events.push({
      id: `checkin:${item.id}`,
      at: item.at,
      kind: 'checkin',
      title: `Humor: ${MOODS[item.mood]}`,
      summary: `Ansiedade ${item.anxiety}/10 · energia ${item.energy}/5`,
      details: [
        `Humor ${item.mood + 1}/5 (${MOODS[item.mood].toLowerCase()})`,
        `Ansiedade ${item.anxiety}/10`,
        `Energia ${item.energy}/5`,
        ...(profile ? [`Perfil de vida: ${profile}`] : []),
        ...(item.anxietyNote ? [`Observação: “${item.anxietyNote}”`] : []),
      ],
    });
  }

  const health = data.health[day];
  if (health && (health.activities.length || health.symptoms.length || health.sleepHours !== null || health.sleepQuality)) {
    const parts = [
      health.activities.length ? `Atividades: ${health.activities.join(', ')}` : null,
      health.symptoms.length ? `Sintomas: ${health.symptoms.join(', ')}` : null,
    ].filter((part): part is string => part !== null);
    events.push({
      id: `health:${day}`,
      at: health.updatedAt,
      kind: 'health',
      title: health.activities.length ? 'Atividades e saúde' : health.symptoms.length ? 'Sintomas e saúde' : 'Sono e saúde',
      summary: parts.join(' · ') || 'Registro de saúde',
      details: [
        ...parts,
        ...(health.sleepHours !== null ? [`Sono: ${String(health.sleepHours).replace('.', ',')} h`] : []),
        ...(health.awakenings !== null ? [`Despertares: ${health.awakenings}`] : []),
        ...(health.sleepQuality ? [`Qualidade do sono: ${health.sleepQuality.toLowerCase()}`] : []),
        ...(health.activityMinutes !== null ? [`Atividade física: ${health.activityMinutes} min`] : []),
        ...(health.weightKg !== null ? [`Peso: ${String(health.weightKg).replace('.', ',')} kg`] : []),
      ],
    });
  }

  for (const entry of data.diary.filter((item) => item.day === day && (item.text.trim() || item.attachments.length))) {
    const text = entry.kind === 'gratitude' ? (entry.gratitude ?? []).join(' · ') : entry.text.trim();
    const audio = entry.attachments.filter((item) => item.kind === 'audio').length;
    const photos = entry.attachments.filter((item) => item.kind === 'photo').length;
    events.push({
      id: `diary:${entry.id}`,
      at: entry.createdAt,
      kind: 'diary',
      title: entry.kind === 'dream' && entry.dreamEmotion ? `Sonho · ${entry.dreamEmotion}` : KIND_TITLES[entry.kind],
      summary: text || `${entry.attachments.length} anexo(s)`,
      details: [
        text,
        ...(photos ? [`${photos} foto${photos > 1 ? 's' : ''}`] : []),
        ...(audio ? [`${audio} áudio${audio > 1 ? 's' : ''}`] : []),
        ...entry.attachments.filter((item) => item.transcript).map((item) => `Áudio: “${item.transcript}”`),
      ].filter(Boolean),
      // The focus editor only shows text: entries with photos or audio expand in place instead (CA-01).
      diaryEntryId: entry.kind === 'free' && !entry.attachments.length ? entry.id : undefined,
    });
  }

  for (const item of data.practices.filter((practice) => onDay(practice.at))) {
    const minutes = Math.max(1, Math.round(item.durationSec / 60));
    events.push({
      id: `practice:${item.id}`,
      at: item.at,
      kind: 'practice',
      title: TOOL_NAMES[item.tool],
      summary: item.durationSec < 60 ? `${item.durationSec} s` : `${minutes} min`,
      details: [`Prática concluída: ${TOOL_NAMES[item.tool]}`, `Duração: ${item.durationSec < 60 ? `${item.durationSec} segundos` : `${minutes} minutos`}`],
    });
  }

  for (const item of data.crises.filter((crisis) => onDay(crisis.at))) {
    const triggers = [
      item.triggers.situation && `Situação: ${item.triggers.situation}`,
      item.triggers.place && `Local: ${item.triggers.place}`,
      item.triggers.thought && `Pensamento: ${item.triggers.thought}`,
    ].filter((part): part is string => Boolean(part));
    events.push({
      id: `crisis:${item.id}`,
      at: item.at,
      kind: 'crisis',
      title: 'Pico de ansiedade',
      summary: `Intensidade ${item.intensity}/10${item.triggers.situation ? ` · ${item.triggers.situation}` : ''}`,
      details: [
        `Intensidade ${item.intensity}/10`,
        ...triggers,
        ...(item.note ? [`Nota: ${item.note}`] : []),
        ...(item.location ? ['Local salvo com a sua permissão'] : []),
      ],
    });
  }

  for (const item of data.achievements.filter((note) => note.day === day)) {
    events.push({
      id: `achievement:${item.id}`,
      at: item.createdAt,
      kind: 'achievement',
      title: 'Conquista do dia',
      summary: item.title || `Nota de voz de ${item.durationSec} s`,
      details: [item.title || 'Nota de voz sem título', `Duração: ${item.durationSec} s`],
    });
  }

  for (const item of data.assessments.filter((result) => onDay(result.at))) {
    const test = ASSESSMENTS[item.kind];
    events.push({
      id: `assessment:${item.id}`,
      at: item.at,
      kind: 'assessment',
      title: test.title,
      summary: `Pontuação ${item.score}/${test.maxScore}`,
      details: [`${test.title}: ${item.score} de ${test.maxScore} pontos`],
    });
  }

  for (const item of data.thoughts.filter((thought) => onDay(thought.at))) {
    events.push({
      id: `thought:${item.id}`,
      at: item.at,
      kind: 'thought',
      title: 'Pensamento reestruturado',
      summary: `“${item.negative}”`,
      details: [`Pensamento: “${item.negative}”`, ...(item.feeling ? [`Sentimento: ${item.feeling}`] : []), `Alternativa: ${item.alternative}`],
    });
  }

  return events.sort((a, b) => a.at.localeCompare(b.at));
}
