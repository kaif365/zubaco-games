import type { ParentOutboundMessage } from '@/types/embed'

export function isEmbeddedWindow(): boolean {
  try {
    return window.self !== window.top
  } catch {
    return true
  }
}

export function postParentMessage(message: ParentOutboundMessage): void {
  if (!isEmbeddedWindow()) return
  window.parent.postMessage(message, '*')
}

export function sendReadySignal(): void {
  postParentMessage({ type: 'GAME_EMBED_READY', payload: { version: '1.0.0' } })
}
