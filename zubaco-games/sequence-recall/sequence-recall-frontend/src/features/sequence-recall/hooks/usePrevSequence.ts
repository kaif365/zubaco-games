import { useMutation } from '@tanstack/react-query';

import type { NextSequenceRequest } from '@/types/api.types';

import { gameApi } from '../api/game.api';

/**
 * Hook for prev sequence.
 *
 * @returns {Override<MutationObserverResult<NextSequenceResponse, Error, NextSequenceRequest, unknown>, { mutate: UseMutateFunction<NextSequenceResponse, Error, NextSequenceRequest, unknown>; }> & { mutateAsync: UseMutateAsyncFunction<NextSequenceResponse, Error, NextSequenceRequest, unknown>; }} The result of usePrevSequence.
 */
export function usePrevSequence() {
  return useMutation({
    mutationFn: (body: NextSequenceRequest) => gameApi.prevSequence(body),
  });
}
