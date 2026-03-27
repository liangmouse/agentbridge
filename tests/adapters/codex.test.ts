import { describe, it, expect } from 'vitest'
import { resolve } from 'node:path'
import { readJsonlSync } from '../../src/utils/jsonl.js'

const FIXTURE = resolve(new URL('.', import.meta.url).pathname, '../fixtures/codex-session.jsonl')

interface CodexEntry {
  timestamp: string
  type: string
  payload: Record<string, unknown>
}

describe('Codex JSONL fixture parsing', () => {
  it('reads all entries from fixture', async () => {
    const entries = await readJsonlSync<CodexEntry>(FIXTURE)
    expect(entries).toHaveLength(3)
  })

  it('first entry is session_meta', async () => {
    const entries = await readJsonlSync<CodexEntry>(FIXTURE)
    const meta = entries[0]
    expect(meta.type).toBe('session_meta')
    expect(meta.payload.id).toBe('codex-session-1')
    expect(meta.payload.cwd).toBe('/Users/test/myproject')
    expect(meta.payload.model_provider).toBe('openai')
  })

  it('response_item entries have role and content', async () => {
    const entries = await readJsonlSync<CodexEntry>(FIXTURE)
    const items = entries.filter((e) => e.type === 'response_item')
    expect(items).toHaveLength(2)
    expect(items[0].payload.role).toBe('user')
    expect(items[1].payload.role).toBe('assistant')
  })

  it('user response_item has input_text content', async () => {
    const entries = await readJsonlSync<CodexEntry>(FIXTURE)
    const userItem = entries.find((e) => e.type === 'response_item' && e.payload.role === 'user')
    const content = userItem?.payload.content as Array<{ type: string; text?: string }>
    expect(content[0].type).toBe('input_text')
    expect(content[0].text).toBe('Fix the bug please')
  })

  it('assistant response_item has output_text content', async () => {
    const entries = await readJsonlSync<CodexEntry>(FIXTURE)
    const assistantItem = entries.find((e) => e.type === 'response_item' && e.payload.role === 'assistant')
    const content = assistantItem?.payload.content as Array<{ type: string; text?: string }>
    expect(content[0].type).toBe('output_text')
    expect(content[0].text).toContain('fixed')
  })
})
