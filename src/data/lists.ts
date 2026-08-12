import type { GameList } from "@/lib/types";
import { imdbTop100 } from "./imdb-top-100";
import { elementsList } from "./elements";
import { presidents } from "./presidents";
import { countriesByPopulation } from "./countries";
import { usStates } from "./us-states";

/**
 * Every playable list. To add a sub-game, drop a new file next to this one that
 * exports a GameList and append it here - nothing else needs to change.
 */
export const LISTS: GameList[] = [
  imdbTop100,
  elementsList,
  presidents,
  countriesByPopulation,
  usStates,
];

export function getList(id: string): GameList {
  return LISTS.find((list) => list.id === id) ?? LISTS[0];
}
