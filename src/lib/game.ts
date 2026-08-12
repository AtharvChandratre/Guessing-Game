import { resolveGuess } from "./match";
import type {
  GameList,
  GameSettings,
  GameState,
  ScoringMode,
  TeamId,
  TurnRecord,
} from "./types";

export const DEFAULT_SETTINGS: GameSettings = {
  listId: "imdb-top-100",
  teamNames: { A: "Team A", B: "Team B" },
  scoring: "rank",
  turnSeconds: null,
};

export function initialState(settings: GameSettings = DEFAULT_SETTINGS): GameState {
  return {
    phase: "setup",
    settings,
    currentTeam: "A",
    turn: 1,
    scores: { A: 0, B: 0 },
    history: [],
    claimed: {},
  };
}

/** Points an entry is worth under the chosen scoring mode. */
export function pointsFor(rank: number, listSize: number, scoring: ScoringMode): number {
  return scoring === "rank" ? rank : listSize - rank + 1;
}

/** Turns in a full round: one per team. */
export const TURNS_PER_ROUND = 2;

/**
 * Split `state.turn` into the round it belongs to and which team's go it is
 * within that round. Turn 1 is round 1 leg 1, turn 2 is round 1 leg 2, turn 3
 * opens round 2.
 *
 * Team A always takes the odd turns, so the leg also identifies the team - but
 * the label is deliberately positional rather than named, so it still reads
 * correctly if a third team is ever added.
 */
export function roundOf(turn: number): { round: number; leg: number } {
  return {
    round: Math.floor((turn - 1) / TURNS_PER_ROUND) + 1,
    leg: ((turn - 1) % TURNS_PER_ROUND) + 1,
  };
}

/** "1-1", "1-2", "2-1"... the round and the go within it. */
export function roundLabel(turn: number): string {
  const { round, leg } = roundOf(turn);
  return `${round}-${leg}`;
}

export const other = (team: TeamId): TeamId => (team === "A" ? "B" : "A");

export type Action =
  | { type: "start"; settings: GameSettings }
  | { type: "guess"; text: string; list: GameList }
  | { type: "timeout" }
  | { type: "end" }
  | { type: "reset" }
  | { type: "playAgain" };

export function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "start":
      return { ...initialState(action.settings), phase: "playing" };

    case "guess": {
      if (state.phase !== "playing") return state;
      const text = action.text.trim();
      if (!text) return state;

      const result = resolveGuess(action.list, text, state.claimed);
      const match = result.kind === "match" ? result.item : null;
      const alreadyClaimed = match ? state.claimed[match.rank] !== undefined : false;
      const base = { id: state.history.length + 1, turn: state.turn, team: state.currentTeam, guess: text };

      let record: TurnRecord;
      if (result.kind === "ambiguous") {
        record = { ...base, outcome: "ambiguous", points: 0 };
      } else if (!match) {
        record = { ...base, outcome: "miss", points: 0 };
      } else if (alreadyClaimed) {
        record = { ...base, outcome: "duplicate", points: 0, matched: match };
      } else {
        record = {
          ...base,
          outcome: "hit",
          points: pointsFor(match.rank, action.list.items.length, state.settings.scoring),
          matched: match,
        };
      }

      // Neither naming something already taken nor typing a fragment that fits
      // several entries should cost the round. The same team stays up and
      // guesses again; only the clock keeps running.
      const keepTurn = record.outcome === "duplicate" || record.outcome === "ambiguous";

      return {
        ...state,
        scores: { ...state.scores, [state.currentTeam]: state.scores[state.currentTeam] + record.points },
        claimed:
          record.outcome === "hit" && match
            ? { ...state.claimed, [match.rank]: state.currentTeam }
            : state.claimed,
        history: [record, ...state.history],
        currentTeam: keepTurn ? state.currentTeam : other(state.currentTeam),
        turn: keepTurn ? state.turn : state.turn + 1,
      };
    }

    case "timeout": {
      if (state.phase !== "playing") return state;
      const record: TurnRecord = {
        id: state.history.length + 1,
        turn: state.turn,
        team: state.currentTeam,
        guess: "",
        outcome: "timeout",
        points: 0,
      };
      return {
        ...state,
        history: [record, ...state.history],
        currentTeam: other(state.currentTeam),
        turn: state.turn + 1,
      };
    }

    case "end":
      return { ...state, phase: "results" };

    case "playAgain":
      return { ...initialState(state.settings), phase: "playing" };

    case "reset":
      return initialState(state.settings);

    default:
      return state;
  }
}

export function winner(state: GameState): TeamId | "tie" {
  if (state.scores.A === state.scores.B) return "tie";
  return state.scores.A > state.scores.B ? "A" : "B";
}
