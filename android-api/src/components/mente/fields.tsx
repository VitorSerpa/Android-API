import { useState, type ReactNode } from 'react';
import { Pressable, Text, TextInput, View, type ViewStyle } from 'react-native';

import { Input, MIN_TOUCH, Pill, TOUCH_SLOP } from '@/components/mente/ui';
import { MenteRadius, MenteType } from '@/constants/mente-theme';
import { parseTime } from '@/lib/time';
import { makeStyles, useColors } from '@/theme';

/**
 * Chips for picking one (`radio`) or several (`checkbox`) options. Values
 * outside `options` simply can't be chosen, which is how the check-in scales
 * enforce their range (US-01 CA-03).
 */
export function ChoiceChips<T extends string | number>({
  options,
  selected,
  onToggle,
  multiple = false,
  label,
  grow = false,
  renderLabel = (value) => String(value),
  children,
}: {
  options: readonly T[];
  selected: readonly T[];
  onToggle: (value: T) => void;
  multiple?: boolean;
  label: string;
  grow?: boolean;
  renderLabel?: (value: T) => string;
  /** Extra chip rendered at the end of the same wrapping row (e.g. "+ Outro"). */
  children?: ReactNode;
}) {
  const styles = useStyles();
  return (
    <View style={styles.chipRow} accessibilityRole={multiple ? undefined : 'radiogroup'} accessibilityLabel={label}>
      {options.map((option) => {
        const isOn = selected.includes(option);
        return (
          <Pressable
            key={String(option)}
            accessibilityRole={multiple ? 'checkbox' : 'radio'}
            accessibilityLabel={renderLabel(option)}
            accessibilityState={multiple ? { checked: isOn } : { selected: isOn }}
            onPress={() => onToggle(option)}
            style={({ pressed }) => [styles.chip, grow && styles.grow, isOn && styles.chipOn, pressed && styles.pressed]}>
            <Text style={[styles.chipText, isOn && styles.chipTextOn]}>{renderLabel(option)}</Text>
          </Pressable>
        );
      })}
      {children}
    </View>
  );
}

/** Chip that turns into an input to add a custom option. */
export function AddChip({ label, onAdd }: { label: string; onAdd: (value: string) => void }) {
  const styles = useStyles();
  const c = useColors();
  const [value, setValue] = useState<string | null>(null);
  const commit = () => {
    const text = value?.trim();
    if (text) onAdd(text);
    setValue(null);
  };
  if (value === null) {
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => setValue('')} style={styles.chip}>
        <Text style={styles.chipText}>+ Outro</Text>
      </Pressable>
    );
  }
  return (
    <TextInput
      autoFocus
      accessibilityLabel={label}
      placeholder={label}
      placeholderTextColor={c.textMuted}
      value={value}
      onChangeText={setValue}
      onSubmitEditing={commit}
      onBlur={commit}
      returnKeyType="done"
      style={[styles.chip, styles.chipInput]}
    />
  );
}

/**
 * Parses what the user typed as a number (comma or dot). Returns `null` for an
 * empty field and `NaN` for something that isn't a valid number in range.
 */
export function parseNumberField(text: string, { min, max, integer = false }: { min: number; max: number; integer?: boolean }): number | null {
  const trimmed = text.trim().replace(',', '.');
  if (!trimmed) return null;
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return Number.NaN;
  const value = Number(trimmed);
  if ((integer && !Number.isInteger(value)) || value < min || value > max) return Number.NaN;
  return value;
}

