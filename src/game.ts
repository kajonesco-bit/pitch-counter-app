import { Game, PitcherEntry, TeamEntry } from './types';

let nextId = 1;

export function newPitcher(): PitcherEntry {
  return { id: `p${Date.now()}-${nextId++}`, name: '', jersey: '', pitches: '' };
}

export function todayAsText(): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${mm}/${dd}/${now.getFullYear()}`;
}

export function newGame(): Game {
  return {
    date: todayAsText(),
    level: '',
    visitor: { name: '', pitchers: [newPitcher()] },
    home: { name: '', pitchers: [newPitcher()] },
  };
}

/** Converts typed text to a pitch count, or null if it is not a whole number from 0 to 999. */
export function parsePitches(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d{1,3}$/.test(trimmed)) return null;
  return Number(trimmed);
}

/** Adds up a team's pitch totals, ignoring fields that are empty or invalid. */
export function teamTotal(team: TeamEntry): number {
  return team.pitchers.reduce((sum, p) => sum + (parsePitches(p.pitches) ?? 0), 0);
}

function isRealDate(text: string): boolean {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text.trim());
  if (!match) return false;
  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

/** Returns a list of problems that must be fixed before a PDF can be created. Empty list = OK. */
export function validateGame(game: Game): string[] {
  const problems: string[] = [];

  if (!isRealDate(game.date)) problems.push('Enter the game date as MM/DD/YYYY.');
  if (!game.visitor.name.trim()) problems.push('Enter the visiting team name.');
  if (!game.home.name.trim()) problems.push('Enter the home team name.');

  const sides: [string, TeamEntry][] = [
    ['Visiting team', game.visitor],
    ['Home team', game.home],
  ];
  for (const [label, team] of sides) {
    if (team.pitchers.length === 0) {
      problems.push(`${label}: add at least one pitcher.`);
    }
    team.pitchers.forEach((pitcher, index) => {
      const who = `${label}, pitcher ${index + 1}`;
      if (!pitcher.name.trim()) problems.push(`${who}: enter a name.`);
      if (parsePitches(pitcher.pitches) === null) {
        problems.push(`${who}: enter the pitch total as a whole number.`);
      }
    });
  }
  return problems;
}
