import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { CrisisQuickLog } from '@/components/mente/crisis-quick-log';
import { Icon, type IconName } from '@/components/mente/icon';
import { StackScreen } from '@/components/mente/stack-screen';
import { Card, IconBubble, Input, MIN_TOUCH, Spacer, TOUCH_SLOP } from '@/components/mente/ui';
import { MenteRadius, MenteType } from '@/constants/mente-theme';
import { COMFORT_PHRASES } from '@/data/phrases';
import type { ToolId } from '@/data/types';
import { useUserData } from '@/data/user-data-context';
import { call, message } from '@/lib/phone';
import { makeStyles, useColors } from '@/theme';

/** CVV — Centro de Valorização da Vida, Brazil's free 24h emotional-support line. */
const CVV = { id: 'cvv', name: 'CVV — Apoio emocional', phone: '188', detail: '188 · 24h, gratuito' };

const EXERCISES: readonly { icon: IconName; title: string; detail: string; tool: ToolId; mini?: boolean }[] = [
  { icon: 'breath', title: 'Respirar', detail: '4-7-8 · 1 min', tool: 'breathing', mini: true },
  { icon: 'anchor', title: 'Grounding', detail: '5-4-3-2-1', tool: 'grounding' },
];

const COMFORT_EVERY_MS = 8000;

/**
 * RF-31: one tap from Início, fully offline (CA-01) — everything here comes
 * from the device: comfort phrases, support contacts, the action plan.
 */
