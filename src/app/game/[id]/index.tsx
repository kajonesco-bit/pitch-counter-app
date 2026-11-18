import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import PitcherCounter from '../../../components/PitcherCounter';
import { Button, Card, colors, styles as ui } from '../../../components/ui';
import {
  addPitches,
  hasAnySignature,
  MAX_TEAM_NAME,
  newPitcher,
  sideLabel,
  teamTotal,
  updatePitcher,
  updateTeam,
} from '../../../model/game';
import { Game, Pitcher, TeamSide, TEAM_SIDES } from '../../../model/types';
import { gameStore, useGame } from '../../../state/useGames';

/** Live pitch counting, plus the game details. */
export default function GameScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const game = useGame(id);
  const [side, setSide] = useState<TeamSide>('visitor');
  const [detailsOpen, setDetailsOpen] = useState(
    () => !game || !game.visitor.name.trim() || !game.home.name.trim()
  );

  if (!game) {
    return (
      <View style={[ui.screen, ui.content]}>
        <Text style={ui.body}>This game could not be found.</Text>
      </View>
    );
  }

  const gameId = game.id;
  const locked = hasAnySignature(game);
  const team = game[side];
  const change = (fn: (g: Game) => Game) => gameStore().updateGame(gameId, fn);
  const changePitcher = (pitcherId: string, fn: (p: Pitcher) => Pitcher) =>
    change((g) => updatePitcher(g, side, pitcherId, fn));

  function unlock() {
    Alert.alert(
      'Remove both signatures?',
      'This game has been signed. To change it, both coaches’ signatures will be removed and both must sign again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove signatures',
          style: 'destructive',
          onPress: () => gameStore().clearSignatures(gameId),
        },
      ]
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Count Pitches' }} />
      <KeyboardAvoidingView
        style={ui.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={100}
      >
        <ScrollView
          contentContainerStyle={ui.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentInsetAdjustmentBehavior="automatic"
        >
          {locked ? (
            <View style={ui.notice}>
              <Text style={ui.noticeText}>
                This game has been signed, so it is locked. Changing anything removes both coaches’
                signatures.
              </Text>
              <Button title="Unlock to make changes" variant="danger" onPress={unlock} />
            </View>
          ) : null}

          <Card>
            <Pressable
              onPress={() => setDetailsOpen((open) => !open)}
              style={styles.detailsHeader}
              accessibilityRole="button"
            >
              <View style={{ flex: 1 }}>
                <Text style={ui.cardTitle}>Game details</Text>
                {!detailsOpen ? (
                  <Text style={ui.muted} numberOfLines={2}>
                    {game.date}
                    {game.level.trim() ? ` · ${game.level.trim()}` : ''}
                  </Text>
                ) : null}
              </View>
              <Text style={ui.link}>{detailsOpen ? 'Done' : 'Edit'}</Text>
            </Pressable>

            {detailsOpen ? (
              <>
                <View style={ui.row}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={ui.fieldLabel}>Date (MM/DD/YYYY)</Text>
                    <TextInput
                      style={[ui.input, locked && ui.readOnlyInput]}
                      value={game.date}
                      onChangeText={(date) => change((g) => ({ ...g, date }))}
                      editable={!locked}
                      keyboardType="numbers-and-punctuation"
                      maxLength={10}
                      returnKeyType="done"
                    />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={ui.fieldLabel}>Level (optional)</Text>
                    <TextInput
                      style={[ui.input, locked && ui.readOnlyInput]}
                      placeholder="Varsity, JV…"
                      placeholderTextColor={colors.placeholder}
                      value={game.level}
                      onChangeText={(level) => change((g) => ({ ...g, level }))}
                      editable={!locked}
                      autoCapitalize="words"
                      maxLength={30}
                      returnKeyType="done"
                    />
                  </View>
                </View>
                {TEAM_SIDES.map((s) => (
                  <View key={s}>
                    <Text style={ui.fieldLabel}>{sideLabel(s)} name</Text>
                    <TextInput
                      style={[ui.input, locked && ui.readOnlyInput]}
                      placeholder={sideLabel(s)}
                      placeholderTextColor={colors.placeholder}
                      value={game[s].name}
                      onChangeText={(name) => change((g) => updateTeam(g, s, (t) => ({ ...t, name })))}
                      editable={!locked}
                      autoCapitalize="words"
                      maxLength={MAX_TEAM_NAME}
                      multiline
                      blurOnSubmit
                      returnKeyType="done"
                    />
                  </View>
                ))}
              </>
            ) : null}
          </Card>

          <View style={styles.switcher}>
            {TEAM_SIDES.map((s) => {
              const selected = s === side;
              return (
                <Pressable
                  key={s}
                  onPress={() => setSide(s)}
                  style={[styles.switchButton, selected && styles.switchSelected]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                >
                  <Text style={[styles.switchSide, selected && styles.switchTextSelected]}>
                    {s === 'visitor' ? 'VISITING' : 'HOME'}
                  </Text>
                  <Text
                    style={[styles.switchName, selected && styles.switchTextSelected]}
                    numberOfLines={2}
                  >
                    {game[s].name.trim() || sideLabel(s)}
                  </Text>
                  <Text style={[styles.switchTotal, selected && styles.switchTextSelected]}>
                    {teamTotal(game[s])} pitches
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Card>
            <Text style={ui.cardTitle}>{team.name.trim() || sideLabel(side)} pitchers</Text>
            {team.pitchers.map((pitcher, index) => (
              <PitcherCounter
                key={pitcher.id}
                pitcher={pitcher}
                index={index}
                locked={locked}
                canRemove={team.pitchers.length > 1}
                onChange={(changes) => changePitcher(pitcher.id, (p) => ({ ...p, ...changes }))}
                onAdd={(delta) => changePitcher(pitcher.id, (p) => addPitches(p, delta))}
                onRemove={() =>
                  change((g) =>
                    updateTeam(g, side, (t) => ({
                      ...t,
                      pitchers: t.pitchers.filter((p) => p.id !== pitcher.id),
                    }))
                  )
                }
              />
            ))}
            {!locked ? (
              <Button
                title="+ Add pitcher"
                variant="secondary"
                onPress={() =>
                  change((g) =>
                    updateTeam(g, side, (t) => ({ ...t, pitchers: [...t.pitchers, newPitcher()] }))
                  )
                }
              />
            ) : null}
            <Text style={styles.teamTotal}>Team total: {teamTotal(team)}</Text>
          </Card>

          <Button title="Finish game: Review & Sign" onPress={() => router.navigate(`/game/${game.id}/review`)} />
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  detailsHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  switcher: { flexDirection: 'row', gap: 10 },
  switchButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#d6d8dc',
    padding: 12,
    gap: 2,
  },
  switchSelected: { backgroundColor: colors.blue, borderColor: colors.blue },
  switchSide: { fontSize: 12, fontWeight: '700', color: colors.muted, letterSpacing: 0.5 },
  switchName: { fontSize: 17, fontWeight: '600', color: colors.text },
  switchTotal: { fontSize: 15, color: colors.muted },
  switchTextSelected: { color: '#fff' },
  teamTotal: { fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'right' },
});
