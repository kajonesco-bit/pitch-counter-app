import { newGame, newPitcher } from '../src/model/game';
import { Game, SignatureInput } from '../src/model/types';
import { createGameStore, GameRepository } from '../src/state/gameStore';

/** A repository that keeps "saved" games in memory, like files on the phone would. */
export function memoryRepository(initial: Game[] = []) {
  const files = new Map<string, string>(initial.map((g) => [g.id, JSON.stringify(g)]));
  const repository: GameRepository = {
    loadAll: () => [...files.values()].map((text) => JSON.parse(text)),
    save: (game) => files.set(game.id, JSON.stringify(game)),
    remove: (id) => files.delete(id),
  };
  return { repository, files };
}

let clock = Date.parse('2026-11-14T19:00:00Z');
export const testNow = () => new Date((clock += 1000));

export function storeWithMemory(initial: Game[] = []) {
  const memory = memoryRepository(initial);
  return { store: createGameStore(memory.repository, testNow), ...memory };
}

export function sampleGame(): Game {
  const game = newGame(new Date('2026-11-14T19:00:00Z'));
  const p = (name: string, jersey: string, pitches: number) => ({ ...newPitcher(), name, jersey, pitches });
  return {
    ...game,
    date: '11/14/2026',
    level: 'Varsity',
    visitor: {
      name: 'East Wake Warriors',
      pitchers: [p('J. Alvarez', '12', 78), p("T. O'Brien", '4', 31)],
    },
    home: { name: 'Central High', pitchers: [p('D. Whitaker', '19', 96), p('R. Patel', '8', 22)] },
  };
}

export const visitorSignature: SignatureInput = {
  coachName: 'Pat Visitor',
  strokes: ['M10 80 L60 30 L110 90 L160 40', 'M200 70 L260 70'],
  width: 340,
  height: 220,
};

export const homeSignature: SignatureInput = {
  coachName: 'Sam Home',
  strokes: ['M20 60 L40 140 L70 60', 'M30 100 L90 40 L150 110'],
  width: 340,
  height: 220,
};
