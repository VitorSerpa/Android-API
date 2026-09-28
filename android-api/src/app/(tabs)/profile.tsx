import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/mente/screen';
import {
  Card,
  Chevron,
  IconBubble,
  Pill,
  SectionEyebrow,
  SettingRow,
  Toggle,
} from '@/components/mente/ui';
import { MenteColors, MenteRadius, MenteType } from '@/constants/mente-theme';

/** The "Sereno" palette swatches shown next to the colour-scheme row. */
const SWATCHES = [
  MenteColors.primary,
  MenteColors.mood,
  MenteColors.anxiety,
  MenteColors.energy,
  MenteColors.accent,
];

const LIFE_PROFILES = ['Trabalho', 'Família', 'Lazer'] as const;

export default function ProfileScreen() {
  const router = useRouter();

  return (
    <Screen>
      <View style={styles.profileCard}>
        <IconBubble name="user" size={44} glyphSize={22} />
        <View style={styles.profileText}>
          <Text style={styles.profileName}>Mariana Alves</Text>
          <Text style={styles.profileMeta}>Com você há 84 dias · 62 check-ins</Text>
        </View>
        <Pill label="Editar" />
      </View>

      <Card style={styles.section}>
        <SectionEyebrow>CONTA E SEGURANÇA</SectionEyebrow>
        <SettingRow
          icon="lock"
          title="PIN de proteção"
          subtitle="Ativo · 4 dígitos"
          trailing={<Toggle initial />}
        />
        <SettingRow
          icon="cloud"
          title="Modo offline"
          subtitle="Dados apenas neste aparelho"
          trailing={<Toggle initial />}
        />
        <SettingRow
          icon="moon"
          title="Descanso digital"
          subtitle="21:30 — 07:00"
          trailing={<Toggle />}
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
        <SettingRow icon="moon" title="Modo escuro" trailing={<Toggle initial />} />
        <SettingRow
          icon="people"
          title="Perfis de vida"
          trailing={
            <View style={styles.tagRow}>
              {LIFE_PROFILES.map((name) => (
                <Pill key={name} label={name} />
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
          subtitle="3 contatos configurados"
          trailing={<Chevron />}
          onPress={() => {}}
        />
        <SettingRow
          icon="people"
          title="Convidar pessoa de confiança"
          subtitle="Compartilhe seu progresso"
          trailing={<Chevron />}
          onPress={() => {}}
        />
        <SettingRow
          icon="people"
          title="Grupos de apoio anônimos"
          subtitle="4 grupos ativos"
          trailing={<Chevron />}
          onPress={() => {}}
        />
      </Card>

      <Card style={styles.section}>
        <SectionEyebrow>INTEGRAÇÕES E RELATÓRIOS</SectionEyebrow>
        <SettingRow
          icon="music"
          title="Spotify"
          subtitle="Playlists de calma"
          trailing={<Pill label="Conectado" tone="positive" />}
        />
        <SettingRow
          icon="fit"
          title="Google Fit"
          subtitle="Sono e atividade"
          trailing={<Pill label="Conectar" tone="accent" />}
        />
        <SettingRow
          icon="doc"
          title="Relatório semanal em PDF"
          subtitle="Gerado toda segunda"
          trailing={<Chevron />}
          onPress={() => {}}
        />
        <SettingRow
          icon="share"
          title="Compartilhar relatório"
          subtitle="E-mail ou mensagem"
          trailing={<Chevron />}
          onPress={() => {}}
        />
      </Card>

      <View style={styles.standaloneRow}>
        <SettingRow
          icon="target"
          title="Lembretes, metas e avaliações"
          subtitle="4 lembretes · 2 metas ativas"
          trailing={<Chevron />}
          onPress={() => router.push('/reminders')}
        />
      </View>
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
  standaloneRow: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: MenteRadius.row,
    backgroundColor: MenteColors.surface,
  },
});
