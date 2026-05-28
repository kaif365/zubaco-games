import { useQuery } from '@tanstack/react-query';

import { tutorialRepository } from '@/features/sequence-recall/repositories/repositoryInstances';

/**
 * Hook for tutorial data.
 *
 * @returns {DefinedQueryObserverResult<TutorialStep[], Error> | QueryObserverLoadingErrorResult<TutorialStep[], Error> | QueryObserverLoadingResult<TutorialStep[], Error> | QueryObserverPendingResult<TutorialStep[], Error> | QueryObserverPlaceholderResult<TutorialStep[], Error>} The result of useTutorialData.
 */
export function useTutorialData() {
  return useQuery({
    queryKey: ['tutorial-steps'],
    queryFn: () => tutorialRepository.getTutorialSteps(),
  });
}
