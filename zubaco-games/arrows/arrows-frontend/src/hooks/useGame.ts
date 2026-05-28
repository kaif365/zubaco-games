"use client";

import { useReducer } from "react";
import { LEVELS } from "@/lib/game/levels";
import { GameState, GameAction, MAX_LIVES } from "@/lib/game/types";
import { buildBoard, removeArrow, isWon } from "@/lib/game/logic";

function initState(levelIndex: number): GameState {
  return {
    levelIndex,
    board: buildBoard(LEVELS[levelIndex]),
    moves: 0,
    lives: MAX_LIVES,
    status: "playing",
  };
}

function reducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "REMOVE_ARROW": {
      const newBoard = removeArrow(action.id, state.board);
      return {
        ...state,
        board: newBoard,
        moves: state.moves + 1,
        status: isWon(newBoard) ? "won" : "playing",
      };
    }
    case "WRONG_MOVE": {
      const lives = state.lives - 1;
      return { ...state, lives, status: lives <= 0 ? "gameover" : "playing" };
    }
    case "RESET_LEVEL":
      return initState(state.levelIndex);
    case "NEXT_LEVEL": {
      const next = Math.min(state.levelIndex + 1, LEVELS.length - 1);
      return initState(next);
    }
    case "GOTO_LEVEL":
      return initState(action.index);
    default:
      return state;
  }
}

export function useGame(initialLevel = 0) {
  const [state, dispatch] = useReducer(reducer, initialLevel, initState);
  return { state, dispatch, levels: LEVELS };
}
