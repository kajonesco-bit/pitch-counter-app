import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import SignaturePad, { SignatureDrawing } from '../../../components/SignaturePad';
import { Button, colors, styles as ui } from '../../../components/ui';
import { MAX_PERSON_NAME, sideLabel, teamTotal, validateGame } from '../../../model/game';
import { hasInk } from '../../../model/signature';
import { TeamSide, TEAM_SIDES } from '../../../model/types';
import { gameStore, useGame } from '../../../state/useGames';

/** One head coach types their name and signs with a finger. */
export default function SignScreen() {
  const params = useLocalSearchParams<{ id: string; side: string }>();
  const side: TeamSide = params.side === 'home' ? 'home' : 'visitor';
  const game = useGame(params.id);
  const [coachName, setCoachName] = useState('');
  const [drawing, setDrawing] = useState<SignatureDrawing>({ strokes: [], width: 0, height: 0 });
  // The screen must not scroll while a finger is on the signature box.
  const [signing, setSigning] = useState(false);

  if (!game) {
    return (
      <View style={[ui.screen, ui.content]}>
        <Text style={ui.body}>This game could not be found.</Text>
      </View>
    );
  }

  const canSave = coachName.trim().length > 0 && hasInk(drawing.strokes);

  function save() {
    if (!game) return;
    const problems = validateGame(game);
    if (problems.length > 0) {
      Alert.alert('The report is not complete', problems.join('\n'));
      return;
    }
    gameStore().signGame(game.id, side, {
      coachName,
      strokes: drawing.strokes,
      width: drawing.width,
      height: drawing.height,
    });
    router.back();
  }

  return (
    <ScrollView
      style={ui.screen}
      contentContainerStyle={styles.body}
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled"
      canCancelContentTouches={false}
      scrollEnabled={!signing}
    >
      <Text style={styles.role}>{sideLabel(side)} head coach</Text>
      <Text style={styles.team} numberOfLines={2}>
        {game[side].name.trim()}
      </Text>
      <Text style={ui.muted}>
        By signing, you confirm the final pitch totals on the review screen:{' '}
        {TEAM_SIDES.map((s) => `${game[s].name.trim()} ${teamTotal(game[s])}`).join(', ')}.
      </Text>

      <View>
        <Text style={ui.fieldLabel}>Coach’s printed name</Text>
        <TextInput
          style={ui.input}
          placeholder="First and last name"
          placeholderTextColor={colors.placeholder}
          value={coachName}
          onChangeText={setCoachName}
          autoCapitalize="words"
          autoCorrect={false}
          maxLength={MAX_PERSON_NAME}
          returnKeyType="done"
        />
      </View>

      <SignaturePad strokes={drawing.strokes} onChange={setDrawing} onSigningChange={setSigning} />

      <View style={ui.row}>
        <Button
          title="Clear"
          variant="secondary"
          style={{ flex: 1 }}
          disabled={drawing.strokes.length === 0}
          onPress={() => setDrawing({ strokes: [], width: 0, height: 0 })}
        />
        <Button title="Save signature" style={{ flex: 2 }} disabled={!canSave} onPress={save} />
      </View>
      <Button title="Cancel" variant="secondary" onPress={() => router.back()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { flexGrow: 1, padding: 16, gap: 14 },
  role: { fontSize: 14, fontWeight: '700', color: colors.muted, textTransform: 'uppercase' },
  team: { fontSize: 22, fontWeight: '700', color: colors.text },
});
