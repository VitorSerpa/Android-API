import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Icon } from '@/components/mente/icon';
import { Button, Input, MIN_TOUCH } from '@/components/mente/ui';
import { MenteRadius, MenteType } from '@/constants/mente-theme';
import { useUserData } from '@/data/user-data-context';
import { currentCoordinates } from '@/lib/location';
import { makeStyles, useColors } from '@/theme';

const INTENSITIES = Array.from({ length: 10 }, (_, index) => index + 1);

/**
 * RF-33: tap "Registrar pico", tap the intensity — saved, with date and time
 * (CA-03: two taps). RF-34 follows up with the possible triggers; RF-35 adds
 * the place only when the user switched it on and Android granted it (CA-04:
 * a refusal still keeps the record).
 */
export function CrisisQuickLog() {
  const styles = useStyles();
  const c = useColors();
  const { data, actions } = useUserData();
  const [stage, setStage] = useState<'idle' | 'intensity' | 'triggers' | 'done'>('idle');
  const [crisisId, setCrisisId] = useState<string | null>(null);
  const [triggers, setTriggers] = useState({ situation: '', place: '', thought: '' });
  const [locating, setLocating] = useState(false);

  const log = (intensity: number) => {
    const id = actions.logCrisis(intensity);
    setCrisisId(id);
    setStage('triggers');
    if (data.settings.crisisLocation && !data.settings.offlineMode) {
      setLocating(true);
      currentCoordinates()
        .then((location) => location && actions.updateCrisis(id, { location }))
        .finally(() => setLocating(false));
    }
  };

  const saveTriggers = () => {
    if (crisisId) {
      actions.updateCrisis(crisisId, {
        triggers: { situation: triggers.situation.trim(), place: triggers.place.trim(), thought: triggers.thought.trim() },
      });
    }
    setTriggers({ situation: '', place: '', thought: '' });
    setStage('done');
  };

  if (stage === 'idle' || stage === 'done') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityHint="Registra um pico de ansiedade em dois toques"
        onPress={() => setStage('intensity')}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
        <Icon name="clipboard" size={17} color={c.accent} cutColor={c.surface} />
        <Text style={styles.buttonText}>{stage === 'done' ? 'Pico registrado ✓ · registrar outro' : 'Registrar pico de ansiedade'}</Text>
      </Pressable>
    );
  }

  if (stage === 'intensity') {
    return (
      <View style={styles.panel}>
        <Text style={styles.title}>Qual a intensidade agora?</Text>
        <View style={styles.grid} accessibilityRole="radiogroup" accessibilityLabel="Intensidade de 1 a 10">
          {INTENSITIES.map((value) => (
            <Pressable
              key={value}
              accessibilityRole="button"
              accessibilityLabel={`Intensidade ${value}`}
              onPress={() => log(value)}
              style={({ pressed }) => [styles.intensity, pressed && styles.pressed]}>
              <Text style={styles.intensityText}>{value}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable accessibilityRole="button" onPress={() => setStage('idle')} style={styles.cancel}>
          <Text style={styles.link}>Cancelar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.panel} accessibilityLiveRegion="polite">
      <Text style={styles.title}>✓ Pico registrado</Text>
      <Text style={styles.detail}>
        Se puder, conte o que pode ter causado. Tudo é opcional.
        {locating ? ' Salvando o local…' : ''}
      </Text>
      <Input accessibilityLabel="Situação" placeholder="Situação (o que estava acontecendo?)" value={triggers.situation} onChangeText={(situation) => setTriggers((value) => ({ ...value, situation }))} />
      <Input accessibilityLabel="Local" placeholder="Local (onde você estava?)" value={triggers.place} onChangeText={(place) => setTriggers((value) => ({ ...value, place }))} />
      <Input accessibilityLabel="Pensamento" placeholder="Pensamento (o que passou pela cabeça?)" value={triggers.thought} onChangeText={(thought) => setTriggers((value) => ({ ...value, thought }))} />
      <Button label="Salvar gatilhos" onPress={saveTriggers} />
      <Button label="Pular" variant="secondary" onPress={() => setStage('done')} />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  pressed: {
    opacity: 0.75,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 52,
    paddingHorizontal: 14,
    borderRadius: MenteRadius.button,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
  },
  buttonText: {
    ...MenteType.captionStrong,
    color: c.accent,
  },
  panel: {
    gap: 10,
    padding: 16,
    borderRadius: MenteRadius.card,
    backgroundColor: c.surface,
  },
  title: {
    ...MenteType.sectionTitle,
    color: c.text,
  },
  detail: {
    ...MenteType.small,
    color: c.textMuted,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  intensity: {
    width: MIN_TOUCH + 8,
    height: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: MenteRadius.chip,
    backgroundColor: c.dangerSurface,
  },
  intensityText: {
    ...MenteType.button,
    color: c.dangerText,
  },
  cancel: {
    minHeight: MIN_TOUCH,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  link: {
    ...MenteType.captionStrong,
    color: c.accent,
  },
}));
