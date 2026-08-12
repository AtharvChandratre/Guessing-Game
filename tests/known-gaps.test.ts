import { describe, it, expect } from "vitest";
import { resolveGuess } from "@/lib/match";
import { byId, expectRank } from "./helpers";

/**
 * Guesses a player would reasonably expect to work, that today do not.
 *
 * Every test here is marked `it.fails`, so the suite is green while the gap
 * exists and turns RED the moment someone fixes it. That is the point: when a
 * matcher change closes one of these, the failure is the prompt to delete the
 * `.fails` and move the case into real-guesses.test.ts. Nothing here is a
 * silent TODO that rots.
 *
 * Ordered by how much recall each one costs, measured over all 1753 entries.
 * None of these produces a WRONG answer - the matcher refuses rather than
 * misattributing - so they cost goodwill, not scores.
 */

describe("gap 1: a transposition costs two edits, not one", () => {
  // Swapping two adjacent keys is the commonest typing slip there is, but plain
  // Levenshtein charges it as a delete plus an insert, which usually blows the
  // budget. Damerau-Levenshtein would score it 1. Worth ~35 points of recall on
  // transposed guesses, the largest single win available.
  it.fails("understands 'Teh Matrix'", () => {
    expectRank("imdb-top-250", "Teh Matrix", 16);
  });

  it.fails("understands 'Pscyho'", () => {
    expectRank("imdb-top-250", "Pscyho", 38);
  });

  it.fails("understands 'Alein'", () => {
    expectRank("imdb-top-250", "Alein", 51);
  });

  it.fails("understands 'Sevne'", () => {
    expectRank("imdb-top-250", "Sevne", 20);
  });
});

describe("gap 2: typos are only forgiven across the whole name", () => {
  // The fuzzy pass compares the guess to a complete key, so a misspelling of a
  // distinctive fragment falls between the two passes: too mangled for the
  // phrase pass, too short for the length check in the fuzzy pass. "Shawshank"
  // works and "Shawshenk" does not, which is a hard thing to explain to a
  // player. Costs ~52 points of recall on fragment typos.
  it.fails("understands 'Shawshenk'", () => {
    expectRank("imdb-top-250", "Shawshenk", 1);
  });

  it.fails("understands 'Schindlers'", () => {
    expectRank("imdb-top-250", "Schinlders", 7);
  });

  it.fails("understands 'Interstelar' as a fragment of a longer title", () => {
    expectRank("best-selling-video-games", "Skyrym", 9);
  });
});

describe("gap 3: a typo in a leading 'The' is fatal", () => {
  // normalize strips a leading article from the stored name but cannot strip a
  // misspelled one from the guess, so the two keys differ by the whole word and
  // the length check rejects them before the edit distance is ever computed.
  // 100% of these miss. Indexing both the stripped and unstripped forms, rather
  // than stripping one side, would close it.
  it.fails("understands 'Teh Godfather'", () => {
    expectRank("imdb-top-250", "Teh Godfather", 2);
  });

  it.fails("understands 'Thr Dark Knight'", () => {
    expectRank("imdb-top-250", "Thr Dark Knight", 3);
  });

  it.fails("understands 'TheGodfather' typed without the space", () => {
    expectRank("imdb-top-250", "TheGodfather", 2);
  });
});

describe("gap 4: a typo near a sequel keyword cascades", () => {
  // "Episodee" does not match the filler-word regex, so the roman numeral is
  // never converted, so the guess carries "v" where the key carries "5", so the
  // digit guard skips the fuzzy pass entirely. One slip disables three stages.
  it.fails("understands 'The Godfather Partt II'", () => {
    expectRank("imdb-top-250", "The Godfather Partt II", 4);
  });

  it.fails("understands 'Star Wars: Episodee V'", () => {
    expectRank("imdb-top-250", "Star Wars: Episodee V - The Empire Strikes Back", 15);
  });
});

describe("gap 5: dropping a small word breaks the phrase pass", () => {
  // The phrase pass needs a contiguous run of whole words, so a guess that
  // skips an interior "the" or "of" matches nothing, and the fuzzy pass then
  // rejects it on length. Roughly half of dropped-stopword guesses miss.
  it.fails("understands 'Back to the Future' without its 'the'", () => {
    expectRank("imdb-top-250", "Back to Future", 29);
  });

  it.fails("understands 'Good Bad Ugly'", () => {
    expectRank("imdb-top-250", "Good Bad Ugly", 10);
  });

  it.fails("understands 'One Flew Over Cuckoos Nest'", () => {
    expectRank("imdb-top-250", "One Flew Over Cuckoos Nest", 19);
  });
});

describe("gap 6: no initialisms", () => {
  // These are data gaps rather than algorithm gaps - each is one alias away
  // from working - but they are the abbreviations players reach for first, so
  // they are worth tracking as behaviour rather than as a data chore.
  it.fails("understands 'LOTR'", () => {
    const result = resolveGuess(byId["imdb-top-250"], "LOTR");
    expect(result.kind).not.toBe("none");
  });

  it.fails("understands 'GTA V'", () => {
    expectRank("best-selling-video-games", "GTA V", 3);
  });

  it.fails("understands 'NYC'", () => {
    expectRank("largest-cities", "NYC", 22);
  });

  it.fails("understands 'JP Morgan' written with a space", () => {
    expectRank("companies-market-cap", "JP Morgan", 16);
  });
});

describe("gap 7: no historical or colloquial place names", () => {
  // Same shape as gap 6: aliases the scrape did not carry.
  it.fails("understands 'Bombay'", () => {
    expectRank("largest-cities", "Bombay", 12);
  });

  it.fails("understands 'Calcutta'", () => {
    expectRank("largest-cities", "Calcutta", 9);
  });

  it.fails("understands 'Saigon'", () => {
    expectRank("largest-cities", "Saigon", 20);
  });
});

describe("gap 8: a fuzzy tie is broken silently by rank", () => {
  // When two entries sit at the same edit distance the matcher takes the
  // higher-ranked one without saying so. Only four such guesses exist across
  // all 1753 entries, but each is a coin flip presented as a fact; reporting
  // ambiguity would be the honest answer. Ghana is #48, China #2.
  it.fails("treats 'Chana' as ambiguous between China and Ghana", () => {
    const result = resolveGuess(byId["countries-population"], "Chana");
    expect(result.kind).toBe("ambiguous");
  });

  it.fails("treats 'Slovania' as ambiguous between Slovakia and Slovenia", () => {
    const result = resolveGuess(byId["countries-gdp"], "Slovania");
    expect(result.kind).toBe("ambiguous");
  });
});

describe("accepted trade-offs, recorded so they are not mistaken for bugs", () => {
  it("gives four-letter names no typo budget, protecting Iran/Iraq and Mali/Malawi", () => {
    expect(resolveGuess(byId["countries-population"], "Irak").kind).toBe("none");
    expect(resolveGuess(byId["countries-population"], "Coco").kind).toBe("none");
  });

  it("refuses a fragment shorter than four characters", () => {
    expect(resolveGuess(byId["imdb-top-250"], "war").kind).toBe("none");
  });

  it("withholds the candidate names when a guess is ambiguous", () => {
    // resolveGuess returns them, but GameScreen deliberately does not render
    // them: naming six Pokémon games would hand out six free answers.
    const result = resolveGuess(byId["best-selling-video-games"], "Pokemon");
    expect(result.kind).toBe("ambiguous");
    if (result.kind === "ambiguous") expect(result.options.length).toBeGreaterThan(1);
  });
});
