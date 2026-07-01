import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './RootNavigator';

// A module-level navigation ref so non-React code (push notification taps,
// deep-link handlers, the global error handler) can drive navigation.
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/** Navigate by route name once the navigator is mounted (no-op otherwise). */
export function navigate<Name extends keyof RootStackParamList>(
  name: Name,
  params?: RootStackParamList[Name],
): void {
  if (navigationRef.isReady()) {
    // @ts-expect-error — params typing is validated by the caller's generics.
    navigationRef.navigate(name, params);
  }
}
