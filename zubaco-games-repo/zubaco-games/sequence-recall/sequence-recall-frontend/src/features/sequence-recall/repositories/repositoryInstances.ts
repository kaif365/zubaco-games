import { GameConfigProvider } from '@/features/sequence-recall/repositories/GameConfigProvider';
import { TutorialRepository } from '@/features/sequence-recall/repositories/TutorialRepository';

export const gameConfigProvider = new GameConfigProvider();
export const tutorialRepository = new TutorialRepository();
