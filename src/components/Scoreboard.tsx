"use client";

import type { GameState, TeamId } from "@/lib/types";

function ScoreCard({
  state,
  team,
  showTurn,
}: {
  state: GameState;
  team: TeamId;
  showTurn: boolean;
}) {
  const isActive = showTurn && state.currentTeam === team;
  return (
    <div className={`score-card ${team.toLowerCase()}${isActive ? " active" : ""}`}>
      <div className="team-name">{state.settings.teamNames[team]}</div>
      <div className="score">{state.scores[team]}</div>
      {isActive ? <div className="turn-tag">Their turn</div> : null}
    </div>
  );
}

export default function Scoreboard({
  state,
  showTurn = true,
}: {
  state: GameState;
  showTurn?: boolean;
}) {
  return (
    <div className="scoreboard">
      <ScoreCard state={state} team="A" showTurn={showTurn} />
      <div className="vs">VS</div>
      <ScoreCard state={state} team="B" showTurn={showTurn} />
    </div>
  );
}
