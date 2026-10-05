import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { useAuth } from '@/auth';
import { validateName } from '@/auth/validation';
import { Screen } from '@/components/mente/screen';
import { Card, Chevron, IconBubble, Input, Pill, SectionEyebrow, SettingRow } from '@/components/mente/ui';
import { MenteRadius, MenteType } from '@/constants/mente-theme';
import { checkInCount } from '@/data/insights';
import { buildWeeklyReport, reportHtml, reportText } from '@/data/report';
import { useUserData } from '@/data/user-data-context';
import { daysBetween, toDayKey } from '@/lib/dates';
import { confirm, notify } from '@/lib/dialogs';
import { sharePdf } from '@/lib/files';
import { shareText } from '@/lib/share';
import { makeStyles, PALETTE_NAMES, useTheme } from '@/theme';

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

export default function ProfileScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { prefs } = useTheme();
  const { user, updateProfile, signOut } = useAuth();
  const { data } = useUserData();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name ?? '');
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const days = user ? daysBetween(new Date(user.createdAt), new Date()) + 1 : 0;
  // Lembretes desativados: const activeReminders = data.reminders.filter((item) => item.enabled).length;

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

  /** US-10: PDF of the last 7 days, shared through the native Android sheet (CA-02). */
  const sharePdfReport = async () => {
    const report = buildWeeklyReport(data);
    // CA-03: an empty week gets a warning, never an empty PDF.
    if (!report.hasData) {
      notify('Sem dados nesta semana', 'Não há registros nos últimos 7 dias. Faça alguns check-ins para gerar o relatório.');
      return;
    }
    setGenerating(true);
    try {
      await sharePdf(reportHtml(report, user?.name ?? ''), `relatorio-semanal-${toDayKey()}.pdf`, 'Compartilhar relatório semanal');
    } catch (error) {
      notify('Não foi possível gerar o PDF', error instanceof Error ? error.message : undefined);
    } finally {
      setGenerating(false);
    }
  };

  const shareTextReport = () => {
    const report = buildWeeklyReport(data);
    if (!report.hasData) {
      notify('Sem dados nesta semana', 'Não há registros nos últimos 7 dias.');
      return;
    }
    shareText('Resumo semanal', reportText(report, user?.name ?? ''));
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
            <Input autoFocus accessibilityLabel="Seu nome" value={name} onChangeText={setName} onSubmitEditing={saveName} returnKeyType="done" autoComplete="name" style={styles.nameInput} />
          ) : (
            <Text style={styles.profileName}>{user?.name}</Text>
          )}
          <Text style={styles.profileMeta}>
            Com você há {plural(days, 'dia', 'dias')} · {plural(checkInCount(data), 'check-in', 'check-ins')}
          </Text>
        </View>
        {saving ? (
          <ActivityIndicator />
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
        <SectionEyebrow>ROTINA E EVOLUÇÃO</SectionEyebrow>
        {/* Lembretes e medicamentos desativados (alertas removidos do app).
        <SettingRow icon="bell" title="Lembretes" subtitle={`${plural(activeReminders, 'lembrete ativo', 'lembretes ativos')} · silêncio noturno ${data.settings.quietHours.enabled ? `${data.settings.quietHours.start}–${data.settings.quietHours.end}` : 'desligado'}`} trailing={<Chevron />} onPress={() => router.push('/reminders')} />
        <SettingRow icon="clipboard" title="Medicamentos" subtitle={data.medications.length ? plural(data.medications.length, 'cadastrado', 'cadastrados') : 'Horário, dosagem e confirmação'} trailing={<Chevron />} onPress={() => router.push('/medications')} />
        */}
        <SettingRow icon="target" title="Metas e autoavaliações" subtitle={`${plural(data.goals.length, 'meta', 'metas')} · estresse, WHO-5 e resiliência`} trailing={<Chevron />} onPress={() => router.push('/wellbeing')} />
      </Card>

      <Card style={styles.section}>
        <SectionEyebrow>RELATÓRIOS</SectionEyebrow>
        <SettingRow
          icon="doc"
          title="Relatório semanal em PDF"
          subtitle="Humor, sono, ansiedade e atividades dos últimos 7 dias"
          trailing={generating ? <ActivityIndicator /> : <Chevron />}
          onPress={sharePdfReport}
        />
        <SettingRow icon="share" title="Resumo em texto" subtitle="Para colar em uma mensagem" trailing={<Chevron />} onPress={shareTextReport} />
      </Card>

      <Card style={styles.section}>
        <SectionEyebrow>APOIO E COMUNIDADE</SectionEyebrow>
        <SettingRow
          icon="phone"
          title="Contatos de apoio"
          subtitle={data.contacts.length ? plural(data.contacts.length, 'contato configurado', 'contatos configurados') : 'Nenhum contato ainda'}
          trailing={<Chevron />}
          onPress={() => router.push('/contacts')}
        />
        {/* Pessoa de confiança e integrações desativadas (tela removida do app).
        <SettingRow
          icon="people"
          title="Pessoa de confiança e integrações"
          subtitle="Resumo semanal · Spotify · sono do relógio"
          trailing={<Chevron />}
          onPress={() => router.push('/community')}
        />
        */}
      </Card>

      <Card style={styles.section}>
        <SectionEyebrow>CONFIGURAÇÕES</SectionEyebrow>
        <SettingRow
          icon="palette"
          title="Aparência e perfis"
          subtitle={`${PALETTE_NAMES[prefs.palette]} · ${plural(data.profiles.length, 'perfil de vida', 'perfis de vida')}`}
          trailing={<Chevron />}
          onPress={() => router.push('/settings')}
        />
        <SettingRow
          icon="lock"
          title="Privacidade e meus dados"
          subtitle={`PIN · modo offline ${data.settings.offlineMode ? 'ativo' : 'desligado'} · exportar JSON`}
          trailing={<Chevron />}
          onPress={() => router.push('/settings')}
        />
        <SettingRow icon="user" title="E-mail" subtitle={user?.email} />
      </Card>

      <Pressable accessibilityRole="button" onPress={onSignOut} style={({ pressed }) => [styles.signOut, pressed && styles.pressed]}>
        <Text style={styles.signOutText}>Sair da conta</Text>
      </Pressable>
    </Screen>
  );
}

const useStyles = makeStyles((c) => ({
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: MenteRadius.card,
    backgroundColor: c.surface,
  },
  profileText: {
    flex: 1,
    gap: 3,
  },
  profileName: {
    ...MenteType.button,
    color: c.text,
  },
  nameInput: {
    ...MenteType.button,
    paddingVertical: 4,
  },
  profileMeta: {
    ...MenteType.small,
    color: c.textMuted,
  },
  section: {
    gap: 10,
    paddingVertical: 14,
  },
  pressed: {
    opacity: 0.75,
  },
  signOut: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    borderRadius: MenteRadius.button,
    borderWidth: 1,
    borderColor: c.dangerBorder,
    backgroundColor: c.dangerSurface,
  },
  signOutText: {
    ...MenteType.captionStrong,
    fontSize: 14,
    color: c.dangerText,
  },
}));
