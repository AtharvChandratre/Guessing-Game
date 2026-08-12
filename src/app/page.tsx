"use client";

import { useReducer } from "react";
import SetupScreen from "@/components/SetupScreen";
import GameScreen from "@/components/GameScreen";
import ResultsScreen from "@/components/ResultsScreen";
import { getList } from "@/data/lists";
import { initialState, reducer } from "@/lib/game";

export default function Page() {
  const [state, dispatch] = useReducer(reducer, undefined, () => initialState());
  const list = getList(state.settings.listId);

  if (state.phase === "setup") {
    return <SetupScreen onStart={(settings) => dispatch({ type: "start", settings })} />;
  }

  if (state.phase === "playing") {
    return (
      <GameScreen
        state={state}
        list={list}
        onGuess={(text) => dispatch({ type: "guess", text, list })}
        onTimeout={() => dispatch({ type: "timeout" })}
        onEnd={() => dispatch({ type: "end" })}
      />
    );
  }

  return (
    <ResultsScreen
      state={state}
      list={list}
      onPlayAgain={() => dispatch({ type: "playAgain" })}
      onNewSetup={() => dispatch({ type: "reset" })}
    />
  );
}
