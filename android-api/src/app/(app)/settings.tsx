import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { ChoiceChips, TimeField } from '@/components/mente/fields';
import { StackScreen } from '@/components/mente/stack-screen';
import { Button, Card, Chevron, Input, MIN_TOUCH, SectionEyebrow, SettingRow, Toggle, TopBar } from '@/components/mente/ui';
import { MenteRadius, MenteType } from '@/constants/mente-theme';
import { BackupFormatError, exportBackup, readBackup } from '@/data/backup';
import { userDataRepository } from '@/data/repository';
import { useSync } from '@/data/sync-context';
import type { LifeProfile } from '@/data/types';
import { useUserData } from '@/data/user-data-context';
import { formatShortDate, formatTime } from '@/lib/dates';
import { confirm, notify } from '@/lib/dialogs';
import { requestLocationPermission } from '@/lib/location';
import { makeStyles, PALETTE_NAMES, PALETTES, useTheme, type DarkModePreference, type PaletteId } from '@/theme';

const DARK_MODES: DarkModePreference[] = ['system', 'schedule', 'light', 'dark'];
const DARK_MODE_NAMES: Record<DarkModePreference, string> = {
  system: 'Como o sistema',
  schedule: 'Automático à noite',
  light: 'Sempre claro',
  dark: 'Sempre escuro',
};

