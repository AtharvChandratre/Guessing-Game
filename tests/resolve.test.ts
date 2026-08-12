import { describe, it, expect } from "vitest";
import { resolveGuess, findMatch } from "@/lib/match";
import type { GameList } from "@/lib/types";
import { byId, expectRank, expectAmbiguous, expectNoMatch, matched } from "./helpers";

/** A throwaway list, for behaviours easier to state without real-world noise. */
const fixture = (names: (string | [string, string[]])[]): GameList => ({
  id: "fixture",
  name: "Fixture",
  category: "Test",
  blurb: "",
  source: { name: "test", url: "https://example.com", sourcedAt: "2026-08-11" },
  items: names.map((entry, i) =>
    typeof entry === "string"
      ? { rank: i + 1, name: entry }
      : { rank: i + 1, name: entry[0], aliases: entry[1] },
  ),
});

describe("pass 1: an exact name or alias", () => {
  it("beats every other interpretation", () => {
    // "godfather" is a fragment of #4 and the whole name of #2. #2 wins.
    expectRank("imdb-top-250", "The Godfather", 2);
    expectRank("imdb-top-250", "Godfather", 2);
  });

  it("wins even when a longer entry contains it", () => {
    expectRank("imdb-top-250", "Alien", 51);
    expectRank("imdb-top-250", "Aliens", 71);
    expectRank("best-selling-video-games", "Grand Theft Auto V", 3);
  });

  it("accepts declared aliases", () => {
    expectRank("companies-market-cap", "GOOG", 3);
    expectRank("companies-market-cap", "Google", 3);
    expectRank("countries-population", "USA", 3);
    expectRank("countries-population", "Burma", 29);
    expectRank("us-states-population", "CA", 1);
    expectRank("imdb-top-250", "Se7en", 20);
  });

  it("rejects an empty or punctuation-only guess", () => {
    expectNoMatch("imdb-top-250", "");
    expectNoMatch("imdb-top-250", "   ");
    expectNoMatch("imdb-top-250", "???");
  });
});

describe("pass 2: a distinctive phrase inside a longer name", () => {
  it("accepts the memorable part of a title", () => {
    expectRank("imdb-top-250", "Shawshank", 1);
    expectRank("imdb-top-250", "Empire Strikes Back", 15);
    expectRank("imdb-top-250", "Return of the King", 5);
    expectRank("best-selling-video-games", "Skyrim", 9);
    expectRank("imdb-top-250", "The Professional", 45);
  });

  it("requires whole words, not a substring", () => {
    const list = fixture(["Interstellar", "Parasite"]);
    // "stell" sits inside "interstellar" but is not a word of it.
    expect(matched(list, "stell")).toBeNull();
  });

  it("ignores fragments too short to be distinctive", () => {
    const list = fixture(["The Dark Knight"]);
    expect(matched(list, "dar")).toBeNull();
  });
});

describe("pass 3: typo tolerance", () => {
  it("forgives a slip in a name long enough to absorb it", () => {
    expectRank("imdb-top-250", "Interstelar", 17);
    expectRank("imdb-top-250", "Inglorious Basterds", 69);
    expectRank("countries-population", "Phillipines", 13);
    expectRank("countries-population", "Austrailia", 54);
    expectRank("companies-market-cap", "nvdia", 1);
  });

  it("forgives punctuation players cannot guess at", () => {
    expectRank("imdb-top-250", "Schindlers List", 7);
    expectRank("imdb-top-250", "Walle", 57);
    expectRank("imdb-top-250", "Oldboy", 85);
    expectRank("companies-market-cap", "Coca Cola", 40);
  });

  it("gives short names no typo budget at all", () => {
    // The protection this buys is worth more than the recall it costs: on the
    // country lists a one-letter budget would make Iran/Iraq, Mali/Malawi and
    // Chad/Chile interchangeable.
    expectRank("countries-population", "Iran", 17);
    expectRank("countries-population", "Iraq", 34);
    expectRank("countries-population", "Chad", 66);
    expectRank("countries-population", "Mali", 60);
    expectNoMatch("countries-population", "Irak");
  });

  it("never edits a number, so a sequel is never swapped for its neighbour", () => {
    // Without the digit guard, deleting " 2" is one cheap edit and "Godfather 3"
    // silently becomes Part II.
    expectNoMatch("imdb-top-250", "The Godfather Part III");
    expectNoMatch("imdb-top-250", "Godfather 3");
    expectNoMatch("imdb-top-250", "Toy Story 4");
    expectRank("imdb-top-250", "Toy Story 3", 92);

    const list = fixture(["Toy Story", "Toy Story 3"]);
    expect(matched(list, "Toy Story 2")).toBeNull();
  });
});

