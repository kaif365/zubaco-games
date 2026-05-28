import { useMutation } from "@tanstack/react-query";
import { gameApiClient } from "@/services/gameApiClient";
import type { MoveEntry } from "@/services/gameApiClient";

export function useAuth() {
  return useMutation({
    mutationFn: (stageId: string) =>
      gameApiClient.fetchDevSessionToken(stageId),
  });
}

export function useGameStart() {
  return useMutation({
    mutationFn: (stageId: string) => gameApiClient.gameStart(stageId),
  });
}

export function useSubmitMoves() {
  return useMutation({
    mutationFn: (moves: MoveEntry[]) => gameApiClient.submitMoves(moves),
  });
}

export function useNextBoard() {
  return useMutation({
    mutationFn: () => gameApiClient.nextBoard(),
  });
}

export function useEndBoard() {
  return useMutation({
    mutationFn: () => gameApiClient.endBoard(),
  });
}

export function useEndGame() {
  return useMutation({
    mutationFn: () => gameApiClient.endGame(),
  });
}

export function useGameStatus() {
  return useMutation({
    mutationFn: () => gameApiClient.gameStatus(),
  });
}

export function useDemo() {
  return useMutation({
    mutationFn: (token: string) => gameApiClient.demoWithToken(token),
  });
}
