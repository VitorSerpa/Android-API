import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { ChoiceChips, TimeField, TimeList } from '@/components/mente/fields';
import { Icon } from '@/components/mente/icon';
import { StackScreen } from '@/components/mente/stack-screen';
import { Button, Card, Chevron, Input, MIN_TOUCH, Spacer, Toggle, TOUCH_SLOP, TopBar } from '@/components/mente/ui';
import { MenteRadius, MenteType } from '@/constants/mente-theme';
import type { Reminder, ReminderKind } from '@/data/types';
import { useUserData } from '@/data/user-data-context';
import { toDayKey } from '@/lib/dates';
import { confirm } from '@/lib/dialogs';
import { ensurePermission, notificationsSupported } from '@/lib/notifications';
import { deferPastQuietHours } from '@/lib/reminder-schedule';
import { timesEvery } from '@/lib/time';
import { makeStyles, useColors } from '@/theme';

const KIND_NAMES: Record<ReminderKind, string> = {
  checkin: 'Check-in de humor',
  hydration: 'Hidratação',
  break: 'Pausa ativa',
  stretch: 'Alongamento',
  custom: 'Outro',
};
const KINDS = Object.keys(KIND_NAMES) as ReminderKind[];

const PRESETS: Partial<Record<ReminderKind, { label: string; times: () => string[] }>> = {
  checkin: { label: 'Ao acordar, meio-dia e ao dormir', times: () => ['08:00', '12:00', '21:30'] },
  hydration: { label: 'A cada 2 h, das 9h às 19h', times: () => timesEvery(2, '09:00', '19:00') },
  break: { label: 'A cada 90 min, das 9h às 18h', times: () => timesEvery(1.5, '09:00', '18:00') },
  stretch: { label: '10:00, 15:00 e 17:30', times: () => ['10:00', '15:00', '17:30'] },
};

export default function RemindersScreen() {
  const styles = useStyles();
  const c = useColors();
  const router = useRouter();
  const { data, actions } = useUserData();
  const [creating, setCreating] = useState(false);
  const [permission, setPermission] = useState<boolean | null>(null);
  const quiet = data.settings.quietHours;

  useEffect(() => {
    if (notificationsSupported) ensurePermission().then(setPermission, () => setPermission(false));
  }, []);

  return (
    <StackScreen>
      <TopBar title="Lembretes" />

      {!notificationsSupported ? (
        <Text style={styles.note}>As notificações aparecem no app para Android. Nesta prévia web só a lista é salva.</Text>
      ) : permission === false ? (
        <Card style={styles.warning}>
          <Text style={styles.warningText}>As notificações estão bloqueadas. Permita-as nas configurações do Android para receber os lembretes.</Text>
          <Button label="Tentar permitir" variant="secondary" onPress={() => ensurePermission().then(setPermission)} />
        </Card>
      ) : null}

      <Pressable accessibilityRole="button" onPress={() => router.push('/medications')} style={({ pressed }) => [styles.linkCard, pressed && styles.pressed]}>
        <Icon name="clipboard" size={18} color={c.accent} cutColor={c.surface} />
        <View style={styles.flex}>
          <Text style={styles.rowTitle}>Medicamentos e suplementos</Text>
          <Text style={styles.rowDetail}>
            {data.medications.length ? `${data.medications.length} cadastrados · lembrete até você tocar em “Tomei”` : 'Cadastre horário e dosagem'}
          </Text>
        </View>
        <Chevron />
      </Pressable>

      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <Icon name="bell" size={16} color={c.accent} />
          <Text style={styles.cardTitle}>Lembretes</Text>
          <Spacer />
          <Pressable accessibilityRole="button" hitSlop={TOUCH_SLOP} onPress={() => setCreating((value) => !value)}>
            <Text style={styles.link}>{creating ? 'Cancelar' : '+ Novo'}</Text>
          </Pressable>
        </View>

        {creating ? <NewReminder onDone={() => setCreating(false)} /> : null}

        {data.reminders.length === 0 ? <Text style={styles.rowDetail}>Nenhum lembrete. Toque em “+ Novo” para criar.</Text> : null}
        {data.reminders.map((reminder) => (
          <ReminderRow key={reminder.id} reminder={reminder} />
        ))}
      </Card>

      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <Icon name="moon" size={16} color={c.accent} />
          <View style={styles.flex}>
            <Text style={styles.cardTitle}>Silêncio noturno</Text>
            <Text style={styles.rowDetail}>Nenhuma notificação é enviada nesse horário.</Text>
          </View>
          <Toggle
            accessibilityLabel="Silêncio noturno"
            value={quiet.enabled}
            onValueChange={(enabled) => actions.updateSettings({ quietHours: { ...quiet, enabled } })}
          />
        </View>
        {quiet.enabled ? (
          <>
            <View style={styles.timeRow}>
              <TimeField label="Início" value={quiet.start} onChange={(start) => actions.updateSettings({ quietHours: { ...quiet, start } })} />
              <TimeField label="Fim" value={quiet.end} onChange={(end) => actions.updateSettings({ quietHours: { ...quiet, end } })} />
            </View>
            <Text style={styles.rowDetail}>Lembretes marcados dentro desse período são adiados para as {quiet.end}.</Text>
          </>
        ) : null}
      </Card>
    </StackScreen>
  );
}

