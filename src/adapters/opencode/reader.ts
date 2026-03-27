import Database from 'better-sqlite3'
import { existsSync } from 'node:fs'
import type { UnifiedConversation, UnifiedMessage } from '../../models/unified.js'
import { getOpenCodeDbPath } from '../../utils/path.js'

interface OpenCodeSession {
  id: string
  project_id: string
  directory: string
  title: string
  time_created: number
  time_updated: number
}

interface OpenCodeMessage {
  id: string
  session_id: string
  data: string // JSON
  time_created: number
}

interface OpenCodePart {
  id: string
  message_id: string
  data: string // JSON
  time_created: number
}

interface OpenCodeMessageData {
  role: string
  modelID?: string
  providerID?: string
  mode?: string
  path?: { cwd?: string; root?: string }
  cost?: number
  tokens?: Record<string, unknown>
  time?: { created?: number; completed?: number }
}

interface OpenCodePartData {
  type: string // 'text' | 'reasoning' | 'tool-call' | 'step-finish' | etc.
  text?: string
  toolName?: string
  args?: Record<string, unknown>
  result?: string
}

export async function* readOpenCodeConversations(projectPath?: string): AsyncGenerator<UnifiedConversation> {
  const dbPath = getOpenCodeDbPath()
  if (!existsSync(dbPath)) return

  const db = new Database(dbPath, { readonly: true })

  try {
    let sessions: OpenCodeSession[]
    if (projectPath) {
      sessions = db.prepare(`
        SELECT s.* FROM session s
        WHERE s.directory = ?
        ORDER BY s.time_updated DESC
      `).all(projectPath) as OpenCodeSession[]
    } else {
      sessions = db.prepare(`
        SELECT * FROM session ORDER BY time_updated DESC
      `).all() as OpenCodeSession[]
    }

    for (const session of sessions) {
      const msgCount = db.prepare(
        'SELECT COUNT(*) as cnt FROM message WHERE session_id = ?',
      ).get(session.id) as { cnt: number }

      if (msgCount.cnt === 0) continue

      yield {
        id: `oc-${session.id}`,
        sourceAgent: 'opencode',
        sourceId: session.id,
        projectPath: session.directory,
        title: session.title || `Session ${session.id.slice(0, 8)}`,
        startedAt: session.time_created,
        updatedAt: session.time_updated,
        messageCount: msgCount.cnt,
      }
    }
  } finally {
    db.close()
  }
}

export async function* readOpenCodeMessages(sourceId: string): AsyncGenerator<UnifiedMessage> {
  const dbPath = getOpenCodeDbPath()
  if (!existsSync(dbPath)) return

  const db = new Database(dbPath, { readonly: true })

  try {
    const messages = db.prepare(`
      SELECT * FROM message WHERE session_id = ? ORDER BY time_created ASC
    `).all(sourceId) as OpenCodeMessage[]

    for (const msg of messages) {
      let msgData: OpenCodeMessageData
      try {
        msgData = JSON.parse(msg.data)
      } catch {
        continue
      }

      // Get parts for this message
      const parts = db.prepare(`
        SELECT * FROM part WHERE message_id = ? ORDER BY time_created ASC
      `).all(msg.id) as OpenCodePart[]

      const textParts: string[] = []
      const toolCalls: { name: string; input: string; output?: string }[] = []

      for (const part of parts) {
        let partData: OpenCodePartData
        try {
          partData = JSON.parse(part.data)
        } catch {
          continue
        }

        if (partData.type === 'text' && partData.text) {
          textParts.push(partData.text)
        } else if (partData.type === 'tool-call' && partData.toolName) {
          toolCalls.push({
            name: partData.toolName,
            input: partData.args ? JSON.stringify(partData.args).slice(0, 500) : '',
            output: partData.result?.slice(0, 500),
          })
        }
      }

      yield {
        id: msg.id,
        conversationId: `oc-${sourceId}`,
        role: msgData.role as 'user' | 'assistant',
        content: textParts.join('\n'),
        rawContent: msg.data,
        model: msgData.modelID,
        timestamp: msg.time_created,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      }
    }
  } finally {
    db.close()
  }
}
