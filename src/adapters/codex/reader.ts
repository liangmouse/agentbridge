import { readdir, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve, basename } from 'node:path'
import type { UnifiedConversation, UnifiedMessage } from '../../models/unified.js'
import { readJsonl, readJsonlSync } from '../../utils/jsonl.js'
import { getCodexSessionIndexPath, getCodexArchivedSessionsDir } from '../../utils/path.js'

interface CodexSessionIndexEntry {
  id: string
  thread_name: string
  updated_at: string
}

interface CodexArchiveEntry {
  timestamp: string
  type: string // 'session_meta' | 'response_item' | 'event_msg' | 'turn_context' | 'user_input'
  payload: Record<string, unknown>
}

interface CodexSessionMeta {
  id: string
  timestamp: string
  cwd: string
  originator?: string
  cli_version?: string
  source?: string
  model_provider?: string
}

interface CodexResponseItem {
  role: string // 'user' | 'assistant' | 'developer'
  content?: Array<{ type: string; text?: string }>
  id?: string
}

export async function* readCodexConversations(projectPath?: string): AsyncGenerator<UnifiedConversation> {
  const indexPath = getCodexSessionIndexPath()
  if (!existsSync(indexPath)) return

  const entries = await readJsonlSync<CodexSessionIndexEntry>(indexPath)
  const archivedDir = getCodexArchivedSessionsDir()

  for (const entry of entries) {
    // Try to find the archived session file to get cwd
    const archiveFile = await findArchivedSessionFile(archivedDir, entry.id)

    let cwd = ''
    let startedAt = new Date(entry.updated_at).getTime()

    if (archiveFile) {
      const meta = await extractSessionMeta(archiveFile)
      if (meta) {
        cwd = meta.cwd
        startedAt = new Date(meta.timestamp).getTime()
      }
    }

    if (projectPath && cwd && cwd !== projectPath) continue

    // Count messages from archive if available
    let messageCount = 0
    if (archiveFile) {
      for await (const line of readJsonl<CodexArchiveEntry>(archiveFile)) {
        if (line.type === 'response_item') messageCount++
      }
    }

    yield {
      id: `cx-${entry.id}`,
      sourceAgent: 'codex',
      sourceId: entry.id,
      projectPath: cwd || 'unknown',
      title: entry.thread_name || `Codex Session ${entry.id.slice(0, 8)}`,
      startedAt,
      updatedAt: new Date(entry.updated_at).getTime(),
      messageCount: messageCount || 1,
    }
  }
}

export async function* readCodexMessages(sourceId: string): AsyncGenerator<UnifiedMessage> {
  const archivedDir = getCodexArchivedSessionsDir()
  const archiveFile = await findArchivedSessionFile(archivedDir, sourceId)
  if (!archiveFile) return

  let conversationId = `cx-${sourceId}`
  let msgIndex = 0

  for await (const entry of readJsonl<CodexArchiveEntry>(archiveFile)) {
    if (entry.type !== 'response_item') continue

    const item = entry.payload as unknown as CodexResponseItem
    if (!item.role) continue

    // Skip 'developer' role (system prompts)
    if (item.role === 'developer') continue

    const content = extractCodexTextContent(item)
    if (!content) continue

    yield {
      id: `${sourceId}-msg-${msgIndex++}`,
      conversationId,
      role: item.role as 'user' | 'assistant',
      content,
      rawContent: JSON.stringify(entry),
      timestamp: new Date(entry.timestamp).getTime(),
    }
  }
}

async function findArchivedSessionFile(archivedDir: string, sessionId: string): Promise<string | null> {
  if (!existsSync(archivedDir)) return null

  const files = await readdir(archivedDir)
  // Archive files contain the session ID in their name
  const match = files.find((f) => f.includes(sessionId))
  return match ? resolve(archivedDir, match) : null
}

async function extractSessionMeta(filePath: string): Promise<CodexSessionMeta | null> {
  for await (const entry of readJsonl<CodexArchiveEntry>(filePath)) {
    if (entry.type === 'session_meta') {
      return entry.payload as unknown as CodexSessionMeta
    }
  }
  return null
}

function extractCodexTextContent(item: CodexResponseItem): string {
  if (!item.content) return ''

  const parts: string[] = []
  for (const block of item.content) {
    if (block.type === 'input_text' || block.type === 'output_text') {
      if (block.text) parts.push(block.text)
    }
  }
  return parts.join('\n')
}
