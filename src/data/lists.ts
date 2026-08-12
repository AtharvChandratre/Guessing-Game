import type { GameList } from "@/lib/types";
import { imdbTop100 } from "./imdb-top-100";
import { imdbTop250 } from "./imdb-top-250";
import { imdbTvTop100 } from "./imdb-tv-top-100";
import { imdbTvTop250 } from "./imdb-tv-top-250";
import { highestGrossingFilms } from "./highest-grossing-films";
import { spotifySongs } from "./spotify-most-streamed";
import { youtubeChannels } from "./youtube-most-subscribed";
import { instagramAccounts } from "./instagram-most-followed";
import { androidApps } from "./android-most-downloaded";
import { mostVisitedWebsites } from "./most-visited-websites";
import { bestSellingGames } from "./best-selling-video-games";
import { countriesByPopulation } from "./countries-population";
import { usStates } from "./us-states-population";
import { largestCities } from "./largest-cities";
import { countriesByArea } from "./countries-area";
import { countriesByGdp } from "./countries-gdp";
import { tallestBuildings } from "./tallest-buildings";
import { footballGoalscorers } from "./football-goalscorers";
import { largestCompanies } from "./companies-market-cap";

/**
 * Every playable list. To add a sub-game, drop a new file next to this one that
 * exports a GameList and append it here - nothing else needs to change.
 *
 * All list data is scraped rather than hand-written; each list carries the
 * source and scrape date it came from.
 */
export const LISTS: GameList[] = [
  imdbTop100,
  imdbTop250,
  imdbTvTop100,
  imdbTvTop250,
  highestGrossingFilms,
  spotifySongs,
  youtubeChannels,
  instagramAccounts,
  mostVisitedWebsites,
  androidApps,
  bestSellingGames,
  largestCompanies,
  countriesByPopulation,
  largestCities,
  usStates,
  countriesByArea,
  countriesByGdp,
  tallestBuildings,
  footballGoalscorers,
];

export function getList(id: string): GameList {
  return LISTS.find((list) => list.id === id) ?? LISTS[0];
}
