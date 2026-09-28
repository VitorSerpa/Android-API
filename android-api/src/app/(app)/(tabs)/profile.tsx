import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/auth';
import { validateName } from '@/auth/validation';
import { Screen } from '@/components/mente/screen';
import {
  Card,
  Chevron,
  IconBubble,
  Input,
  Pill,
  SectionEyebrow,
  SettingRow,
  Toggle,
} from '@/components/mente/ui';
import { MenteColors, MenteRadius, MenteType } from '@/constants/mente-theme';
import { checkInCount } from '@/data/insights';
import { buildWeeklyReport } from '@/data/report';
import { LIFE_PROFILES } from '@/data/types';
import { useUserData } from '@/data/user-data-context';
import { daysBetween } from '@/lib/dates';
import { comingSoon, confirm, notify } from '@/lib/dialogs';
import { shareText } from '@/lib/share';

/** The "Sereno" palette swatches shown next to the colour-scheme row. */
const SWATCHES = [
  MenteColors.primary,
  MenteColors.mood,
  MenteColors.anxiety,
  MenteColors.energy,
  MenteColors.accent,
];

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

export default function ProfileScreen() {
  const router = useRouter();
  const { user, updateProfile, signOut } = useAuth();
  const { data, actions } = useUserData();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name ?? '');
  const [saving, setSaving] = useState(false);

  const days = user ? daysBetween(new Date(user.createdAt), new Date()) + 1 : 0;
  const checkIns = checkInCount(data);
  const { settings } = data;
  const activeReminders = data.reminders.filter((item) => item.enabled).length;

  const saveName = async () => {
    const error = validateName(name);
    if (error) {
      notify(error);
      return;
    }
    setSaving(true);
    try {
      await updateProfile({ name: name.trim() });
      setEditing(false);
    } catch (error) {
      notify('Não foi possível salvar', error instanceof Error ? error.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  const onSignOut = async () => {
    const ok = await confirm('Sair da conta', 'Você precisará entrar novamente para ver seus dados.', 'Sair');
    if (ok) await signOut();
  };

  return (
    <Screen>
      <View style={styles.profileCard}>
        <IconBubble name="user" size={44} glyphSize={22} />
        <View style={styles.profileText}>
          {editing ? (
            <Input
              autoFocus
              value={name}
              onChangeText={setName}
              onSubmitEditing={saveName}
              returnKeyType="done"
              autoComplete="name"
              style={styles.nameInput}
            />
          ) : (
            <Text style={styles.profileName}>{user?.name}</Text>
          )}
          <Text style={styles.profileMeta}>
            Com você há {plural(days, 'dia', 'dias')} · {plural(checkIns, 'check-in', 'check-ins')}
          </Text>
        </View>
        {saving ? (
          <ActivityIndicator color={MenteColors.accent} />
        ) : editing ? (
          <Pill label="Salvar" tone="accent" onPress={saveName} />
        ) : (
          <Pill
            label="Editar"
            onPress={() => {
              setName(user?.name ?? '');
              setEditing(true);
            }}
          />
        )}
      </View>

      <Card style={styles.section}>
        <SectionEyebrow>CONTA E SEGURANÇA</SectionEyebrow>
        <SettingRow icon="user" title="E-mail" subtitle={user?.email} />
        <SettingRow
          icon="lock"
          title="PIN de proteção"
          subtitle="Em breve"
          trailing={<Chevron />}
          onPress={() => comingSoon('PIN de proteção')}
        />
        <SettingRow
          icon="cloud"
          title="Modo offline"
          subtitle={settings.offlineMode ? 'Dados apenas neste aparelho' : 'Sincronizar quando disponível'}
          trailing={
            <Toggle
              accessibilityLabel="Modo offline"
              value={settings.offlineMode}
              onValueChange={(offlineMode) => actions.updateSettings({ offlineMode })}
            />
          }
        />
        <SettingRow
          icon="moon"
          title="Descanso digital"
          subtitle="21:30 — 07:00"
          trailing={
            <Toggle
              accessibilityLabel="Descanso digital"
              value={settings.digitalRest}
              onValueChange={(digitalRest) => actions.updateSettings({ digitalRest })}
            />
          }
        />
      </Card>

      <Card style={styles.section}>
        <SectionEyebrow>APARÊNCIA E PERFIS DE VIDA</SectionEyebrow>
        <SettingRow
          icon="palette"
          title="Paleta de cores"
          subtitle="Sereno"
          trailing={
            <View style={styles.swatchRow}>
              {SWATCHES.map((color) => (
                <View key={color} style={[styles.swatch, { backgroundColor: color }]} />
              ))}
            </View>
          }
        />
        <SettingRow
          icon="moon"
          title="Modo escuro"
          subtitle="Em breve"
          trailing={<Chevron />}
          onPress={() => comingSoon('Modo escuro')}
        />
        <SettingRow
          icon="people"
          title="Perfis de vida"
          trailing={
            <View style={styles.tagRow}>
              {LIFE_PROFILES.map((profile) => (
                <Pill key={profile} label={profile} />
              ))}
            </View>
          }
        />
      </Card>

      <Card style={styles.section}>
        <SectionEyebrow>APOIO E COMUNIDADE</SectionEyebrow>
        <SettingRow
          icon="phone"
          title="Contatos de apoio"
          subtitle={
            data.contacts.length
              ? `${plural(data.contacts.length, 'contato configurado', 'contatos configurados')}`
              : 'Nenhum contato ainda'
          }
          trailing={<Chevron />}
          onPress={() => router.push('/contacts')}
        />
        <SettingRow
          icon="people"
          title="Convidar pessoa de confiança"
          subtitle="Compartilhe seu progresso"
          trailing={<Chevron />}
          onPress={() =>
            shareText(
              'Convite',
              `${user?.name ?? 'Alguém'} está usando o Mente Equilibrada para cuidar do bem-estar e gostaria de ter você por perto nessa jornada.`,
            )
          }
        />
        <SettingRow
          icon="people"
          title="Grupos de apoio anônimos"
          subtitle="Em breve"
          trailing={<Chevron />}
          onPress={() => comingSoon('Grupos de apoio anônimos')}
        />
      </Card>

      <Card style={styles.section}>
        <SectionEyebrow>INTEGRAÇÕES E RELATÓRIOS</SectionEyebrow>
        <SettingRow
          icon="music"
          title="Spotify"
          subtitle="Playlists de calma"
          trailing={<Pill label="Conectar" tone="accent" onPress={() => comingSoon('Integração com Spotify')} />}
        />
        <SettingRow
          icon="fit"
          title="Google Fit"
          subtitle="Sono e atividade"
          trailing={<Pill label="Conectar" tone="accent" onPress={() => comingSoon('Integração com Google Fit')} />}
        />
        <SettingRow
          icon="doc"
          title="Relatório semanal em PDF"
          subtitle="Em breve"
          trailing={<Chevron />}
          onPress={() => comingSoon('Relatório em PDF')}
        />
        <SettingRow
          icon="share"
          title="Compartilhar relatório"
          subtitle="E-mail ou mensagem"
          trailing={<Chevron />}
          onPress={() => shareText('Resumo semanal', buildWeeklyReport(data, user?.name ?? ''))}
        />
      </Card>

      <View style={styles.standaloneRow}>
        <SettingRow
          icon="target"
          title="Lembretes, metas e avaliações"
          subtitle={`${plural(activeReminders, 'lembrete', 'lembretes')} · ${plural(data.goals.length, 'meta ativa', 'metas ativas')}`}
          trailing={<Chevron />}
          onPress={() => router.push('/reminders')}
        />
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={onSignOut}
        style={({ pressed }) => [styles.signOut, pressed && styles.pressed]}>
        <Text style={styles.signOutText}>Sair da conta</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: MenteRadius.card,
    backgroundColor: MenteColors.surface,
  },
  profileText: {
    flex: 1,
    gap: 3,
  },
  profileName: {
    ...MenteType.button,
    color: MenteColors.text,
  },
  nameInput: {
    ...MenteType.button,
    paddingVertical: 4,
  },
  profileMeta: {
    ...MenteType.link,
    fontFamily: MenteType.tiny.fontFamily,
    color: MenteColors.textMuted,
  },
  section: {
    gap: 10,
    paddingVertical: 14,
  },
  swatchRow: {
    flexDirection: 'row',
    gap: 7,
  },
  swatch: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 6,
  },
  pressed: {
    opacity: 0.75,
  },
  signOut: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: MenteRadius.button,
    borderWidth: 1,
    borderColor: MenteColors.dangerBorder,
    backgroundColor: MenteColors.dangerSurface,
  },
  signOutText: {
    ...MenteType.captionStrong,
    fontSize: 14,
    color: MenteColors.dangerText,
  },
  standaloneRow: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: MenteRadius.row,
    backgroundColor: MenteColors.surface,
  },
});
