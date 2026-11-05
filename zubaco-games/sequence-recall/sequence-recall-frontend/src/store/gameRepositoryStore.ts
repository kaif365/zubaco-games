import { GameRepository } from '@/features/sequence-recall/repositories/GameRepository';
import type { GameConfig } from '@/types/game';

let repository: GameRepository | null = null;

/**
 * Gets game repository.
 *
 * @param {GameConfig} config - The config.
 * @param {number} [startLen] - Initial sequence length.
 * @param {number} [initialLevel] - Initial level.
 *
 * @returns {GameRepository} The result of getGameRepository.
 */
export function getGameRepository(config: GameConfig, startLen?: number, initialLevel = 1) {
  if (!repository) {
    repository = new GameRepository(config, startLen ?? config.initialSequenceLength, initialLevel);
  }
  return repository;
}

/**
 * Reset game repository.
 *
 * @param {GameConfig} config - The config.
 * @param {number} [startLen] - Initial sequence length.
 * @param {number} [initialLevel] - Initial level.
 *
 * @returns {GameRepository} The result of resetGameRepository.
 */
export function resetGameRepository(config: GameConfig, startLen?: number, initialLevel = 1) {
  repository = new GameRepository(config, startLen ?? config.initialSequenceLength, initialLevel);
  return repository;
}
