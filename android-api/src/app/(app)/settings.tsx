import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { ChoiceChips, TimeField } from '@/components/mente/fields';
import { StackScreen } from '@/components/mente/stack-screen';
import { Button, Card, Chevron, Input, MIN_TOUCH, SectionEyebrow, SettingRow, Toggle, TopBar } from '@/components/mente/ui';
import { MenteRadius, MenteType } from '@/constants/mente-theme';
import { BackupFormatError, exportBackup, readBackup } from '@/data/backup';
import type { LifeProfile } from '@/data/types';
import { useUserData } from '@/data/user-data-context';
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
  const [busy, setBusy] = useState(false);

  const toggleLocation = async (enabled: boolean) => {
    if (!enabled) {
      // US-20 preview: turning it off stops any new record from asking for GPS.
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
              : 'Desativado: o login e a localização das crises podem usar a internet.'
          }
          trailing={
            <Toggle accessibilityLabel="Modo offline completo" value={settings.offlineMode} onValueChange={(offlineMode) => actions.updateSettings({ offlineMode })} />
          }
        />
        <SettingRow
          icon="alert"
          title="Salvar local dos picos de ansiedade"
          subtitle="Pede permissão ao Android e usa o GPS só no momento do registro."
          trailing={<Toggle accessibilityLabel="Salvar local dos picos" value={settings.crisisLocation} onValueChange={toggleLocation} />}
        />
      </Card>

      <Card style={styles.card}>
        <SectionEyebrow>MEUS DADOS</SectionEyebrow>
        <Text style={styles.detail}>
          Exporta tudo — check-ins, saúde, diário com fotos e áudios, práticas, testes, metas e crises — em um único arquivo JSON,
          que pode ser importado em outro aparelho.
        </Text>
        <Button label={busy ? 'Exportando…' : 'Exportar todos os dados (JSON)'} onPress={doExport} disabled={busy} />
        <Button label="Importar backup" variant="secondary" onPress={doImport} />
      </Card>
    </StackScreen>
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
