// The shape of the data the app works with.
// Everything typed into the form is kept as text (strings) so that a field can
// be empty or half-typed; we check and convert it when the PDF is created.

export type PitcherEntry = {
  id: string; // internal id so the list can be edited safely; never shown
  name: string;
  jersey: string;
  pitches: string; // final pitch total for the game, as typed
};

export type TeamEntry = {
  name: string;
  pitchers: PitcherEntry[];
};

export type Game = {
  date: string; // MM/DD/YYYY
  level: string; // optional, e.g. "Varsity" or "JV"
  visitor: TeamEntry;
  home: TeamEntry;
};

export type TeamSide = 'visitor' | 'home';