export default function SettingsScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { prefs, setPrefs, scheme } = useTheme();
  const { data, actions } = useUserData();
  const { settings } = data;
  // Descanso digital desativado: const rest = settings.digitalRest;
  const savedLocations = data.crises.filter((item) => item.location).length;
  const [busy, setBusy] = useState(false);

  const toggleLocation = async (enabled: boolean) => {
    if (!enabled) {
      // RF-72 / US-20 CA-01: off at any time; from now on no record saves coordinates and the GPS is never used.
      actions.updateSettings({ crisisLocation: false });
      return;
    }
    const granted = await requestLocationPermission();
    actions.updateSettings({ crisisLocation: granted });
    if (!granted) notify('Permissão negada', 'Sem a permissão, os picos continuam sendo salvos, só que sem o local.');
  };

  const doExport = async () => {
    setBusy(true);
    try {
      await exportBackup(data);
    } catch (error) {
      notify('Não foi possível exportar', error instanceof Error ? error.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const doImport = async () => {
    try {
      const imported = await readBackup();
      if (!imported) return;
      const ok = await confirm(
        'Restaurar backup?',
        `O arquivo tem ${imported.checkIns.length} check-ins e ${imported.diary.length} entradas de diário. Os dados atuais deste aparelho serão substituídos.`,
        'Restaurar',
      );
      if (!ok) return;
      actions.replaceAll(imported);
      notify('Backup restaurado', 'Todos os registros do arquivo foram carregados.');
    } catch (error) {
      notify('Não foi possível importar', error instanceof BackupFormatError ? error.message : 'Verifique se o arquivo é um backup do Mente Equilibrada.');
    }
  };

  return (
    <StackScreen>
      <TopBar title="Configurações" />

      <Card style={styles.card}>
        <SectionEyebrow>APARÊNCIA</SectionEyebrow>
        <Text style={styles.label}>Paleta de cores</Text>
        <View style={styles.palettes} accessibilityRole="radiogroup" accessibilityLabel="Paleta de cores">
          {(Object.keys(PALETTES) as PaletteId[]).map((id) => {
            const tokens = PALETTES[id][scheme];
            const selected = prefs.palette === id;
            return (
              <Pressable
                key={id}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={PALETTE_NAMES[id]}
                onPress={() => setPrefs({ palette: id })}
                style={[styles.palette, { backgroundColor: tokens.background }, selected && { borderColor: tokens.accent }]}>
                <View style={styles.swatches}>
                  {[tokens.primary, tokens.mood, tokens.anxiety, tokens.energy].map((color) => (
                    <View key={color} style={[styles.swatch, { backgroundColor: color }]} />
                  ))}
                </View>
                <Text style={[styles.paletteName, { color: tokens.text }]}>
                  {selected ? '✓ ' : ''}
                  {PALETTE_NAMES[id]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Modo escuro</Text>
        <ChoiceChips
          label="Modo escuro"
          options={DARK_MODES}
          renderLabel={(mode) => DARK_MODE_NAMES[mode]}
          selected={[prefs.darkMode]}
          onToggle={(darkMode) => setPrefs({ darkMode })}
        />
        {prefs.darkMode === 'schedule' ? (
          <>
            <View style={styles.row}>
              <TimeField label="Escurece às" value={prefs.nightStart} onChange={(nightStart) => setPrefs({ nightStart })} />
              <TimeField label="Clareia às" value={prefs.nightEnd} onChange={(nightEnd) => setPrefs({ nightEnd })} />
            </View>
            <Text style={styles.detail}>O modo escuro liga e desliga sozinho nesses horários.</Text>
          </>
        ) : null}
      </Card>

      <ProfilesCard />

      <RoutineCard />

      {/* Descanso digital desativado (RF-53). Para reativar, descomente este card, `rest` acima e o <DigitalRestGate> em (app)/_layout.tsx.
      <Card style={styles.card}>
        <SectionEyebrow>DESCANSO DIGITAL</SectionEyebrow>
        <SettingRow
          icon="moon"
          title="Período de descanso digital"
          subtitle="Nesse horário o app mostra só a tela de respiração."
          trailing={
            <Toggle accessibilityLabel="Descanso digital" value={rest.enabled} onValueChange={(enabled) => actions.updateSettings({ digitalRest: { ...rest, enabled, skippedOn: null } })} />
          }
        />
        {rest.enabled ? (
          <View style={styles.row}>
            <TimeField label="Começa às" value={rest.start} onChange={(start) => actions.updateSettings({ digitalRest: { ...rest, start } })} />
            <TimeField label="Termina às" value={rest.end} onChange={(end) => actions.updateSettings({ digitalRest: { ...rest, end } })} />
          </View>
        ) : null}
      </Card>
      */}

      <Card style={styles.card}>
        <SectionEyebrow>PRIVACIDADE</SectionEyebrow>
        <SettingRow icon="lock" title="PIN de segurança" subtitle="Protege o diário e os dados pessoais" trailing={<Chevron />} onPress={() => router.push('/pin')} />
        <SettingRow
          icon="cloud"
          title="Modo offline completo"
          subtitle={
            settings.offlineMode
              ? 'Ativo: os dados ficam só neste aparelho e o app não faz nenhuma requisição de rede.'
              : 'Desativado: o login, a sincronização e a localização das crises podem usar a internet.'
          }
          trailing={
            <Toggle accessibilityLabel="Modo offline completo" value={settings.offlineMode} onValueChange={(offlineMode) => actions.updateSettings({ offlineMode })} />
          }
        />
        <SettingRow
          icon="alert"
          title="Salvar local dos picos de ansiedade"
          subtitle={
            settings.crisisLocation
              ? 'Ativo: usa o GPS só no momento do registro. Desligue quando quiser.'
              : 'Desativado: nenhum registro salva o local e o GPS nunca é usado.'
          }
          trailing={<Toggle accessibilityLabel="Salvar local dos picos" value={settings.crisisLocation} onValueChange={toggleLocation} />}
        />
        {savedLocations ? (
          <Button
            label={`Apagar locais já salvos (${savedLocations})`}
            variant="secondary"
            onPress={async () => {
              const ok = await confirm(
                'Apagar locais salvos?',
                'Os picos continuam registrados, só sem o local. Isso não pode ser desfeito.',
                'Apagar locais',
              );
              if (ok) actions.clearCrisisLocations();
            }}
          />
        ) : null}
      </Card>

      <SyncCard />

      <Card style={styles.card}>
        <SectionEyebrow>MEUS DADOS</SectionEyebrow>
        <Text style={styles.detail}>
          Exporta tudo — check-ins, saúde, diário com fotos e áudios, práticas, testes, metas e crises — em um único arquivo JSON,
          que pode ser importado em outro aparelho.
        </Text>
        <Button label={busy ? 'Exportando…' : 'Exportar todos os dados (JSON)'} onPress={doExport} disabled={busy} />
        <Button label="Importar backup" variant="secondary" onPress={doImport} />
      </Card>

      <DatabaseCheckCard />
    </StackScreen>
  );
}

const describeSync = (at: string | null) => {
  if (!at) return 'Ainda não sincronizado.';
  const date = new Date(at);
  return `Última sincronização: ${formatShortDate(date)}, ${formatTime(date)}.`;
};

/** RF-58: shows how the automatic sync is going and lets the user force one. */
function SyncCard() {
  const styles = useStyles();
  const { status, syncNow } = useSync();
  const busy = status.kind === 'syncing';

  const detail =
    status.kind === 'disabled'
      ? status.reason === 'offline-mode'
        ? 'Pausada: o modo offline completo está ativo. Seus registros continuam guardados neste aparelho.'
        : 'Indisponível: o endereço do servidor (EXPO_PUBLIC_API_URL) não está configurado.'
      : status.kind === 'syncing'
        ? 'Sincronizando…'
        : status.kind === 'error'
          ? `${status.message} ${describeSync(status.lastSyncAt)}`
          : describeSync(status.lastSyncAt);

  return (
    <Card style={styles.card}>
      <SectionEyebrow>SINCRONIZAÇÃO</SectionEyebrow>
      <Text style={styles.detail}>
        Seus registros são salvos primeiro neste aparelho e enviados ao servidor automaticamente sempre que houver internet —
        mesmo depois de dias sem conexão. Fotos e áudios ficam no aparelho; para levá-los a outro celular, use o backup abaixo.
      </Text>
      <Text style={[styles.label, status.kind === 'error' && styles.danger]} accessibilityLiveRegion="polite">
        {detail}
      </Text>
      {status.kind !== 'disabled' ? (
        <Button label={busy ? 'Sincronizando…' : 'Sincronizar agora'} variant="secondary" disabled={busy} onPress={() => syncNow()} />
      ) : null}
    </Card>
  );
}

/** US-21 CA-03: a load test of the database, run on demand. */
const STRESS_OPERATIONS = 500;

function DatabaseCheckCard() {
  const styles = useStyles();
  const [result, setResult] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  if (!userDataRepository.stressTest) return null;

  const run = async () => {
    setRunning(true);
    try {
      const outcome = await userDataRepository.stressTest!(STRESS_OPERATIONS);
      const rate = (outcome.failures / outcome.operations) * 100;
      setResult(
        `${outcome.operations} gravações em ${(outcome.durationMs / 1000).toFixed(1).replace('.', ',')} s · ` +
          `${outcome.failures} falha${outcome.failures === 1 ? '' : 's'} (${rate.toFixed(2).replace('.', ',')}%) — ` +
          (rate < 1 ? 'dentro da meta de menos de 1%.' : 'acima da meta de 1%.'),
      );
    } catch (error) {
      setResult(error instanceof Error ? error.message : 'O teste não pôde ser concluído.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card style={styles.card}>
      <SectionEyebrow>CONFIABILIDADE DO BANCO</SectionEyebrow>
      <Text style={styles.detail}>
        Faz {STRESS_OPERATIONS} gravações em transação numa tabela de teste e confere cada uma. Seus registros não são alterados.
      </Text>
      <Button label={running ? 'Testando…' : 'Testar o banco de dados'} variant="secondary" disabled={running} onPress={run} />
      {result ? (
        <Text style={styles.label} accessibilityLiveRegion="polite">
          {result}
        </Text>
      ) : null}
    </Card>
  );
}

/** Mood goal options (1–5 scale), RF-71. */
const MOOD_GOALS = [2.5, 3, 3.5, 4] as const;

/** US-19: the morning question (RF-70) and the weekly mood goal (RF-71). */
function RoutineCard() {
  const styles = useStyles();
  const { data, actions } = useUserData();
  const morning = data.settings.morningCheckIn;
  const goal = data.settings.weeklyMoodGoal;
  const setMorning = (patch: Partial<typeof morning>) => actions.updateSettings({ morningCheckIn: { ...morning, ...patch } });

  return (
    <Card style={styles.card}>
      <SectionEyebrow>ROTINA</SectionEyebrow>
      <SettingRow
        icon="moon"
        title="Perguntar como estou pela manhã"
        subtitle="Na primeira vez que você abrir o app de manhã, ele pergunta como você está — uma vez por dia."
        trailing={
          <Toggle
            accessibilityLabel="Perguntar como estou pela manhã"
            value={morning.enabled}
            onValueChange={(enabled) => setMorning({ enabled, lastAskedOn: null })}
          />
        }
      />
      {morning.enabled ? (
        <View style={styles.row}>
          <TimeField label="De" value={morning.start} onChange={(start) => setMorning({ start })} />
          <TimeField label="Até" value={morning.end} onChange={(end) => setMorning({ end })} />
        </View>
      ) : null}

      <Text style={styles.label}>Objetivo de humor da semana</Text>
      <Text style={styles.detail}>Um humor médio mínimo (de 1 a 5). O Início mostra durante a semana se você está acima ou abaixo dele.</Text>
      <ChoiceChips
        label="Objetivo de humor da semana"
        options={[0, ...MOOD_GOALS]}
        renderLabel={(value) => (value === 0 ? 'Sem objetivo' : `${String(value).replace('.', ',')} ou mais`)}
        selected={[goal ?? 0]}
        onToggle={(value) => actions.updateSettings({ weeklyMoodGoal: value === 0 ? null : value })}
      />
    </Card>
  );
}

/** RF-52: life contexts that check-ins and diary entries can belong to. */
function ProfilesCard() {
  const styles = useStyles();
  const { data, actions } = useUserData();
  const [draft, setDraft] = useState('');

  const remove = async (profile: LifeProfile) => {
    if (await confirm('Remover perfil', `Os registros de “${profile.name}” ficam sem perfil.`, 'Remover')) actions.removeProfile(profile.id);
  };

  return (
    <Card style={styles.card}>
      <SectionEyebrow>PERFIS DE VIDA</SectionEyebrow>
      <Text style={styles.detail}>Associe cada check-in a uma área da vida e compare como cada uma está.</Text>
      {data.profiles.map((profile) => (
        <ProfileRow key={profile.id} profile={profile} onRemove={() => remove(profile)} />
      ))}
      <View style={styles.row}>
        <Input accessibilityLabel="Novo perfil" placeholder="Novo perfil (ex.: Estudos)" value={draft} onChangeText={setDraft} style={styles.flex} />
        <Button
          label="Criar"
          variant="secondary"
          disabled={!draft.trim()}
          onPress={() => {
            actions.addProfile(draft.trim());
            setDraft('');
          }}
        />
      </View>
    </Card>
  );
}

function ProfileRow({ profile, onRemove }: { profile: LifeProfile; onRemove: () => void }) {
  const styles = useStyles();
  const { actions } = useUserData();
  const [name, setName] = useState(profile.name);
  return (
    <View style={styles.row}>
      <Input
        accessibilityLabel={`Nome do perfil ${profile.name}`}
        value={name}
        onChangeText={setName}
        onBlur={() => name.trim() && name.trim() !== profile.name && actions.renameProfile(profile.id, name.trim())}
        style={styles.flex}
      />
      <Pressable accessibilityRole="button" accessibilityLabel={`Remover perfil ${profile.name}`} onPress={onRemove} style={styles.remove}>
        <Text style={styles.danger}>Remover</Text>
      </Pressable>
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
  label: {
    ...MenteType.captionStrong,
    color: c.text,
  },
  detail: {
    ...MenteType.small,
    color: c.textMuted,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  palettes: {
    flexDirection: 'row',
    gap: 8,
  },
  palette: {
    flex: 1,
    gap: 8,
    minHeight: 72,
    padding: 10,
    borderRadius: MenteRadius.chip,
    borderWidth: 2,
    borderColor: c.border,
  },
  swatches: {
    flexDirection: 'row',
    gap: 3,
  },
  swatch: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  paletteName: {
    ...MenteType.smallStrong,
  },
  remove: {
    minHeight: MIN_TOUCH,
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  danger: {
    ...MenteType.captionStrong,
    color: c.dangerText,
  },
}));
