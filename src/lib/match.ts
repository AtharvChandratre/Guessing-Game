import type { GameList, ListItem } from "./types";

/** Combining marks left behind by NFD decomposition. */
const DIACRITICS = new RegExp("[\\u0300-\\u036f]", "g");

/**
 * Fold a guess down to a comparable key: lowercase, no accents, no punctuation,
 * no leading article, single-spaced. "The Shawshank Redemption!" -> "shawshank redemption"
 */
export function normalize(raw: string): string {
  return raw
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
 * Returns null unless exactly one item matches, so an ambiguous fragment like
 * "godfather" asks the team to be more specific instead of picking for them.
 */
function uniquePhraseMatch(
  index: Candidate[],
  needle: string,
  isClaimed: (item: ListItem) => boolean,
): ListItem | null {
  if (needle.length < 4) return null;

  const hits: ListItem[] = [];
  for (const { item, keys } of index) {
    if (keys.some((key) => containsPhrase(key, needle))) hits.push(item);
  }
  if (hits.length === 0) return null;
  if (hits.length === 1) return hits[0];

  // Several items contain the phrase. Only resolve it if all but one are
  // already claimed, which keeps repeat guesses of the same fragment working.
  const open = hits.filter((item) => !isClaimed(item));
  return open.length === 1 ? open[0] : null;
}

/**
 * Resolve a typed guess to a list entry, or null if nothing is close enough.
 *
 * Exact matches always win over fuzzy ones. When one name covers several entries
 * (Grover Cleveland's two terms), an unclaimed entry is preferred over a claimed
 * one, so typing the name a second time reaches the second entry rather than
 * bouncing off the first as a duplicate. Otherwise the lowest rank wins.
 *
 * @param claimed Ranks already taken this game. Omit to ignore claim state.
 */
export function findMatch(
  list: GameList,
  guess: string,
  claimed?: Readonly<Record<number, unknown>>,
): ListItem | null {
  const needle = normalize(guess);
  if (!needle) return null;

  const isClaimed = (item: ListItem) => claimed !== undefined && claimed[item.rank] !== undefined;
  const index = getIndex(list);

  let claimedExact: ListItem | null = null;
  for (const { item, keys } of index) {
    if (!keys.includes(needle)) continue;
    if (!isClaimed(item)) return item;
    claimedExact ??= item;
  }
  if (claimedExact) return claimedExact;

  const phrase = uniquePhraseMatch(index, needle, isClaimed);
  if (phrase) return phrase;

  const budget = tolerance(needle.length);
  if (budget === 0) return null;

  let best: ListItem | null = null;
  let bestDistance = budget + 1;
  let claimedBest: ListItem | null = null;
  let claimedBestDistance = budget + 1;

  for (const { item, keys } of index) {
    for (const key of keys) {
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

  return best ?? claimedBest;
}
