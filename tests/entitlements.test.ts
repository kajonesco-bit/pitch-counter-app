import {
  AppState,
  canExportPdf,
  FREE_SIGNED_REPORTS,
  freeReportsRemaining,
  freeReportsUsed,
  looksLikeAppState,
  migrateExistingGames,
  newAppState,
  reportKey,
  signingDecision,
} from '../src/model/entitlements';
import { gameStatus, newGame, updatePitcher } from '../src/model/game';
import { Game } from '../src/model/types';
import { AppStateRepository, createAppStateStore } from '../src/state/appStateStore';
import { homeSignature, sampleGame, storeWithMemory, testNow, visitorSignature } from './helpers';

function memoryAppState(initial: AppState | null = null) {
  let saved: string | null = initial ? JSON.stringify(initial) : null;
  const repo: AppStateRepository = {
    load: () => (saved ? JSON.parse(saved) : null),
    save: (s) => {
      saved = JSON.stringify(s);
    },
  };
  return { repo, saved: () => (saved ? (JSON.parse(saved) as AppState) : null) };
}

/** A games store + app-state store wired like the app: signing a game records its completion. */
function setupApp(existing: Game[] = []) {
  const games = storeWithMemory(existing);
  const mem = memoryAppState();
  const app = createAppStateStore(mem.repo, () => Object.values(games.store.getGames()), testNow);
  app.getState(); // first launch of 1.2
  function completeNewGame(overrides: Partial<Game> = {}) {
    const g = games.store.createGame();
    games.store.updateGame(g.id, () => ({ ...sampleGame(), ...overrides, id: g.id, createdAt: g.createdAt }));
    return complete(g.id);
  }
  /** Both coaches sign, the way the signing screen does it. Returns false if the paywall would stop it. */
  function complete(id: string) {
    const game = games.store.getGame(id)!;
    if (signingDecision(app.getState(), game) === 'needs-pro') return false;
    games.store.signGame(id, 'visitor', visitorSignature);
    const signed = games.store.signGame(id, 'home', homeSignature)!;
    app.recordCompletion(signed);
    return true;
  }
  return { games, app, mem, completeNewGame, complete };
}

function signedGame(): Game {
  const { store } = storeWithMemory([sampleGame()]);
  const id = Object.keys(store.getGames())[0];
  store.signGame(id, 'visitor', visitorSignature);
  return store.signGame(id, 'home', homeSignature)!;
}

describe('free signed report allowance', () => {
  it('a new user gets exactly 3 newly completed signed reports, then needs Pro', () => {
    const { app, completeNewGame, games } = setupApp();
    expect(FREE_SIGNED_REPORTS).toBe(3);
    expect(freeReportsRemaining(app.getState())).toBe(3);
    expect(completeNewGame()).toBe(true);
    expect(completeNewGame()).toBe(true);
    expect(completeNewGame()).toBe(true);
    expect(freeReportsRemaining(app.getState())).toBe(0);
    expect(completeNewGame()).toBe(false); // the 4th is stopped before signing
    const fourth = Object.values(games.store.getGames()).find((g) => gameStatus(g) !== 'signed')!;
    expect(signingDecision(app.getState(), fourth)).toBe('needs-pro');
    expect(canExportPdf(app.getState(), fourth)).toBe(false);
  });

  it('pitch counting is never limited: games can be created and counted without any free reports left', () => {
    const { app, completeNewGame, games } = setupApp();
    for (let i = 0; i < 3; i++) completeNewGame();
    for (let i = 0; i < 20; i++) {
      const g = games.store.createGame();
      games.store.updateGame(g.id, (x) => updatePitcher(x, 'home', x.home.pitchers[0].id, (p) => ({ ...p, pitches: 50 + i })));
    }
    expect(Object.keys(games.store.getGames())).toHaveLength(23);
    expect(freeReportsRemaining(app.getState())).toBe(0);
  });

  it('a free report stays exportable after the limit is reached', () => {
    const { app, completeNewGame, games } = setupApp();
    for (let i = 0; i < 3; i++) completeNewGame();
    for (const g of Object.values(games.store.getGames())) expect(canExportPdf(app.getState(), g)).toBe(true);
  });

  it('correcting a count on a free report and re-signing does not use another free report', () => {
    const { app, completeNewGame, complete, games } = setupApp();
    completeNewGame();
    const id = Object.keys(games.store.getGames())[0];
    games.store.updateGame(id, (g) => updatePitcher(g, 'home', g.home.pitchers[0].id, (p) => ({ ...p, pitches: p.pitches + 1 })));
    expect(gameStatus(games.store.getGame(id)!)).toBe('draft'); // signatures still cleared by the edit
    expect(signingDecision(app.getState(), games.store.getGame(id)!)).toBe('allowed');
    expect(complete(id)).toBe(true);
    expect(freeReportsUsed(app.getState())).toBe(1);
  });

  it('reusing a game for a different date or teams counts as a new report', () => {
    const { app, completeNewGame, games } = setupApp();
    completeNewGame();
    const id = Object.keys(games.store.getGames())[0];
    games.store.updateGame(id, (g) => ({ ...g, date: '11/21/2026', home: { ...g.home, name: 'Different High' } }));
    expect(signingDecision(app.getState(), games.store.getGame(id)!)).toBe('uses-free-report');
  });

  it('deleting a game does not give back a free report', () => {
    const { app, completeNewGame, games } = setupApp();
    completeNewGame();
    games.store.deleteGame(Object.keys(games.store.getGames())[0]);
    expect(freeReportsRemaining(app.getState())).toBe(2);
  });

  it('a report key ignores spacing and capitals', () => {
    const g = sampleGame();
    expect(reportKey({ ...g, home: { ...g.home, name: '  central   HIGH ' } })).toBe(reportKey(g));
  });
});

