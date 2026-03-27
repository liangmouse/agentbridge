import type Database from 'better-sqlite3'
import type { AgentAdapter } from '../adapters/types.js'
import type { ConversationUpdatedEvent } from '../models/unified.js'
import { getConversation, getMessages } from '../store/conversations.js'

/**
 * DistributorService listens for conversation:updated events and
 * writes the updated conversation to all other authorized agents.
 */
export class DistributorService {
  constructor(
    private db: Database.Database,
    private adapters: AgentAdapter[],
  ) {}

  async handleEvent(event: ConversationUpdatedEvent): Promise<void> {
    const conversation = getConversation(this.db, event.conversationId)
    if (!conversation) {
      console.error(`[Distributor] Conversation not found: ${event.conversationId}`)
      return
    }

    const messages = getMessages(this.db, event.conversationId)
    if (messages.length === 0) return

    // Distribute to all agents except the source
    const targetAdapters = this.adapters.filter(
      (a) => a.name !== event.sourceAgent,
    )

    for (const adapter of targetAdapters) {
      if (!(await adapter.detect())) continue

      try {
        await adapter.writeConversation(conversation, messages)
        console.log(
          `[Distributor] Wrote conversation ${event.conversationId} to ${adapter.name}`,
        )
      } catch (err) {
        console.error(
          `[Distributor] Failed to write to ${adapter.name}:`,
          err,
        )
      }
    }
  }
}
