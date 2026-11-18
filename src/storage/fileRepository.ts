import { Directory, File, Paths } from 'expo-file-system';

import { Game } from '../model/types';
import { GameRepository } from '../state/gameStore';

/** Very light check that a saved file really is a game written by this app. */
function looksLikeGame(value: unknown): value is Game {
  const g = value as Game;
  return (
    !!g &&
    g.schemaVersion === 1 &&
    typeof g.id === 'string' &&
    Array.isArray(g.visitor?.pitchers) &&
    Array.isArray(g.home?.pitchers) &&
    typeof g.signatures === 'object'
  );
}

/**
 * Saves each game as its own small file in the app's private documents folder
 * on the iPhone. Nothing leaves the phone.
 */
export function createFileRepository(): GameRepository {
  const folder = new Directory(Paths.document, 'games');

  function ensureFolder() {
    if (!folder.exists) folder.create({ intermediates: true, idempotent: true });
  }

  return {
    loadAll() {
      ensureFolder();
      const games: Game[] = [];
      for (const entry of folder.list()) {
        if (!(entry instanceof File) || !entry.name.endsWith('.json')) continue;
        try {
          const parsed = JSON.parse(entry.textSync());
          if (looksLikeGame(parsed)) games.push(parsed);
        } catch {
          // Skip a damaged file rather than lose every other game.
        }
      }
      return games;
    },

    save(game) {
      ensureFolder();
      // Write to a temporary file first, then swap it in, so a crash mid-save
      // cannot leave a half-written game behind.
      const temp = new File(folder, `${game.id}.json.tmp`);
      temp.writeSync(JSON.stringify(game));
      temp.moveSync(new File(folder, `${game.id}.json`), { overwrite: true });
    },

    remove(id) {
      const file = new File(folder, `${id}.json`);
      if (file.exists) file.delete();
    },
  };
}
