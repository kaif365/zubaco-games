import { useMutation } from '@tanstack/react-query';

import type { ValidateRequest } from '@app-types/api.types';

import { gameApi } from '../api/game.api';

// Fire-and-forget: game flow does not wait on this response.
// Call mutate() (not mutateAsync) so errors don't surface to the UI.
/**
 * Hook for validate.
 *
 * @returns {Override<MutationObserverResult<ValidateResponse, Error, ValidateRequest, unknown>, { mutate: UseMutateFunction<ValidateResponse, Error, ValidateRequest, unknown>; }> & { mutateAsync: UseMutateAsyncFunction<ValidateResponse, Error, ValidateRequest, unknown>; }} The result of useValidate.
 */
export function useValidate() {
  return useMutation({
    mutationFn: (body: ValidateRequest) => gameApi.validate(body),
  });
}
