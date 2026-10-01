import { useState } from 'react';
import { Pressable, Text, TextInput, View, type TextInputProps } from 'react-native';

import { MenteRadius, MenteType } from '@/constants/mente-theme';
import { makeStyles, useColors } from '@/theme';

export type TextFieldProps = TextInputProps & {
  label: string;
  /** Renders the trailing reveal toggle and masks the input by default. */
  secure?: boolean;
  /** Validation message shown under the field; also tints the border. */
  error?: string | null;
};

export function TextField({ label, secure = false, error, style, ...inputProps }: TextFieldProps) {
  const c = useColors();
  const styles = useStyles();
  const [revealed, setRevealed] = useState(false);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>

      <View style={[styles.input, error ? styles.inputError : null]}>
        {/* Leading glyph placeholder, as drawn in the prototype. */}
        <View style={styles.leadingIcon} />

        <TextInput
          style={[styles.textInput, style]}
          placeholderTextColor={c.textMuted}
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

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  field: {
    gap: 8,
    width: '100%',
  },
  label: {
    ...MenteType.label,
    color: c.text,
  },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: MenteRadius.input,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
  },
  inputError: {
    borderColor: c.dangerText,
  },
  error: {
    ...MenteType.small,
    color: c.dangerText,
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
    color: c.text,
  },
  revealToggle: {
    width: 14,
    height: 14,
    borderRadius: '50%',
    backgroundColor: 'rgba(124, 153, 174, 0.6)',
  },
}));
