import { describe, it, expect, beforeEach, vi } from 'vitest'

// Re-import fresh module each test to reset state
describe('anti-loop', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('marks a file as own write and detects it', async () => {
    const { markWrite, isOwnWrite } = await import('../../src/utils/anti-loop.js')
    markWrite('/some/path/file.jsonl')
    expect(isOwnWrite('/some/path/file.jsonl')).toBe(true)
  })

  it('returns false for unmarked files', async () => {
    const { isOwnWrite } = await import('../../src/utils/anti-loop.js')
    expect(isOwnWrite('/never/marked.jsonl')).toBe(false)
  })

  it('clears mark after TTL', async () => {
    const { markWrite, isOwnWrite } = await import('../../src/utils/anti-loop.js')
    markWrite('/ttl/test.jsonl')
    expect(isOwnWrite('/ttl/test.jsonl')).toBe(true)
    vi.advanceTimersByTime(6000)
    expect(isOwnWrite('/ttl/test.jsonl')).toBe(false)
  })
})
