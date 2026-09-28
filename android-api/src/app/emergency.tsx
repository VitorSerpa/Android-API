import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/mente/icon';
import { Card, IconBubble, Spacer } from '@/components/mente/ui';
import { MenteColors, MenteRadius, MenteSpacing, MenteType } from '@/constants/mente-theme';

const EXERCISES: readonly { icon: IconName; title: string; detail: string }[] = [
  { icon: 'breath', title: 'Respirar', detail: '4-7-8 · 1 min' },
  { icon: 'anchor', title: 'Grounding', detail: '5-4-3-2-1' },
];

const CONTACTS = [
  { name: 'CVV — Apoio emocional', detail: '188 · 24h, gratuito' },
  { name: 'Marcos (irmão)', detail: '(11) 9 8842-0031' },
  { name: 'Dra. Helena — psicóloga', detail: '(11) 9 9120-7744' },
] as const;

const ACTION_PLAN = [
  'Sair da sala e beber água',
  'Respiração 4-7-8 por 4 ciclos',
  'Mandar mensagem para o Marcos',
] as const;

export default function EmergencyScreen() {
  const router = useRouter();

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.topBar}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fechar"
              hitSlop={8}
              onPress={() => (router.canGoBack() ? router.back() : router.navigate('/home'))}
              style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
              <Icon name="close" size={15} color={MenteColors.accent} />
            </Pressable>
            <Spacer />
            <View style={styles.crisisBadge}>
              <Text style={styles.crisisBadgeText}>MODO CRISE</Text>
            </View>
          </View>

          <View style={styles.intro}>
            <Text style={styles.title}>Você não está sozinha.</Text>
            <Text style={styles.subtitle}>
              Respire. Vamos passar por isso um passo de cada vez.
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.helpButton, pressed && styles.pressed]}>
            <Icon name="phone" size={20} color={MenteColors.onPrimary} cutColor={MenteColors.dangerText} />
            <Text style={styles.helpButtonText}>Preciso de ajuda agora</Text>
          </Pressable>

          <View style={styles.exerciseRow}>
            {EXERCISES.map((exercise) => (
              <Pressable
                key={exercise.title}
                accessibilityRole="button"
                onPress={() => router.navigate('/tools')}
                style={({ pressed }) => [styles.exercise, pressed && styles.pressed]}>
                <Icon name={exercise.icon} size={24} color={MenteColors.accent} />
                <Text style={styles.exerciseTitle}>{exercise.title}</Text>
                <Text style={styles.exerciseDetail}>{exercise.detail}</Text>
              </Pressable>
            ))}
          </View>

          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Contatos de apoio</Text>

            {CONTACTS.map((contact) => (
              <View key={contact.name} style={styles.contact}>
                <IconBubble name="phone" size={35} glyphSize={17} />
                <View style={styles.contactText}>
                  <Text style={styles.contactName}>{contact.name}</Text>
                  <Text style={styles.contactDetail}>{contact.detail}</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Ligar para ${contact.name}`}
                  style={({ pressed }) => [styles.callButton, pressed && styles.pressed]}>
                  <Text style={styles.callButtonText}>Ligar</Text>
                </Pressable>
              </View>
            ))}
          </Card>

          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Meu plano de ação</Text>
            {ACTION_PLAN.map((step, index) => (
              <Text key={step} style={styles.planStep}>
                {index + 1}. {step}
              </Text>
            ))}
          </Card>

          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.logButton, pressed && styles.pressed]}>
            <Icon name="clipboard" size={17} color={MenteColors.accent} cutColor={MenteColors.surface} />
            <Text style={styles.logButtonText}>Registrar esta crise (30 segundos)</Text>
          </Pressable>

          <Text style={styles.logCaption}>Intensidade · gatilho · local · observação</Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: MenteColors.background,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    gap: 13,
    paddingHorizontal: MenteSpacing.gutter,
    paddingTop: 10,
    paddingBottom: 24,
  },
  pressed: {
    opacity: 0.75,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeButton: {
    padding: 9,
    borderRadius: MenteRadius.pill,
    backgroundColor: MenteColors.surface,
  },
  crisisBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: MenteRadius.pill,
    backgroundColor: MenteColors.dangerSurface,
  },
  crisisBadgeText: {
    ...MenteType.badge,
    letterSpacing: 0.7,
    color: MenteColors.dangerText,
  },
  intro: {
    gap: 8,
    paddingTop: 4,
  },
  title: {
    ...MenteType.heading,
    color: MenteColors.text,
  },
  subtitle: {
    ...MenteType.subtitle,
    fontSize: 15,
    lineHeight: 22,
    color: MenteColors.textMuted,
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 20,
    borderRadius: MenteRadius.card,
    backgroundColor: MenteColors.dangerText,
  },
  helpButtonText: {
    ...MenteType.button,
    fontSize: 17,
    color: MenteColors.onPrimary,
  },
  exerciseRow: {
    flexDirection: 'row',
    gap: 12,
  },
  exercise: {
    flex: 1,
    gap: 8,
    padding: 16,
    borderRadius: MenteRadius.card,
    backgroundColor: MenteColors.surface,
  },
  exerciseTitle: {
    ...MenteType.button,
    color: MenteColors.text,
  },
  exerciseDetail: {
    ...MenteType.caption,
    color: MenteColors.textMuted,
  },
  card: {
    gap: 12,
  },
  cardTitle: {
    ...MenteType.sectionTitle,
    color: MenteColors.text,
  },
  contact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  contactText: {
    flex: 1,
    gap: 2,
  },
  contactName: {
    ...MenteType.body,
    fontFamily: MenteType.captionStrong.fontFamily,
    color: MenteColors.text,
  },
  contactDetail: {
    ...MenteType.caption,
    color: MenteColors.textMuted,
  },
  callButton: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: MenteRadius.pill,
    backgroundColor: MenteColors.primary,
  },
  callButtonText: {
    ...MenteType.captionStrong,
    color: MenteColors.onPrimary,
  },
  planStep: {
    ...MenteType.body,
    color: MenteColors.text,
  },
  logButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    paddingVertical: 15,
    borderRadius: MenteRadius.button,
    borderWidth: 1,
    borderColor: MenteColors.border,
    backgroundColor: MenteColors.surface,
  },
  logButtonText: {
    ...MenteType.body,
    fontFamily: MenteType.captionStrong.fontFamily,
    color: MenteColors.accent,
  },
  logCaption: {
    ...MenteType.link,
    marginTop: -6,
    textAlign: 'center',
    color: MenteColors.textMuted,
  },
});
