import type { GameList, ListItem } from "./types";

/** Combining marks left behind by NFD decomposition. */
const DIACRITICS = new RegExp("[\\u0300-\\u036f]", "g");

const ROMAN_VALUES: Record<string, number> = { i: 1, v: 5, x: 10, l: 50, c: 100 };

/** Parse a lowercase roman numeral, or null if it is not one. */
function romanToNumber(token: string): number | null {
  if (!/^[ivxlc]+$/.test(token)) return null;
  let total = 0;
  for (let i = 0; i < token.length; i++) {
    const value = ROMAN_VALUES[token[i]];
    const next = ROMAN_VALUES[token[i + 1]];
    total += next && next > value ? -value : value;
  }
  return total;
}

/**
 * Canonicalize sequel numbering so every way of writing the same instalment
 * lands on one key: "The Godfather Part II", "Godfather Part 2" and
 * "Godfather II" all become "godfather 2".
 *
 * Applied to stored names and guesses alike, so a conversion that misreads a
 * title (Malcolm X) still matches itself - it only has to be consistent.
 */
function canonicalizeSequel(text: string): string {
  // "part 2", "chapter ii", "episode v" -> just the arabic number, wherever it
  // sits. Converting here as well as at the end keeps a mid-title numeral
  // ("Episode V - The Empire Strikes Back") in step with a trailing one.
  const withoutFiller = text.replace(
    /\b(?:part|pt|chapter|episode|volume|vol)\s+(\d+|[ivxlc]+)\b/g,
    (whole, token: string) => {
      if (/^\d+$/.test(token)) return token;
      const value = romanToNumber(token);
      return value === null ? whole : String(value);
    },
  );

  // A trailing roman numeral is a sequel number. Leading or mid-title ones are
  // left alone, so "V for Vendetta" keeps its V.
  return withoutFiller.replace(/\s([ivxlc]+)$/, (whole, token: string) => {
    if (token === "i") return whole; // "Rocky I" is rare; "I" as a word is not.
    const value = romanToNumber(token);
    return value === null ? whole : ` ${value}`;
  });
}

/**
 * Fold a guess down to a comparable key: lowercase, no accents, no punctuation,
 * no leading article, single-spaced, sequel numbering canonicalized.
 * "The Shawshank Redemption!" -> "shawshank redemption"
 */
export function normalize(raw: string): string {
  const base = raw
    .normalize("NFD")
    .replace(DIACRITICS, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    // Keep letters and digits from any script, so non-Latin names (Cyrillic,
    // Hangul, Arabic) survive instead of normalizing to an empty key.
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(the|a|an)\s+/, "");

  return canonicalizeSequel(base);
}

/** Levenshtein distance, capped early once it exceeds `max` so long strings stay cheap. */
function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  let curr = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    let rowBest = curr[0];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      rowBest = Math.min(rowBest, curr[j]);
    }
    if (rowBest > max) return max + 1;
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

/** The digits in a key, in order: "godfather 2" -> "2", "star wars 1977" -> "1977". */
const digitsOf = (text: string) => (text.match(/\d+/g) ?? []).join(" ");

/** Typo budget: none for very short names, growing slowly for longer ones. */
function tolerance(len: number): number {
  if (len <= 4) return 0;
  if (len <= 8) return 1;
  if (len <= 16) return 2;
  return 3;
}

type Candidate = { item: ListItem; keys: string[] };

/** Every accepted spelling of every item, precomputed once per list. */
function buildIndex(list: GameList): Candidate[] {
  return [...list.items]
    .sort((a, b) => a.rank - b.rank)
    .map((item) => ({
      item,
      keys: [item.name, ...(item.aliases ?? [])].map(normalize).filter(Boolean),
    }));
}

const indexCache = new WeakMap<GameList, Candidate[]>();

function getIndex(list: GameList): Candidate[] {
  let index = indexCache.get(list);
  if (!index) {
    index = buildIndex(list);
    indexCache.set(list, index);
  }
  return index;
}

