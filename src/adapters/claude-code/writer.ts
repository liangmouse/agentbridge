import { existsSync, mkdirSync } from 'node:fs'
import { writeFile, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { UnifiedConversation, UnifiedMessage } from '../../models/unified.js'
import { encodeClaudeProjectPath, getClaudeProjectsDir } from '../../utils/path.js'
import { markWrite } from '../../utils/anti-loop.js'

interface ClaudeSessionsIndex {
  version: number
  entries: Array<{
    sessionId: string
    title: string
    createdAt: string
    updatedAt: string
  }>
  originalPath?: string
}

export async function writeClaudeConversation(
  conversation: UnifiedConversation,
  messages: UnifiedMessage[],
): Promise<void> {
  const projectsDir = getClaudeProjectsDir()
  const encodedPath = encodeClaudeProjectPath(conversation.projectPath)
  const projectDir = resolve(projectsDir, encodedPath)

  if (!existsSync(projectDir)) {
    mkdirSync(projectDir, { recursive: true })
  }

  // Generate a new session ID for the target
  const newSessionId = randomUUID()
  const sessionFile = resolve(projectDir, `${newSessionId}.jsonl`)

  // Convert messages to Claude Code JSONL format
  const lines: string[] = []
  let prevUuid: string | null = null

  for (const msg of messages) {
    const uuid = randomUUID()
    const entry = {
      parentUuid: prevUuid,
      isSidechain: false,
      type: msg.role === 'user' ? 'user' : 'assistant',
      message: {
        role: msg.role,
        content: buildClaudeContent(msg),
        ...(msg.model ? { model: msg.model } : {}),
      },
      uuid,
      timestamp: new Date(msg.timestamp).toISOString(),
      userType: 'external',
      entrypoint: 'cli',
      cwd: conversation.projectPath,
      sessionId: newSessionId,
      version: '2.1.81',
      ...(conversation.gitBranch ? { gitBranch: conversation.gitBranch } : {}),
    }
    lines.push(JSON.stringify(entry))
    prevUuid = uuid
  }

  markWrite(sessionFile)
  await writeFile(sessionFile, lines.join('\n') + '\n', 'utf-8')

  // Update sessions-index.json
  await updateSessionsIndex(projectDir, newSessionId, conversation)
}

function buildClaudeContent(msg: UnifiedMessage): string | Array<{ type: string; text?: string; name?: string; input?: unknown; id?: string }> {
  if (!msg.toolCalls?.length) {
    return msg.content
  }

  // If there are tool calls, build content blocks
  const blocks: Array<{ type: string; text?: string; name?: string; input?: unknown; id?: string }> = []

  if (msg.content) {
    blocks.push({ type: 'text', text: msg.content })
  }

  for (const tc of msg.toolCalls) {
    blocks.push({
      type: 'tool_use',
      id: `toolu_${randomUUID().replace(/-/g, '').slice(0, 24)}`,
      name: tc.name,
      input: safeParseJson(tc.input),
    })
  }

  return blocks.length === 1 && blocks[0].type === 'text' ? (blocks[0].text ?? '') : blocks
}

async function updateSessionsIndex(
  projectDir: string,
  sessionId: string,
  conv: UnifiedConversation,
): Promise<void> {
  const indexPath = resolve(projectDir, 'sessions-index.json')
  let index: ClaudeSessionsIndex = { version: 1, entries: [] }

  if (existsSync(indexPath)) {
    try {
      const raw = await readFile(indexPath, 'utf-8')
      index = JSON.parse(raw)
    } catch {
      // reset if corrupt
    }
  }

  index.entries.push({
    sessionId,
    title: conv.title,
    createdAt: new Date(conv.startedAt).toISOString(),
    updatedAt: new Date(conv.updatedAt).toISOString(),
  })

  markWrite(indexPath)
  await writeFile(indexPath, JSON.stringify(index, null, 2), 'utf-8')
}

function safeParseJson(str: string): unknown {
  try {
    return JSON.parse(str)
  } catch {
    return { text: str }
  }
}
