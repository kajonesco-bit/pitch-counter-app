import { newGame, protectSignatures, reportFingerprint } from '../model/game';
import { Game, SignatureInput, TeamSide } from '../model/types';

/** Where games are kept. The app uses files on the phone; tests use memory. */
export interface GameRepository {
  loadAll(): Game[];
  save(game: Game): void;
  remove(id: string): void;
}

export type GamesState = Readonly<Record<string, Game>>;

/**
 * Holds every saved game. All changes go through here, so every change is
 * saved immediately and the signature rule is always applied.
 */
export function createGameStore(repository: GameRepository, now: () => Date = () => new Date()) {
  let games: GamesState = {};
  let loaded = false;
  const listeners = new Set<() => void>();

  function emit() {
    listeners.forEach((listener) => listener());
  }

  function ensureLoaded() {
    if (loaded) return;
    loaded = true;
    const entries: Record<string, Game> = {};
    for (const game of repository.loadAll()) entries[game.id] = game;
    games = entries;
  }

  function commit(game: Game) {
    repository.save(game);
    games = { ...games, [game.id]: game };
    emit();
  }

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    getGames(): GamesState {
      ensureLoaded();
      return games;
    },

    getGame(id: string): Game | undefined {
      ensureLoaded();
      return games[id];
    },

    createGame(): Game {
      ensureLoaded();
      const game = newGame(now());
      commit(game);
      return game;
    },

    /**
     * Changes a game. If the change touches anything the coaches approved,
     * both signatures are removed (see protectSignatures).
     */
    updateGame(id: string, change: (game: Game) => Game): Game | undefined {
      ensureLoaded();
      const before = games[id];
      if (!before) return undefined;
      const changed = protectSignatures(before, change(before));
      const after = { ...changed, updatedAt: now().toISOString() };
      commit(after);
      return after;
    },

    /** Stores a coach's signature against the report exactly as it is now. */
    signGame(id: string, side: TeamSide, input: SignatureInput): Game | undefined {
      ensureLoaded();
      const game = games[id];
      if (!game) return undefined;
      const signature = {
        ...input,
        coachName: input.coachName.trim(),
        signedAt: now().toISOString(),
        reportFingerprint: reportFingerprint(game),
      };
      return this.updateGame(id, (g) => ({ ...g, signatures: { ...g.signatures, [side]: signature } }));
    },

    clearSignatures(id: string): Game | undefined {
      return this.updateGame(id, (g) => ({ ...g, signatures: { visitor: null, home: null } }));
    },

    deleteGame(id: string) {
      ensureLoaded();
      if (!games[id]) return;
      repository.remove(id);
      const rest = { ...games };
      delete rest[id];
      games = rest;
      emit();
    },
  };
}

export type GameStore = ReturnType<typeof createGameStore>;
