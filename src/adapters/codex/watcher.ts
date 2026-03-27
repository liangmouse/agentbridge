import { watch as chokidarWatch } from 'chokidar'
import { basename } from 'node:path'
import type { ConversationUpdatedEvent } from '../../models/unified.js'
import { getCodexArchivedSessionsDir, getCodexDir } from '../../utils/path.js'
import { isOwnWrite } from '../../utils/anti-loop.js'

export function watchCodex(callback: (event: ConversationUpdatedEvent) => void): () => void {
  const watchPaths = [
    `${getCodexArchivedSessionsDir()}/*.jsonl`,
    `${getCodexDir()}/session_index.jsonl`,
  ]

  const watcher = chokidarWatch(watchPaths, {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 1000, pollInterval: 200 },
  })

  const handleChange = (filePath: string) => {
    if (isOwnWrite(filePath)) return

    // Extract session ID from filename: rollout-<timestamp>-<sessionId>.jsonl
    const fileName = basename(filePath, '.jsonl')
    const parts = fileName.split('-')
    // Session ID is the last UUID-like segment
    const sessionId = parts.slice(-5).join('-') // UUIDs have 5 segments

    callback({
      type: 'conversation:updated',
      sourceAgent: 'codex',
      conversationId: `cx-${sessionId}`,
      projectPath: '', // Will be resolved during sync
      timestamp: Date.now(),
    })
  }

  watcher.on('change', handleChange)
  watcher.on('add', handleChange)

  return () => watcher.close()
}
