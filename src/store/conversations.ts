import type Database from 'better-sqlite3'
import type { UnifiedConversation, UnifiedMessage, UnifiedToolCall, AgentName } from '../models/unified.js'

export function upsertConversation(db: Database.Database, conv: UnifiedConversation): void {
  db.prepare(`
    INSERT INTO conversations (id, source_agent, source_id, project_path, title, git_branch, started_at, updated_at, message_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(source_agent, source_id) DO UPDATE SET
      title = excluded.title,
      git_branch = excluded.git_branch,
      updated_at = excluded.updated_at,
      message_count = excluded.message_count
  `).run(
    conv.id, conv.sourceAgent, conv.sourceId, conv.projectPath,
    conv.title, conv.gitBranch ?? null, conv.startedAt, conv.updatedAt, conv.messageCount,
  )
}

export function upsertMessage(db: Database.Database, msg: UnifiedMessage): void {
  db.prepare(`
    INSERT OR REPLACE INTO messages (id, conversation_id, role, content, raw_content, model, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(msg.id, msg.conversationId, msg.role, msg.content, msg.rawContent ?? null, msg.model ?? null, msg.timestamp)

  if (msg.toolCalls?.length) {
    const insertTool = db.prepare(`
      INSERT INTO tool_calls (message_id, name, input, output)
      VALUES (?, ?, ?, ?)
    `)
    // Clear existing tool calls for this message
    db.prepare('DELETE FROM tool_calls WHERE message_id = ?').run(msg.id)
    for (const tc of msg.toolCalls) {
      insertTool.run(msg.id, tc.name, tc.input, tc.output ?? null)
    }
  }
}

export function getConversationsByProject(db: Database.Database, projectPath: string): UnifiedConversation[] {
  const rows = db.prepare(`
    SELECT * FROM conversations WHERE project_path = ? ORDER BY updated_at DESC
  `).all(projectPath) as any[]

  return rows.map(rowToConversation)
}

export function getAllConversations(db: Database.Database): UnifiedConversation[] {
  const rows = db.prepare(`
    SELECT * FROM conversations ORDER BY updated_at DESC
  `).all() as any[]

  return rows.map(rowToConversation)
}

export function getConversation(db: Database.Database, id: string): UnifiedConversation | null {
  const row = db.prepare('SELECT * FROM conversations WHERE id = ?').get(id) as any
  return row ? rowToConversation(row) : null
}

export function getMessages(db: Database.Database, conversationId: string): UnifiedMessage[] {
  const rows = db.prepare(`
    SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC
  `).all(conversationId) as any[]

  return rows.map((row) => {
    const toolCalls = db.prepare(`
      SELECT name, input, output FROM tool_calls WHERE message_id = ?
    `).all(row.id) as UnifiedToolCall[]

    return {
      id: row.id,
      conversationId: row.conversation_id,
      role: row.role,
      content: row.content,
      rawContent: row.raw_content ?? undefined,
      model: row.model ?? undefined,
      timestamp: row.timestamp,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    }
  })
}

export function conversationExists(db: Database.Database, sourceAgent: AgentName, sourceId: string): boolean {
  const row = db.prepare('SELECT 1 FROM conversations WHERE source_agent = ? AND source_id = ?').get(sourceAgent, sourceId)
  return !!row
}

export function updateSyncState(db: Database.Database, agentName: string, lastFileModified?: string): void {
  db.prepare(`
    INSERT INTO sync_state (agent_name, last_sync_at, last_file_modified)
    VALUES (?, ?, ?)
    ON CONFLICT(agent_name) DO UPDATE SET
      last_sync_at = excluded.last_sync_at,
      last_file_modified = excluded.last_file_modified
  `).run(agentName, Date.now(), lastFileModified ?? null)
}

export function getSyncState(db: Database.Database, agentName: string): { lastSyncAt: number; lastFileModified?: string } | null {
  const row = db.prepare('SELECT last_sync_at, last_file_modified FROM sync_state WHERE agent_name = ?').get(agentName) as any
  if (!row) return null
  return { lastSyncAt: row.last_sync_at, lastFileModified: row.last_file_modified ?? undefined }
}

function rowToConversation(row: any): UnifiedConversation {
  return {
    id: row.id,
    sourceAgent: row.source_agent as AgentName,
    sourceId: row.source_id,
    projectPath: row.project_path,
    title: row.title,
    gitBranch: row.git_branch ?? undefined,
    startedAt: row.started_at,
    updatedAt: row.updated_at,
    messageCount: row.message_count,
  }
}
