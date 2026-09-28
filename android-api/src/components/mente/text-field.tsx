import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { MenteColors, MenteRadius, MenteType } from '@/constants/mente-theme';

export type TextFieldProps = TextInputProps & {
  label: string;
  /** Renders the trailing reveal toggle and masks the input by default. */
  secure?: boolean;
};

export function TextField({ label, secure = false, style, ...inputProps }: TextFieldProps) {
  const [revealed, setRevealed] = useState(false);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.input}>
        {/* Leading glyph placeholder, as drawn in the prototype. */}
        <View style={styles.leadingIcon} />

        <TextInput
          style={[styles.textInput, style]}
          placeholderTextColor={MenteColors.textMuted}
          secureTextEntry={secure && !revealed}
          {...inputProps}
        />

        {secure && (
          <Pressable
            onPress={() => setRevealed((value) => !value)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Ocultar senha' : 'Mostrar senha'}
            style={styles.revealToggle}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: 8,
    width: '100%',
  },
  label: {
    ...MenteType.label,
    color: MenteColors.text,
  },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: MenteRadius.input,
    borderWidth: 1,
    borderColor: MenteColors.border,
    backgroundColor: MenteColors.surface,
  },
  leadingIcon: {
    width: 15,
    height: 12,
    borderRadius: 3,
    backgroundColor: 'rgba(124, 153, 174, 0.75)',
  },
  textInput: {
    flex: 1,
    padding: 0,
    ...MenteType.body,
    color: MenteColors.text,
  },
  revealToggle: {
    width: 14,
    height: 14,
    borderRadius: '50%',
    backgroundColor: 'rgba(124, 153, 174, 0.6)',
  },
});
