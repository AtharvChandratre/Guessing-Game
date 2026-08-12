"use client";

import { useEffect, useRef, useState } from "react";
import Timer from "./Timer";
import Scoreboard from "./Scoreboard";
import GuessLog from "./GuessLog";
import { pointsFor } from "@/lib/game";
import type { GameList, GameState, TurnRecord } from "@/lib/types";

type Props = {
  state: GameState;
  list: GameList;
  onGuess: (text: string) => void;
  onTimeout: () => void;
  onEnd: () => void;
};

function Feedback({ record, list, scoring }: { record: TurnRecord; list: GameList; scoring: GameState["settings"]["scoring"] }) {
  const worth = record.matched ? pointsFor(record.matched.rank, list.items.length, scoring) : 0;

  const content = {
    hit: {
      headline: `${record.matched?.name} is #${record.matched?.rank}. +${record.points} points.`,
      detail: record.matched?.note ? String(record.matched.note) : "Nice pull.",
    },
    duplicate: {
      headline: `${record.matched?.name} was already taken.`,
      detail: `It went for ${worth} points earlier. No points this turn.`,
    },
    miss: {
      headline: `"${record.guess}" is not on the list.`,
      detail: "No points. Turn passes.",
    },
    timeout: {
      headline: "Time expired.",
      detail: "No points. Turn passes.",
    },
  }[record.outcome];

  return (
    <div className={`feedback ${record.outcome}`} role="status">
      <div className="headline">{content.headline}</div>
      <div className="detail">{content.detail}</div>
    </div>
  );
}

export default function GameScreen({ state, list, onGuess, onTimeout, onEnd }: Props) {
  const [text, setText] = useState("");
  const [paused, setPaused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastRecord = state.history[0];
  const claimedCount = Object.keys(state.claimed).length;
  const timed = state.settings.turnSeconds !== null;

  // Hand the keyboard to the next team as soon as the turn flips.
  useEffect(() => {
    if (!paused) inputRef.current?.focus();
  }, [state.turn, paused]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (paused || !text.trim()) return;
    onGuess(text);
    setText("");
  };

  const activeName = state.settings.teamNames[state.currentTeam];

  return (
    <div className="shell">
      <div className="spread" style={{ marginBottom: 18 }}>
        <div>
          <p className="eyebrow">{list.name}</p>
          <h2 style={{ margin: "4px 0 0", fontSize: 22 }}>Round {state.turn}</h2>
        </div>
        <div className="row">
          {timed ? (
            <button type="button" className="btn" onClick={() => setPaused((p) => !p)}>
              {paused ? "Resume clock" : "Pause clock"}
            </button>
          ) : null}
          <button type="button" className="btn" onClick={onEnd}>
            End game &amp; see results
          </button>
        </div>
      </div>

      <Scoreboard state={state} />

      <section className="panel">
        <div className="spread" style={{ marginBottom: 14 }}>
          <div>
            <p className="eyebrow">Now guessing</p>
            <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.01em" }}>
              {activeName}
            </div>
          </div>
          {state.settings.turnSeconds ? (
            <div style={{ minWidth: 220 }}>
              <Timer
                duration={state.settings.turnSeconds}
                resetKey={state.turn}
                paused={paused}
                onExpire={onTimeout}
              />
            </div>
          ) : null}
        </div>

        <form className="guess-form" onSubmit={submit}>
          <input
            ref={inputRef}
            className="text-input"
            value={text}
            placeholder={
              paused ? "Clock paused" : `Name something from ${list.name}...`
            }
            onChange={(e) => setText(e.target.value)}
            disabled={paused}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            aria-label={`Guess for ${activeName}`}
          />
          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={paused || !text.trim()}
          >
            Lock it in
          </button>
        </form>

        {paused ? (
          <div className="feedback timeout" role="status">
            <div className="headline">Clock paused</div>
            <div className="detail">
              {activeName} still has the turn. Resume when everyone is ready.
            </div>
          </div>
        ) : lastRecord ? (
          <Feedback record={lastRecord} list={list} scoring={state.settings.scoring} />
        ) : (
          <p className="hint">
            {state.settings.scoring === "rank"
              ? "Points equal the entry's rank, so the deeper the cut the bigger the score."
              : "Points run high at the top of the list, so the famous answers pay best."}{" "}
            Close spellings count, and so does a distinctive part of a longer name.
          </p>
        )}
      </section>

      <section className="panel">
        <div className="spread" style={{ marginBottom: 14 }}>
          <h2 style={{ margin: 0 }}>Turn history</h2>
          <span className="hint" style={{ margin: 0 }}>
            {claimedCount} of {list.items.length} entries claimed
          </span>
        </div>
        <GuessLog state={state} />
      </section>
    </div>
  );
}
