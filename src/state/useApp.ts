import { useSyncExternalStore } from 'react';

import { createExpoIapStore } from '../purchases/expoIapStore';
import { createProController, ProController } from '../purchases/proController';
import { createAppStateFile } from '../storage/appStateFile';
import { AppStateStore, createAppStateStore } from './appStateStore';
import { gameStore } from './useGames';

let appState: AppStateStore | null = null;
let pro: ProController | null = null;

/** The one app-state store, backed by a file on the phone. */
export function appStateStore(): AppStateStore {
  if (!appState) {
    appState = createAppStateStore(createAppStateFile(), () => Object.values(gameStore().getGames()));
  }
  return appState;
}

/** The one Pro purchase controller, talking to the App Store through expo-iap. */
export function proController(): ProController {
  if (!pro) {
    pro = createProController({
      store: createExpoIapStore(),
      isPro: () => appStateStore().getState().pro.owned,
      grantPro: (transactionId) => appStateStore().grantPro(transactionId),
    });
  }
  return pro;
}

export function useAppState() {
  const s = appStateStore();
  return useSyncExternalStore(s.subscribe, s.getState);
}

export function useProSnapshot() {
  const c = proController();
  return useSyncExternalStore(c.subscribe, c.getSnapshot);
}
