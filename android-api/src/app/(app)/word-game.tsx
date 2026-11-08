import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Icon } from '@/components/mente/icon';
import { StackScreen } from '@/components/mente/stack-screen';
import { Button, Card, MIN_TOUCH, TopBar } from '@/components/mente/ui';
import { MenteRadius, MenteType } from '@/constants/mente-theme';
import { newRound, roundMessage, type Round } from '@/data/word-game';
import { useUserData } from '@/data/user-data-context';
import { makeStyles, useColors } from '@/theme';

type Answer = { chosen: string; right: boolean } | null;

/**
 * RF-73 / US-20: a calm distraction game. One word at a time, tap the category
 * it belongs to. Everything is on the device, so it works offline (CA-02), and
 * it is one tap away from the emergency screen.
 */
export default function WordGameScreen() {
  const styles = useStyles();
  const c = useColors();
  const router = useRouter();
  const { data, actions } = useUserData();
  const [round, setRound] = useState<Round>(() => newRound());
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [answer, setAnswer] = useState<Answer>(null);
  const favorite = data.favoriteTechniques.includes('word-game');

  const finished = index >= round.words.length;
  const current = round.words[index];

  const choose = (categoryId: string) => {
    if (answer || !current) return;
    const right = categoryId === current.categoryId;
    setAnswer({ chosen: categoryId, right });
    if (right) setCorrect((value) => value + 1);
  };

  const next = () => {
    setAnswer(null);
    setIndex((value) => value + 1);
  };

  const restart = () => {
    setRound(newRound());
    setIndex(0);
    setCorrect(0);
    setAnswer(null);
  };

  const categoryName = (id: string) => round.categories.find((category) => category.id === id)?.name ?? '';

  return (
    <StackScreen>
      <TopBar
        title="Jogo de palavras"
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={favorite ? 'Remover dos atalhos' : 'Salvar nos atalhos'}
            accessibilityState={{ selected: favorite }}
            onPress={() => actions.toggleFavoriteTechnique('word-game')}
            style={styles.favorite}>
            <Text style={styles.favoriteText}>{favorite ? '★' : '☆'}</Text>
          </Pressable>
        }
      />
      <Text style={styles.detail}>
        Sem pressa e sem cronômetro. Leia a palavra e toque na categoria a que ela pertence — sua atenção volta para o agora.
      </Text>

      {finished ? (
        <Card style={styles.center}>
          <Icon name="heart" size={30} color={c.greenText} />
          <Text style={styles.score}>
            {correct} de {round.words.length}
          </Text>
          <Text style={styles.message}>{roundMessage(correct, round.words.length)}</Text>
          <Button label="Jogar outra rodada" onPress={restart} style={styles.stretch} />
          <Button
            label="Respirar um minuto"
            variant="secondary"
            onPress={() => router.push({ pathname: '/practice', params: { tool: 'breathing', mini: '1' } })}
            style={styles.stretch}
          />
        </Card>
      ) : (
        <>
          <Card style={styles.center}>
            <Text style={styles.progress}>
              Palavra {index + 1} de {round.words.length}
            </Text>
            <Text style={styles.word} accessibilityLiveRegion="polite">
              {current.word}
            </Text>
            <Text style={styles.feedback} accessibilityLiveRegion="polite">
              {answer
                ? answer.right
                  ? 'Isso mesmo!'
                  : `Quase! “${current.word}” é de ${categoryName(current.categoryId)}.`
                : 'A que categoria ela pertence?'}
            </Text>
          </Card>

          <View style={styles.categories} accessibilityRole="radiogroup" accessibilityLabel="Categorias">
            {round.categories.map((category) => {
              const isRight = answer && category.id === current.categoryId;
              const isWrongChoice = answer && !answer.right && category.id === answer.chosen;
              return (
                <Pressable
                  key={category.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: answer?.chosen === category.id, disabled: Boolean(answer) }}
                  onPress={() => choose(category.id)}
                  style={({ pressed }) => [
                    styles.category,
                    isRight && styles.categoryRight,
                    isWrongChoice && styles.categoryWrong,
                    pressed && styles.pressed,
                  ]}>
                  <Text style={[styles.categoryText, isRight && styles.categoryTextRight, isWrongChoice && styles.categoryTextWrong]}>
                    {category.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {answer ? <Button label={index + 1 < round.words.length ? 'Próxima palavra' : 'Ver resultado'} onPress={next} /> : null}
          <Text style={styles.detail}>
            Acertos: {correct} · Categorias desta rodada: {round.categories.map((category) => category.name).join(', ')}
          </Text>
        </>
      )}
    </StackScreen>
  );
}

const useStyles = makeStyles((c) => ({
  detail: {
    ...MenteType.small,
    color: c.textMuted,
  },
  center: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 28,
  },
  stretch: {
    alignSelf: 'stretch',
  },
  progress: {
    ...MenteType.captionStrong,
    color: c.accent,
  },
  word: {
    ...MenteType.title,
    fontSize: 34,
    lineHeight: 42,
    textAlign: 'center',
    color: c.text,
  },
  feedback: {
    ...MenteType.body,
    textAlign: 'center',
    color: c.textMuted,
  },
  score: {
    ...MenteType.title,
    color: c.text,
  },
  message: {
    ...MenteType.body,
    textAlign: 'center',
    color: c.textMuted,
  },
  categories: {
    gap: 10,
  },
  category: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: MenteRadius.button,
    borderWidth: 2,
    borderColor: c.border,
    backgroundColor: c.surface,
  },
  categoryRight: {
    borderColor: c.greenText,
    backgroundColor: c.greenSurface,
  },
  categoryWrong: {
    borderColor: c.dangerBorder,
    backgroundColor: c.dangerSurface,
  },
  categoryText: {
    ...MenteType.button,
    color: c.text,
  },
  categoryTextRight: {
    color: c.greenText,
  },
  categoryTextWrong: {
    color: c.dangerText,
  },
  favorite: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteText: {
    ...MenteType.heading,
    color: c.amberText,
  },
  pressed: {
    opacity: 0.75,
  },
}));
