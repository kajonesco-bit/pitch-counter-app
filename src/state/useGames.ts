import { useSyncExternalStore } from 'react';

import { createFileRepository } from '../storage/fileRepository';
import { createGameStore, GameStore } from './gameStore';

let store: GameStore | null = null;

/** The one store for the whole app, backed by files on the phone. */
export function gameStore(): GameStore {
  if (!store) store = createGameStore(createFileRepository());
  return store;
}

export function useGames() {
  const s = gameStore();
  return useSyncExternalStore(s.subscribe, s.getGames);
}

export function useGame(id: string | undefined) {
  const games = useGames();
  return id ? games[id] : undefined;
}
