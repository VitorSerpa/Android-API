import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/mente/icon';
import { Button, Card, IconBubble, Input, Spacer } from '@/components/mente/ui';
import { MenteColors, MenteRadius, MenteSpacing, MenteType } from '@/constants/mente-theme';
import type { ToolId } from '@/data/types';
import { useUserData } from '@/data/user-data-context';
import { call } from '@/lib/phone';

/** CVV — Centro de Valorização da Vida, Brazil's free 24h emotional-support line. */
const CVV = { id: 'cvv', name: 'CVV — Apoio emocional', phone: '188', detail: '188 · 24h, gratuito' };

const EXERCISES: readonly { icon: IconName; title: string; detail: string; tool: ToolId }[] = [
  { icon: 'breath', title: 'Respirar', detail: '4-7-8 · 1 min', tool: 'breathing' },
  { icon: 'anchor', title: 'Grounding', detail: '5-4-3-2-1', tool: 'grounding' },
];

const INTENSITIES = Array.from({ length: 10 }, (_, index) => index + 1);

export default function EmergencyScreen() {
  const router = useRouter();
  const { data, actions } = useUserData();

  const [editingPlan, setEditingPlan] = useState(false);
  const [plan, setPlan] = useState<string[]>(data.actionPlan);

  const [logging, setLogging] = useState(false);
  const [logged, setLogged] = useState(false);
  const [intensity, setIntensity] = useState(5);
  const [trigger, setTrigger] = useState('');
  const [place, setPlace] = useState('');
  const [note, setNote] = useState('');

  const contacts = [
    CVV,
    ...data.contacts.map((contact) => ({ ...contact, detail: contact.phone })),
  ];

  const savePlan = () => {
    const steps = plan.map((step) => step.trim()).filter(Boolean);
    actions.setActionPlan(steps);
    setPlan(steps);
    setEditingPlan(false);
  };

  const saveLog = () => {
    actions.logCrisis({ intensity, trigger: trigger.trim(), place: place.trim(), note: note.trim() });
    setLogging(false);
    setLogged(true);
    setTrigger('');
    setPlace('');
    setNote('');
    setIntensity(5);
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.safeArea}
          // Android is edge-to-edge (targetSdk 35+), where `adjustResize` no longer
          // shrinks the window, so pad on both platforms.
          behavior="padding">
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
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
            <Text style={styles.title}>Você não está só.</Text>
            <Text style={styles.subtitle}>
              Respire. Vamos passar por isso um passo de cada vez.
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityHint="Liga para o CVV, 188"
            onPress={() => call(CVV.phone)}
            style={({ pressed }) => [styles.helpButton, pressed && styles.pressed]}>
            <Icon name="phone" size={20} color={MenteColors.onPrimary} cutColor={MenteColors.dangerText} />
            <Text style={styles.helpButtonText}>Preciso de ajuda agora</Text>
          </Pressable>

          <View style={styles.exerciseRow}>
            {EXERCISES.map((exercise) => (
              <Pressable
                key={exercise.title}
                accessibilityRole="button"
                onPress={() => router.push({ pathname: '/practice', params: { tool: exercise.tool } })}
                style={({ pressed }) => [styles.exercise, pressed && styles.pressed]}>
                <Icon name={exercise.icon} size={24} color={MenteColors.accent} />
                <Text style={styles.exerciseTitle}>{exercise.title}</Text>
                <Text style={styles.exerciseDetail}>{exercise.detail}</Text>
              </Pressable>
            ))}
          </View>

          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Contatos de apoio</Text>
              <Spacer />
              <Pressable accessibilityRole="button" hitSlop={8} onPress={() => router.push('/contacts')}>
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
              <Pressable
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => (editingPlan ? savePlan() : setEditingPlan(true))}>
                <Text style={styles.link}>{editingPlan ? 'Salvar' : 'Editar'}</Text>
              </Pressable>
            </View>

            {editingPlan ? (
              <>
                {plan.map((step, index) => (
                  <View key={index} style={styles.planEditRow}>
                    <Text style={styles.planStep}>{index + 1}.</Text>
                    <Input
                      value={step}
                      onChangeText={(value) =>
                        setPlan((current) => current.map((item, i) => (i === index ? value : item)))
                      }
                      style={styles.flex}
                    />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remover passo ${index + 1}`}
                      hitSlop={8}
                      onPress={() => setPlan((current) => current.filter((_, i) => i !== index))}>
                      <Icon name="close" size={12} color={MenteColors.textMuted} />
                    </Pressable>
                  </View>
                ))}
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setPlan((current) => [...current, ''])}>
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

          {logging ? (
            <Card style={styles.card}>
              <Text style={styles.cardTitle}>Registrar crise</Text>
              <Text style={styles.contactDetail}>Intensidade</Text>
              <View style={styles.intensityRow}>
                {INTENSITIES.map((value) => {
                  const selected = intensity === value;
                  return (
                    <Pressable
                      key={value}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      onPress={() => setIntensity(value)}
                      style={[styles.intensity, selected && styles.intensitySelected]}>
                      <Text style={[styles.intensityText, selected && styles.intensityTextSelected]}>
                        {value}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Input placeholder="Gatilho (o que aconteceu?)" value={trigger} onChangeText={setTrigger} />
              <Input placeholder="Local" value={place} onChangeText={setPlace} />
              <Input placeholder="Observação" value={note} onChangeText={setNote} multiline />
              <Button label="Salvar registro" onPress={saveLog} />
              <Button label="Cancelar" variant="secondary" onPress={() => setLogging(false)} />
            </Card>
          ) : (
            <>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setLogged(false);
                  setLogging(true);
                }}
                style={({ pressed }) => [styles.logButton, pressed && styles.pressed]}>
                <Icon name="clipboard" size={17} color={MenteColors.accent} cutColor={MenteColors.surface} />
                <Text style={styles.logButtonText}>
                  {logged ? 'Crise registrada ✓' : 'Registrar esta crise (30 segundos)'}
                </Text>
              </Pressable>

              <Text style={styles.logCaption}>
                {data.crises.length
                  ? `${data.crises.length} ${data.crises.length === 1 ? 'registro' : 'registros'} · intensidade · gatilho · local · observação`
                  : 'Intensidade · gatilho · local · observação'}
              </Text>
            </>
          )}
        </ScrollView>
        </KeyboardAvoidingView>
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
  flex: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  link: {
    ...MenteType.link,
    color: MenteColors.accent,
  },
  planEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  intensityRow: {
    flexDirection: 'row',
    gap: 4,
  },
  intensity: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: MenteColors.background,
  },
  intensitySelected: {
    backgroundColor: MenteColors.dangerText,
  },
  intensityText: {
    ...MenteType.smallStrong,
    color: MenteColors.textMuted,
  },
  intensityTextSelected: {
    color: MenteColors.onPrimary,
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
