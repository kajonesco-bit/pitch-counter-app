// Who may complete and export signed reports. Pure logic: no storage, no store.

import { gameStatus } from './game';
import { Game } from './types';

/** Newly completed signed reports a free user gets. */
export const FREE_SIGNED_REPORTS = 3;

/** App Store Connect product ID of the one-time Pro purchase (non-consumable). */
export const PRO_PRODUCT_ID = 'com.kajonesco.pitchcounter.pro';

/** Why a report may be completed and exported without Pro. */
export type UnlockReason =
  | 'legacy' // already signed by both coaches before version 1.2
  | 'free'; // used one of the free signed reports

export type UnlockedReport = { gameId: string; reason: UnlockReason; at: string };

export type AppState = {
  schemaVersion: 1;
  createdAt: string;
  pro: { owned: boolean; transactionId?: string; updatedAt?: string };
  /** Reports that may be signed and exported without Pro, keyed by reportKey(). */
  unlockedReports: Record<string, UnlockedReport>;
  onboardingSeen: boolean;
  review: { signedExports: number; lastRequestedAt?: string; lastRequestedVersion?: string };
};

/**
 * Identifies one report: the game plus its date and teams. Correcting pitch
 * counts, pitchers or the level keeps the same report, so re-signing after a
 * correction is free. Changing the date or a team makes it a different report.
 */
export function reportKey(game: Game): string {
  const norm = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();
  return [game.id, norm(game.date), norm(game.visitor.name), norm(game.home.name)].join('|');
}

export function newAppState(now: Date): AppState {
  return {
    schemaVersion: 1,
    createdAt: now.toISOString(),
    pro: { owned: false },
    unlockedReports: {},
    onboardingSeen: false,
    review: { signedExports: 0 },
  };
}

/**
 * Runs once, the first time version 1.2 starts. Every report already signed by
 * both coaches stays signable and exportable for free, and does not count
 * toward the free allowance. A new install has no games, so nothing is granted.
 */
export function migrateExistingGames(games: Game[], now: Date): AppState {
  const state = newAppState(now);
  for (const game of games) {
    if (gameStatus(game) === 'signed') {
      state.unlockedReports[reportKey(game)] = { gameId: game.id, reason: 'legacy', at: now.toISOString() };
    }
  }
  return state;
}

/** Free reports used so far. Deleting a game does not give one back. */
export function freeReportsUsed(state: AppState): number {
  return Object.values(state.unlockedReports).filter((r) => r.reason === 'free').length;
}

export function freeReportsRemaining(state: AppState): number {
  return Math.max(0, FREE_SIGNED_REPORTS - freeReportsUsed(state));
}

export function isReportUnlocked(state: AppState, game: Game): boolean {
  return state.pro.owned || reportKey(game) in state.unlockedReports;
}

export type SigningDecision =
  | 'allowed' // Pro, or this report is already unlocked
  | 'uses-free-report' // allowed; completing it will use a free report
  | 'needs-pro';

/** May the coaches complete (sign) this report? */
export function signingDecision(state: AppState, game: Game): SigningDecision {
  if (isReportUnlocked(state, game)) return 'allowed';
  return freeReportsRemaining(state) > 0 ? 'uses-free-report' : 'needs-pro';
}

/** PDF export needs Pro, or a report that is already unlocked (free or from before 1.2). */
export function canExportPdf(state: AppState, game: Game): boolean {
  return isReportUnlocked(state, game);
}

/**
 * Call after a signature is saved. When the game has just become fully signed
 * and is not already unlocked, it uses one free report.
 */
export function recordCompletion(state: AppState, game: Game, now: Date): AppState {
  if (gameStatus(game) !== 'signed' || isReportUnlocked(state, game)) return state;
  if (freeReportsRemaining(state) === 0) return state; // the screens stop this before it happens
  return {
    ...state,
    unlockedReports: {
      ...state.unlockedReports,
      [reportKey(game)]: { gameId: game.id, reason: 'free', at: now.toISOString() },
    },
  };
}

export function grantPro(state: AppState, transactionId: string | undefined, now: Date): AppState {
  if (state.pro.owned && state.pro.transactionId === transactionId) return state;
  return { ...state, pro: { owned: true, transactionId, updatedAt: now.toISOString() } };
}

// ---------- App Store rating prompt ----------

/** Apple shows the prompt at most 3 times a year; we also wait this long between asks. */
const DAYS_BETWEEN_REVIEW_REQUESTS = 120;

export function recordSignedExport(state: AppState): AppState {
  return { ...state, review: { ...state.review, signedExports: state.review.signedExports + 1 } };
}

/**
 * Ask for a rating only after a coach has completed and exported a signed
 * report, never twice for the same app version, and not more than once every
 * DAYS_BETWEEN_REVIEW_REQUESTS days. Everyone is asked the same way: no
 * filtering on how happy someone seems, and nothing is offered in return.
 */
export function shouldRequestReview(state: AppState, appVersion: string, now: Date): boolean {
  const { signedExports, lastRequestedAt, lastRequestedVersion } = state.review;
  if (signedExports < 1) return false;
  if (lastRequestedVersion === appVersion) return false;
  if (lastRequestedAt) {
    const days = (now.getTime() - new Date(lastRequestedAt).getTime()) / 86_400_000;
    if (days < DAYS_BETWEEN_REVIEW_REQUESTS) return false;
  }
  return true;
}

export function markReviewRequested(state: AppState, appVersion: string, now: Date): AppState {
  return {
    ...state,
    review: { ...state.review, lastRequestedAt: now.toISOString(), lastRequestedVersion: appVersion },
  };
}

/** Light check that a saved file really is this app's state. */
export function looksLikeAppState(value: unknown): value is AppState {
  const s = value as AppState;
  return (
    !!s &&
    s.schemaVersion === 1 &&
    typeof s.pro?.owned === 'boolean' &&
    typeof s.unlockedReports === 'object' &&
    s.unlockedReports !== null &&
    typeof s.review?.signedExports === 'number'
  );
}
