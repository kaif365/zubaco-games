import type { ParentOutboundMessage } from '@/types/embed'

/**
 * Detects whether the app is running inside an iframe.
 *
 * @returns {boolean} True if the current window is embedded in a parent frame.
 */
export function isEmbeddedWindow(): boolean {
  try {
    return window.self !== window.top
  } catch {
    return true
  }
}

/**
 * Posts a typed message to the parent window when running inside an iframe.
 *
 * @param {ParentOutboundMessage} message - The message to send to the parent frame.
 */
export function postParentMessage(message: ParentOutboundMessage): void {
  if (!isEmbeddedWindow()) return
  window.parent.postMessage(message, '*')
}

/**
 * Sends the GAME_EMBED_READY signal to the parent frame to indicate the game has loaded.
 */
export function sendReadySignal(): void {
  postParentMessage({ type: 'GAME_EMBED_READY', payload: { version: '1.0.0' } })
}
