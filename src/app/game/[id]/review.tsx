import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import SignaturePreview from '../../../components/SignaturePreview';
import { Button, Card, colors, StatusBadge, styles as ui } from '../../../components/ui';
import {
  gameStatus,
  sideLabel,
  teamTotal,
  validateGame,
  validSignature,
} from '../../../model/game';
import { TeamSide, TEAM_SIDES } from '../../../model/types';
import { createGamePdf, sharePdf } from '../../../pdf/exportPdf';
import { gameStore, useGame } from '../../../state/useGames';

/** Final review of both teams, then signatures and the PDF. */
export default function ReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const game = useGame(id);
  const [busy, setBusy] = useState(false);

  if (!game) {
    return (
      <View style={[ui.screen, ui.content]}>
        <Text style={ui.body}>This game could not be found.</Text>
      </View>
    );
  }

  const status = gameStatus(game);
  const problems = validateGame(game);
  const ready = problems.length === 0;

  async function sharePdfNow() {
    if (!game) return;
    if (!ready) {
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

  function confirmDelete() {
    Alert.alert('Delete this game?', 'The game and its signatures are removed from this iPhone. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          gameStore().deleteGame(game!.id);
          router.dismissTo('/');
        },
      },
    ]);
  }

  function sign(side: TeamSide) {
    router.navigate({ pathname: '/game/[id]/sign', params: { id: game!.id, side } });
  }

  const statusMessage =
    status === 'signed'
      ? 'Both head coaches have signed. The PDF will include both signatures.'
      : status === 'partly-signed'
        ? 'One coach has signed. The other coach still needs to sign.'
        : 'Check every number below, then each head coach signs.';

  return (
    <ScrollView style={ui.screen} contentContainerStyle={ui.content} contentInsetAdjustmentBehavior="automatic">
      <Card>
        <View style={styles.topRow}>
          <Text style={ui.cardTitle}>Final review</Text>
          <StatusBadge status={status} />
        </View>
        <Text style={ui.body}>{statusMessage}</Text>
        <Text style={ui.muted}>
          {game.date}
          {game.level.trim() ? ` · ${game.level.trim()}` : ''}
        </Text>
      </Card>

      {!ready ? (
        <View style={ui.notice}>
          <Text style={[ui.noticeText, { fontWeight: '700' }]}>Before signing, fix:</Text>
          {problems.map((p) => (
            <Text key={p} style={ui.noticeText}>
              • {p}
            </Text>
          ))}
        </View>
      ) : null}

      {TEAM_SIDES.map((side) => {
        const team = game[side];
        return (
          <Card key={side}>
            <Text style={ui.muted}>{sideLabel(side)}</Text>
            <Text style={styles.teamName}>{team.name.trim() || '(no name)'}</Text>
            <View style={[styles.tableRow, styles.tableHead]}>
              <Text style={[styles.cellName, styles.headText]}>Pitcher</Text>
              <Text style={[styles.cellNum, styles.headText]}>No.</Text>
              <Text style={[styles.cellNum, styles.headText]}>Pitches</Text>
            </View>
            {team.pitchers.map((p, index) => (
              <View key={p.id} style={styles.tableRow}>
                <Text style={styles.cellName}>{p.name.trim() || `Pitcher ${index + 1} (no name)`}</Text>
                <Text style={styles.cellNum}>{p.jersey.trim() || '–'}</Text>
                <Text style={[styles.cellNum, styles.bold]}>{p.pitches}</Text>
              </View>
            ))}
            <View style={[styles.tableRow, styles.totalRow]}>
              <Text style={[styles.cellName, styles.bold]}>Team total</Text>
              <Text style={[styles.cellNum, styles.bold]}>{teamTotal(team)}</Text>
            </View>
          </Card>
        );
      })}

      <Card>
        <Text style={ui.cardTitle}>Head coach signatures</Text>
        {TEAM_SIDES.map((side) => {
          const signature = validSignature(game, side);
          return (
            <View key={side} style={styles.signatureBlock}>
              <Text style={ui.muted}>
                {sideLabel(side)}: {game[side].name.trim() || '(no name)'}
              </Text>
              {signature ? (
                <>
                  <SignaturePreview signature={signature} />
                  <Text style={styles.bold}>{signature.coachName}</Text>
                  <Text style={ui.muted}>Signed {new Date(signature.signedAt).toLocaleString()}</Text>
                </>
              ) : (
                <Button
                  title={`Sign as ${side === 'visitor' ? 'visiting' : 'home'} head coach`}
                  variant="secondary"
                  disabled={!ready}
                  onPress={() => sign(side)}
                />
              )}
            </View>
          );
        })}
      </Card>

      <Button
        title={status === 'signed' ? 'Create signed PDF & Share' : 'Create unsigned PDF & Share'}
        onPress={sharePdfNow}
        busy={busy}
        disabled={!ready}
      />
      <Button title="Back to counting / Edit" variant="secondary" onPress={() => router.dismissTo(`/game/${game.id}`)} />
      <Text style={styles.footnote}>Unofficial record. Not an approved state-association form.</Text>
      <Button title="Delete game" variant="danger" onPress={confirmDelete} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  teamName: { fontSize: 20, fontWeight: '700', color: colors.text },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: 8,
  },
  tableHead: { borderBottomWidth: 1 },
  headText: { fontSize: 13, color: colors.muted, fontWeight: '600' },
  totalRow: { borderBottomWidth: 0, justifyContent: 'space-between' },
  cellName: { flex: 1, fontSize: 17, color: colors.text },
  cellNum: { width: 64, fontSize: 17, color: colors.text, textAlign: 'center' },
  bold: { fontWeight: '700', fontSize: 17, color: colors.text },
  signatureBlock: { gap: 6, paddingTop: 6 },
  footnote: { fontSize: 13, color: colors.muted, textAlign: 'center' },
});
