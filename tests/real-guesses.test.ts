import { describe, it, expect } from "vitest";
import { LISTS } from "@/data/lists";
import { resolveGuess, normalize } from "@/lib/match";
import { expectRank, expectAmbiguous, makeRandom, typos, verdict, recall } from "./helpers";
import type { Verdict } from "./helpers";

/**
 * How people actually type, list by list. These are the cases worth protecting:
 * a regression here is a player being told their correct answer is wrong.
 */

describe("films", () => {
  it("accepts the short name everyone uses", () => {
    expectRank("imdb-top-250", "Shawshank", 1);
    expectRank("imdb-top-250", "Dark Knight", 3);
    expectRank("imdb-top-250", "Return of the King", 5);
    expectRank("imdb-top-250", "Empire Strikes Back", 15);
    expectRank("imdb-top-250", "A New Hope", 30);
    expectRank("imdb-top-250", "Django", 50);
    expectRank("imdb-top-250", "Cinema Paradiso", 46);
    expectRank("imdb-top-250", "Silence of the Lambs", 22);
  });

  it("accepts titles typed without their punctuation", () => {
    expectRank("imdb-top-250", "Schindlers List", 7);
    expectRank("imdb-top-250", "One Flew Over the Cuckoos Nest", 19);
    expectRank("imdb-top-250", "The Good the Bad and the Ugly", 10);
    expectRank("imdb-top-250", "2001 A Space Odyssey", 106);
    expectRank("imdb-top-250", "Wall E", 57);
    expectRank("imdb-top-250", "WALL-E", 57);
    expectRank("imdb-top-250", "Walle", 57);
  });

  it("accepts accented titles typed in plain ASCII", () => {
    expectRank("imdb-top-250", "Amelie", 116);
    expectRank("imdb-top-250", "Leon the Professional", 45);
    expectRank("imdb-top-250", "Il buono il brutto il cattivo", 10);
  });

  it("accepts common misspellings", () => {
    expectRank("imdb-top-250", "Inglorious Basterds", 69);
    expectRank("imdb-top-250", "Interstelar", 17);
    expectRank("imdb-top-250", "Parasit", 35);
  });

  it("accepts either spelling of a stylised title", () => {
    expectRank("imdb-top-250", "Se7en", 20);
    expectRank("imdb-top-250", "Seven", 20);
  });

  it("keeps a film and its sequel distinct", () => {
    expectRank("imdb-top-250", "Alien", 51);
    expectRank("imdb-top-250", "Aliens", 71);
    expectRank("imdb-top-250", "Toy Story", 78);
    expectRank("imdb-top-250", "Toy Story 3", 92);
    expectRank("imdb-top-250", "Terminator 2", 28);
  });

  it("flags a franchise name as ambiguous instead of picking a favourite", () => {
    expectAmbiguous("imdb-top-250", "Lord of the Rings", 3);
    expectAmbiguous("imdb-top-250", "Spider-Man", 3);
    expectAmbiguous("imdb-top-250", "Avengers", 2);
    expectAmbiguous("imdb-top-250", "Kill Bill", 2);
    expectAmbiguous("highest-grossing-films", "Jurassic", 2);
  });

  it("lets a curated alias settle a franchise name that would otherwise be ambiguous", () => {
    // Three Star Wars films are on the list, but the 1977 original is also
    // called plain "Star Wars", and an exact alias outranks a fragment.
    expectRank("imdb-top-250", "Star Wars", 30);
  });
});

describe("television", () => {
  it("disambiguates two shows with the same title by claim order", () => {
    const list = LISTS.find((l) => l.id === "imdb-tv-top-250")!;
    const first = resolveGuess(list, "The Office");
    expect(first.kind).toBe("match");
    if (first.kind !== "match") return;
    const second = resolveGuess(list, "The Office", { [first.item.rank]: true });
    expect(second.kind).toBe("match");
    if (second.kind === "match") expect(second.item.rank).not.toBe(first.item.rank);
  });

  it("accepts the bare title of a year-stamped entry", () => {
    for (const guess of ["Twin Peaks", "Dragon Ball Z", "Dragon Ball", "Mahabharat"]) {
      const list = LISTS.find((l) => l.id === "imdb-tv-top-250")!;
      const result = resolveGuess(list, guess);
      expect(result.kind, `"${guess}"`).toBe("match");
    }
  });
});

