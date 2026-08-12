# Rank Rush

A two-team party guessing game. Teams alternate turns naming entries from a ranked list. Land on
one and you bank its rank as points, so obscure deep cuts are worth more than the obvious answers.
There is no turn limit - play as long as you like, then end the game and compare totals.

## Rules as implemented

- Teams A and B alternate, one guess per turn.
- A correct guess scores the entry's rank (`#99` is worth 99 points under the default scoring mode).
- An entry can only be claimed once. Naming a claimed entry scores nothing but does **not** end the
  round: the same team guesses again, on the same clock.
- A wrong guess scores nothing and passes the turn.
- With the optional round timer on, running out of time scores nothing and passes the turn.
- Matching is forgiving: case, punctuation, accents and a leading "the" are ignored, aliases such
  as tickers and original-language titles are accepted, small typos are tolerated on longer names,
  and a distinctive part of a longer name works ("Shawshank", "Empire Strikes Back").
- A fragment that fits more than one entry - "Pokemon" against six Pokémon games, "Call of Duty"
  against five - is reported as ambiguous rather than guessed at or called a miss. It scores
  nothing, names nothing, and does **not** end the round: the same team narrows it down and tries
  again. Once all but one candidate has been claimed the fragment resolves to the survivor.
- Sequel numbering is canonicalized, so "The Godfather Part II", "Godfather Part 2" and
  "Godfather II" all resolve to the same entry, and typo tolerance never changes a number - asking
  for "Godfather 3" does not hand you Part II.

Team names are remembered per browser tab, so refreshing the page brings the same two teams back
instead of resetting to "Team A" and "Team B". They live in `sessionStorage` rather than
`localStorage` deliberately: a second tab is a second game with its own names, and closing the tab
ends the session rather than greeting the next group with someone else's team. Nothing else is
persisted - a refresh mid-game still returns to setup.

Two scoring modes are available at setup:

- **Rank = points** (default): deeper entries pay more.
- **Inverted**: the top of the list pays more, `#1` being worth the full list length.

## Running locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Tests

```bash
npm test          # once
npm run test:watch
```

The suite covers the matcher, since being told a correct guess is wrong is the
one failure that ruins a game. It runs over the real shipped lists rather than
fixtures - 345 tests, most of them sweeping all 2303 entries.

| File | What it holds the line on |
| --- | --- |
| `tests/normalize.test.ts` | Case, punctuation, accents, articles, non-Latin scripts, sequel numbering |
| `tests/lists.test.ts` | Per-list invariants: gapless ranks, every name and alias resolves to itself, no key collisions, every entry reachable once the ones above it are claimed |
| `tests/resolve.test.ts` | The three matching passes, the digit guard, ambiguity, claim awareness, cost |
| `tests/real-guesses.test.ts` | How people actually type, list by list, plus measured recall floors |
| `tests/known-gaps.test.ts` | Guesses that ought to work and do not |
| `tests/outcomes.test.ts` | Whether a given result costs you the round |
| `tests/session.test.ts` | Team names surviving a refresh, and storage failing safely |

Two of those need explaining.

**Recall floors.** `real-guesses.test.ts` perturbs all 2303 names with a fixed
seed and asserts a floor on how many still resolve - 90% for a wrong letter,
84% for a missing one, 57% for a transposition. They sit just under today's
rates, so a change that quietly makes matching stricter fails the build.
Raising a floor after an improvement is how you are meant to edit that block.

**Known gaps.** Every test in `known-gaps.test.ts` is marked `it.fails`, so it
is green while the gap exists and turns red the moment someone closes it. That
red is the prompt to delete the `.fails` and move the case into
`real-guesses.test.ts`. Nothing in there is a comment that can rot.

## Deploying to Vercel

The app is a stock Next.js App Router project with no backend, no database and no environment
variables, so it deploys as-is: import the repo on Vercel and accept the detected defaults, or run
`npx vercel`.

## The lists

Twenty-three, across film, television, music, internet, apps, games, sport, business,
geography and architecture. On the setup screen they are grouped into five colour-coded sections - Screen, Music &
Internet, Games & Sport, World, Business - defined in `src/data/sections.ts`, each occupying a
single row with its label in a left gutter. All of them fit on one screen at 1440x900. Lists that
are the same subject at different depths (IMDb's Top 100 and Top 250) share one card with a size
toggle; hovering a card previews its description, caveat and source below the grid; and the picker
collapses to a one-line summary once you have chosen. A search box filters by list name, section,
category or description.
Every list is scraped rather than written from memory, and each one carries the source and scrape
date it came from, shown on the setup screen:

| List | Entries | Source |
| --- | --- | --- |
| IMDb Top 100 / Top 250 Movies | 100 / 250 | [IMDb Top 250](https://www.imdb.com/chart/top/) |
| IMDb Top 100 / Top 250 TV Shows | 100 / 250 | [IMDb Top 250 TV](https://www.imdb.com/chart/toptv/) |
| Highest-Grossing Films | 50 | Wikipedia |
| Highest-Grossing Media Franchises | 100 | Wikipedia |
| Most-Streamed Songs on Spotify | 100 | Wikipedia |
| Most-Subscribed YouTube Channels | 100 | Wikipedia |
| Most-Followed Instagram Accounts | 50 | Wikipedia |
| Most-Visited Websites | 50 | Wikipedia (Similarweb figures) |
| Most-Downloaded Android Apps | 100 | Wikipedia |
| Best-Selling Video Games | 50 | Wikipedia |
| Top 100 Companies by Market Cap | 100 | [CompaniesMarketCap](https://companiesmarketcap.com/) |
| Most Valuable Brands | 100 | Wikipedia (Brand Finance figures) |
| 100 Most Populous Countries | 100 | Wikipedia |
| Largest Cities in the World | 84 | Wikipedia |
| US States by Population | 50 | Wikipedia |
| Largest Countries by Area | 100 | Wikipedia |
| Largest Economies by GDP | 100 | Wikipedia |
| Tallest Buildings in the World | 87 | Wikipedia |
| All-Time Football Goalscorers | 82 | Wikipedia (RSSSF list) |
| Formula One Race Winners | 100 | Wikipedia |
| All-Time Olympic Medal Table | 100 | Wikipedia |

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

Give it a `category` that one of the sections in `src/data/sections.ts` already claims, or add it
to a section's `categories`. A category no section claims lands in a catch-all "Other" band rather
than disappearing. Add the optional `series` field to pair it with an existing list on a shared
card:

```ts
series: { id: "imdb-movies", name: "IMDb Top Movies", variant: "Top 500" },
```

`aliases` are alternate spellings that should be accepted (stock tickers, original-language titles,
state abbreviations). `note` is optional flavour text shown when the entry is claimed. Keep aliases
unambiguous: if two entries can answer to the same alias, the matcher treats it like a repeated
name rather than picking one.

Where a source genuinely holds two entries of the same name - the US and UK versions of The Office,
both runs of Twin Peaks - the entry name is disambiguated (`The Office (2005)`) and the bare title
kept as an alias on both. Guessing it once claims the first, guessing it again claims the second.

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
    session.ts    Per-tab persistence of the team names
```

## Refreshing the data

The data files under `src/data/` are generated from the sources in the table above. To refresh a
list, re-scrape its source, rewrite the corresponding file keeping the `GameList` shape, and bump
`source.sourcedAt`. Two things to preserve when you do:

- Ranks must run 1..N with no gaps.
- No two entries in a list should normalize to the same name or alias, or the matcher will treat
  them as a repeated name.
