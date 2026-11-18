import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { MAX_PERSON_NAME, parsePitches } from '../model/game';
import { Pitcher } from '../model/types';
import { colors, styles as ui } from './ui';

type Props = {
  pitcher: Pitcher;
  index: number;
  locked: boolean;
  canRemove: boolean;
  onChange: (changes: Partial<Pitcher>) => void;
  onAdd: (delta: number) => void;
  onRemove: () => void;
};

/** One pitcher: name, jersey number, and big -1 / +1 buttons around the count. */
export default function PitcherCounter({ pitcher, index, locked, canRemove, onChange, onAdd, onRemove }: Props) {
  // The count can also be typed to correct it. Keep the typed text separately
  // until the field is left, so a half-typed number is never saved.
  const [draft, setDraft] = useState<string | null>(null);

  function commitDraft() {
    if (draft === null) return;
    const value = parsePitches(draft);
    if (draft.trim() === '') {
      // Left empty: keep the current count.
    } else if (value === null) {
      Alert.alert('Not a pitch count', 'Enter a whole number from 0 to 999.');
    } else if (value !== pitcher.pitches) {
      onChange({ pitches: value });
    }
    setDraft(null);
  }

  function confirmRemove() {
    const who = pitcher.name.trim() || `Pitcher ${index + 1}`;
    if (pitcher.pitches === 0 && !pitcher.name.trim()) {
      onRemove();
      return;
    }
    Alert.alert(`Remove ${who}?`, `This removes ${who} and their ${pitcher.pitches} pitches.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: onRemove },
    ]);
  }

  const label = pitcher.name.trim() || `Pitcher ${index + 1}`;

  return (
    <View style={styles.card}>
      <View style={ui.row}>
        <TextInput
          style={[ui.input, styles.name, locked && ui.readOnlyInput]}
          placeholder={`Pitcher ${index + 1} name`}
          placeholderTextColor={colors.placeholder}
          value={pitcher.name}
          onChangeText={(name) => onChange({ name })}
          editable={!locked}
          autoCapitalize="words"
          autoCorrect={false}
          maxLength={MAX_PERSON_NAME}
          returnKeyType="done"
        />
        <TextInput
          style={[ui.input, styles.jersey, locked && ui.readOnlyInput]}
          placeholder="#"
          placeholderTextColor={colors.placeholder}
          value={pitcher.jersey}
          onChangeText={(jersey) => onChange({ jersey: jersey.replace(/[^0-9]/g, '') })}
          editable={!locked}
          keyboardType="number-pad"
          maxLength={3}
          accessibilityLabel={`${label} jersey number`}
        />
      </View>

      <View style={styles.counterRow}>
        <Pressable
          style={({ pressed }) => [styles.step, styles.minus, pressed && ui.pressed, (locked || pitcher.pitches === 0) && ui.faded]}
          onPress={() => onAdd(-1)}
          disabled={locked || pitcher.pitches === 0}
          accessibilityRole="button"
          accessibilityLabel={`Subtract one pitch from ${label}`}
        >
          <Text style={[styles.stepText, { color: colors.blue }]}>−1</Text>
        </Pressable>

        <View style={styles.countBox}>
          <TextInput
            style={styles.count}
            value={draft ?? String(pitcher.pitches)}
            onFocus={() => setDraft(String(pitcher.pitches))}
            onChangeText={(text) => setDraft(text.replace(/[^0-9]/g, ''))}
            onBlur={commitDraft}
            editable={!locked}
            keyboardType="number-pad"
            maxLength={3}
            selectTextOnFocus
            accessibilityLabel={`${label} pitch count, tap to correct`}
          />
          <Text style={styles.countLabel}>pitches</Text>
        </View>

        <Pressable
          style={({ pressed }) => [styles.step, styles.plus, pressed && ui.pressed, locked && ui.faded]}
          onPress={() => onAdd(1)}
          disabled={locked}
          accessibilityRole="button"
          accessibilityLabel={`Add one pitch for ${label}`}
        >
          <Text style={[styles.stepText, { color: '#fff' }]}>+1</Text>
        </Pressable>
      </View>

      {canRemove && !locked ? (
        <Pressable onPress={confirmRemove} hitSlop={8} style={styles.remove}>
          <Text style={styles.removeText}>Remove pitcher</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: '#e1e3e6',
    borderRadius: 10,
    padding: 10,
    gap: 10,
  },
  name: { flex: 1, minWidth: 0 },
  jersey: { width: 64, textAlign: 'center' },
  counterRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  step: {
    width: 84,
    height: 72,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  minus: { backgroundColor: '#fff', borderWidth: 2, borderColor: colors.blue },
  plus: { backgroundColor: colors.blue },
  stepText: { fontSize: 28, fontWeight: '700' },
  countBox: { flex: 1, minWidth: 0, alignItems: 'stretch' },
  count: {
    fontSize: 44,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    width: '100%',
    paddingVertical: 0,
    fontVariant: ['tabular-nums'],
  },
  countLabel: { fontSize: 13, color: colors.muted, textAlign: 'center' },
  remove: { alignSelf: 'flex-end' },
  removeText: { fontSize: 15, color: colors.red },
});
