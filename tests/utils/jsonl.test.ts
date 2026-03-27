import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { writeFileSync, unlinkSync, mkdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { readJsonl, readJsonlSync, appendJsonl } from '../../src/utils/jsonl.js'

const TMP = resolve(tmpdir(), 'agentbridge-test-jsonl')

beforeEach(() => {
  if (!existsSync(TMP)) mkdirSync(TMP, { recursive: true })
})

afterEach(() => {
  const files = ['test.jsonl', 'append.jsonl', 'empty.jsonl', 'malformed.jsonl']
  for (const f of files) {
    try { unlinkSync(resolve(TMP, f)) } catch {}
  }
})

describe('readJsonlSync', () => {
  it('parses valid JSONL', async () => {
    const file = resolve(TMP, 'test.jsonl')
    writeFileSync(file, '{"a":1}\n{"b":2}\n')
    const results = await readJsonlSync<{ a?: number; b?: number }>(file)
    expect(results).toEqual([{ a: 1 }, { b: 2 }])
  })

  it('skips empty lines', async () => {
    const file = resolve(TMP, 'test.jsonl')
    writeFileSync(file, '{"a":1}\n\n{"b":2}\n\n')
    const results = await readJsonlSync<unknown>(file)
    expect(results).toHaveLength(2)
  })

  it('skips malformed lines without throwing', async () => {
    const file = resolve(TMP, 'malformed.jsonl')
    writeFileSync(file, '{"a":1}\nNOT_JSON\n{"b":2}\n')
    const results = await readJsonlSync<unknown>(file)
    expect(results).toHaveLength(2)
  })

  it('returns empty array for empty file', async () => {
    const file = resolve(TMP, 'empty.jsonl')
    writeFileSync(file, '')
    const results = await readJsonlSync<unknown>(file)
    expect(results).toEqual([])
  })
})

describe('readJsonl (streaming)', () => {
  it('streams valid JSONL entries', async () => {
    const file = resolve(TMP, 'test.jsonl')
    writeFileSync(file, '{"x":1}\n{"x":2}\n{"x":3}\n')
    const results: unknown[] = []
    for await (const item of readJsonl<{ x: number }>(file)) {
      results.push(item)
    }
    expect(results).toEqual([{ x: 1 }, { x: 2 }, { x: 3 }])
  })
})

describe('appendJsonl', () => {
  it('appends a JSON line to file', async () => {
    const file = resolve(TMP, 'append.jsonl')
    await appendJsonl(file, { key: 'value' })
    await appendJsonl(file, { key: 'value2' })
    const results = await readJsonlSync<{ key: string }>(file)
    expect(results).toEqual([{ key: 'value' }, { key: 'value2' }])
  })
})
