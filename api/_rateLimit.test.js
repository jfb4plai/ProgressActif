import { describe, it, expect, beforeEach, vi } from 'vitest'
import { verifierQuota, _reset } from './_rateLimit.js'

beforeEach(() => { _reset() ; vi.useRealTimers() })

describe('verifierQuota', () => {
  it('autorise sous la limite et refuse au-delà', () => {
    for (let i = 0; i < 5; i++) expect(verifierQuota('1.2.3.4', 5, 1000).ok).toBe(true)
    expect(verifierQuota('1.2.3.4', 5, 1000).ok).toBe(false)
  })

  it('isole les IP', () => {
    for (let i = 0; i < 5; i++) verifierQuota('1.1.1.1', 5, 1000)
    expect(verifierQuota('2.2.2.2', 5, 1000).ok).toBe(true)
  })

  it('rouvre le quota après expiration de la fenêtre', () => {
    vi.useFakeTimers()
    for (let i = 0; i < 5; i++) verifierQuota('9.9.9.9', 5, 1000)
    expect(verifierQuota('9.9.9.9', 5, 1000).ok).toBe(false)
    vi.advanceTimersByTime(1001)
    expect(verifierQuota('9.9.9.9', 5, 1000).ok).toBe(true)
  })
})
