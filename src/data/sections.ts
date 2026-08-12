import type { GameList } from "@/lib/types";

/**
 * Categories are fine-grained enough that six of them hold a single list, which
 * makes them useless for grouping. Sections roll them up into five bands that
 * are actually scannable, each with an accent colour so the eye can find a band
 * before reading any labels.
 */
export type Section = {
  id: string;
  name: string;
  categories: string[];
  accent: string;
};

export const SECTIONS: Section[] = [
  { id: "screen", name: "Screen", categories: ["Film", "Television"], accent: "#f472b6" },
  {
    id: "sound",
    name: "Music & Internet",
    categories: ["Music", "Internet", "Apps"],
    accent: "#a78bfa",
  },
  { id: "play", name: "Games & Sport", categories: ["Games", "Sport"], accent: "#4ade80" },
  { id: "world", name: "World", categories: ["Geography", "Architecture"], accent: "#38bdf8" },
  { id: "money", name: "Business", categories: ["Business", "Economics"], accent: "#fbbf24" },
];

/** Catch-all so a list with an unclaimed category still reaches the picker. */
const OTHER: Section = { id: "other", name: "Other", categories: [], accent: "#94a3b8" };

export function sectionFor(list: GameList): Section {
  return SECTIONS.find((section) => section.categories.includes(list.category)) ?? OTHER;
}

/** Group lists into their sections, dropping empty ones and keeping SECTIONS order. */
export function toBands(lists: GameList[]): { section: Section; cards: ListCard[] }[] {
  const bySection = new Map<string, GameList[]>();
  for (const list of lists) {
    const id = sectionFor(list).id;
    bySection.set(id, [...(bySection.get(id) ?? []), list]);
  }

  return [...SECTIONS, OTHER]
    .filter((section) => bySection.has(section.id))
    .map((section) => ({ section, cards: toCards(bySection.get(section.id) ?? []) }));
}

/** One picker card: a standalone list, or every variant of a series. */
export type ListCard = {
  key: string;
  name: string;
  variants: GameList[];
};

/** Collapse a set of lists into cards, keeping the given order. */
export function toCards(lists: GameList[]): ListCard[] {
  const cards: ListCard[] = [];
  const bySeries = new Map<string, ListCard>();

  for (const list of lists) {
    if (!list.series) {
      cards.push({ key: list.id, name: list.name, variants: [list] });
      continue;
    }
    const existing = bySeries.get(list.series.id);
    if (existing) {
      existing.variants.push(list);
    } else {
      const card = { key: list.series.id, name: list.series.name, variants: [list] };
      bySeries.set(list.series.id, card);
      cards.push(card);
    }
  }

  return cards;
}