/** Labelled numeric field with its unit and a validation message (US-03 CA-02). */
export function NumberField({
  label,
  value,
  onChangeText,
  unit,
  error,
  integer = false,
  placeholder,
  style,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  unit?: string;
  error?: string | null;
  integer?: boolean;
  placeholder?: string;
  style?: ViewStyle;
}) {
  const styles = useStyles();
  const c = useColors();
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.numberBox, error ? styles.numberBoxError : null]}>
        <TextInput
          accessibilityLabel={label}
          accessibilityHint={error ?? undefined}
          inputMode={integer ? 'numeric' : 'decimal'}
          placeholder={placeholder}
          placeholderTextColor={c.textMuted}
          value={value}
          // Only digits and one separator can be typed at all.
          onChangeText={(text) => onChangeText(integer ? text.replace(/\D/g, '') : text.replace(/[^\d.,]/g, ''))}
          style={styles.numberInput}
        />
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

/** Editable list of `HH:MM` times, used by reminders and medications. */
export function TimeList({ times, onChange, label }: { times: string[]; onChange: (times: string[]) => void; label: string }) {
  const styles = useStyles();
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const add = () => {
    const time = parseTime(draft);
    if (!time) {
      setError('Use o formato HH:MM, por exemplo 08:30.');
      return;
    }
    setError(null);
    setDraft('');
    onChange([...times, time]);
  };

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.chipRow}>
        {times.map((time) => (
          <Pill key={time} label={`${time}  ✕`} onPress={() => onChange(times.filter((item) => item !== time))} />
        ))}
        {times.length === 0 ? <Text style={styles.hint}>Nenhum horário ainda.</Text> : null}
      </View>
      <View style={styles.addRow}>
        <Input
          accessibilityLabel={`Novo horário para ${label}`}
          placeholder="HH:MM"
          inputMode="numeric"
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={add}
          style={styles.timeInput}
        />
        <Pressable accessibilityRole="button" hitSlop={TOUCH_SLOP} onPress={add} style={styles.addButton}>
          <Text style={styles.addText}>Adicionar horário</Text>
        </Pressable>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

/** A single `HH:MM` field that normalises on blur. */
export function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (time: string) => void }) {
  const styles = useStyles();
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState(false);
  return (
    <View style={[styles.field, styles.grow]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Input
        accessibilityLabel={label}
        inputMode="numeric"
        value={draft}
        onChangeText={setDraft}
        onBlur={() => {
          const time = parseTime(draft);
          setError(!time);
          if (time) {
            setDraft(time);
            onChange(time);
          }
        }}
      />
      {error ? <Text style={styles.error}>Horário inválido</Text> : null}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  chip: {
    minHeight: MIN_TOUCH,
    minWidth: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: MenteRadius.chip,
    backgroundColor: c.background,
  },
  grow: {
    flex: 1,
  },
  chipOn: {
    backgroundColor: c.primary,
  },
  chipText: {
    ...MenteType.caption,
    color: c.textMuted,
  },
  chipTextOn: {
    ...MenteType.captionStrong,
    color: c.onPrimary,
  },
  chipInput: {
    ...MenteType.caption,
    minWidth: 140,
    color: c.text,
  },
  pressed: {
    opacity: 0.75,
  },
  field: {
    gap: 6,
    // Let the field shrink inside a row instead of pushing the page sideways.
    minWidth: 0,
  },
  fieldLabel: {
    ...MenteType.captionStrong,
    color: c.text,
  },
  numberBox: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: MIN_TOUCH,
    paddingHorizontal: 12,
    borderRadius: MenteRadius.chip,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: c.background,
  },
  numberBoxError: {
    borderColor: c.dangerText,
  },
  numberInput: {
    ...MenteType.body,
    flex: 1,
    // Web inputs have an intrinsic ~20ch width; without this they overflow the row.
    minWidth: 0,
    width: 0,
    paddingVertical: 8,
    color: c.text,
  },
  unit: {
    ...MenteType.caption,
    color: c.textMuted,
  },
  error: {
    ...MenteType.small,
    color: c.dangerText,
  },
  hint: {
    ...MenteType.small,
    color: c.textMuted,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  timeInput: {
    width: 100,
  },
  addButton: {
    minHeight: MIN_TOUCH,
    justifyContent: 'center',
  },
  addText: {
    ...MenteType.captionStrong,
    color: c.accent,
  },
}));