describe("countries", () => {
  it("accepts the name people say rather than the name on the list", () => {
    expectRank("countries-population", "America", 3);
    expectRank("countries-population", "USA", 3);
    expectRank("countries-population", "Britain", 21);
    expectRank("countries-population", "UK", 21);
    expectRank("countries-population", "Holland", 71);
    expectRank("countries-population", "Burma", 29);
    expectRank("countries-population", "Cote d'Ivoire", 49);
    expectRank("countries-population", "Czechia", 87);
    expectRank("countries-population", "UAE", 86);
  });

  it("keeps countries with confusable names apart", () => {
    expectRank("countries-population", "Niger", 55);
    expectRank("countries-population", "Nigeria", 6);
    expectRank("countries-population", "Austria", 98);
    expectRank("countries-population", "Australia", 54);
    expectRank("countries-population", "Sudan", 28);
    expectRank("countries-population", "South Sudan", 76);
    expectRank("countries-population", "Iran", 17);
    expectRank("countries-population", "Iraq", 34);
  });

  it("flags an ambiguous Congo", () => {
    expectRank("countries-population", "DR Congo", 12);
  });
});

describe("companies", () => {
  it("accepts the brand, the legal name and the ticker", () => {
    expectRank("companies-market-cap", "Google", 3);
    expectRank("companies-market-cap", "Alphabet", 3);
    expectRank("companies-market-cap", "GOOG", 3);
    expectRank("companies-market-cap", "Facebook", 10);
    expectRank("companies-market-cap", "Meta", 10);
    expectRank("companies-market-cap", "Apple", 2);
    expectRank("companies-market-cap", "AAPL", 2);
    expectRank("companies-market-cap", "Berkshire", 13);
    expectRank("companies-market-cap", "Aramco", 9);
    expectRank("companies-market-cap", "Exxon", 22);
  });
});

describe("games", () => {
  it("accepts the sub-title everyone calls the game by", () => {
    expectRank("best-selling-video-games", "Skyrim", 9);
    expectRank("best-selling-video-games", "Witcher 3", 10);
    expectRank("best-selling-video-games", "Red Dead Redemption 2", 4);
    expectRank("best-selling-video-games", "Grand Theft Auto 5", 3);
  });

  it("flags a franchise rather than picking an instalment", () => {
    expectAmbiguous("best-selling-video-games", "Pokemon", 6);
    expectAmbiguous("best-selling-video-games", "Mario", 5);
    expectAmbiguous("best-selling-video-games", "Call of Duty", 5);
    expectAmbiguous("best-selling-video-games", "Grand Theft Auto", 3);
  });
});

describe("websites", () => {
  it("accepts the site by the name people call it", () => {
    expectRank("most-visited-websites", "YouTube", 2);
    expectRank("most-visited-websites", "Facebook", 3);
    expectRank("most-visited-websites", "ChatGPT", 5);
    expectRank("most-visited-websites", "Reddit", 7);
    expectRank("most-visited-websites", "Wikipedia", 11);
    expectRank("most-visited-websites", "Netflix", 20);
  });

  it("accepts the domain, since half of these are known by it", () => {
    expectRank("most-visited-websites", "google.com", 1);
    expectRank("most-visited-websites", "youtube.com", 2);
    expectRank("most-visited-websites", "bbc.co.uk", 49);
    expectRank("most-visited-websites", "t.me", 44);
  });

  it("accepts the name people still use for a renamed site", () => {
    expectRank("most-visited-websites", "Twitter", 6);
    expectRank("most-visited-websites", "X", 6);
  });

  it("keeps the three Yahoo entries apart", () => {
    expectRank("most-visited-websites", "Yahoo!", 13);
    expectRank("most-visited-websites", "Yahoo", 13);
    expectRank("most-visited-websites", "Yahoo Japan", 12);
    expectRank("most-visited-websites", "Yahoo! News Japan", 38);
  });

  it("resolves a site whose name is a fragment of a longer one", () => {
    // "Microsoft" is an entry outright and a prefix of two others.
    expectRank("most-visited-websites", "Microsoft", 32);
    expectRank("most-visited-websites", "Microsoft Bing", 8);
    expectRank("most-visited-websites", "Bing", 8);
    expectRank("most-visited-websites", "Google Search", 1);
  });
});

