"use client";

import type { GameState, TurnRecord } from "@/lib/types";

function describe(record: TurnRecord) {
  switch (record.outcome) {
    case "hit":
      return {
        main: record.matched?.name ?? record.guess,
        sub: `#${record.matched?.rank} · guessed "${record.guess}"`,
      };
    case "duplicate":
      return { main: record.matched?.name ?? record.guess, sub: "already claimed" };
    case "ambiguous":
      return { main: record.guess, sub: "matches more than one entry" };
    case "miss":
      return { main: record.guess, sub: "not on the list" };
    case "timeout":
      return { main: "Ran out of time", sub: "no guess submitted" };
  }
}

export default function GuessLog({ state }: { state: GameState }) {
  if (state.history.length === 0) {
    return <p className="hint" style={{ margin: 0 }}>No turns played yet.</p>;
  }

  return (
    <ul className="log">
      {state.history.map((record) => {
        const { main, sub } = describe(record);
        return (
          <li key={record.id}>
            <span className={`who ${record.team.toLowerCase()}`}>
              {state.settings.teamNames[record.team]}
            </span>
            <span className="what">
              {main}
              <span className="sub"> · {sub}</span>
            </span>
            <span className={`pts ${record.points > 0 ? "scored" : "zero"}`}>
              {record.points > 0 ? `+${record.points}` : "0"}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
