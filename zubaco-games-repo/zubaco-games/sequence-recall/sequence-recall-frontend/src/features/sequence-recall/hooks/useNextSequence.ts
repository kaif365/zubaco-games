import { useMutation } from '@tanstack/react-query';

import type { NextSequenceRequest } from '@app-types/api.types';

import { gameApi } from '../api/game.api';

// Called in the background while the current sequence is playing (pre-fetch buffer).
// useMutation is correct here: it's a POST triggered at specific game moments,
// not a data dependency of a component lifecycle.
/**
 * Hook for next sequence.
 *
 * @returns {Override<MutationObserverResult<NextSequenceResponse, Error, NextSequenceRequest, unknown>, { mutate: UseMutateFunction<NextSequenceResponse, Error, NextSequenceRequest, unknown>; }> & { mutateAsync: UseMutateAsyncFunction<NextSequenceResponse, Error, NextSequenceRequest, unknown>; }} The result of useNextSequence.
 */
export function useNextSequence() {
  return useMutation({
    mutationFn: (body: NextSequenceRequest) => gameApi.nextSequence(body),
  });
}
