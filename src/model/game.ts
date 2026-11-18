import { Game, GameStatus, Pitcher, Signature, Team, TeamSide, TEAM_SIDES } from './types';

export const MAX_PITCHES = 999;
export const MAX_TEAM_NAME = 60;
export const MAX_PERSON_NAME = 40;

export function sideLabel(side: TeamSide): string {
  return side === 'visitor' ? 'Visiting team' : 'Home team';
}

export function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function todayAsText(now: Date = new Date()): string {
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${mm}/${dd}/${now.getFullYear()}`;
}

export function newPitcher(): Pitcher {
  return { id: makeId(), name: '', jersey: '', pitches: 0 };
}

export function newGame(now: Date = new Date()): Game {
  const stamp = now.toISOString();
  return {
    schemaVersion: 1,
    id: makeId(),
    createdAt: stamp,
    updatedAt: stamp,
    date: todayAsText(now),
    level: '',
    visitor: { name: '', pitchers: [newPitcher()] },
    home: { name: '', pitchers: [newPitcher()] },
    signatures: { visitor: null, home: null },
  };
}

// ---------- Pitch counts ----------

function clampPitches(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(MAX_PITCHES, Math.max(0, Math.round(value)));
}

/** +1 / -1 buttons. A count never goes below 0. */
export function addPitches(pitcher: Pitcher, delta: number): Pitcher {
  return { ...pitcher, pitches: clampPitches(pitcher.pitches + delta) };
}

/** Converts a typed correction to a pitch count, or null if it is not a whole number from 0 to 999. */
export function parsePitches(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d{1,3}$/.test(trimmed)) return null;
  return Number(trimmed);
}

export function teamTotal(team: Team): number {
  return team.pitchers.reduce((sum, p) => sum + p.pitches, 0);
}

// ---------- Changing a game ----------

export function updateTeam(game: Game, side: TeamSide, change: (team: Team) => Team): Game {
  return { ...game, [side]: change(game[side]) };
}

export function updatePitcher(
  game: Game,
  side: TeamSide,
  pitcherId: string,
  change: (pitcher: Pitcher) => Pitcher
): Game {
  return updateTeam(game, side, (team) => ({
    ...team,
    pitchers: team.pitchers.map((p) => (p.id === pitcherId ? change(p) : p)),
  }));
}

// ---------- Signature protection ----------

/** Small, stable text hash (cyrb53). Used only to detect changes, not for security. */
function hashText(text: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const value = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  return value.toString(36).toUpperCase().padStart(11, '0');
}

/**
 * A check code for everything the coaches approve: date, level, team names,
 * and every pitcher's name, jersey number and pitch total, in order.
 * Any change to that information changes the code.
 * Extra spaces at the start or end of a field are ignored, as the PDF ignores them.
 */
export function reportFingerprint(game: Game): string {
  const team = (t: Team) => ({
    name: t.name.trim(),
    pitchers: t.pitchers.map((p) => [p.name.trim(), p.jersey.trim(), p.pitches]),
  });
  return hashText(
    JSON.stringify({
      date: game.date.trim(),
      level: game.level.trim(),
      visitor: team(game.visitor),
      home: team(game.home),
    })
  );
}

/** A signature counts only if the report has not changed since the coach signed it. */
export function isSignatureValid(game: Game, side: TeamSide): boolean {
  const signature = game.signatures[side];
  return signature !== null && signature.reportFingerprint === reportFingerprint(game);
}

export function validSignature(game: Game, side: TeamSide): Signature | null {
  return isSignatureValid(game, side) ? game.signatures[side] : null;
}

export function hasAnySignature(game: Game): boolean {
  return TEAM_SIDES.some((side) => game.signatures[side] !== null);
}

/**
 * Called on every save. If the approved report information changed, BOTH
 * signatures are removed, so both coaches must sign again.
 */
export function protectSignatures(before: Game, after: Game): Game {
  if (!hasAnySignature(after)) return after;
  const reportChanged = reportFingerprint(before) !== reportFingerprint(after);
  const staleSignature = TEAM_SIDES.some(
    (side) => after.signatures[side] !== null && !isSignatureValid(after, side)
  );
  if (!reportChanged && !staleSignature) return after;
  return { ...after, signatures: { visitor: null, home: null } };
}

export function gameStatus(game: Game): GameStatus {
  const count = TEAM_SIDES.filter((side) => isSignatureValid(game, side)).length;
  if (count === 2) return 'signed';
  if (count === 1) return 'partly-signed';
  return 'draft';
}

export function statusLabel(status: GameStatus): string {
  switch (status) {
    case 'signed':
      return 'Signed';
    case 'partly-signed':
      return 'Signed by 1 of 2';
    default:
      return 'Draft';
  }
}

// ---------- Checks before review, signing and PDF ----------

function isRealDate(text: string): boolean {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text.trim());
  if (!match) return false;
  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

/** Problems that must be fixed before coaches can sign or a PDF can be created. Empty list = OK. */
export function validateGame(game: Game): string[] {
  const problems: string[] = [];
  if (!isRealDate(game.date)) problems.push('Enter the game date as MM/DD/YYYY.');
  for (const side of TEAM_SIDES) {
    const team = game[side];
    const label = sideLabel(side);
    if (!team.name.trim()) problems.push(`${label}: enter the team name.`);
    if (team.pitchers.length === 0) problems.push(`${label}: add at least one pitcher.`);
    team.pitchers.forEach((pitcher, index) => {
      if (!pitcher.name.trim()) problems.push(`${label}, pitcher ${index + 1}: enter a name.`);
    });
  }
  return problems;
}

/** "Eastside at Central High", with fallbacks while names are still blank. */
export function matchupTitle(game: Game): string {
  const visitor = game.visitor.name.trim() || 'Visiting team';
  const home = game.home.name.trim() || 'Home team';
  return `${visitor} at ${home}`;
}
