import { addPitches, newPitcher, parsePitches, teamTotal, validateGame } from '../src/model/game';
import { sampleGame, storeWithMemory } from './helpers';

describe('live pitch counting', () => {
  it('adds and subtracts one pitch at a time', () => {
    let p = newPitcher();
    p = addPitches(p, 1);
    p = addPitches(p, 1);
    p = addPitches(p, 1);
    p = addPitches(p, -1);
    expect(p.pitches).toBe(2);
  });

  it('never goes below zero', () => {
    let p = newPitcher();
    p = addPitches(p, -1);
    expect(p.pitches).toBe(0);
    p = addPitches(p, 1);
    p = addPitches(p, -1);
    p = addPitches(p, -1);
    expect(p.pitches).toBe(0);
  });

  it('stops at 999', () => {
    const p = addPitches({ ...newPitcher(), pitches: 999 }, 1);
    expect(p.pitches).toBe(999);
  });

  it('accepts typed corrections only as whole numbers 0-999', () => {
    expect(parsePitches('87')).toBe(87);
    expect(parsePitches(' 0 ')).toBe(0);
    expect(parsePitches('-3')).toBeNull();
    expect(parsePitches('1.5')).toBeNull();
    expect(parsePitches('1000')).toBeNull();
    expect(parsePitches('')).toBeNull();
  });

  it('keeps pitcher and team totals in step with taps across several pitchers', () => {
    const { store } = storeWithMemory();
    const game = store.createGame();
    const first = game.home.pitchers[0].id;
    store.updateGame(game.id, (g) => ({
      ...g,
      home: { ...g.home, pitchers: [...g.home.pitchers, { ...g.home.pitchers[0], id: 'second' }] },
    }));
    for (let i = 0; i < 40; i++) {
      store.updateGame(game.id, (g) => ({
        ...g,
        home: { ...g.home, pitchers: g.home.pitchers.map((p) => (p.id === first ? addPitches(p, 1) : p)) },
      }));
    }
    for (let i = 0; i < 12; i++) {
      store.updateGame(game.id, (g) => ({
        ...g,
        home: { ...g.home, pitchers: g.home.pitchers.map((p) => (p.id === 'second' ? addPitches(p, 1) : p)) },
      }));
    }
    const saved = store.getGame(game.id)!;
    expect(saved.home.pitchers.map((p) => p.pitches)).toEqual([40, 12]);
    expect(teamTotal(saved.home)).toBe(52);
    expect(teamTotal(saved.visitor)).toBe(0);
  });

  it('requires team and pitcher names before review sign-off', () => {
    const game = sampleGame();
    expect(validateGame(game)).toEqual([]);
    const problems = validateGame({
      ...game,
      date: '02/30/2026',
      home: { name: ' ', pitchers: [{ ...game.home.pitchers[0], name: '' }] },
    });
    expect(problems).toEqual([
      'Enter the game date as MM/DD/YYYY.',
      'Home team: enter the team name.',
      'Home team, pitcher 1: enter a name.',
    ]);
  });
});
