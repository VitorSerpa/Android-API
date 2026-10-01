import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, TopBar } from '@/components/mente/ui';
import { MenteRadius, MenteSpacing, MenteType } from '@/constants/mente-theme';
import { ASSESSMENTS, normaliseAnswers } from '@/data/assessments';
import type { AssessmentKind } from '@/data/types';
import { useUserData } from '@/data/user-data-context';
import { makeStyles } from '@/theme';

const isKind = (value: unknown): value is AssessmentKind =>
  typeof value === 'string' && value in ASSESSMENTS;

export default function AssessmentScreen() {
  const styles = useStyles();
  const router = useRouter();
  const params = useLocalSearchParams<{ kind?: string }>();
  const definition = ASSESSMENTS[isKind(params.kind) ? params.kind : 'wellbeing'];
  const { actions } = useUserData();

  const [answers, setAnswers] = useState<(number | null)[]>(() =>
    definition.questions.map(() => null),
  );
  const [result, setResult] = useState<number | null>(null);

  // CA-03: the score only exists once every question has an answer.
  const complete = answers.every((answer) => answer !== null);
  const answered = answers.filter((answer) => answer !== null).length;

  const submit = () => {
    if (!complete) return;
    const score = definition.score(normaliseAnswers(definition, answers as number[]));
    actions.saveAssessment(definition.kind, score);
    setResult(score);
  };

  const close = () => (router.canGoBack() ? router.back() : router.navigate('/wellbeing'));

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <TopBar title={definition.title} />

          {result !== null ? (
            <Card style={styles.resultCard}>
              <Text style={styles.resultLabel}>Resultado</Text>
              <Text style={styles.resultValue}>{definition.describe(result)}</Text>
              <Text style={styles.caption}>
                Pontuação {result} de {definition.maxScore}
              </Text>
              <Text style={styles.interpretation}>{definition.interpret(result)}</Text>
              <Text style={styles.caption}>
                Este resultado é apenas indicativo e não substitui a avaliação de um profissional de
                saúde mental.
              </Text>
              <Button
                label="Ver histórico"
                variant="secondary"
                onPress={() => router.replace({ pathname: '/assessment-history', params: { kind: definition.kind } })}
                style={styles.stretch}
              />
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
                          accessibilityLabel={option}
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
              <Text style={styles.caption}>
                {complete ? 'Tudo respondido.' : `${answered} de ${definition.questions.length} respondidas — responda todas para ver o resultado.`}
              </Text>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: {
    flex: 1,
    backgroundColor: c.background,
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
  interpretation: {
    ...MenteType.body,
    textAlign: 'center',
    color: c.text,
  },
  intro: {
    ...MenteType.body,
    color: c.textMuted,
  },
  card: {
    gap: 10,
  },
  question: {
    ...MenteType.captionStrong,
    fontSize: 14,
    lineHeight: 20,
    color: c.text,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  option: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: MenteRadius.pill,
    backgroundColor: c.background,
  },
  optionSelected: {
    backgroundColor: c.primary,
  },
  optionText: {
    ...MenteType.small,
    color: c.textMuted,
  },
  optionTextSelected: {
    ...MenteType.smallStrong,
    color: c.onPrimary,
  },
  resultCard: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 28,
  },
  resultLabel: {
    ...MenteType.small,
    color: c.textMuted,
  },
  resultValue: {
    ...MenteType.title,
    color: c.text,
  },
  caption: {
    ...MenteType.small,
    textAlign: 'center',
    color: c.textMuted,
    marginBottom: 6,
  },
}));
