import { readdir, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve, basename } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { UnifiedConversation, UnifiedMessage } from '../../models/unified.js'
import { readJsonl } from '../../utils/jsonl.js'
import { getClaudeProjectsDir, decodeClaudeProjectPath } from '../../utils/path.js'

/** Raw Claude Code JSONL entry */
interface ClaudeEntry {
  uuid: string
  parentUuid: string | null
  isSidechain?: boolean
  type: string // 'user' | 'assistant' | 'file-history-snapshot' | 'queue-operation' | 'progress'
  message?: {
    role: string
    content: string | ClaudeContentBlock[]
    model?: string
  }
  timestamp: string
  sessionId: string
  cwd?: string
  gitBranch?: string
  version?: string
  userType?: string
  entrypoint?: string
  requestId?: string
}

interface ClaudeContentBlock {
  type: string // 'text' | 'tool_use' | 'tool_result' | 'thinking'
  text?: string
  name?: string
  input?: Record<string, unknown>
  content?: string | ClaudeContentBlock[]
  id?: string
}

export async function* readClaudeConversations(projectPath?: string): AsyncGenerator<UnifiedConversation> {
  const projectsDir = getClaudeProjectsDir()
  if (!existsSync(projectsDir)) return

  const dirs = await readdir(projectsDir)

  for (const dir of dirs) {
    const decodedPath = decodeClaudeProjectPath(dir)
    if (projectPath && decodedPath !== projectPath) continue

    const dirPath = resolve(projectsDir, dir)
    const dirStat = await stat(dirPath).catch(() => null)
    if (!dirStat?.isDirectory()) continue

    const files = await readdir(dirPath)
    const jsonlFiles = files.filter((f) => f.endsWith('.jsonl'))

    for (const file of jsonlFiles) {
      const sessionId = basename(file, '.jsonl')
      const filePath = resolve(dirPath, file)

      let title = ''
      let startedAt = Infinity
      let updatedAt = 0
      let messageCount = 0
      let gitBranch: string | undefined
      let cwd: string | undefined

      for await (const entry of readJsonl<ClaudeEntry>(filePath)) {
        if (entry.type !== 'user' && entry.type !== 'assistant') continue

        const ts = new Date(entry.timestamp).getTime()
        if (ts < startedAt) startedAt = ts
        if (ts > updatedAt) updatedAt = ts
        messageCount++

        if (!gitBranch && entry.gitBranch) gitBranch = entry.gitBranch
        if (!cwd && entry.cwd) cwd = entry.cwd

        // Use first user message as title
        if (!title && entry.type === 'user' && entry.message) {
          title = extractTextContent(entry.message.content).slice(0, 100)
        }
      }

      if (messageCount === 0) continue

      yield {
        id: `cc-${sessionId}`,
        sourceAgent: 'claude-code',
        sourceId: sessionId,
        projectPath: cwd || decodedPath,
        title: title || `Session ${sessionId.slice(0, 8)}`,
        gitBranch,
        startedAt: startedAt === Infinity ? Date.now() : startedAt,
        updatedAt,
        messageCount,
      }
    }
  }
}

export async function* readClaudeMessages(sourceId: string): AsyncGenerator<UnifiedMessage> {
  const projectsDir = getClaudeProjectsDir()
  if (!existsSync(projectsDir)) return

  // Find the session file across all project directories
  const dirs = await readdir(projectsDir)
  let targetFile: string | null = null

  for (const dir of dirs) {
    const filePath = resolve(projectsDir, dir, `${sourceId}.jsonl`)
    if (existsSync(filePath)) {
      targetFile = filePath
      break
    }
  }

  if (!targetFile) return

  for await (const entry of readJsonl<ClaudeEntry>(targetFile)) {
    if (entry.type !== 'user' && entry.type !== 'assistant') continue
    if (!entry.message) continue

    const content = extractTextContent(entry.message.content)
    const toolCalls = extractToolCalls(entry.message.content)

    yield {
      id: entry.uuid,
      conversationId: `cc-${sourceId}`,
      role: entry.message.role as 'user' | 'assistant',
      content,
      rawContent: JSON.stringify(entry),
      model: entry.message.model,
      timestamp: new Date(entry.timestamp).getTime(),
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    }
  }
}

function extractTextContent(content: string | ClaudeContentBlock[]): string {
  if (typeof content === 'string') return content

  const parts: string[] = []
  for (const block of content) {
    if (block.type === 'text' && block.text) {
      parts.push(block.text)
    }
  }
  return parts.join('\n')
}

function extractToolCalls(content: string | ClaudeContentBlock[]): { name: string; input: string; output?: string }[] {
  if (typeof content === 'string') return []

  const calls: { name: string; input: string; output?: string }[] = []
  for (const block of content) {
    if (block.type === 'tool_use' && block.name) {
      calls.push({
        name: block.name,
        input: block.input ? JSON.stringify(block.input).slice(0, 500) : '',
      })
    }
  }
  return calls
}
