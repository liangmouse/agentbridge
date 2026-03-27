import { existsSync } from 'node:fs'
import Database from 'better-sqlite3'
import type { ConversationUpdatedEvent } from '../../models/unified.js'
import { getOpenCodeDbPath } from '../../utils/path.js'

/**
 * OpenCode uses SQLite, so we poll for changes rather than watching files.
 * We track the max time_updated from sessions and detect new/updated sessions.
 */
export function watchOpenCode(callback: (event: ConversationUpdatedEvent) => void): () => void {
  const dbPath = getOpenCodeDbPath()
  if (!existsSync(dbPath)) return () => {}

  let lastChecked = Date.now()
  const POLL_INTERVAL_MS = 3000

  const interval = setInterval(() => {
    try {
      const db = new Database(dbPath, { readonly: true })
      const updatedSessions = db.prepare(`
        SELECT id, directory, time_updated FROM session
        WHERE time_updated > ?
        ORDER BY time_updated ASC
      `).all(lastChecked) as Array<{ id: string; directory: string; time_updated: number }>

      for (const session of updatedSessions) {
        callback({
          type: 'conversation:updated',
          sourceAgent: 'opencode',
          conversationId: `oc-${session.id}`,
          projectPath: session.directory,
          timestamp: session.time_updated,
        })
        lastChecked = Math.max(lastChecked, session.time_updated)
      }

      db.close()
    } catch {
      // DB might be locked, skip this cycle
    }
  }, POLL_INTERVAL_MS)

  return () => clearInterval(interval)
}
