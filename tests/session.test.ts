import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { readTeamNames, writeTeamNames } from "@/lib/session";

/** Minimal in-memory Storage, so these run without a DOM. */
function fakeStorage(overrides: Partial<Storage> = {}): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    key: (i: number) => [...map.keys()][i] ?? null,
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
    ...overrides,
  } as Storage;
}

const install = (storage: Storage | (() => never)) => {
  Object.defineProperty(globalThis, "window", {
    value: typeof storage === "function" ? { get sessionStorage() { return storage(); } } : { sessionStorage: storage },
    configurable: true,
    writable: true,
  });
};

beforeEach(() => install(fakeStorage()));
afterEach(() => {
  delete (globalThis as { window?: unknown }).window;
});

describe("team names survive a refresh", () => {
  it("reads back what it wrote", () => {
    writeTeamNames({ A: "The Wolves", B: "Quiz Kids" });
    expect(readTeamNames()).toEqual({ A: "The Wolves", B: "Quiz Kids" });
  });

  it("returns null when the tab has nothing stored yet", () => {
    expect(readTeamNames()).toBeNull();
  });

  it("overwrites rather than accumulating", () => {
    writeTeamNames({ A: "First", B: "Second" });
    writeTeamNames({ A: "Third", B: "Fourth" });
    expect(readTeamNames()).toEqual({ A: "Third", B: "Fourth" });
  });

  it("keeps names that are only whitespace apart", () => {
    writeTeamNames({ A: "Team A", B: "Team  A" });
    expect(readTeamNames()).toEqual({ A: "Team A", B: "Team  A" });
  });

  it("round-trips names with quotes, emoji and non-Latin scripts", () => {
    const names = { A: 'The "Best" Team 🏆', B: "Маша и Медведь" };
    writeTeamNames(names);
    expect(readTeamNames()).toEqual(names);
  });
});

describe("it never takes the page down", () => {
  it("returns null on the server, where there is no window", () => {
    delete (globalThis as { window?: unknown }).window;
    expect(readTeamNames()).toBeNull();
    expect(() => writeTeamNames({ A: "a", B: "b" })).not.toThrow();
  });

  it("survives a browser that throws on sessionStorage access", () => {
    // Some privacy modes throw on the property itself, not just on setItem.
    install(() => {
      throw new DOMException("The operation is insecure.", "SecurityError");
    });
    expect(readTeamNames()).toBeNull();
    expect(() => writeTeamNames({ A: "a", B: "b" })).not.toThrow();
  });

  it("survives a full quota", () => {
    install(
      fakeStorage({
        setItem: () => {
          throw new DOMException("QuotaExceededError");
        },
      }),
    );
    expect(() => writeTeamNames({ A: "a", B: "b" })).not.toThrow();
  });
});

describe("it distrusts what it reads back", () => {
  const poison = (raw: string) => {
    const storage = fakeStorage();
    storage.setItem("rank-rush:team-names", raw);
    install(storage);
  };

  it("ignores unparseable JSON", () => {
    poison("{not json");
    expect(readTeamNames()).toBeNull();
  });

  it("ignores a value of the wrong shape", () => {
    for (const raw of ['"a string"', "42", "null", "[]", '{"A":"only a"}', '{"A":1,"B":2}']) {
      poison(raw);
      expect(readTeamNames(), raw).toBeNull();
    }
  });

  it("truncates an over-long name to the input's own limit", () => {
    poison(JSON.stringify({ A: "x".repeat(500), B: "ok" }));
    expect(readTeamNames()).toEqual({ A: "x".repeat(28), B: "ok" });
  });
});
