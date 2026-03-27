import { existsSync, mkdirSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { UnifiedConversation, UnifiedMessage } from '../../models/unified.js'
import { getCodexArchivedSessionsDir, getCodexSessionIndexPath } from '../../utils/path.js'
import { appendJsonl } from '../../utils/jsonl.js'
import { markWrite } from '../../utils/anti-loop.js'

export async function writeCodexConversation(
  conversation: UnifiedConversation,
  messages: UnifiedMessage[],
): Promise<void> {
  const archivedDir = getCodexArchivedSessionsDir()
  if (!existsSync(archivedDir)) {
    mkdirSync(archivedDir, { recursive: true })
  }

  const sessionId = conversation.sourceId || `agentbridge-${Date.now()}`
  const timestamp = new Date(conversation.startedAt).toISOString()
  const fileName = `rollout-${timestamp.replace(/[:.]/g, '-')}-${sessionId}.jsonl`
  const filePath = resolve(archivedDir, fileName)

  // Build session_meta entry
  const sessionMeta = {
    timestamp: new Date().toISOString(),
    type: 'session_meta',
    payload: {
      id: sessionId,
      timestamp,
      cwd: conversation.projectPath,
      originator: 'AgentBridge',
      cli_version: '0.1.0',
      source: 'agentbridge',
      model_provider: 'mixed',
    },
  }

  const lines: string[] = [JSON.stringify(sessionMeta)]

  // Convert messages to response_item entries
  for (const msg of messages) {
    const entry = {
      timestamp: new Date(msg.timestamp).toISOString(),
      type: 'response_item',
      payload: {
        role: msg.role,
        content: [
          {
            type: msg.role === 'user' ? 'input_text' : 'output_text',
            text: msg.content,
          },
        ],
        id: msg.id,
      },
    }
    lines.push(JSON.stringify(entry))
  }

  markWrite(filePath)
  await writeFile(filePath, lines.join('\n') + '\n', 'utf-8')

  // Update session_index.jsonl
  const indexPath = getCodexSessionIndexPath()
  const indexEntry = {
    id: sessionId,
    thread_name: conversation.title,
    updated_at: new Date(conversation.updatedAt).toISOString(),
  }

  markWrite(indexPath)
  await appendJsonl(indexPath, indexEntry)
}