describe("sequel numbering end to end", () => {
  it("accepts every spelling of the same instalment", () => {
    for (const guess of [
      "The Godfather Part II",
      "The Godfather Part 2",
      "Godfather Part II",
      "Godfather II",
      "Godfather 2",
      "the godfather part 2",
    ]) {
      expectRank("imdb-top-250", guess, 4);
    }
  });

  it("keeps the two Godfathers apart", () => {
    expectRank("imdb-top-250", "The Godfather", 2);
    expectRank("imdb-top-250", "The Godfather Part II", 4);
  });

  it("matches a Star Wars episode whether the numeral leads or trails", () => {
    expectRank("imdb-top-250", "Star Wars: Episode V - The Empire Strikes Back", 15);
    expectRank("imdb-top-250", "Star Wars Episode 5", 15);
    expectRank("imdb-top-250", "Empire Strikes Back", 15);
  });
});

describe("a fragment that fits several entries", () => {
  it("reports ambiguity rather than guessing or refusing", () => {
    expectAmbiguous("best-selling-video-games", "Pokemon", 6);
    expectAmbiguous("best-selling-video-games", "Mario", 5);
    expectAmbiguous("best-selling-video-games", "Call of Duty", 5);
    expectAmbiguous("imdb-top-250", "Lord of the Rings", 3);
    expectAmbiguous("tallest-buildings", "Tower", 20);
  });

  it("returns the candidates it was torn between", () => {
    const result = resolveGuess(byId["best-selling-video-games"], "Pokemon");
    expect(result.kind).toBe("ambiguous");
    if (result.kind !== "ambiguous") return;
    expect(result.options.every((item) => /Pok/.test(item.name))).toBe(true);
  });

  it("resolves once all but one candidate has been claimed", () => {
    const list = byId["best-selling-video-games"];
    const pokemon = list.items.filter((item) => /^Pok/.test(item.name));
    expect(pokemon.length).toBeGreaterThan(1);

    const claimed: Record<number, boolean> = {};
    for (const item of pokemon.slice(0, -1)) claimed[item.rank] = true;

    const survivor = pokemon[pokemon.length - 1];
    expect(matched(list, "Pokemon", claimed)?.rank).toBe(survivor.rank);
  });

  it("reports a duplicate, not ambiguity, once every candidate is taken", () => {
    const list = byId["best-selling-video-games"];
    const pokemon = list.items.filter((item) => /^Pok/.test(item.name));
    const claimed = Object.fromEntries(pokemon.map((item) => [item.rank, true]));
    // The caller sees a match to a claimed rank, which reads as "already taken"
    // rather than sending the team round again on a fragment that cannot score.
    const result = resolveGuess(list, "Pokemon", claimed);
    expect(result.kind).toBe("match");
    if (result.kind === "match") expect(claimed[result.item.rank]).toBe(true);
  });

  it("never lets ambiguity override an exact name", () => {
    // "Mario Kart" fits two entries, but "Mario Kart Wii" is one entry's name.
    expectAmbiguous("best-selling-video-games", "Mario Kart");
    expectRank("best-selling-video-games", "Mario Kart Wii", 26);
  });
});

describe("claim awareness", () => {
  it("prefers an unclaimed entry when two share a name", () => {
    const list = byId["imdb-tv-top-250"];
    const offices = list.items.filter((item) => /^The Office/.test(item.name));
    expect(offices.length).toBe(2);

    const first = matched(list, "The Office", {})!;
    const second = matched(list, "The Office", { [first.rank]: true })!;
    expect(second.rank).not.toBe(first.rank);
    expect(new Set([first.rank, second.rank])).toEqual(
      new Set(offices.map((item) => item.rank)),
    );
  });

  it("still returns a claimed entry rather than pretending it is absent", () => {
    const list = byId["imdb-top-250"];
    const result = resolveGuess(list, "Pulp Fiction", { 9: true });
    expect(result.kind).toBe("match");
    if (result.kind === "match") expect(result.item.rank).toBe(9);
  });

  it("behaves identically when no claim state is supplied", () => {
    expect(findMatch(byId["imdb-top-250"], "Shawshank")?.rank).toBe(1);
    expect(findMatch(byId["imdb-top-250"], "Shawshank", {})?.rank).toBe(1);
  });
});

describe("cost", () => {
  it("resolves a worst-case guess on the largest list fast enough to feel instant", () => {
    const list = byId["imdb-top-250"];
    resolveGuess(list, "warm up the index");
    const started = performance.now();
    for (let i = 0; i < 500; i++) resolveGuess(list, `an unmatchable guess ${i}`);
    const perGuess = (performance.now() - started) / 500;
    expect(perGuess).toBeLessThan(5);
  });

  it("reuses its index across calls on the same list", () => {
    const list = byId["imdb-tv-top-250"];
    resolveGuess(list, "warm up");
    const started = performance.now();
    for (let i = 0; i < 5000; i++) resolveGuess(list, "Breaking Bad");
    expect(performance.now() - started).toBeLessThan(500);
  });
});
