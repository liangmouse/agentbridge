import { existsSync } from 'node:fs'
import type { AgentAdapter } from '../types.js'
import type { ConversationUpdatedEvent, UnifiedConversation, UnifiedMessage } from '../../models/unified.js'
import { getCodexDir } from '../../utils/path.js'
import { readCodexConversations, readCodexMessages } from './reader.js'
import { writeCodexConversation } from './writer.js'
import { watchCodex } from './watcher.js'

export class CodexAdapter implements AgentAdapter {
  name = 'codex' as const

  async detect(): Promise<boolean> {
    return existsSync(getCodexDir())
  }

  getStoragePaths(): string[] {
    return [getCodexDir()]
  }

  async *readConversations(projectPath?: string): AsyncGenerator<UnifiedConversation> {
    yield* readCodexConversations(projectPath)
  }

  async *readMessages(sourceId: string): AsyncGenerator<UnifiedMessage> {
    yield* readCodexMessages(sourceId)
  }

  async writeConversation(conversation: UnifiedConversation, messages: UnifiedMessage[]): Promise<void> {
    await writeCodexConversation(conversation, messages)
  }

  watch(callback: (event: ConversationUpdatedEvent) => void): () => void {
    return watchCodex(callback)
  }
}
