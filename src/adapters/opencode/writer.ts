import Database from 'better-sqlite3'
import { existsSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import type { UnifiedConversation, UnifiedMessage } from '../../models/unified.js'
import { getOpenCodeDbPath } from '../../utils/path.js'

export async function writeOpenCodeConversation(
  conversation: UnifiedConversation,
  messages: UnifiedMessage[],
): Promise<void> {
  const dbPath = getOpenCodeDbPath()
  if (!existsSync(dbPath)) return

  const db = new Database(dbPath)

  try {
    db.pragma('foreign_keys = ON')

    const newSessionId = `ses_${randomUUID().replace(/-/g, '').slice(0, 24)}`

    // Find or create project
    let projectId = db.prepare(
      'SELECT id FROM project WHERE name = ?',
    ).get(conversation.projectPath) as { id: string } | undefined

    if (!projectId) {
      const pid = randomUUID()
      db.prepare(
        'INSERT INTO project (id, name) VALUES (?, ?)',
      ).run(pid, conversation.projectPath)
      projectId = { id: pid }
    }

    // Insert session
    db.prepare(`
      INSERT INTO session (id, project_id, directory, title, time_created, time_updated)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      newSessionId,
      projectId.id,
      conversation.projectPath,
      conversation.title,
      conversation.startedAt,
      conversation.updatedAt,
    )

    // Insert messages and parts
    let prevMsgId: string | null = null
    for (const msg of messages) {
      const msgId = `msg_${randomUUID().replace(/-/g, '').slice(0, 24)}`

      const msgData = {
        role: msg.role,
        time: { created: msg.timestamp, completed: msg.timestamp },
        parentID: prevMsgId,
        modelID: msg.model || 'unknown',
        providerID: 'agentbridge',
        mode: 'build',
        agent: 'build',
        path: { cwd: conversation.projectPath, root: conversation.projectPath },
        cost: 0,
        tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
        finish: 'stop',
      }

      db.prepare(`
        INSERT INTO message (id, session_id, data, time_created, time_updated)
        VALUES (?, ?, ?, ?, ?)
      `).run(msgId, newSessionId, JSON.stringify(msgData), msg.timestamp, msg.timestamp)

      // Insert text part
      if (msg.content) {
        const partId = `prt_${randomUUID().replace(/-/g, '').slice(0, 24)}`
        const partData = { type: 'text', text: msg.content }
        db.prepare(`
          INSERT INTO part (id, message_id, session_id, data, time_created, time_updated)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(partId, msgId, newSessionId, JSON.stringify(partData), msg.timestamp, msg.timestamp)
      }

      // Insert tool call parts
      if (msg.toolCalls) {
        for (const tc of msg.toolCalls) {
          const partId = `prt_${randomUUID().replace(/-/g, '').slice(0, 24)}`
          const partData = {
            type: 'tool-call',
            toolName: tc.name,
            args: safeParseJson(tc.input),
            result: tc.output,
          }
          db.prepare(`
            INSERT INTO part (id, message_id, session_id, data, time_created, time_updated)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(partId, msgId, newSessionId, JSON.stringify(partData), msg.timestamp, msg.timestamp)
        }
      }

      prevMsgId = msgId
    }
  } finally {
    db.close()
  }
}

function safeParseJson(str: string): unknown {
  try {
    return JSON.parse(str)
  } catch {
    return { text: str }
  }
}
