import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { TimeList } from '@/components/mente/fields';
import { StackScreen } from '@/components/mente/stack-screen';
import { Button, Card, Input, MIN_TOUCH, Spacer, Toggle, TOUCH_SLOP, TopBar } from '@/components/mente/ui';
import { MenteRadius, MenteType } from '@/constants/mente-theme';
import { dosesOn, otherInsights } from '@/data/insights';
import type { Medication } from '@/data/types';
import { useUserData } from '@/data/user-data-context';
import { formatShortDate, formatTime, toDayKey } from '@/lib/dates';
import { confirm } from '@/lib/dialogs';
import { dismissNotification, medicationNotificationId } from '@/lib/notifications';
import { makeStyles } from '@/theme';

/**
 * RF-17/RF-18. Each dose time schedules a notification that stays in the
 * status bar until "Tomei" is tapped — there or here — and the confirmation is
 * stored with the time it happened (CA-01).
 */
export default function MedicationsScreen() {
  const styles = useStyles();
  const { data, actions } = useUserData();
  const [creating, setCreating] = useState(data.medications.length === 0);
  const today = toDayKey();
  const doses = dosesOn(data, today);
  const insight = otherInsights(data).find((text) => text.includes('medicamento'));

  const take = (medicationId: string, time: string) => {
    actions.recordIntake(medicationId, today, time);
    dismissNotification(medicationNotificationId(medicationId, time)).catch(() => {});
  };

  const recent = data.intakes.slice(0, 10);

  return (
    <StackScreen>
      <TopBar title="Medicamentos" />

      {doses.length ? (
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Hoje</Text>
          {doses.map((dose) => (
            <View key={`${dose.medicationId}-${dose.time}`} style={styles.row}>
              <Text style={styles.time}>{dose.time}</Text>
              <View style={styles.flex}>
                <Text style={styles.title}>{dose.name}</Text>
                {dose.dosage ? <Text style={styles.detail}>{dose.dosage}</Text> : null}
              </View>
              {dose.takenAt ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityHint="Desfaz a confirmação"
                  onLongPress={() => actions.undoIntake(dose.medicationId, today, dose.time)}
                  style={styles.takenBox}>
                  <Text style={styles.taken}>✓ {formatTime(new Date(dose.takenAt))}</Text>
                </Pressable>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Tomei ${dose.name} das ${dose.time}`}
                  onPress={() => take(dose.medicationId, dose.time)}
                  style={styles.takeButton}>
                  <Text style={styles.takeText}>Tomei</Text>
                </Pressable>
              )}
            </View>
          ))}
        </Card>
      ) : null}

      <Card style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.cardTitle}>Meus medicamentos e suplementos</Text>
          <Spacer />
          <Pressable accessibilityRole="button" hitSlop={TOUCH_SLOP} onPress={() => setCreating((value) => !value)}>
            <Text style={styles.link}>{creating ? 'Cancelar' : '+ Novo'}</Text>
          </Pressable>
        </View>
        {creating ? <MedicationForm onDone={() => setCreating(false)} /> : null}
        {data.medications.map((medication) => (
          <MedicationRow key={medication.id} medication={medication} />
        ))}
        {!data.medications.length && !creating ? <Text style={styles.detail}>Nenhum medicamento cadastrado.</Text> : null}
      </Card>

      {insight ? (
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Medicação e humor</Text>
          <Text style={styles.detail}>{insight}</Text>
        </Card>
      ) : null}

      {recent.length ? (
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Doses confirmadas</Text>
          {recent.map((intake) => (
            <Text key={intake.id} style={styles.detail}>
              {formatShortDate(new Date(intake.takenAt))} {formatTime(new Date(intake.takenAt))} ·{' '}
              {data.medications.find((item) => item.id === intake.medicationId)?.name ?? 'Medicamento removido'} (dose das {intake.time})
            </Text>
          ))}
        </Card>
      ) : null}
    </StackScreen>
  );
}

function MedicationForm({ medication, onDone }: { medication?: Medication; onDone: () => void }) {
  const styles = useStyles();
  const { actions } = useUserData();
  const [name, setName] = useState(medication?.name ?? '');
  const [dosage, setDosage] = useState(medication?.dosage ?? '');
  const [times, setTimes] = useState<string[]>(medication?.times ?? ['08:00']);
  const valid = name.trim().length > 1 && times.length > 0;

  const save = () => {
    if (!valid) return;
    if (medication) actions.updateMedication(medication.id, { name: name.trim(), dosage: dosage.trim(), times });
    else actions.addMedication({ name: name.trim(), dosage: dosage.trim(), times });
    onDone();
  };

  return (
    <View style={styles.editor}>
      <Input accessibilityLabel="Nome" placeholder="Nome (ex.: Sertralina, Vitamina D)" value={name} onChangeText={setName} />
      <Input accessibilityLabel="Dosagem" placeholder="Dosagem (ex.: 50 mg, 1 cápsula)" value={dosage} onChangeText={setDosage} />
      <TimeList label="Horários" times={times} onChange={setTimes} />
      <Button label={medication ? 'Salvar alterações' : 'Adicionar'} onPress={save} disabled={!valid} />
    </View>
  );
}

function MedicationRow({ medication }: { medication: Medication }) {
  const styles = useStyles();
  const { actions } = useUserData();
  const [editing, setEditing] = useState(false);

  const remove = async () => {
    if (await confirm('Remover medicamento', `Remover “${medication.name}” e seus lembretes?`, 'Remover')) {
      actions.removeMedication(medication.id);
    }
  };

  return (
    <View style={styles.item}>
      <View style={styles.row}>
        <View style={styles.flex}>
          <Text style={[styles.title, !medication.enabled && styles.muted]}>{medication.name}</Text>
          <Text style={styles.detail}>
            {medication.dosage ? `${medication.dosage} · ` : ''}
            {medication.times.join(', ')}
          </Text>
        </View>
        <Pressable accessibilityRole="button" onPress={() => setEditing((value) => !value)} style={styles.editButton}>
          <Text style={styles.link}>{editing ? 'Fechar' : 'Editar'}</Text>
        </Pressable>
        <Toggle
          accessibilityLabel={`Lembretes de ${medication.name}`}
          value={medication.enabled}
          onValueChange={(enabled) => actions.updateMedication(medication.id, { enabled })}
        />
      </View>
      {editing ? (
        <>
          <MedicationForm medication={medication} onDone={() => setEditing(false)} />
          <Button label="Remover medicamento" variant="secondary" onPress={remove} />
        </>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  flex: {
    flex: 1,
  },
  card: {
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    ...MenteType.sectionTitle,
    color: c.text,
  },
  link: {
    ...MenteType.captionStrong,
    color: c.accent,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: MIN_TOUCH,
  },
  item: {
    gap: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  time: {
    ...MenteType.captionStrong,
    width: 44,
    color: c.accent,
  },
  title: {
    ...MenteType.captionStrong,
    color: c.text,
  },
  detail: {
    ...MenteType.small,
    color: c.textMuted,
  },
  muted: {
    color: c.textMuted,
  },
  takenBox: {
    minHeight: MIN_TOUCH,
    justifyContent: 'center',
  },
  taken: {
    ...MenteType.smallStrong,
    color: c.greenText,
  },
  takeButton: {
    minHeight: MIN_TOUCH,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: MenteRadius.pill,
    backgroundColor: c.primary,
  },
  takeText: {
    ...MenteType.captionStrong,
    color: c.onPrimary,
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
}));
