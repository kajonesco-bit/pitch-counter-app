import { gameStatus, isSignatureValid, reportFingerprint, updatePitcher } from '../src/model/game';
import { Game } from '../src/model/types';
import { homeSignature, sampleGame, storeWithMemory, visitorSignature } from './helpers';

function signedGame() {
  const { store, files } = storeWithMemory([sampleGame()]);
  const id = Object.keys(store.getGames())[0];
  store.signGame(id, 'visitor', visitorSignature);
  store.signGame(id, 'home', homeSignature);
  return { store, files, id };
}

describe('signatures', () => {
  it('a game signed by both coaches is complete', () => {
    const { store, id } = signedGame();
    const game = store.getGame(id)!;
    expect(gameStatus(game)).toBe('signed');
    expect(isSignatureValid(game, 'visitor')).toBe(true);
    expect(isSignatureValid(game, 'home')).toBe(true);
    expect(game.signatures.visitor?.coachName).toBe('Pat Visitor');
  });

  it('signing by one coach does not disturb the other coach’s signature', () => {
    const { store } = storeWithMemory([sampleGame()]);
    const id = Object.keys(store.getGames())[0];
    store.signGame(id, 'home', homeSignature);
    expect(gameStatus(store.getGame(id)!)).toBe('partly-signed');
    store.signGame(id, 'visitor', visitorSignature);
    expect(gameStatus(store.getGame(id)!)).toBe('signed');
  });

  const changes: [string, (g: Game) => Game][] = [
    ['a pitch total (+1)', (g) => updatePitcher(g, 'home', g.home.pitchers[0].id, (p) => ({ ...p, pitches: p.pitches + 1 }))],
    ['a typed pitch correction', (g) => updatePitcher(g, 'visitor', g.visitor.pitchers[1].id, (p) => ({ ...p, pitches: 30 }))],
    ['a pitcher name', (g) => updatePitcher(g, 'home', g.home.pitchers[1].id, (p) => ({ ...p, name: 'R. Patil' }))],
    ['a jersey number', (g) => updatePitcher(g, 'visitor', g.visitor.pitchers[0].id, (p) => ({ ...p, jersey: '21' }))],
    ['a team name', (g) => ({ ...g, home: { ...g.home, name: 'Central High JV' } })],
    ['the game date', (g) => ({ ...g, date: '11/15/2026' })],
    ['the level', (g) => ({ ...g, level: 'JV' })],
    ['an added pitcher', (g) => ({ ...g, home: { ...g.home, pitchers: [...g.home.pitchers, { id: 'x', name: 'New', jersey: '', pitches: 0 }] } })],
    ['a removed pitcher', (g) => ({ ...g, visitor: { ...g.visitor, pitchers: g.visitor.pitchers.slice(0, 1) } })],
  ];

  it.each(changes)('changing %s removes BOTH signatures, and that is saved', (_label, change) => {
    const { store, files, id } = signedGame();
    store.updateGame(id, change);
    const game = store.getGame(id)!;
    expect(game.signatures).toEqual({ visitor: null, home: null });
    expect(gameStatus(game)).toBe('draft');
    // The saved copy on the "phone" has no signatures either.
    expect(JSON.parse(files.get(id)!).signatures).toEqual({ visitor: null, home: null });
  });

  it('changing a value and changing it back still requires both coaches to sign again', () => {
    const { store, id } = signedGame();
    const bump = (delta: number) => (g: Game) =>
      updatePitcher(g, 'home', g.home.pitchers[0].id, (p) => ({ ...p, pitches: p.pitches + delta }));
    store.updateGame(id, bump(1));
    store.updateGame(id, bump(-1));
    expect(gameStatus(store.getGame(id)!)).toBe('draft');
  });

  it('edits that do not change the report keep the signatures', () => {
    const { store, id } = signedGame();
    store.updateGame(id, (g) => ({ ...g, home: { ...g.home, name: 'Central High ' } }));
    expect(gameStatus(store.getGame(id)!)).toBe('signed');
  });

  it('a signature saved against a different report is never treated as valid', () => {
    const { store, id } = signedGame();
    const game = store.getGame(id)!;
    const tampered: Game = { ...game, home: { ...game.home, pitchers: game.home.pitchers.map((p) => ({ ...p, pitches: 1 })) } };
    expect(isSignatureValid(tampered, 'visitor')).toBe(false);
    expect(isSignatureValid(tampered, 'home')).toBe(false);
    expect(gameStatus(tampered)).toBe('draft');
    expect(reportFingerprint(tampered)).not.toBe(reportFingerprint(game));
  });

  it('after re-signing by both coaches the game is complete again', () => {
    const { store, id } = signedGame();
    store.updateGame(id, (g) => ({ ...g, level: 'JV' }));
    store.signGame(id, 'visitor', visitorSignature);
    expect(gameStatus(store.getGame(id)!)).toBe('partly-signed');
    store.signGame(id, 'home', homeSignature);
    expect(gameStatus(store.getGame(id)!)).toBe('signed');
  });
});
