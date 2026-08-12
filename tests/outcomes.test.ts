import { describe, it, expect } from "vitest";
import { reducer, initialState, DEFAULT_SETTINGS } from "@/lib/game";
import { byId } from "./helpers";

/**
 * What a match result costs the team that typed it.
 *
 * Matching is only half the promise: the other half is that being misunderstood
 * never silently ends your round. A regression here looks to players exactly
 * like a matcher bug, so it belongs next to the matcher tests.
 */
const list = byId["best-selling-video-games"];

const start = () =>
  reducer(initialState(), { type: "start", settings: { ...DEFAULT_SETTINGS, listId: list.id } });

const guess = (state: ReturnType<typeof start>, text: string) =>
  reducer(state, { type: "guess", text, list });

describe("a guess that scores", () => {
  it("banks the rank and passes the turn", () => {
    const after = guess(start(), "Minecraft");
    expect(after.history[0].outcome).toBe("hit");
    expect(after.history[0].points).toBe(2);
    expect(after.scores.A).toBe(2);
    expect(after.currentTeam).toBe("B");
    expect(after.turn).toBe(2);
  });

  it("marks the entry claimed so it cannot score twice", () => {
    const after = guess(start(), "Minecraft");
    expect(after.claimed[2]).toBe("A");
  });
});

describe("a guess that is not on the list", () => {
  it("scores nothing and passes the turn", () => {
    const after = guess(start(), "Half-Life 3");
    expect(after.history[0].outcome).toBe("miss");
    expect(after.scores.A).toBe(0);
    expect(after.currentTeam).toBe("B");
  });
});

describe("a guess that names something already taken", () => {
  it("scores nothing but keeps the turn", () => {
    const claimed = guess(start(), "Minecraft");
    const after = guess({ ...claimed, currentTeam: "B" }, "Minecraft");
    expect(after.history[0].outcome).toBe("duplicate");
    expect(after.history[0].points).toBe(0);
    expect(after.currentTeam).toBe("B");
    expect(after.turn).toBe(claimed.turn);
  });
});

describe("a guess that fits several entries", () => {
  it("scores nothing but keeps the turn, so a franchise name costs nothing", () => {
    const after = guess(start(), "Pokemon");
    expect(after.history[0].outcome).toBe("ambiguous");
    expect(after.history[0].points).toBe(0);
    expect(after.currentTeam).toBe("A");
    expect(after.turn).toBe(1);
  });

  it("claims nothing, so no entry is burned by an ambiguous attempt", () => {
    const after = guess(start(), "Pokemon");
    expect(Object.keys(after.claimed)).toEqual([]);
  });

  it("lets the same team narrow it down and score on the retry", () => {
    const first = guess(start(), "Pokemon");
    const second = guess(first, "Pokemon Red");
    expect(second.history[0].outcome).toBe("hit");
    expect(second.scores.A).toBe(17);
    expect(second.currentTeam).toBe("B");
  });

  it("records every attempt in the log, not just the one that ended the round", () => {
    const after = guess(guess(start(), "Pokemon"), "Pokemon Red");
    expect(after.history.map((r) => r.outcome)).toEqual(["hit", "ambiguous"]);
    expect(new Set(after.history.map((r) => r.id)).size).toBe(2);
    // Both attempts belong to the same round.
    expect(new Set(after.history.map((r) => r.turn)).size).toBe(1);
  });
});

describe("inverted scoring", () => {
  it("pays the top of the list instead of the bottom", () => {
    const state = reducer(initialState(), {
      type: "start",
      settings: { ...DEFAULT_SETTINGS, listId: list.id, scoring: "inverted" },
    });
    const after = reducer(state, { type: "guess", text: "Tetris", list });
    expect(after.scores.A).toBe(list.items.length); // #1 in a 50-item list
  });
});
