import { GameRepository } from '@/features/sequence-recall/repositories/GameRepository';
import type { GameConfig } from '@/types/game';

let repository: GameRepository | null = null;

/**
 * Gets game repository.
 *
 * @param {GameConfig} config - The config.
 *
 * @returns {GameRepository} The result of getGameRepository.
 */
export function getGameRepository(config: GameConfig) {
  if (!repository) repository = new GameRepository(config);
  return repository;
}

/**
 * Reset game repository.
 *
 * @param {GameConfig} config - The config.
 *
 * @returns {GameRepository} The result of resetGameRepository.
 */
export function resetGameRepository(config: GameConfig) {
  repository = new GameRepository(config);
  return repository;
}