describe('Pro entitlement', () => {
  it('Pro allows unlimited signing and export of any report', () => {
    const { app, completeNewGame, games } = setupApp();
    for (let i = 0; i < 3; i++) completeNewGame();
    app.grantPro('tx-1');
    for (let i = 0; i < 10; i++) expect(completeNewGame()).toBe(true);
    for (const g of Object.values(games.store.getGames())) expect(canExportPdf(app.getState(), g)).toBe(true);
    expect(freeReportsUsed(app.getState())).toBe(3); // Pro reports do not use free ones
  });

  it('Pro is remembered across restarts (works offline at the field)', () => {
    const { app, mem, games } = setupApp();
    app.grantPro('tx-9');
    const reopened = createAppStateStore(mem.repo, () => Object.values(games.store.getGames()), testNow);
    expect(reopened.getState().pro).toMatchObject({ owned: true, transactionId: 'tx-9' });
  });
});

describe('existing games from version 1.1', () => {
  it('reports signed before 1.2 stay free to view, re-sign and export, and do not use free reports', () => {
    const legacySigned = [signedGame(), signedGame(), signedGame(), signedGame()];
    const { app } = setupApp(legacySigned);
    const state = app.getState();
    expect(Object.values(state.unlockedReports).every((r) => r.reason === 'legacy')).toBe(true);
    expect(Object.keys(state.unlockedReports)).toHaveLength(4);
    expect(freeReportsRemaining(state)).toBe(3);
    for (const g of legacySigned) {
      expect(canExportPdf(state, g)).toBe(true);
      expect(signingDecision(state, g)).toBe('allowed');
    }
  });

  it('a legacy report corrected and re-signed is still free', () => {
    const legacy = signedGame();
    const { app, games, complete } = setupApp([legacy]);
    games.store.updateGame(legacy.id, (g) => ({ ...g, level: 'JV' }));
    expect(complete(legacy.id)).toBe(true);
    expect(freeReportsUsed(app.getState())).toBe(0);
  });

  it('drafts and half-signed games from 1.1 are kept and counted normally when completed later', () => {
    const draft = { ...sampleGame(), id: 'draft-1' };
    const { store } = storeWithMemory([{ ...sampleGame(), id: 'half-1' }]);
    const half = store.signGame('half-1', 'visitor', visitorSignature)!;
    const { app, games, complete } = setupApp([draft, half]);
    expect(Object.keys(games.store.getGames()).sort()).toEqual(['draft-1', 'half-1']);
    expect(app.getState().unlockedReports).toEqual({});
    expect(complete('draft-1')).toBe(true);
    expect(freeReportsRemaining(app.getState())).toBe(2);
  });

  it('migration runs only once: games signed later are not mistaken for old ones', () => {
    const { app, mem, completeNewGame, games } = setupApp([signedGame()]);
    completeNewGame();
    const reopened = createAppStateStore(mem.repo, () => Object.values(games.store.getGames()), testNow);
    const reasons = Object.values(reopened.getState().unlockedReports).map((r) => r.reason).sort();
    expect(reasons).toEqual(['free', 'legacy']);
    expect(reopened.getState()).toEqual(app.getState());
  });

  it('a brand-new install starts with nothing unlocked and 3 free reports', () => {
    const state = migrateExistingGames([], new Date('2026-11-25T12:00:00Z'));
    expect(state).toEqual(newAppState(new Date('2026-11-25T12:00:00Z')));
    expect(freeReportsRemaining(state)).toBe(3);
  });

  it('a damaged settings file is never mistaken for valid state', () => {
    expect(looksLikeAppState(null)).toBe(false);
    expect(looksLikeAppState({ schemaVersion: 1 })).toBe(false);
    expect(looksLikeAppState(newAppState(new Date()))).toBe(true);
    expect(gameStatus(newGame())).toBe('draft');
  });
});
