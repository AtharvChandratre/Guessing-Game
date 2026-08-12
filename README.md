# Rank Rush

A two-team party guessing game. Teams alternate turns naming entries from a ranked list. Land on
one and you bank its rank as points, so obscure deep cuts are worth more than the obvious answers.
There is no turn limit - play as long as you like, then end the game and compare totals.

## Rules as implemented

- Teams A and B alternate, one guess per turn.
- A correct guess scores the entry's rank (`#99` is worth 99 points under the default scoring mode).
- An entry can only be claimed once. Naming a claimed entry scores nothing and passes the turn.
- A wrong guess scores nothing and passes the turn.
- With the optional round timer on, running out of time scores nothing and passes the turn.
- Matching is forgiving: case, punctuation, accents and a leading "the" are ignored, aliases such
  as tickers and original-language titles are accepted, small typos are tolerated on longer names,
  and a distinctive part of a longer name works ("Shawshank", "Empire Strikes Back"). A fragment
  that fits more than one entry is rejected rather than guessed at.

Two scoring modes are available at setup:

- **Rank = points** (default): deeper entries pay more.
- **Inverted**: the top of the list pays more, `#1` being worth the full list length.

## Running locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Deploying to Vercel

The app is a stock Next.js App Router project with no backend, no database and no environment
variables, so it deploys as-is: import the repo on Vercel and accept the detected defaults, or run
`npx vercel`.

## The lists

Fifteen to start, across film, music, internet, games, business, geography, architecture and sport.
Every list is scraped rather than written from memory, and each one carries the source and scrape
date it came from, shown on the setup screen:

| List | Entries | Source |
| --- | --- | --- |
| IMDb Top 100 / Top 250 Movies | 100 / 250 | [IMDb Top 250](https://www.imdb.com/chart/top/) |
| Highest-Grossing Films | 50 | Wikipedia |
| Most-Streamed Songs on Spotify | 100 | Wikipedia |
| Most-Subscribed YouTube Channels | 100 | Wikipedia |
| Most-Followed Instagram Accounts | 50 | Wikipedia |
| Best-Selling Video Games | 50 | Wikipedia |
| Top 100 Companies by Market Cap | 100 | [CompaniesMarketCap](https://companiesmarketcap.com/) |
| 100 Most Populous Countries | 100 | Wikipedia |
| Largest Cities in the World | 84 | Wikipedia |
| US States by Population | 50 | Wikipedia |
| Largest Countries by Area | 100 | Wikipedia |
| Largest Economies by GDP | 100 | Wikipedia |
| Tallest Buildings in the World | 87 | Wikipedia |
| NBA All-Time Scoring Leaders | 50 | Wikipedia |

Most of these rankings move over time - box-office totals, stream counts, follower counts, market
caps and IMDb's ratings all change - so each affected list carries a `caveat` shown at setup. The
ranks in the game are a snapshot from the scrape date, not a live feed.

## Adding a new list

Every sub-game is just an ordered list. Add a file in `src/data/` that exports a `GameList`:

```ts
import type { GameList } from "@/lib/types";

export const myList: GameList = {
  id: "my-list",
  name: "My List",
  category: "Music",
  blurb: "One line describing what the ordering means.",
  caveat: "Optional note shown at setup if the ranking is a snapshot rather than a fixed fact.",
  source: { name: "Where it came from", url: "https://...", sourcedAt: "2026-08-11" },
  items: [
    { rank: 1, name: "First entry", aliases: ["nickname"] },
    // ...
  ],
};
```

Then append it to the `LISTS` array in `src/data/lists.ts`. Nothing else needs to change - the
setup screen, scoring and end-of-game reveal all read from that array.

`aliases` are alternate spellings that should be accepted (stock tickers, original-language titles,
state abbreviations). `note` is optional flavour text shown when the entry is claimed. Keep aliases
unambiguous: if two entries can answer to the same alias, the matcher treats it like a repeated
name rather than picking one.

## Project layout

```
src/
  app/            Next.js entry point, global styles
  components/     Setup, game, results screens and their parts
  data/           One file per playable list, plus the registry in lists.ts
  lib/
    types.ts      Shared types
    match.ts      Guess normalization and fuzzy matching
    game.ts       Game state reducer and scoring
```

## Refreshing the data

The data files under `src/data/` are generated from the sources in the table above. To refresh a
list, re-scrape its source, rewrite the corresponding file keeping the `GameList` shape, and bump
`source.sourcedAt`. Two things to preserve when you do:

- Ranks must run 1..N with no gaps.
- No two entries in a list should normalize to the same name or alias, or the matcher will treat
  them as a repeated name.
