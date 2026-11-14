import { useState } from 'react';
import {
  ActivityIndicator,
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
import { SafeAreaView } from 'react-native-safe-area-context';

import { newGame, newPitcher, teamTotal, validateGame } from '../game';
import { createGamePdf, sharePdf } from '../pdf/exportPdf';
import { Game, PitcherEntry, TeamEntry, TeamSide } from '../types';

export default function GameFormScreen() {
  const [game, setGame] = useState<Game>(newGame);
  const [busy, setBusy] = useState(false);

  // --- Small helpers that change one part of the game and keep the rest ---

  function updateTeam(side: TeamSide, change: (team: TeamEntry) => TeamEntry) {
    setGame((current) => ({ ...current, [side]: change(current[side]) }));
  }

  function updatePitcher(side: TeamSide, id: string, changes: Partial<PitcherEntry>) {
    updateTeam(side, (team) => ({
      ...team,
      pitchers: team.pitchers.map((p) => (p.id === id ? { ...p, ...changes } : p)),
    }));
  }

  function addPitcher(side: TeamSide) {
    updateTeam(side, (team) => ({ ...team, pitchers: [...team.pitchers, newPitcher()] }));
  }

  function removePitcher(side: TeamSide, id: string) {
    updateTeam(side, (team) => ({
      ...team,
      pitchers: team.pitchers.filter((p) => p.id !== id),
    }));
  }

  function confirmNewGame() {
    Alert.alert('Start a new game?', 'This clears everything on this screen.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => setGame(newGame()) },
    ]);
  }

  async function createAndSharePdf() {
    const problems = validateGame(game);
    if (problems.length > 0) {
      Alert.alert('Please fix these first', problems.join('\n'));
      return;
    }
    setBusy(true);
    try {
      const file = await createGamePdf(game);
      await sharePdf(file);
    } catch (error) {
      Alert.alert('Could not create the PDF', error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  // --- One team's section of the form ---

  function renderTeam(side: TeamSide, heading: string) {
    const team = game[side];
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{heading}</Text>
        <TextInput
          style={styles.input}
          placeholder="Team name"
          placeholderTextColor={PLACEHOLDER}
          value={team.name}
          onChangeText={(name) => updateTeam(side, (t) => ({ ...t, name }))}
          autoCapitalize="words"
          returnKeyType="done"
        />

        <View style={styles.columnLabels}>
          <Text style={[styles.columnLabel, styles.nameColumn]}>Pitcher</Text>
          <Text style={[styles.columnLabel, styles.jerseyColumn]}>No.</Text>
          <Text style={[styles.columnLabel, styles.pitchesColumn]}>Pitches</Text>
          <View style={styles.removeColumn} />
        </View>

        {team.pitchers.map((pitcher, index) => (
          <View key={pitcher.id} style={styles.pitcherRow}>
            <TextInput
              style={[styles.input, styles.nameColumn]}
              placeholder={`Pitcher ${index + 1}`}
              placeholderTextColor={PLACEHOLDER}
              value={pitcher.name}
              onChangeText={(name) => updatePitcher(side, pitcher.id, { name })}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
            />
            <TextInput
              style={[styles.input, styles.jerseyColumn, styles.centered]}
              placeholder="#"
              placeholderTextColor={PLACEHOLDER}
              value={pitcher.jersey}
              onChangeText={(jersey) => updatePitcher(side, pitcher.id, { jersey })}
              keyboardType="number-pad"
              maxLength={3}
            />
            <TextInput
              style={[styles.input, styles.pitchesColumn, styles.centered]}
              placeholder="0"
              placeholderTextColor={PLACEHOLDER}
              value={pitcher.pitches}
              onChangeText={(pitches) => updatePitcher(side, pitcher.id, { pitches })}
              keyboardType="number-pad"
              maxLength={3}
            />
            <Pressable
              style={styles.removeColumn}
              onPress={() => removePitcher(side, pitcher.id)}
              disabled={team.pitchers.length === 1}
              accessibilityLabel={`Remove pitcher ${index + 1}`}
              hitSlop={8}
            >
              <Text style={[styles.removeText, team.pitchers.length === 1 && styles.faded]}>✕</Text>
            </Pressable>
          </View>
        ))}

        <View style={styles.teamFooter}>
          <Pressable onPress={() => addPitcher(side)} hitSlop={8}>
            <Text style={styles.link}>+ Add pitcher</Text>
          </Pressable>
          <Text style={styles.total}>Team total: {teamTotal(team)}</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View style={styles.header}>
            <Text style={styles.title}>Pitch Counter</Text>
            <Pressable onPress={confirmNewGame} hitSlop={8}>
              <Text style={styles.link}>New game</Text>
            </Pressable>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Game</Text>
            <View style={styles.gameRow}>
              <View style={styles.flex}>
                <Text style={styles.fieldLabel}>Date (MM/DD/YYYY)</Text>
                <TextInput
                  style={styles.input}
                  value={game.date}
                  onChangeText={(date) => setGame((g) => ({ ...g, date }))}
                  keyboardType="numbers-and-punctuation"
                  maxLength={10}
                  returnKeyType="done"
                />
              </View>
              <View style={styles.flex}>
                <Text style={styles.fieldLabel}>Level (optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Varsity, JV…"
                  placeholderTextColor={PLACEHOLDER}
                  value={game.level}
                  onChangeText={(level) => setGame((g) => ({ ...g, level }))}
                  autoCapitalize="words"
                  returnKeyType="done"
                />
              </View>
            </View>
          </View>

          {renderTeam('visitor', 'Visiting team')}
          {renderTeam('home', 'Home team')}

          <Pressable
            style={[styles.button, busy && styles.faded]}
            onPress={createAndSharePdf}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Create PDF &amp; Share</Text>
            )}
          </Pressable>
          <Text style={styles.footnote}>
            Unofficial record. Not an approved state-association form.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const PLACEHOLDER = '#9aa0a6';
const BLUE = '#0a5cc2';

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: '#f2f3f5' },
  content: { padding: 16, paddingBottom: 48, gap: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: '#111' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, gap: 10 },
  cardTitle: { fontSize: 18, fontWeight: '600', color: '#111' },
  gameRow: { flexDirection: 'row', gap: 10 },
  fieldLabel: { fontSize: 13, color: '#555', marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#c9ccd1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 17,
    color: '#111',
    backgroundColor: '#fff',
  },
  centered: { textAlign: 'center' },
  columnLabels: { flexDirection: 'row', gap: 8, marginTop: 4 },
  columnLabel: { fontSize: 13, color: '#555' },
  pitcherRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  nameColumn: { flex: 1 },
  jerseyColumn: { width: 54, textAlign: 'center' },
  pitchesColumn: { width: 70, textAlign: 'center' },
  removeColumn: { width: 28, alignItems: 'center' },
  removeText: { fontSize: 18, color: '#b3261e' },
  teamFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  total: { fontSize: 17, fontWeight: '600', color: '#111' },
  link: { fontSize: 17, color: BLUE },
  button: {
    backgroundColor: BLUE,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  faded: { opacity: 0.35 },
  footnote: { fontSize: 13, color: '#666', textAlign: 'center' },
});
