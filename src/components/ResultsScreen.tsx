"use client";

import Scoreboard from "./Scoreboard";
import GuessLog from "./GuessLog";
import { winner } from "@/lib/game";
import type { GameList, GameState, TeamId } from "@/lib/types";

export default function ResultsScreen({
  state,
  list,
  onPlayAgain,
  onNewSetup,
}: {
  state: GameState;
  list: GameList;
  onPlayAgain: () => void;
  onNewSetup: () => void;
}) {
  const result = winner(state);
  const rounds = state.history.length;
  const hits = state.history.filter((r) => r.outcome === "hit").length;
  const claimedCount = Object.keys(state.claimed).length;
  const margin = Math.abs(state.scores.A - state.scores.B);

  const bestTurn = state.history.reduce<null | (typeof state.history)[number]>(
    (best, record) => (best === null || record.points > best.points ? record : best),
    null,
  );

  return (
    <div className="shell">
      <section className="panel winner-banner">
        <p className="eyebrow">Final result</p>
        {result === "tie" ? (
          <div className="who">Dead tie at {state.scores.A}</div>
        ) : (
          <>
            <div className={`who ${result.toLowerCase()}`}>
              {state.settings.teamNames[result as TeamId]} wins
            </div>
            <p className="lede" style={{ margin: "8px auto 0", textAlign: "center" }}>
              by {margin} point{margin === 1 ? "" : "s"} after {rounds} round
              {rounds === 1 ? "" : "s"} of {list.name}
            </p>
          </>
        )}

        <div className="final-scores">
          <Scoreboard state={state} showTurn={false} />
        </div>

        <div className="row" style={{ justifyContent: "center", marginTop: 24 }}>
          <button type="button" className="btn btn-primary btn-lg" onClick={onPlayAgain}>
            Rematch, same settings
          </button>
          <button type="button" className="btn btn-lg" onClick={onNewSetup}>
            Change list or teams
          </button>
        </div>
      </section>

      <section className="panel">
        <h2>How it went</h2>
        <div className="stat-grid">
          <div className="stat">
            <div className="value">{rounds}</div>
            <div className="label">Rounds played</div>
          </div>
          <div className="stat">
            <div className="value">{hits}</div>
            <div className="label">Successful guesses</div>
          </div>
          <div className="stat">
            <div className="value">
              {claimedCount}/{list.items.length}
            </div>
            <div className="label">List claimed</div>
          </div>
          <div className="stat">
            <div className="value">{bestTurn && bestTurn.points > 0 ? `+${bestTurn.points}` : "-"}</div>
            <div className="label">
              {bestTurn && bestTurn.points > 0
                ? `Best: ${bestTurn.matched?.name ?? ""}`.slice(0, 34)
                : "Best turn"}
            </div>
          </div>
        </div>
      </section>

      <section className="panel">
        <h2>The full list</h2>
        <p className="hint" style={{ marginTop: 0, marginBottom: 14 }}>
          Highlighted entries were claimed during the game.
        </p>
        <ul className="reveal">
          {list.items.map((item) => {
            const claimedBy = state.claimed[item.rank];
            return (
              <li
                key={item.rank}
                className={claimedBy ? `claimed-${claimedBy.toLowerCase()}` : ""}
              >
                <span className="rank">{item.rank}</span>
                <span className="name">
                  {item.name}
                  {claimedBy ? (
                    <span className="tag">{state.settings.teamNames[claimedBy]}</span>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="panel">
        <h2>Every turn</h2>
        <GuessLog state={state} />
      </section>
    </div>
  );
}
