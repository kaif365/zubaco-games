import type { ParentOutboundMessage } from '@/types/embed';
import { appConfig } from '@app/config/appConfig';

/**
 * Resolve parent origin.
 *
 * @returns {string | null} The result of resolveParentOrigin.
 */
function resolveParentOrigin(): string | null {
  if (appConfig.embed.parentOrigin) return appConfig.embed.parentOrigin;

  const ancestorOriginList = window.location.ancestorOrigins;
  if (ancestorOriginList.length > 0) {
    return ancestorOriginList.item(0);
  }

  if (document.referrer) {
    try {
      return new URL(document.referrer).origin;
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Checks whether embedded window.
 *
 * @returns {boolean} The result of isEmbeddedWindow.
 */
export function isEmbeddedWindow(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

/**
 * Post parent message.
 *
 * @param {ParentReadyMessage | ParentResizeMessage | ParentScoreMessage} message - The message.
 *
 * @returns {void} No return value.
 */
export function postParentMessage(message: ParentOutboundMessage): void {
  if (!isEmbeddedWindow()) return;

  const parentOrigin = resolveParentOrigin();
  if (!parentOrigin) return;

  window.parent.postMessage(message, parentOrigin);
}

/**
 * Send ready signal.
 *
 * @returns {void} No return value.
 */
export function sendReadySignal(): void {
  postParentMessage({ type: 'SEQUENCE_RECALL_READY', payload: { version: '1.0.0' } });
}
