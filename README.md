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
- Matching is forgiving: case, punctuation, accents and a leading "the" are ignored, common
  nicknames and abbreviations are accepted, and small typos are tolerated on longer names.

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
  items: [
    { rank: 1, name: "First entry", aliases: ["nickname"] },
    // ...
  ],
};
```

Then append it to the `LISTS` array in `src/data/lists.ts`. Nothing else needs to change - the
setup screen, scoring and end-of-game reveal all read from that array.

`aliases` are alternate spellings that should be accepted (short forms, native titles, chemical
symbols, state abbreviations). `note` is optional flavour text shown when the entry is claimed.

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

## Notes on the bundled lists

The IMDb, country-population and state-population lists are point-in-time snapshots, since those
rankings shift. Treat the ranks in the game as the game's own scoreboard. The presidents and
periodic table lists are fixed orderings.
