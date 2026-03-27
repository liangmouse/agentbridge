import type Database from 'better-sqlite3'
import type { UnifiedConversation } from '../models/unified.js'

export interface TimelineEntry {
  conversation: UnifiedConversation
  formattedTime: string
}

export function getTimeline(db: Database.Database, projectPath: string): TimelineEntry[] {
  const rows = db.prepare(`
    SELECT * FROM conversations
    WHERE project_path = ?
    ORDER BY updated_at DESC
  `).all(projectPath) as any[]

  return rows.map((row) => ({
    conversation: {
      id: row.id,
      sourceAgent: row.source_agent,
      sourceId: row.source_id,
      projectPath: row.project_path,
      title: row.title,
      gitBranch: row.git_branch ?? undefined,
      startedAt: row.started_at,
      updatedAt: row.updated_at,
      messageCount: row.message_count,
    },
    formattedTime: formatTimestamp(row.updated_at),
  }))
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