describe("android apps", () => {
  it("accepts the app by the name on the icon", () => {
    expectRank("android-most-downloaded", "WhatsApp", 14);
    expectRank("android-most-downloaded", "Instagram", 25);
    expectRank("android-most-downloaded", "Snapchat", 42);
    expectRank("android-most-downloaded", "TikTok", 58);
    expectRank("android-most-downloaded", "Spotify", 68);
    expectRank("android-most-downloaded", "Subway Surfers", 36);
  });

  it("accepts the short name of an app whose listing carries a tagline", () => {
    expectRank("android-most-downloaded", "Truecaller", 95);
    expectRank("android-most-downloaded", "Viber", 78);
    expectRank("android-most-downloaded", "Picsart", 96);
    expectRank("android-most-downloaded", "Microsoft Word", 43);
    expectRank("android-most-downloaded", "Excel", 47);
  });

  it("accepts the name people still use for a renamed app", () => {
    expectRank("android-most-downloaded", "Twitter", 60);
    expectRank("android-most-downloaded", "X", 60);
    expectRank("android-most-downloaded", "Mi Drop", 76);
  });

  it("flags a publisher prefix shared by many entries", () => {
    // Thirty-four entries are Google apps, so the bare word cannot be an answer.
    expectAmbiguous("android-most-downloaded", "Google", 30);
    expectAmbiguous("android-most-downloaded", "Google Play", 4);
    expectAmbiguous("android-most-downloaded", "Calculator", 3);
  });

  it("still resolves a Google app named in full", () => {
    expectRank("android-most-downloaded", "Google Maps", 3);
    expectRank("android-most-downloaded", "Gmail", 7);
    expectRank("android-most-downloaded", "Google Chrome", 6);
    expectRank("android-most-downloaded", "Chrome", 6);
  });
});

describe("people and places", () => {
  it("accepts footballers by surname and without accents", () => {
    expectRank("football-goalscorers", "Ronaldo", 1);
    expectRank("football-goalscorers", "Messi", 4);
    expectRank("football-goalscorers", "Pele", 11);
    expectRank("football-goalscorers", "Puskas", 7);
    expectRank("football-goalscorers", "Ibrahimovic", 32);
  });

  it("accepts states by postal abbreviation", () => {
    expectRank("us-states-population", "CA", 1);
    expectRank("us-states-population", "NY", 4);
    expectRank("us-states-population", "TX", 2);
  });

  it("flags a building fragment shared by dozens of entries", () => {
    expectAmbiguous("tallest-buildings", "Tower", 20);
    expectRank("tallest-buildings", "Burj Khalifa", 1);
  });
});

/**
 * Recall floors, measured across every entry of every list.
 *
 * These are deliberately regression guards rather than targets: each floor sits
 * just under the rate the matcher achieves today, so a change that quietly
 * makes the game stricter fails the build. Raising a floor after an improvement
 * is the intended way to edit this block. The gaps behind the lower numbers are
 * catalogued in known-gaps.test.ts.
 */
describe("recall across all 1753 entries", () => {
  const sample = (mutate: (text: string, rnd: () => number) => string, seed: number) => {
    const rnd = makeRandom(seed);
    const verdicts: Verdict[] = [];
    const missed: string[] = [];
    for (const list of LISTS) {
      for (const item of list.items) {
        const guess = mutate(item.name, rnd);
        if (normalize(guess) === normalize(item.name)) continue;
        const v = verdict(list, item, guess);
        verdicts.push(v);
        if (v === "missed" || v === "wrong") missed.push(`${list.id}: "${guess}" <- ${item.name}`);
      }
    }
    return { verdicts, missed };
  };

  it("understands a name typed with one wrong letter at least 90% of the time", () => {
    const { verdicts } = sample(typos.substitute, 1);
    expect(recall(verdicts)).toBeGreaterThan(0.9);
  });

  it("understands a name typed with one doubled letter at least 93% of the time", () => {
    const { verdicts } = sample(typos.double, 2);
    expect(recall(verdicts)).toBeGreaterThan(0.93);
  });

  it("understands a name typed with one missing letter at least 84% of the time", () => {
    const { verdicts } = sample(typos.drop, 3);
    expect(recall(verdicts)).toBeGreaterThan(0.84);
  });

  it("understands a name with two letters swapped at least 57% of the time", () => {
    // Low because Levenshtein charges a transposition two edits. See
    // known-gaps.test.ts: this is the single biggest recall win available.
    const { verdicts } = sample(typos.transpose, 4);
    expect(recall(verdicts)).toBeGreaterThan(0.57);
  });

  it("almost never hands back an entry the player did not ask for", () => {
    // Refusing a correct guess annoys players; awarding the wrong entry
    // corrupts the score. The second must stay far rarer than the first.
    const all: Verdict[] = [];
    for (const [mutate, seed] of [
      [typos.substitute, 11],
      [typos.drop, 12],
      [typos.double, 13],
      [typos.transpose, 14],
    ] as const) {
      all.push(...sample(mutate, seed).verdicts);
    }
    const wrong = all.filter((v) => v === "wrong").length;
    expect(wrong / all.length).toBeLessThan(0.005);
  });
});
