// The shape of the data the app saves and works with.

export type TeamSide = 'visitor' | 'home';

export const TEAM_SIDES: TeamSide[] = ['visitor', 'home'];

export type Pitcher = {
  id: string; // internal id, never shown
  name: string;
  jersey: string;
  pitches: number; // always a whole number from 0 to MAX_PITCHES
};

export type Team = {
  name: string;
  pitchers: Pitcher[];
};

/**
 * A head coach's finger signature.
 * `strokes` are SVG path strings drawn inside a `width` x `height` box, so the
 * exact lines the coach drew can be shown on screen and placed in the PDF.
 */
export type Signature = {
  coachName: string;
  strokes: string[];
  width: number;
  height: number;
  signedAt: string; // ISO date-time
  /** Check code of the report at the moment of signing; see reportFingerprint(). */
  reportFingerprint: string;
};

export type Game = {
  schemaVersion: 1;
  id: string;
  createdAt: string; // ISO date-time
  updatedAt: string; // ISO date-time
  date: string; // MM/DD/YYYY
  level: string; // optional, e.g. "Varsity"
  visitor: Team;
  home: Team;
  signatures: Record<TeamSide, Signature | null>;
};

/** What a coach draws, before the app adds the time and report check code. */
export type SignatureInput = Pick<Signature, 'coachName' | 'strokes' | 'width' | 'height'>;

export type GameStatus = 'draft' | 'partly-signed' | 'signed';
