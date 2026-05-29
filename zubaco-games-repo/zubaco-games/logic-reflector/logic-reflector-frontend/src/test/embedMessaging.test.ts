import { describe, expect, it } from 'vitest'
import { isEmbeddedWindow, postParentMessage, sendReadySignal } from '@/lib/embed/messaging'

describe('embed messaging', () => {
  it('returns false in non-iframe test environment', () => {
    expect(isEmbeddedWindow()).toBe(false)
  })

  it('safely no-ops when not embedded', () => {
    postParentMessage({ type: 'GAME_EMBED_SCORE_UPDATE', payload: { score: 1, level: 1, lives: 3 } })
    sendReadySignal()
    expect(true).toBe(true)
  })
})
