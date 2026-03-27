import { existsSync } from 'node:fs'
import type { AgentAdapter } from '../types.js'
import type { ConversationUpdatedEvent, UnifiedConversation, UnifiedMessage } from '../../models/unified.js'
import { getClaudeProjectsDir } from '../../utils/path.js'
import { readClaudeConversations, readClaudeMessages } from './reader.js'
import { writeClaudeConversation } from './writer.js'
import { watchClaude } from './watcher.js'

export class ClaudeCodeAdapter implements AgentAdapter {
  name = 'claude-code' as const

  async detect(): Promise<boolean> {
    return existsSync(getClaudeProjectsDir())
  }

  getStoragePaths(): string[] {
    return [getClaudeProjectsDir()]
  }

  async *readConversations(projectPath?: string): AsyncGenerator<UnifiedConversation> {
    yield* readClaudeConversations(projectPath)
  }

  async *readMessages(sourceId: string): AsyncGenerator<UnifiedMessage> {
    yield* readClaudeMessages(sourceId)
  }

  async writeConversation(conversation: UnifiedConversation, messages: UnifiedMessage[]): Promise<void> {
    await writeClaudeConversation(conversation, messages)
  }

  watch(callback: (event: ConversationUpdatedEvent) => void): () => void {
    return watchClaude(callback)
  }
}
