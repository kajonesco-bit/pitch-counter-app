import Constants from 'expo-constants';
import { Link, router } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Card, colors, StatusBadge, styles as ui } from '../components/ui';
import { FREE_SIGNED_REPORTS, freeReportsRemaining } from '../model/entitlements';
import { gameStatus, matchupTitle, teamTotal } from '../model/game';
import { Game } from '../model/types';
import { appStateStore, useAppState } from '../state/useApp';
import { gameStore, useGames } from '../state/useGames';

/** Saved games, newest first. Drafts open for counting; signed games open on the review screen. */
export default function GamesScreen() {
  const games = useGames();
  const appState = useAppState();

  // Introduce Pro once, on this list screen only (never during counting). Always dismissible.
  useEffect(() => {
    if (appStateStore().getState().onboardingSeen) return;
    const timer = setTimeout(() => {
      appStateStore().markOnboardingSeen();
      if (!appStateStore().getState().pro.owned) router.navigate({ pathname: '/pro', params: { reason: 'welcome' } });
    }, 700);
    return () => clearTimeout(timer);
  }, []);
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
          <Pressable
            onPress={() => router.navigate({ pathname: '/pro', params: { reason: 'settings' } })}
            style={styles.proRow}
            accessibilityRole="button"
          >
            <Text style={styles.proTitle}>{appState.pro.owned ? 'Pitch Counter Pro ✓' : 'Pitch Counter Pro'}</Text>
            <Text style={styles.footerText}>
              {appState.pro.owned
                ? 'Unlimited signed reports unlocked'
                : `${freeReportsRemaining(appState)} of ${FREE_SIGNED_REPORTS} free signed reports left · Restore Purchases`}
            </Text>
          </Pressable>
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
  proRow: { alignItems: 'center', gap: 2, paddingVertical: 8, paddingHorizontal: 12 },
  proTitle: { fontSize: 16, fontWeight: '600', color: colors.blue },
  privacyLink: { color: colors.blue, fontSize: 16, paddingHorizontal: 12, paddingVertical: 12 },
});
