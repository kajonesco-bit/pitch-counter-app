import { createGameStore } from '../src/state/gameStore';
import { gameStatus } from '../src/model/game';
import { homeSignature, memoryRepository, sampleGame, storeWithMemory, testNow, visitorSignature } from './helpers';

describe('saved game history', () => {
  it('games are still there after the app restarts, with their status', () => {
    const { store, files } = storeWithMemory();
    const draft = store.createGame();
    const signed = store.createGame();
    store.updateGame(signed.id, (g) => ({ ...sampleGame(), id: g.id, createdAt: g.createdAt }));
    store.signGame(signed.id, 'visitor', visitorSignature);
    store.signGame(signed.id, 'home', homeSignature);

    // "Restart": a brand-new store reading the same saved files.
    const reopened = createGameStore(
      memoryRepository([...files.values()].map((t) => JSON.parse(t))).repository,
      testNow
    );
    expect(Object.keys(reopened.getGames()).sort()).toEqual([draft.id, signed.id].sort());
    expect(gameStatus(reopened.getGame(draft.id)!)).toBe('draft');
    expect(gameStatus(reopened.getGame(signed.id)!)).toBe('signed');
    expect(reopened.getGame(signed.id)!.signatures.home?.strokes).toEqual(homeSignature.strokes);
  });

  it('deleting a game removes its saved file', () => {
    const { store, files } = storeWithMemory();
    const game = store.createGame();
    expect(files.has(game.id)).toBe(true);
    store.deleteGame(game.id);
    expect(files.has(game.id)).toBe(false);
    expect(store.getGame(game.id)).toBeUndefined();
  });

  it('notifies screens when a game changes', () => {
    const { store } = storeWithMemory();
    const listener = jest.fn();
    store.subscribe(listener);
    const game = store.createGame();
    store.updateGame(game.id, (g) => ({ ...g, level: 'JV' }));
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
