import Constants from 'expo-constants';
import { Link, router } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Card, colors, StatusBadge, styles as ui } from '../components/ui';
import { gameStatus, matchupTitle, teamTotal } from '../model/game';
import { Game } from '../model/types';
import { gameStore, useGames } from '../state/useGames';

/** Saved games, newest first. Drafts open for counting; signed games open on the review screen. */
export default function GamesScreen() {
  const games = useGames();
  const list = useMemo(
    () => Object.values(games).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [games]
  );

  function startGame() {
    const game = gameStore().createGame();
    router.navigate(`/game/${game.id}`);
  }

  function open(game: Game) {
    const status = gameStatus(game);
    router.navigate(status === 'draft' ? `/game/${game.id}` : `/game/${game.id}/review`);
  }

  return (
    <FlatList
      style={ui.screen}
      contentContainerStyle={ui.content}
      contentInsetAdjustmentBehavior="automatic"
      data={list}
      keyExtractor={(game) => game.id}
      ListHeaderComponent={
        <View style={styles.header}>
          <Button title="+ New game" onPress={startGame} />
          {list.length > 0 ? <Text style={styles.sectionTitle}>Saved games</Text> : null}
        </View>
      }
      ListEmptyComponent={
        <Card>
          <Text style={ui.body}>No games yet. Tap “New game” to start counting pitches.</Text>
        </Card>
      }
      renderItem={({ item }) => (
        <Pressable onPress={() => open(item)} style={({ pressed }) => pressed && ui.pressed}>
          <Card>
            <View style={styles.topRow}>
              <Text style={ui.muted}>{item.date}{item.level.trim() ? ` · ${item.level.trim()}` : ''}</Text>
              <StatusBadge status={gameStatus(item)} />
            </View>
            <Text style={styles.matchup}>{matchupTitle(item)}</Text>
            <Text style={ui.muted}>
              Pitches: {item.visitor.name.trim() || 'Visitors'} {teamTotal(item.visitor)} ·{' '}
              {item.home.name.trim() || 'Home'} {teamTotal(item.home)}
            </Text>
          </Card>
        </Pressable>
      )}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      ListFooterComponent={
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Games are saved only on this iPhone.{'\n'}Version {Constants.expoConfig?.version ?? ''}
          </Text>
          <Link href="/privacy" style={styles.privacyLink}>Privacy Policy</Link>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  header: { gap: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: colors.muted, textTransform: 'uppercase' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  matchup: { fontSize: 18, fontWeight: '600', color: colors.text },
  footer: { alignItems: 'center', gap: 8, marginTop: 20 },
  footerText: { fontSize: 13, color: colors.muted, textAlign: 'center' },
  privacyLink: { color: colors.blue, fontSize: 16, paddingHorizontal: 12, paddingVertical: 12 },
});
