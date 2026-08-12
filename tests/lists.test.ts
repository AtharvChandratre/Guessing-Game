import { describe, it, expect } from "vitest";
import { LISTS } from "@/data/lists";
import { resolveGuess, normalize } from "@/lib/match";
import { keysOf } from "./helpers";

/**
 * Properties that must hold for every entry of every shipped list.
 *
 * The failure these guard against is the one that makes players angry: typing a
 * name that really is on the list and being told it is not. Every one of these
 * runs across all 1753 entries, so a bad scrape or a normalization change that
 * strands a name shows up here rather than mid-game.
 */
describe.each(LISTS.map((list) => [list.id, list] as const))("%s", (_id, list) => {
  it("has gapless ranks from 1 to N", () => {
    const ranks = list.items.map((item) => item.rank).sort((a, b) => a - b);
    expect(ranks).toEqual(Array.from({ length: list.items.length }, (_, i) => i + 1));
  });

  it("gives every entry a name that survives normalization", () => {
    const empty = list.items.filter((item) => normalize(item.name) === "");
    expect(empty.map((item) => `#${item.rank} ${item.name}`)).toEqual([]);
  });

  it("resolves every entry's own name to that entry", () => {
    const stranded = list.items
      .map((item) => {
        const result = resolveGuess(list, item.name);
        if (result.kind === "match" && result.item.rank === item.rank) return null;
        return `#${item.rank} "${item.name}" -> ${result.kind === "match" ? `#${result.item.rank} ${result.item.name}` : result.kind}`;
      })
      .filter(Boolean);
    expect(stranded).toEqual([]);
  });

  it("resolves every entry's name typed in the wrong case and punctuation", () => {
    const stranded = list.items
      .filter((item) => {
        const noisy = `  ${item.name.toUpperCase()}!  `;
        const result = resolveGuess(list, noisy);
        return !(result.kind === "match" && result.item.rank === item.rank);
      })
      .map((item) => `#${item.rank} ${item.name}`);
    expect(stranded).toEqual([]);
  });

  it("resolves every alias to an entry that actually declares it", () => {
    const stranded: string[] = [];
    for (const item of list.items) {
      for (const alias of item.aliases ?? []) {
        const result = resolveGuess(list, alias);
        // An alias shared by two entries (both Offices, both Twin Peaks) may
        // legitimately resolve to either; it must resolve to one of them.
        const ok =
          result.kind === "match" && keysOf(result.item).includes(normalize(alias));
        if (!ok) stranded.push(`#${item.rank} ${item.name}: alias "${alias}"`);
      }
    }
    expect(stranded).toEqual([]);
  });

  it("never leaves an entry unreachable because another entry shadows its name", () => {
    // Two entries may share an alias on purpose, but each entry must still have
    // at least one key that reaches it once the entries above it are claimed.
    const claimed: Record<number, boolean> = {};
    const unreachable: string[] = [];
    for (const item of [...list.items].sort((a, b) => a.rank - b.rank)) {
      const result = resolveGuess(list, item.name, claimed);
      if (!(result.kind === "match" && result.item.rank === item.rank)) {
        unreachable.push(`#${item.rank} ${item.name}`);
      }
      claimed[item.rank] = true;
    }
    expect(unreachable).toEqual([]);
  });

  it("has no two entries whose names normalize to the same key", () => {
    const seen = new Map<string, string>();
    const collisions: string[] = [];
    for (const item of list.items) {
      const key = normalize(item.name);
      const prior = seen.get(key);
      if (prior) collisions.push(`"${prior}" and "${item.name}" both normalize to "${key}"`);
      else seen.set(key, item.name);
    }
    expect(collisions).toEqual([]);
  });

  it("has no alias that merely repeats its own entry's name", () => {
    const redundant: string[] = [];
    for (const item of list.items) {
      const keys = keysOf(item);
      const dupes = keys.filter((key, i) => keys.indexOf(key) !== i);
      if (dupes.length) redundant.push(`#${item.rank} ${item.name}: ${dupes.join(", ")}`);
    }
    expect(redundant).toEqual([]);
  });

  it("carries a source with a URL and a scrape date", () => {
    expect(list.source.name).toBeTruthy();
    expect(list.source.url).toMatch(/^https?:\/\//);
    expect(list.source.sourcedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("the registry", () => {
  it("has unique list ids", () => {
    const ids = LISTS.map((list) => list.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("ships the nineteen lists the setup screen expects", () => {
    expect(LISTS.length).toBe(19);
    expect(LISTS.every((list) => list.items.length >= 50)).toBe(true);
  });
});
