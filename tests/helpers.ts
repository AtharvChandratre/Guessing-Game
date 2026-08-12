import { expect } from "vitest";
import { resolveGuess, normalize } from "@/lib/match";
import { LISTS } from "@/data/lists";
import type { GameList, ListItem } from "@/lib/types";

export const byId = Object.fromEntries(LISTS.map((list) => [list.id, list])) as Record<
  string,
  GameList
>;

/** Every accepted spelling of an item, as the matcher sees them. */
export const keysOf = (item: ListItem): string[] =>
  [item.name, ...(item.aliases ?? [])].map(normalize).filter(Boolean);

/** The item a guess landed on, or null for ambiguous/none. Keeps assertions terse. */
export function matched(list: GameList, guess: string, claimed?: Record<number, unknown>) {
  const result = resolveGuess(list, guess, claimed);
  return result.kind === "match" ? result.item : null;
}

/**
 * Assert a guess lands on a specific rank. Failure messages name what came back
 * instead, since "expected 5, got null" is useless when a list has 250 entries.
 */
export function expectRank(listId: string, guess: string, rank: number) {
  const list = byId[listId];
  const result = resolveGuess(list, guess);
  const got =
    result.kind === "match"
      ? `#${result.item.rank} ${result.item.name}`
      : result.kind === "ambiguous"
        ? `ambiguous between ${result.options.map((o) => o.name).join(", ")}`
        : "no match";
  const want = list.items.find((item) => item.rank === rank);
  expect(got, `"${guess}" in ${listId} should be #${rank} ${want?.name}`).toBe(
    `#${rank} ${want?.name}`,
  );
}

export function expectAmbiguous(listId: string, guess: string, atLeast = 2) {
  const result = resolveGuess(byId[listId], guess);
  expect(result.kind, `"${guess}" in ${listId}`).toBe("ambiguous");
  if (result.kind === "ambiguous") expect(result.options.length).toBeGreaterThanOrEqual(atLeast);
}

export function expectNoMatch(listId: string, guess: string) {
  const result = resolveGuess(byId[listId], guess);
  const got =
    result.kind === "match" ? `#${result.item.rank} ${result.item.name}` : result.kind;
  expect(got, `"${guess}" in ${listId} should not match anything`).toBe("none");
}

/**
 * Deterministic PRNG. The generative tests perturb 1753 real names, so they need
 * to be reproducible: a flaky recall figure is worse than no recall figure.
 */
export function makeRandom(seed: number) {
  let state = seed;
  return () => (state = (state * 1103515245 + 12345) % 2147483648) / 2147483648;
}

/** Single-keystroke slips, the errors players actually make. */
export const typos = {
  /** Hit the neighbouring key: "parasite" -> "porasite". */
  substitute: (text: string, rnd: () => number) => {
    const i = pickLetter(text, rnd);
    return i < 0 ? text : text.slice(0, i) + (text[i] === "a" ? "o" : "a") + text.slice(i + 1);
  },
  /** Miss a key: "parasite" -> "parasie". */
  drop: (text: string, rnd: () => number) => {
    const i = pickLetter(text, rnd);
    return i < 0 ? text : text.slice(0, i) + text.slice(i + 1);
  },
  /** Hit a key twice: "parasite" -> "parrasite". */
  double: (text: string, rnd: () => number) => {
    const i = pickLetter(text, rnd);
    return i < 0 ? text : text.slice(0, i) + text[i] + text.slice(i);
  },
  /** Type two keys out of order: "the" -> "teh". The commonest slip of all. */
  transpose: (text: string, rnd: () => number) => {
    for (let attempt = 0; attempt < 8; attempt++) {
      const i = pickLetter(text, rnd);
      if (i < 0 || i + 1 >= text.length) continue;
      if (text[i] === " " || text[i + 1] === " " || text[i] === text[i + 1]) continue;
      return text.slice(0, i) + text[i + 1] + text[i] + text.slice(i + 2);
    }
    return text;
  },
};

function pickLetter(text: string, rnd: () => number): number {
  for (let attempt = 0; attempt < 8; attempt++) {
    const i = Math.floor(rnd() * text.length);
    if (text[i] !== " ") return i;
  }
  return -1;
}

/**
 * How a perturbed guess turned out, from the player's point of view.
 *
 * "elsewhere" is not necessarily a bug: "godfather" derived from "The Godfather
 * Part II" correctly lands on "The Godfather", which owns that name outright.
 * Only a landing that no key justifies counts as `wrong`.
 */
export type Verdict = "found" | "ambiguous" | "elsewhere" | "wrong" | "missed";

export function verdict(list: GameList, source: ListItem, guess: string): Verdict {
  const result = resolveGuess(list, guess);
  if (result.kind === "none") return "missed";
  if (result.kind === "ambiguous") return "ambiguous";
  if (result.item.rank === source.rank) return "found";
  return keysOf(result.item).includes(normalize(guess)) ? "elsewhere" : "wrong";
}

/** Share of guesses the player would consider "the game understood me". */
export function recall(verdicts: Verdict[]): number {
  const good = verdicts.filter((v) => v === "found" || v === "ambiguous" || v === "elsewhere");
  return good.length / verdicts.length;
}