function NewReminder({ onDone }: { onDone: () => void }) {
  const styles = useStyles();
  const { actions } = useUserData();
  const [kind, setKind] = useState<ReminderKind>('hydration');
  const [title, setTitle] = useState(KIND_NAMES.hydration);
  const [times, setTimes] = useState<string[]>(PRESETS.hydration!.times());
  const preset = PRESETS[kind];

  const pickKind = (next: ReminderKind) => {
    setKind(next);
    setTitle(next === 'custom' ? '' : KIND_NAMES[next]);
    setTimes(PRESETS[next]?.times() ?? []);
  };

  const add = () => {
    actions.addReminder({ kind, title: title.trim(), times });
    onDone();
  };

  return (
    <View style={styles.editor}>
      <ChoiceChips label="Tipo de lembrete" options={KINDS} renderLabel={(value) => KIND_NAMES[value]} selected={[kind]} onToggle={pickKind} />
      <Input accessibilityLabel="Título do lembrete" placeholder="Título" value={title} onChangeText={setTitle} />
      {preset ? (
        <Pressable accessibilityRole="button" onPress={() => setTimes(preset.times())} style={styles.presetButton}>
          <Text style={styles.link}>Usar sugestão: {preset.label}</Text>
        </Pressable>
      ) : null}
      <TimeList label="Horários" times={times} onChange={setTimes} />
      <Button label="Adicionar lembrete" onPress={add} disabled={!title.trim() || times.length === 0} />
    </View>
  );
}

function ReminderRow({ reminder }: { reminder: Reminder }) {
  const styles = useStyles();
  const { data, actions } = useUserData();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(reminder.title);
  const [times, setTimes] = useState(reminder.times);
  const done = reminder.doneOn === toDayKey();
  const quiet = data.settings.quietHours;
  const deferred = reminder.times.filter((time) => deferPastQuietHours(time, quiet) !== time);

  const save = () => {
    actions.updateReminder(reminder.id, { title: title.trim() || reminder.title, times });
    setEditing(false);
  };

  const remove = async () => {
    if (await confirm('Remover lembrete', `Remover “${reminder.title}”?`, 'Remover')) actions.removeReminder(reminder.id);
  };

  return (
    <View style={styles.reminder}>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: done }}
          accessibilityHint="Marca como feito hoje"
          onPress={() => actions.toggleReminderDone(reminder.id)}
          style={styles.rowText}>
          <Text style={[styles.rowTitle, !reminder.enabled && styles.muted]}>
            {done ? '✓ ' : ''}
            {reminder.title}
          </Text>
          <Text style={styles.rowDetail}>
            {KIND_NAMES[reminder.kind]} · {reminder.times.join(', ') || 'sem horário'}
          </Text>
          {reminder.enabled && deferred.length ? (
            <Text style={styles.rowDetail}>
              {deferred.join(', ')} → adiado para {quiet.end} (silêncio noturno)
            </Text>
          ) : null}
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`Editar ${reminder.title}`} onPress={() => setEditing((value) => !value)} style={styles.editButton}>
          <Text style={styles.link}>{editing ? 'Fechar' : 'Editar'}</Text>
        </Pressable>
        <Toggle
          accessibilityLabel={`Lembrete ${reminder.title}`}
          value={reminder.enabled}
          onValueChange={(enabled) => actions.updateReminder(reminder.id, { enabled })}
        />
      </View>

      {editing ? (
        <View style={styles.editor}>
          <Input accessibilityLabel="Título do lembrete" value={title} onChangeText={setTitle} />
          <TimeList label="Horários" times={times} onChange={setTimes} />
          <View style={styles.timeRow}>
            <Button label="Salvar" onPress={save} disabled={times.length === 0} style={styles.flex} />
            <Button label="Excluir" variant="secondary" onPress={remove} style={styles.flex} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  flex: {
    flex: 1,
  },
  pressed: {
    opacity: 0.75,
  },
  note: {
    ...MenteType.small,
    color: c.textMuted,
  },
  warning: {
    gap: 10,
    backgroundColor: c.amberSurface,
  },
  warningText: {
    ...MenteType.caption,
    color: c.amberText,
  },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 60,
    paddingHorizontal: 16,
    borderRadius: MenteRadius.card,
    backgroundColor: c.surface,
  },
  card: {
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    ...MenteType.sectionTitle,
    color: c.text,
  },
  link: {
    ...MenteType.captionStrong,
    color: c.accent,
  },
  reminder: {
    gap: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowText: {
    flex: 1,
    minHeight: MIN_TOUCH,
    justifyContent: 'center',
    gap: 2,
  },
  rowTitle: {
    ...MenteType.captionStrong,
    color: c.text,
  },
  rowDetail: {
    ...MenteType.small,
    color: c.textMuted,
  },
  muted: {
    color: c.textMuted,
  },
  editButton: {
    minHeight: MIN_TOUCH,
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  editor: {
    gap: 10,
    padding: 12,
    borderRadius: MenteRadius.row,
    borderWidth: 1,
    borderColor: c.border,
  },
  presetButton: {
    minHeight: MIN_TOUCH,
    justifyContent: 'center',
  },
  timeRow: {
    flexDirection: 'row',
    gap: 10,
  },
}));
