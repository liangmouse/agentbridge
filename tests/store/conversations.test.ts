import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, rmSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { tmpdir } from 'node:os'
import Database from 'better-sqlite3'
import { getDb, closeDb } from '../../src/store/db.js'
import {
  upsertConversation,
  upsertMessage,
  getConversation,
  getAllConversations,
  getConversationsByProject,
  getMessages,
  conversationExists,
  updateSyncState,
  getSyncState,
} from '../../src/store/conversations.js'
import type { UnifiedConversation, UnifiedMessage } from '../../src/models/unified.js'

const TMP_DIR = resolve(tmpdir(), 'agentbridge-test-store')
const DB_PATH = resolve(TMP_DIR, 'test.db')

const sampleConv: UnifiedConversation = {
  id: 'cc-session-1',
  sourceAgent: 'claude-code',
  sourceId: 'session-1',
  projectPath: '/Users/test/project',
  title: 'Fix the login bug',
  gitBranch: 'main',
  startedAt: 1700000000000,
  updatedAt: 1700000100000,
  messageCount: 3,
}

const sampleMsg: UnifiedMessage = {
  id: 'msg-1',
  conversationId: 'cc-session-1',
  role: 'user',
  content: 'Fix the login bug',
  timestamp: 1700000000000,
}

let db: Database.Database

beforeEach(() => {
  if (!existsSync(TMP_DIR)) mkdirSync(TMP_DIR, { recursive: true })
  db = getDb(DB_PATH)
})

afterEach(() => {
  closeDb()
  try { rmSync(TMP_DIR, { recursive: true }) } catch {}
})

describe('upsertConversation', () => {
  it('inserts a new conversation', () => {
    upsertConversation(db, sampleConv)
    const conv = getConversation(db, sampleConv.id)
    expect(conv).not.toBeNull()
    expect(conv!.title).toBe('Fix the login bug')
    expect(conv!.sourceAgent).toBe('claude-code')
  })

  it('updates existing conversation on conflict', () => {
    upsertConversation(db, sampleConv)
    upsertConversation(db, { ...sampleConv, title: 'Updated title', messageCount: 10 })
    const conv = getConversation(db, sampleConv.id)
    expect(conv!.title).toBe('Updated title')
    expect(conv!.messageCount).toBe(10)
  })
})

describe('getConversationsByProject', () => {
  it('returns only conversations for the given project', () => {
    upsertConversation(db, sampleConv)
    upsertConversation(db, { ...sampleConv, id: 'oc-session-2', sourceAgent: 'opencode', sourceId: 'session-2', projectPath: '/other/project' })

    const results = getConversationsByProject(db, '/Users/test/project')
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('cc-session-1')
  })
})

describe('getAllConversations', () => {
  it('returns all conversations ordered by updatedAt desc', () => {
    upsertConversation(db, sampleConv)
    upsertConversation(db, { ...sampleConv, id: 'oc-session-2', sourceAgent: 'opencode', sourceId: 'session-2', updatedAt: 1700000200000 })

    const all = getAllConversations(db)
    expect(all).toHaveLength(2)
    expect(all[0].updatedAt).toBeGreaterThan(all[1].updatedAt)
  })
})

describe('upsertMessage / getMessages', () => {
  it('inserts and retrieves messages', () => {
    upsertConversation(db, sampleConv)
    upsertMessage(db, sampleMsg)
    upsertMessage(db, { ...sampleMsg, id: 'msg-2', role: 'assistant', content: 'Fixed!', timestamp: 1700000010000 })

    const messages = getMessages(db, 'cc-session-1')
    expect(messages).toHaveLength(2)
    expect(messages[0].role).toBe('user')
    expect(messages[1].role).toBe('assistant')
  })

  it('stores and retrieves tool calls', () => {
    upsertConversation(db, sampleConv)
    upsertMessage(db, {
      ...sampleMsg,
      id: 'msg-tool',
      toolCalls: [{ name: 'Read', input: '{"file_path":"/src/index.ts"}', output: 'content...' }],
    })

    const messages = getMessages(db, 'cc-session-1')
    expect(messages[0].toolCalls).toHaveLength(1)
    expect(messages[0].toolCalls![0].name).toBe('Read')
  })
})

describe('conversationExists', () => {
  it('returns true when conversation exists', () => {
    upsertConversation(db, sampleConv)
    expect(conversationExists(db, 'claude-code', 'session-1')).toBe(true)
  })

  it('returns false when conversation does not exist', () => {
    expect(conversationExists(db, 'claude-code', 'non-existent')).toBe(false)
  })
})

describe('syncState', () => {
  it('saves and retrieves sync state', () => {
    updateSyncState(db, 'claude-code', '/some/file.jsonl')
    const state = getSyncState(db, 'claude-code')
    expect(state).not.toBeNull()
    expect(state!.lastFileModified).toBe('/some/file.jsonl')
    expect(state!.lastSyncAt).toBeGreaterThan(0)
  })

  it('returns null for agent with no sync state', () => {
    expect(getSyncState(db, 'nonexistent-agent')).toBeNull()
  })
})
