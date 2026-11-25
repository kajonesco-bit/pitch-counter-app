import Constants from 'expo-constants';
import { router, useLocalSearchParams } from 'expo-router';
import * as StoreReview from 'expo-store-review';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import SignaturePreview from '../../../components/SignaturePreview';
import { Button, Card, colors, StatusBadge, styles as ui } from '../../../components/ui';
import {
  gameStatus,
  sideLabel,
  teamTotal,
  validateGame,
  validSignature,
} from '../../../model/game';
import {
  canExportPdf,
  FREE_SIGNED_REPORTS,
  freeReportsRemaining,
  signingDecision,
} from '../../../model/entitlements';
import { TeamSide, TEAM_SIDES } from '../../../model/types';
import { createGamePdf, sharePdf } from '../../../pdf/exportPdf';
import { appStateStore, useAppState } from '../../../state/useApp';
import { gameStore, useGame } from '../../../state/useGames';

const APP_VERSION = Constants.expoConfig?.version ?? '';

function showPaywall(reason: 'limit' | 'export') {
  router.navigate({ pathname: '/pro', params: { reason } });
}

/** Apple's own rating prompt, after a signed report was exported. Never from a button, never with an offer. */
async function maybeAskForRating() {
  try {
    if (!appStateStore().recordSignedExport(APP_VERSION)) return;
    // Apple never shows the prompt in TestFlight builds; isAvailableAsync is false there.
    if (!(await StoreReview.isAvailableAsync()) || !(await StoreReview.hasAction())) return;
    appStateStore().markReviewRequested(APP_VERSION);
    await StoreReview.requestReview();
  } catch {
    // A rating prompt is never worth an error message.
  }
}

/** Final review of both teams, then signatures and the PDF. */
export default function ReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const game = useGame(id);
  const appState = useAppState();
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
  const decision = signingDecision(appState, game);
  const exportable = canExportPdf(appState, game);
  const remaining = freeReportsRemaining(appState);

  async function sharePdfNow() {
    if (!game) return;
    if (!ready) {
      Alert.alert('Please fix these first', problems.join('\n'));
      return;
    }
    if (!exportable) {
      showPaywall('export');
      return;
    }
    setBusy(true);
    try {
      const file = await createGamePdf(game);
      await sharePdf(file);
      if (status === 'signed') await maybeAskForRating();
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
    if (decision === 'needs-pro') {
      showPaywall('limit');
      return;
    }
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

      {decision === 'uses-free-report' && status !== 'signed' ? (
        <View style={ui.notice}>
          <Text style={ui.noticeText}>
            Free version: completing this signed report uses 1 of your {FREE_SIGNED_REPORTS} free signed
            reports ({remaining} left). Pitch counting is always free.
          </Text>
          <Pressable onPress={() => router.navigate({ pathname: '/pro', params: { reason: 'settings' } })} hitSlop={8}>
            <Text style={ui.link}>About Pitch Counter Pro</Text>
          </Pressable>
        </View>
      ) : null}
      {decision === 'needs-pro' ? (
        <View style={ui.notice}>
          <Text style={ui.noticeText}>
            You’ve used your {FREE_SIGNED_REPORTS} free signed reports. Unlock Pitch Counter Pro (one-time purchase,
            no subscription) to sign and export this report. Your counts are saved either way.
          </Text>
          <Button title="See Pitch Counter Pro" onPress={() => showPaywall('limit')} />
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
