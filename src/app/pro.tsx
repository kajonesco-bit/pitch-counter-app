import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, colors, styles as ui } from '../components/ui';
import { FREE_SIGNED_REPORTS, freeReportsRemaining } from '../model/entitlements';
import { proController, useAppState, useProSnapshot } from '../state/useApp';

type Reason = 'welcome' | 'limit' | 'export' | 'settings';

const HEADLINES: Record<Reason, string> = {
  welcome: 'Signed game reports, made simple',
  limit: `You’ve used your ${FREE_SIGNED_REPORTS} free signed reports`,
  export: 'PDF export for this game is part of Pro',
  settings: 'Pitch Counter Pro',
};

const BENEFITS = [
  'Unlimited signed reports from both head coaches',
  'Unlimited PDF exports to share, print or save',
  'Pay once — no subscription, no renewals',
  'Pitch counting stays free and unlimited for everyone',
];

/** The Pro paywall. Always dismissible; never shown during live counting. */
export default function ProScreen() {
  const params = useLocalSearchParams<{ reason?: string }>();
  const reason: Reason = (['welcome', 'limit', 'export', 'settings'] as const).find((r) => r === params.reason) ?? 'settings';
  const state = useAppState();
  const pro = useProSnapshot();
  const owned = state.pro.owned;
  const remaining = freeReportsRemaining(state);
  const hasEarlierReports = Object.values(state.unlockedReports).some((r) => r.reason === 'legacy');

  useEffect(() => {
    const c = proController();
    if (c.getSnapshot().status === 'idle' || c.getSnapshot().status === 'unavailable') void c.start();
    return () => c.clearMessage();
  }, []);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const busy = pro.status === 'purchasing' || pro.status === 'restoring' || pro.status === 'loading';
  const price = pro.product?.displayPrice;

  return (
    <ScrollView style={ui.screen} contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
      <View style={styles.hero}>
        <Text style={styles.badge}>PRO</Text>
        <Text style={styles.title} accessibilityRole="header">
          {owned ? 'Pitch Counter Pro is unlocked' : HEADLINES[reason]}
        </Text>
        <Text style={styles.subtitle}>
          {owned
            ? 'Thank you! Sign and export as many game reports as you need.'
            : 'Unlock unlimited signed game reports with a single one-time purchase.'}
        </Text>
      </View>

      <View style={styles.card}>
        {BENEFITS.map((b) => (
          <View key={b} style={styles.benefit}>
            <Text style={styles.check}>✓</Text>
            <Text style={styles.benefitText}>{b}</Text>
          </View>
        ))}
      </View>

      {!owned ? (
        <Text style={styles.allowance}>
          {remaining > 0
            ? `Free: ${remaining} of ${FREE_SIGNED_REPORTS} signed reports left.${hasEarlierReports ? ' Reports signed before version 1.2 stay free.' : ''}`
            : `All ${FREE_SIGNED_REPORTS} free signed reports are used. Your saved games and earlier reports are still here.`}
        </Text>
      ) : null}

      {pro.message ? (
        <View style={ui.notice} accessibilityLiveRegion="polite">
          <Text style={ui.noticeText}>{pro.message}</Text>
        </View>
      ) : null}

      {owned ? (
        <Button title="Done" onPress={close} />
      ) : (
        <>
          {pro.status === 'unavailable' ? (
            <Button title="Try again" variant="secondary" onPress={() => void proController().start()} />
          ) : (
            <Button
              title={
                pro.status === 'pending'
                  ? 'Waiting for approval…'
                  : price
                    ? `Unlock Pro — ${price}`
                    : 'Loading price…'
              }
              onPress={() => void proController().buy()}
              busy={pro.status === 'purchasing'}
              disabled={!price || busy || pro.status === 'pending'}
            />
          )}
          <Text style={styles.fineprint}>
            {price ? `${price}, paid once. ` : 'Paid once. '}
            One-time purchase charged to your Apple Account. Not a subscription — it never renews.
          </Text>
          <Pressable
            onPress={() => void proController().restore()}
            disabled={busy}
            style={styles.restore}
            accessibilityRole="button"
            hitSlop={8}
          >
            {pro.status === 'restoring' ? (
              <ActivityIndicator color={colors.blue} />
            ) : (
              <Text style={[ui.link, busy && ui.faded]}>Restore Purchases</Text>
            )}
          </Pressable>
          <Button title="Not now" variant="secondary" onPress={close} />
        </>
      )}

      <Pressable onPress={() => router.navigate('/privacy')} style={styles.restore} hitSlop={8}>
        <Text style={styles.privacy}>Privacy Policy</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 48, gap: 16 },
  hero: { alignItems: 'center', gap: 10, paddingTop: 8 },
  badge: {
    backgroundColor: colors.blue,
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 2,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: 'hidden',
  },
  title: { fontSize: 26, fontWeight: '800', color: colors.text, textAlign: 'center' },
  subtitle: { fontSize: 17, color: colors.muted, textAlign: 'center' },
  card: { backgroundColor: colors.card, borderRadius: 14, padding: 16, gap: 12 },
  benefit: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  check: { fontSize: 18, fontWeight: '800', color: colors.green, width: 20 },
  benefitText: { flex: 1, fontSize: 17, color: colors.text },
  allowance: { fontSize: 15, color: colors.muted, textAlign: 'center' },
  fineprint: { fontSize: 13, color: colors.muted, textAlign: 'center' },
  restore: { alignSelf: 'center', paddingVertical: 6, minHeight: 32, justifyContent: 'center' },
  privacy: { fontSize: 14, color: colors.muted, textDecorationLine: 'underline' },
});
