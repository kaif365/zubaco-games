export interface UserContextValue {
  readonly token: string | null;
  readonly isTokenReady: boolean;
  readonly syncTokenFromStorage: () => Promise<void>;
  readonly rebootstrapAuth: () => Promise<void>;
}
