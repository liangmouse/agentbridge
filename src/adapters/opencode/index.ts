import { existsSync } from 'node:fs'
import type { AgentAdapter } from '../types.js'
import type { ConversationUpdatedEvent, UnifiedConversation, UnifiedMessage } from '../../models/unified.js'
import { getOpenCodeDbPath } from '../../utils/path.js'
import { readOpenCodeConversations, readOpenCodeMessages } from './reader.js'
import { writeOpenCodeConversation } from './writer.js'
import { watchOpenCode } from './watcher.js'

export class OpenCodeAdapter implements AgentAdapter {
  name = 'opencode' as const

  async detect(): Promise<boolean> {
    return existsSync(getOpenCodeDbPath())
  }

  getStoragePaths(): string[] {
    return [getOpenCodeDbPath()]
  }

  async *readConversations(projectPath?: string): AsyncGenerator<UnifiedConversation> {
    yield* readOpenCodeConversations(projectPath)
  }

  async *readMessages(sourceId: string): AsyncGenerator<UnifiedMessage> {
    yield* readOpenCodeMessages(sourceId)
  }

  async writeConversation(conversation: UnifiedConversation, messages: UnifiedMessage[]): Promise<void> {
    await writeOpenCodeConversation(conversation, messages)
  }

  watch(callback: (event: ConversationUpdatedEvent) => void): () => void {
    return watchOpenCode(callback)
  }
}
