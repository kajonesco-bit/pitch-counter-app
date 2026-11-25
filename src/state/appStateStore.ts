import {
  AppState,
  grantPro,
  markReviewRequested,
  migrateExistingGames,
  recordCompletion,
  recordSignedExport,
  shouldRequestReview,
} from '../model/entitlements';
import { Game } from '../model/types';

/** Where the app's own settings live. The app uses a file on the phone; tests use memory. */
export interface AppStateRepository {
  load(): AppState | null;
  save(state: AppState): void;
}

/**
 * Holds the free-report ledger, the cached Pro status and the rating-prompt
 * history. `existingGames` is read only once, on the very first start of
 * version 1.2, to protect reports signed before monetization.
 */
export function createAppStateStore(
  repository: AppStateRepository,
  existingGames: () => Game[],
  now: () => Date = () => new Date()
) {
  let state: AppState | null = null;
  const listeners = new Set<() => void>();

  function current(): AppState {
    if (!state) {
      const saved = repository.load();
      if (saved) {
        state = saved;
      } else {
        state = migrateExistingGames(existingGames(), now());
        repository.save(state);
      }
    }
    return state;
  }

  function commit(next: AppState) {
    if (next === state) return;
    repository.save(next);
    state = next;
    listeners.forEach((l) => l());
  }

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getState: current,
    grantPro(transactionId?: string) {
      commit(grantPro(current(), transactionId, now()));
    },
    recordCompletion(game: Game) {
      commit(recordCompletion(current(), game, now()));
    },
    markOnboardingSeen() {
      if (!current().onboardingSeen) commit({ ...current(), onboardingSeen: true });
    },
    /** Records a signed export and says whether to show Apple's rating prompt now. */
    recordSignedExport(appVersion: string): boolean {
      commit(recordSignedExport(current()));
      return shouldRequestReview(current(), appVersion, now());
    },
    markReviewRequested(appVersion: string) {
      commit(markReviewRequested(current(), appVersion, now()));
    },
  };
}

export type AppStateStore = ReturnType<typeof createAppStateStore>;