/** True when `needle` appears in `key` on whole-word boundaries. */
function containsPhrase(key: string, needle: string): boolean {
  let from = 0;
  for (;;) {
    const at = key.indexOf(needle, from);
    if (at === -1) return false;
    const before = at === 0 || key[at - 1] === " ";
    const after = at + needle.length === key.length || key[at + needle.length] === " ";
    if (before && after) return true;
    from = at + 1;
  }
}

/**
 * Items whose name contains the guess as a whole phrase - how "shawshank" or
 * "empire strikes back" reach their full titles without curated nicknames.
 */
function phraseCandidates(index: Candidate[], needle: string): ListItem[] {
  if (needle.length < 4) return [];
  return index
    .filter(({ keys }) => keys.some((key) => containsPhrase(key, needle)))
    .map(({ item }) => item);
}

export type MatchResult =
  /** Resolved to a single entry. */
  | { kind: "match"; item: ListItem }
  /** A fragment several unclaimed entries answer to: "Pokemon", "Call of Duty". */
  | { kind: "ambiguous"; options: ListItem[] }
  | { kind: "none" };

/**
 * Resolve a typed guess against a list.
 *
 * Passes run in order of confidence: an exact name or alias, then a distinctive
 * phrase inside a longer name, then a fuzzy match for typos.
 *
 * An exact name that covers several entries (Grover Cleveland's two terms, both
 * Offices) prefers an unclaimed one, so typing it again reaches the second
 * entry. A *fragment* covering several entries is different: it is not a
 * definite answer, so it comes back ambiguous and the team gets another go
 * rather than being handed an entry it did not ask for.
 *
 * @param claimed Ranks already taken this game. Omit to ignore claim state.
 */
export function resolveGuess(
  list: GameList,
  guess: string,
  claimed?: Readonly<Record<number, unknown>>,
): MatchResult {
  const needle = normalize(guess);
  if (!needle) return { kind: "none" };

  const isClaimed = (item: ListItem) => claimed !== undefined && claimed[item.rank] !== undefined;
  const index = getIndex(list);

  let claimedExact: ListItem | null = null;
  for (const { item, keys } of index) {
    if (!keys.includes(needle)) continue;
    if (!isClaimed(item)) return { kind: "match", item };
    claimedExact ??= item;
  }
  if (claimedExact) return { kind: "match", item: claimedExact };

  const candidates = phraseCandidates(index, needle);
  if (candidates.length === 1) return { kind: "match", item: candidates[0] };
  if (candidates.length > 1) {
    const open = candidates.filter((item) => !isClaimed(item));
    // Down to one still-available entry, so the fragment is no longer ambiguous.
    if (open.length === 1) return { kind: "match", item: open[0] };
    if (open.length > 1) return { kind: "ambiguous", options: open };
    // Every candidate is taken: report one, which reads as a duplicate.
    return { kind: "match", item: candidates[0] };
  }

  const budget = tolerance(needle.length);
  if (budget === 0) return { kind: "none" };

  let best: ListItem | null = null;
  let bestDistance = budget + 1;
  let claimedBest: ListItem | null = null;
  let claimedBestDistance = budget + 1;

  const needleDigits = digitsOf(needle);

  for (const { item, keys } of index) {
    for (const key of keys) {
      // Typos are letters, not numbers. Without this, "Godfather 3" quietly
      // becomes Part II and "Toy Story 4" becomes Toy Story 3.
      if (digitsOf(key) !== needleDigits) continue;
      const distance = editDistance(needle, key, budget);
      if (isClaimed(item)) {
        if (distance < claimedBestDistance) {
          claimedBest = item;
          claimedBestDistance = distance;
        }
      } else if (distance < bestDistance) {
        best = item;
        bestDistance = distance;
      }
    }
  }

  const fuzzy = best ?? claimedBest;
  return fuzzy ? { kind: "match", item: fuzzy } : { kind: "none" };
}

/** Convenience wrapper for callers that only care whether a guess lands. */
export function findMatch(
  list: GameList,
  guess: string,
  claimed?: Readonly<Record<number, unknown>>,
): ListItem | null {
  const result = resolveGuess(list, guess, claimed);
  return result.kind === "match" ? result.item : null;
}
