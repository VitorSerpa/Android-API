import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, TopBar } from '@/components/mente/ui';
import { MenteColors, MenteRadius, MenteSpacing, MenteType } from '@/constants/mente-theme';
import { ASSESSMENTS, normaliseAnswers } from '@/data/assessments';
import type { AssessmentKind } from '@/data/types';
import { useUserData } from '@/data/user-data-context';

const isKind = (value: unknown): value is AssessmentKind =>
  typeof value === 'string' && value in ASSESSMENTS;

export default function AssessmentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ kind?: string }>();
  const definition = ASSESSMENTS[isKind(params.kind) ? params.kind : 'wellbeing'];
  const { actions } = useUserData();

  const [answers, setAnswers] = useState<(number | null)[]>(() =>
    definition.questions.map(() => null),
  );
  const [result, setResult] = useState<number | null>(null);

  const complete = answers.every((answer) => answer !== null);

  const submit = () => {
    const score = definition.score(normaliseAnswers(definition, answers as number[]));
    actions.saveAssessment(definition.kind, score);
    setResult(score);
  };

  const close = () => (router.canGoBack() ? router.back() : router.navigate('/reminders'));

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <TopBar title={definition.title} />

          {result !== null ? (
            <Card style={styles.resultCard}>
              <Text style={styles.resultLabel}>Resultado</Text>
              <Text style={styles.resultValue}>{definition.describe(result)}</Text>
              <Text style={styles.caption}>
                Este resultado é apenas indicativo e não substitui a avaliação de um profissional de
                saúde mental.
              </Text>
              <Button label="Concluir" onPress={close} style={styles.stretch} />
            </Card>
          ) : (
            <>
              <Text style={styles.intro}>{definition.intro}</Text>

              {definition.questions.map((question, index) => (
                <Card key={question.text} style={styles.card}>
                  <Text style={styles.question}>
                    {index + 1}. {question.text}
                  </Text>
                  <View style={styles.options}>
                    {definition.options.map((option, value) => {
                      const selected = answers[index] === value;
                      return (
                        <Pressable
                          key={option}
                          accessibilityRole="radio"
                          accessibilityState={{ selected }}
                          onPress={() =>
                            setAnswers((current) =>
                              current.map((answer, i) => (i === index ? value : answer)),
                            )
                          }
                          style={[styles.option, selected && styles.optionSelected]}>
                          <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                            {option}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </Card>
              ))}

              <Button label="Ver resultado" onPress={submit} disabled={!complete} />
            </>
          )}
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
  flex: {
    flex: 1,
  },
  content: {
    gap: 13,
    paddingHorizontal: MenteSpacing.gutter,
    paddingTop: 10,
    paddingBottom: 24,
  },
  stretch: {
    alignSelf: 'stretch',
  },
  intro: {
    ...MenteType.body,
    color: MenteColors.textMuted,
  },
  card: {
    gap: 10,
  },
  question: {
    ...MenteType.captionStrong,
    fontSize: 14,
    lineHeight: 20,
    color: MenteColors.text,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  option: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: MenteRadius.pill,
    backgroundColor: MenteColors.background,
  },
  optionSelected: {
    backgroundColor: MenteColors.primary,
  },
  optionText: {
    ...MenteType.small,
    color: MenteColors.textMuted,
  },
  optionTextSelected: {
    ...MenteType.smallStrong,
    color: MenteColors.onPrimary,
  },
  resultCard: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 28,
  },
  resultLabel: {
    ...MenteType.small,
    color: MenteColors.textMuted,
  },
  resultValue: {
    ...MenteType.title,
    color: MenteColors.text,
  },
  caption: {
    ...MenteType.small,
    textAlign: 'center',
    color: MenteColors.textMuted,
    marginBottom: 6,
  },
});
