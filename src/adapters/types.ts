import type { AgentName, ConversationUpdatedEvent, UnifiedConversation, UnifiedMessage } from '../models/unified.js'

export interface AgentAdapter {
  name: AgentName
  detect(): Promise<boolean>
  getStoragePaths(): string[]
  readConversations(projectPath?: string): AsyncGenerator<UnifiedConversation>
  readMessages(sourceId: string): AsyncGenerator<UnifiedMessage>
  writeConversation(conversation: UnifiedConversation, messages: UnifiedMessage[]): Promise<void>
  watch(callback: (event: ConversationUpdatedEvent) => void): () => void
}
