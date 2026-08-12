export type ListItem = {
  /** 1-based position in the list. This is also the point value in "rank" scoring. */
  rank: number;
  name: string;
  /** Extra accepted spellings: short forms, symbols, alternate titles. */
  aliases?: string[];
  /** Optional flavour text shown once the item has been claimed. */
  note?: string;
};

/** Where a list's ordering came from, shown in the UI so players can check it. */
export type ListSource = {
  name: string;
  url: string;
  /** ISO date the data was scraped. */
  sourcedAt: string;
};

/**
 * Lists that are the same subject at different depths - IMDb's Top 100 and Top
 * 250 - share a series and render as one card with a size toggle. Everywhere
 * else they stay ordinary independent lists.
 */
export type ListSeries = {
  id: string;
  /** Card title, standing in for the individual list names. */
  name: string;
  /** Label for this variant's toggle button. */
  variant: string;
};

export type GameList = {
  id: string;
  name: string;
  category: string;
  series?: ListSeries;
  /** One-line explanation of what the ordering means. */
  blurb: string;
  /** Shown in setup when the ordering is a point-in-time snapshot rather than a fixed fact. */
  caveat?: string;
  source: ListSource;
  items: ListItem[];
};

export type TeamId = "A" | "B";

/**
 * "rank"     -> guessing #99 scores 99. Obscure entries are worth more.
 * "inverted" -> guessing #99 in a 100-item list scores 2. The top of the list is worth more.
 */
export type ScoringMode = "rank" | "inverted";

export type GameSettings = {
  listId: string;
  teamNames: Record<TeamId, string>;
  scoring: ScoringMode;
  /** Seconds per guessing round. null disables the timer entirely. */
  turnSeconds: number | null;
};

export type GuessOutcome = "hit" | "miss" | "duplicate" | "ambiguous" | "timeout";

export type TurnRecord = {
  /** Monotonic id per attempt. Distinct from `turn`, since a duplicate guess
   *  adds a record without ending the round. */
  id: number;
  turn: number;
  team: TeamId;
  /** Raw text the team typed. Empty for a timeout. */
  guess: string;
  outcome: GuessOutcome;
  points: number;
  /** Set for hits and duplicates: the list entry the guess resolved to. */
  matched?: ListItem;
};

export type GameState = {
  phase: "setup" | "playing" | "results";
  settings: GameSettings;
  currentTeam: TeamId;
  turn: number;
  scores: Record<TeamId, number>;
  history: TurnRecord[];
  /** Ranks already claimed, so the same entry cannot score twice. */
  claimed: Record<number, TeamId>;
};
