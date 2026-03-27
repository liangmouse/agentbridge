import { describe, it, expect } from 'vitest'
import { resolve } from 'node:path'
import { readJsonlSync } from '../../src/utils/jsonl.js'

const FIXTURE = resolve(new URL('.', import.meta.url).pathname, '../fixtures/claude-session.jsonl')

interface ClaudeEntry {
  uuid: string
  parentUuid: string | null
  type: string
  message?: { role: string; content: unknown; model?: string }
  timestamp: string
  sessionId: string
  cwd?: string
  gitBranch?: string
}

describe('Claude Code JSONL fixture parsing', () => {
  it('reads all entries from fixture', async () => {
    const entries = await readJsonlSync<ClaudeEntry>(FIXTURE)
    expect(entries).toHaveLength(3)
  })

  it('first entry is a user message', async () => {
    const entries = await readJsonlSync<ClaudeEntry>(FIXTURE)
    const first = entries[0]
    expect(first.type).toBe('user')
    expect(first.message?.role).toBe('user')
    expect(first.sessionId).toBe('test-session-1')
    expect(first.gitBranch).toBe('main')
    expect(first.cwd).toBe('/Users/test/myproject')
  })

  it('second entry is an assistant message with tool_use', async () => {
    const entries = await readJsonlSync<ClaudeEntry>(FIXTURE)
    const second = entries[1]
    expect(second.type).toBe('assistant')
    expect(second.message?.role).toBe('assistant')
    expect(second.message?.model).toBe('claude-sonnet-4-6')
    const content = second.message?.content as Array<{ type: string }>
    expect(Array.isArray(content)).toBe(true)
    expect(content.some((b) => b.type === 'tool_use')).toBe(true)
  })

  it('entries have valid timestamps', async () => {
    const entries = await readJsonlSync<ClaudeEntry>(FIXTURE)
    for (const entry of entries) {
      const ts = new Date(entry.timestamp).getTime()
      expect(ts).toBeGreaterThan(0)
      expect(isNaN(ts)).toBe(false)
    }
  })

  it('parentUuid chain is consistent', async () => {
    const entries = await readJsonlSync<ClaudeEntry>(FIXTURE)
    expect(entries[0].parentUuid).toBeNull()
    expect(entries[1].parentUuid).toBe(entries[0].uuid)
    expect(entries[2].parentUuid).toBe(entries[1].uuid)
  })
})
