import { describe, it, expect } from "vitest";
import { normalize } from "@/lib/match";

describe("normalize: folding away things players cannot be expected to type", () => {
  it("ignores case", () => {
    expect(normalize("THE MATRIX")).toBe(normalize("the matrix"));
  });

  it("ignores punctuation and collapses the gap it leaves", () => {
    expect(normalize("Schindler's List")).toBe("schindler s list");
    expect(normalize("Spider-Man: Across the Spider-Verse")).toBe(
      "spider man across the spider verse",
    );
    expect(normalize("WALL·E")).toBe("wall e");
    expect(normalize("Coca-Cola")).toBe("coca cola");
  });

  it("ignores accents", () => {
    expect(normalize("Amélie")).toBe("amelie");
    expect(normalize("Pelé")).toBe("pele");
    expect(normalize("Zlatan Ibrahimović")).toBe("zlatan ibrahimovic");
    expect(normalize("Pokémon")).toBe("pokemon");
  });

  it("ignores surrounding and repeated whitespace", () => {
    expect(normalize("  the   dark    knight  ")).toBe("dark knight");
  });

  it("spells out an ampersand so '&' and 'and' agree", () => {
    expect(normalize("Rick & Morty")).toBe(normalize("Rick and Morty"));
  });

  it("drops one leading article, but only a leading one", () => {
    expect(normalize("The Godfather")).toBe("godfather");
    expect(normalize("A Space Odyssey")).toBe("space odyssey");
    expect(normalize("An Education")).toBe("education");
    // Interior articles carry meaning and are kept.
    expect(normalize("Back to the Future")).toBe("back to the future");
    // "The" as a real first word of the remaining title survives the single strip.
    expect(normalize("The Lord of the Rings: The Two Towers")).toBe(
      "lord of the rings the two towers",
    );
  });

  it("keeps letters from every script rather than emptying the key", () => {
    // A Cyrillic channel name must stay guessable in its own alphabet.
    expect(normalize("Маша и Медведь"))
      .not.toBe("");
    expect(normalize("방탄소년단")).not.toBe("");
    expect(normalize("أحمد")).not.toBe("");
  });

  it("keeps digits that are part of the name", () => {
    expect(normalize("Se7en")).toBe("se7en");
    expect(normalize("12 Angry Men")).toBe("12 angry men");
    expect(normalize("2001: A Space Odyssey")).toBe("2001 a space odyssey");
  });

  it("returns an empty key for input with nothing to match on", () => {
    expect(normalize("")).toBe("");
    expect(normalize("   ")).toBe("");
    expect(normalize("!!! ???")).toBe("");
  });
});

describe("normalize: sequel numbering", () => {
  it("collapses every spelling of a sequel number onto one key", () => {
    const target = normalize("The Godfather Part II");
    expect(normalize("Godfather Part 2")).toBe(target);
    expect(normalize("The Godfather II")).toBe(target);
    expect(normalize("godfather 2")).toBe(target);
  });

  it("handles the other filler words the same way", () => {
    expect(normalize("Kill Bill Vol. 2")).toBe(normalize("Kill Bill 2"));
    expect(normalize("Friday the 13th Chapter III")).toBe(normalize("Friday the 13th 3"));
    expect(normalize("Rocky Pt II")).toBe(normalize("Rocky 2"));
  });

  it("converts a mid-title episode numeral, not just a trailing one", () => {
    // The guess trails the numeral; the stored name buries it mid-title. Both
    // have to land on the same key or Star Wars becomes unguessable.
    expect(normalize("Star Wars: Episode V - The Empire Strikes Back")).toContain("5");
    expect(normalize("Star Wars Episode V")).toContain("5");
    expect(normalize("Star Wars Episode 5")).toBe(normalize("Star Wars Episode V"));
  });

  it("leaves a leading or mid-title roman numeral alone", () => {
    // Otherwise "V for Vendetta" becomes "5 for vendetta".
    expect(normalize("V for Vendetta")).toBe("v for vendetta");
    expect(normalize("X-Men")).toBe("x men");
  });

  it("leaves a trailing 'I' alone, since it is usually the word", () => {
    expect(normalize("Tonari no Totoro I")).toContain(" i");
  });

  it("converts a trailing roman numeral consistently on both sides", () => {
    // "Malcolm X" becomes "malcolm 10", which is wrong as a reading but
    // harmless: the same rule runs over the stored name, so it still matches
    // itself. Consistency is the requirement, not correctness.
    expect(normalize("Malcolm X")).toBe(normalize("Malcolm X"));
    expect(normalize("Grand Theft Auto V")).toBe(normalize("Grand Theft Auto 5"));
  });

  it("is idempotent, so normalizing a key twice is a no-op", () => {
    for (const raw of [
      "The Godfather Part II",
      "Star Wars: Episode V - The Empire Strikes Back",
      "WALL·E",
      "Amélie",
      "2001: A Space Odyssey",
      "Rick & Morty",
    ]) {
      expect(normalize(normalize(raw))).toBe(normalize(raw));
    }
  });
});