export default function EmergencyScreen() {
  const styles = useStyles();
  const c = useColors();
  const router = useRouter();
  const { data, actions } = useUserData();
  const [editingPlan, setEditingPlan] = useState(false);
  const [plan, setPlan] = useState<string[]>(data.actionPlan);
  const [phrase, setPhrase] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setPhrase((value) => (value + 1) % COMFORT_PHRASES.length), COMFORT_EVERY_MS);
    return () => clearInterval(id);
  }, []);

  const contacts = [CVV, ...data.contacts.map((contact) => ({ ...contact, detail: contact.phone }))];

  const savePlan = () => {
    const steps = plan.map((step) => step.trim()).filter(Boolean);
    actions.setActionPlan(steps);
    setPlan(steps);
    setEditingPlan(false);
  };

  return (
    <StackScreen>
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fechar"
          onPress={() => (router.canGoBack() ? router.back() : router.navigate('/home'))}
          style={styles.closeButton}>
          <Icon name="close" size={15} color={c.accent} />
        </Pressable>
        <Spacer />
        <View style={styles.crisisBadge}>
          <Text style={styles.crisisBadgeText}>MODO EMERGÊNCIA</Text>
        </View>
      </View>

      <View style={styles.intro} accessibilityLiveRegion="polite">
        <Text style={styles.title}>{COMFORT_PHRASES[phrase]}</Text>
        <Text style={styles.subtitle}>Respire. Vamos passar por isso um passo de cada vez.</Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityHint="Liga para o CVV, 188"
        onPress={() => call(CVV.phone)}
        style={({ pressed }) => [styles.helpButton, pressed && styles.pressed]}>
        <Icon name="phone" size={20} color={c.onPrimary} cutColor={c.dangerText} />
        <Text style={styles.helpButtonText}>Ligar para o CVV (188)</Text>
      </Pressable>

      <View style={styles.exerciseRow}>
        {EXERCISES.map((exercise) => (
          <Pressable
            key={exercise.title}
            accessibilityRole="button"
            onPress={() =>
              router.push({ pathname: '/practice', params: { tool: exercise.tool, ...(exercise.mini ? { mini: '1' } : {}) } })
            }
            style={({ pressed }) => [styles.exercise, pressed && styles.pressed]}>
            <Icon name={exercise.icon} size={24} color={c.accent} />
            <Text style={styles.exerciseTitle}>{exercise.title}</Text>
            <Text style={styles.exerciseDetail}>{exercise.detail}</Text>
          </Pressable>
        ))}
      </View>

      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Contatos de apoio</Text>
          <Spacer />
          <Pressable accessibilityRole="button" hitSlop={TOUCH_SLOP} onPress={() => router.push('/contacts')}>
            <Text style={styles.link}>{data.contacts.length ? 'Gerenciar' : '+ Adicionar'}</Text>
          </Pressable>
        </View>

        {contacts.map((contact) => (
          <View key={contact.id} style={styles.contact}>
            <IconBubble name="phone" size={35} glyphSize={17} />
            <View style={styles.contactText}>
              <Text style={styles.contactName}>{contact.name}</Text>
              <Text style={styles.contactDetail}>{contact.detail}</Text>
            </View>
            {contact.id !== CVV.id ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Mandar mensagem para ${contact.name}`}
                onPress={() => message(contact.phone, 'Oi, estou passando por um momento difícil. Você pode falar comigo?')}
                style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressed]}>
                <Text style={styles.secondaryActionText}>Mensagem</Text>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Ligar para ${contact.name}`}
              onPress={() => call(contact.phone)}
              style={({ pressed }) => [styles.callButton, pressed && styles.pressed]}>
              <Text style={styles.callButtonText}>Ligar</Text>
            </Pressable>
          </View>
        ))}
      </Card>

      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Meu plano de ação</Text>
          <Spacer />
          <Pressable accessibilityRole="button" hitSlop={TOUCH_SLOP} onPress={() => (editingPlan ? savePlan() : setEditingPlan(true))}>
            <Text style={styles.link}>{editingPlan ? 'Salvar' : 'Editar'}</Text>
          </Pressable>
        </View>

        {editingPlan ? (
          <>
            {plan.map((step, index) => (
              <View key={index} style={styles.planEditRow}>
                <Text style={styles.planStep}>{index + 1}.</Text>
                <Input
                  accessibilityLabel={`Passo ${index + 1}`}
                  value={step}
                  onChangeText={(value) => setPlan((current) => current.map((item, i) => (i === index ? value : item)))}
                  style={styles.flex}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remover passo ${index + 1}`}
                  onPress={() => setPlan((current) => current.filter((_, i) => i !== index))}
                  style={styles.iconButton}>
                  <Icon name="close" size={12} color={c.textMuted} />
                </Pressable>
              </View>
            ))}
            <Pressable accessibilityRole="button" onPress={() => setPlan((current) => [...current, ''])} style={styles.iconRow}>
              <Text style={styles.link}>+ Adicionar passo</Text>
            </Pressable>
          </>
        ) : data.actionPlan.length ? (
          data.actionPlan.map((step, index) => (
            <Text key={`${index}-${step}`} style={styles.planStep}>
              {index + 1}. {step}
            </Text>
          ))
        ) : (
          <Text style={styles.contactDetail}>Defina o que te ajuda num momento difícil.</Text>
        )}
      </Card>

      <CrisisQuickLog />
      <Text style={styles.logCaption}>
        {data.crises.length
          ? `${data.crises.length} ${data.crises.length === 1 ? 'pico registrado' : 'picos registrados'} · data, hora, intensidade e gatilhos`
          : 'Salva data, hora e intensidade em dois toques'}
      </Text>
    </StackScreen>
  );
}

const useStyles = makeStyles((c) => ({
  pressed: {
    opacity: 0.75,
  },
  flex: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeButton: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: MenteRadius.pill,
    backgroundColor: c.surface,
  },
  crisisBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: MenteRadius.pill,
    backgroundColor: c.dangerSurface,
  },
  crisisBadgeText: {
    ...MenteType.badge,
    letterSpacing: 0.7,
    color: c.dangerText,
  },
  intro: {
    gap: 8,
    paddingTop: 4,
    minHeight: 96,
  },
  title: {
    ...MenteType.heading,
    color: c.text,
  },
  subtitle: {
    ...MenteType.subtitle,
    fontSize: 15,
    lineHeight: 22,
    color: c.textMuted,
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 20,
    borderRadius: MenteRadius.card,
    backgroundColor: c.dangerText,
  },
  helpButtonText: {
    ...MenteType.button,
    fontSize: 17,
    color: c.onPrimary,
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
    backgroundColor: c.surface,
  },
  exerciseTitle: {
    ...MenteType.button,
    color: c.text,
  },
  exerciseDetail: {
    ...MenteType.caption,
    color: c.textMuted,
  },
  card: {
    gap: 12,
  },
  cardHeader: {
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
  contact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  contactText: {
    flex: 1,
    gap: 2,
  },
  contactName: {
    ...MenteType.body,
    fontFamily: MenteType.captionStrong.fontFamily,
    color: c.text,
  },
  contactDetail: {
    ...MenteType.caption,
    color: c.textMuted,
  },
  secondaryAction: {
    minHeight: MIN_TOUCH,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  secondaryActionText: {
    ...MenteType.captionStrong,
    color: c.accent,
  },
  callButton: {
    minHeight: MIN_TOUCH,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: MenteRadius.pill,
    backgroundColor: c.primary,
  },
  callButtonText: {
    ...MenteType.captionStrong,
    color: c.onPrimary,
  },
  planEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planStep: {
    ...MenteType.body,
    color: c.text,
  },
  iconButton: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconRow: {
    minHeight: MIN_TOUCH,
    justifyContent: 'center',
  },
  logCaption: {
    ...MenteType.small,
    textAlign: 'center',
    color: c.textMuted,
  },
}));
