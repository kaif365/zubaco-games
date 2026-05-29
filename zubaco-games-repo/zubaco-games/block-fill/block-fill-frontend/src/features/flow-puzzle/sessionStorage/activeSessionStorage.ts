import { secureGetItem, secureSetItem, secureRemoveItem } from '@/utils/secureStorage';

export const ACTIVE_SESSION_KEY = 'block-fill-active-session-id';

function canUseStorage() {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

export function getActiveSessionId(): string | null {
  if (!canUseStorage()) {
    return null;
  }
  return secureGetItem(ACTIVE_SESSION_KEY);
}

export function setActiveSessionId(sessionId: string) {
  if (!canUseStorage()) {
    return;
  }
  secureSetItem(ACTIVE_SESSION_KEY, sessionId);
}

export function clearActiveSessionId() {
  if (!canUseStorage()) {
    return;
  }
  secureRemoveItem(ACTIVE_SESSION_KEY);
}
