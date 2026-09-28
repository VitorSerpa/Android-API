import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/mente/icon';
import { Card, Spacer, Toggle, TopBar } from '@/components/mente/ui';
import { MenteColors, MenteRadius, MenteSpacing, MenteType } from '@/constants/mente-theme';

const REMINDERS = [
  { title: 'Check-in diário', schedule: 'Todo dia às 9:00', done: true, on: true },
  { title: 'Medicação', schedule: '8:00 e 20:00', done: true, on: true },
  { title: 'Hidratação', schedule: 'A cada 2 horas', done: false, on: true },
  { title: 'Alongamento', schedule: '15:00, dias úteis', done: false, on: false },
] as const;

const GOALS = [
  { title: 'Check-in 5x por semana', progress: '4 de 5', ratio: 0.8 },
  { title: 'Meditar 60 min no mês', progress: '38 de 60', ratio: 0.63 },
] as const;

const RATINGS = ['Sim', 'Mais ou menos', 'Não'] as const;

const ASSESSMENTS = [
  { title: 'Nível de estresse', last: 'Última: 14/10', value: 'Moderado', color: MenteColors.anxiety },
  { title: 'Bem-estar geral (WHO-5)', last: 'Última: 01/10', value: '68 de 100', color: MenteColors.primary },
  { title: 'Resiliência', last: 'Última: 28/09', value: 'Boa', color: MenteColors.mood },
] as const;

export default function RemindersScreen() {
  const [rating, setRating] = useState<string | null>(null);

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <TopBar title="Rotina e evolução" />

          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <Icon name="bell" size={16} color={MenteColors.accent} />
              <Text style={styles.cardTitle}>Lembretes</Text>
              <Spacer />
              <Pressable accessibilityRole="button" hitSlop={8}>
                <Text style={styles.link}>+ Novo</Text>
              </Pressable>
            </View>

            {REMINDERS.map((reminder) => (
              <View key={reminder.title} style={styles.row}>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>{reminder.title}</Text>
                  <Text style={styles.rowDetail}>{reminder.schedule}</Text>
                </View>
                {reminder.done ? (
                  <View style={styles.donePill}>
                    <Text style={styles.donePillText}>Feito hoje</Text>
                  </View>
                ) : null}
                <Toggle initial={reminder.on} />
              </View>
            ))}

            <View style={styles.divider} />

            <View style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>Período noturno sem notificações</Text>
                <Text style={styles.rowDetail}>22:00 — 07:00</Text>
              </View>
              <Toggle initial />
            </View>
          </Card>

          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <Icon name="target" size={16} color={MenteColors.accent} />
              <Text style={styles.cardTitle}>Metas de bem-estar</Text>
              <Spacer />
              <Pressable accessibilityRole="button" hitSlop={8}>
                <Text style={styles.link}>+ Nova</Text>
              </Pressable>
            </View>

            {GOALS.map((goal) => (
              <View key={goal.title} style={styles.goal}>
                <View style={styles.goalHeader}>
                  <Text style={styles.goalTitle}>{goal.title}</Text>
                  <Spacer />
                  <Text style={styles.goalProgress}>{goal.progress}</Text>
                </View>
                <View style={styles.goalTrack}>
                  <View style={[styles.goalFill, { width: `${goal.ratio * 100}%` }]} />
                </View>
              </View>
            ))}
          </Card>

          <Card style={styles.card}>
            <Text style={styles.eyebrow}>Sugestão para esta semana</Text>
            <Text style={styles.suggestion}>
              Caminhar 20 minutos depois do almoço nos dias de reunião.
            </Text>

            <View style={styles.ratingRow}>
              <Text style={styles.rowDetail}>Foi útil?</Text>
              <Spacer />
              {RATINGS.map((option) => {
                const selected = rating === option;
                return (
                  <Pressable
                    key={option}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    onPress={() => setRating(option)}
                    style={[styles.ratingChip, selected && styles.ratingChipSelected]}>
                    <Text style={[styles.ratingText, selected && styles.ratingTextSelected]}>
                      {option}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>

          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Avaliações</Text>
              <Spacer />
              <Pressable accessibilityRole="button" hitSlop={8}>
                <Text style={styles.link}>Refazer</Text>
              </Pressable>
            </View>

            {ASSESSMENTS.map((assessment) => (
              <View key={assessment.title} style={styles.assessment}>
                <View style={[styles.assessmentBar, { backgroundColor: assessment.color }]} />
                <View style={styles.rowText}>
                  <Text style={styles.assessmentTitle}>{assessment.title}</Text>
                  <Text style={styles.rowDetail}>{assessment.last}</Text>
                </View>
                <Text style={styles.assessmentValue}>{assessment.value}</Text>
              </View>
            ))}
          </Card>
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
    color: MenteColors.text,
  },
  link: {
    ...MenteType.link,
    color: MenteColors.accent,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    ...MenteType.captionStrong,
    fontSize: 14,
    color: MenteColors.text,
  },
  rowDetail: {
    ...MenteType.small,
    color: MenteColors.textMuted,
  },
  donePill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: MenteRadius.pill,
    backgroundColor: MenteColors.greenSurface,
  },
  donePillText: {
    ...MenteType.micro,
    color: MenteColors.greenText,
  },
  divider: {
    height: 1,
    backgroundColor: MenteColors.border,
  },
  goal: {
    gap: 7,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goalTitle: {
    ...MenteType.small,
    color: MenteColors.text,
  },
  goalProgress: {
    ...MenteType.small,
    color: MenteColors.textMuted,
  },
  goalTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: MenteColors.background,
  },
  goalFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: MenteColors.primary,
  },
  eyebrow: {
    ...MenteType.link,
    color: MenteColors.textMuted,
  },
  suggestion: {
    ...MenteType.body,
    color: MenteColors.text,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  ratingChip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: MenteRadius.pill,
    backgroundColor: MenteColors.background,
  },
  ratingChipSelected: {
    backgroundColor: MenteColors.primary,
  },
  ratingText: {
    ...MenteType.link,
    color: MenteColors.textMuted,
  },
  ratingTextSelected: {
    fontFamily: MenteType.captionStrong.fontFamily,
    color: MenteColors.onPrimary,
  },
  assessment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  assessmentBar: {
    width: 3,
    height: 28,
    borderRadius: 2,
  },
  assessmentTitle: {
    ...MenteType.caption,
    fontFamily: MenteType.captionStrong.fontFamily,
    color: MenteColors.text,
  },
  assessmentValue: {
    ...MenteType.caption,
    color: MenteColors.accent,
  },
});
