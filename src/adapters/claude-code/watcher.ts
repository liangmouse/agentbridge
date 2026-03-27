import { watch as chokidarWatch } from 'chokidar'
import { basename, dirname } from 'node:path'
import type { ConversationUpdatedEvent } from '../../models/unified.js'
import { getClaudeProjectsDir, decodeClaudeProjectPath } from '../../utils/path.js'
import { isOwnWrite } from '../../utils/anti-loop.js'

export function watchClaude(callback: (event: ConversationUpdatedEvent) => void): () => void {
  const projectsDir = getClaudeProjectsDir()
  const watcher = chokidarWatch(`${projectsDir}/**/*.jsonl`, {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 1000, pollInterval: 200 },
  })

  watcher.on('change', (filePath) => {
    if (isOwnWrite(filePath)) return

    const sessionId = basename(filePath, '.jsonl')
    const projectDirName = basename(dirname(filePath))
    const projectPath = decodeClaudeProjectPath(projectDirName)

    callback({
      type: 'conversation:updated',
      sourceAgent: 'claude-code',
      conversationId: `cc-${sessionId}`,
      projectPath,
      timestamp: Date.now(),
    })
  })

  watcher.on('add', (filePath) => {
    if (isOwnWrite(filePath)) return
    if (!filePath.endsWith('.jsonl')) return

    const sessionId = basename(filePath, '.jsonl')
    const projectDirName = basename(dirname(filePath))
    const projectPath = decodeClaudeProjectPath(projectDirName)

    callback({
      type: 'conversation:updated',
      sourceAgent: 'claude-code',
      conversationId: `cc-${sessionId}`,
      projectPath,
      timestamp: Date.now(),
    })
  })

  return () => watcher.close()
}
