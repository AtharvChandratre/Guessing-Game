"use client";

import { useState } from "react";
import { LISTS, getList } from "@/data/lists";
import { DEFAULT_SETTINGS } from "@/lib/game";
import type { GameSettings, ScoringMode, TeamId } from "@/lib/types";

const TIMER_OPTIONS: { label: string; value: number | null }[] = [
  { label: "No timer", value: null },
  { label: "30s", value: 30 },
  { label: "1 min", value: 60 },
  { label: "90s", value: 90 },
  { label: "2 min", value: 120 },
  { label: "3 min", value: 180 },
  { label: "5 min", value: 300 },
];

const SCORING_OPTIONS: { mode: ScoringMode; title: string; desc: string }[] = [
  {
    mode: "rank",
    title: "Rank = points",
    desc: "Guess #99 and score 99. Deep cuts are worth the most.",
  },
  {
    mode: "inverted",
    title: "Inverted",
    desc: "The top of the list pays best. #1 is worth the full list length.",
  },
];

export default function SetupScreen({ onStart }: { onStart: (settings: GameSettings) => void }) {
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const selectedList = getList(settings.listId);

  const setTeamName = (team: TeamId, value: string) =>
    setSettings((s) => ({ ...s, teamNames: { ...s.teamNames, [team]: value } }));

  const start = () =>
    onStart({
      ...settings,
      teamNames: {
        A: settings.teamNames.A.trim() || "Team A",
        B: settings.teamNames.B.trim() || "Team B",
      },
    });

  return (
    <div className="shell">
      <p className="eyebrow">Two teams, one ranked list</p>
      <h1>Rank Rush</h1>
      <p className="lede">
        Teams alternate turns naming entries from a ranked list. Land on one and you bank its rank as
        points, so digging deeper into the list pays more than the obvious answers. Play as many
        rounds as you like, then end the game and compare totals.
      </p>

      <section className="panel">
        <h2>1. Pick a list</h2>
        <div className="list-grid">
          {LISTS.map((list) => (
            <button
              key={list.id}
              type="button"
              className="list-card"
              aria-pressed={list.id === settings.listId}
              onClick={() => setSettings((s) => ({ ...s, listId: list.id }))}
            >
              <div className="cat">{list.category}</div>
              <div className="title">{list.name}</div>
              <p className="blurb">{list.blurb}</p>
              <div className="count">{list.items.length} entries</div>
            </button>
          ))}
        </div>
        {selectedList.caveat ? <p className="caveat">{selectedList.caveat}</p> : null}
      </section>

      <section className="panel">
        <h2>2. Name the teams</h2>
        <div className="grid-2">
          <div>
            <label className="field-label" htmlFor="team-a">
              Team A
            </label>
            <input
              id="team-a"
              className="text-input"
              value={settings.teamNames.A}
              maxLength={28}
              onChange={(e) => setTeamName("A", e.target.value)}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="team-b">
              Team B
            </label>
            <input
              id="team-b"
              className="text-input"
              value={settings.teamNames.B}
              maxLength={28}
              onChange={(e) => setTeamName("B", e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="panel">
        <h2>3. Scoring</h2>
        <div className="grid-2">
          {SCORING_OPTIONS.map((option) => (
            <button
              key={option.mode}
              type="button"
              className="mode-card"
              aria-pressed={settings.scoring === option.mode}
              onClick={() => setSettings((s) => ({ ...s, scoring: option.mode }))}
            >
              <div className="title">{option.title}</div>
              <div className="desc">{option.desc}</div>
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>4. Round timer</h2>
        <div className="chip-row">
          {TIMER_OPTIONS.map((option) => (
            <button
              key={String(option.value)}
              type="button"
              className="chip"
              aria-pressed={settings.turnSeconds === option.value}
              onClick={() => setSettings((s) => ({ ...s, turnSeconds: option.value }))}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="hint">
          The clock runs per guessing round. If it hits zero the turn passes to the other team with
          no points. Leave it off to play untimed.
        </p>
      </section>

      <div className="row" style={{ marginTop: 22 }}>
        <button type="button" className="btn btn-primary btn-lg" onClick={start}>
          Start game
        </button>
        <span className="hint" style={{ margin: 0 }}>
          Playing {selectedList.name} &middot; {selectedList.items.length} entries
        </span>
      </div>
    </div>
  );
}
