import type Database from 'better-sqlite3'
import type { AgentAdapter } from '../adapters/types.js'
import type { AgentName } from '../models/unified.js'
import { upsertConversation, upsertMessage, updateSyncState } from '../store/conversations.js'
import { eventBus } from './event-bus.js'

export interface SyncResult {
  agent: AgentName
  conversationssynced: number
  messagessynced: number
}

export async function syncAgent(
  db: Database.Database,
  adapter: AgentAdapter,
  projectPath?: string,
): Promise<SyncResult> {
  let conversationssynced = 0
  let messagessynced = 0

  for await (const conv of adapter.readConversations(projectPath)) {
    upsertConversation(db, conv)
    conversationssynced++

    // Sync messages
    for await (const msg of adapter.readMessages(conv.sourceId)) {
      upsertMessage(db, msg)
      messagessynced++
    }
  }

  updateSyncState(db, adapter.name)

  return {
    agent: adapter.name,
    conversationssynced: conversationssynced,
    messagessynced: messagessynced,
  }
}

export async function syncAll(
  db: Database.Database,
  adapters: AgentAdapter[],
  projectPath?: string,
): Promise<SyncResult[]> {
  const results: SyncResult[] = []

  for (const adapter of adapters) {
    if (!(await adapter.detect())) continue

    try {
      const result = await syncAgent(db, adapter, projectPath)
      results.push(result)
      console.log(
        `[Sync] ${adapter.name}: ${result.conversationssynced} conversations, ${result.messagessynced} messages`,
      )
    } catch (err) {
      console.error(`[Sync] Error syncing ${adapter.name}:`, err)
    }
  }

  return results
}

/**
 * Handle a conversation update event by syncing the specific conversation
 * and emitting to the event bus for distribution.
 */
export async function handleConversationUpdate(
  db: Database.Database,
  adapter: AgentAdapter,
  conversationId: string,
): Promise<void> {
  // Extract sourceId from conversationId (remove prefix like 'cc-', 'oc-', 'cx-')
  const sourceId = conversationId.replace(/^(cc|oc|cx)-/, '')

  // Re-read the updated conversation
  for await (const conv of adapter.readConversations()) {
    if (conv.sourceId === sourceId) {
      upsertConversation(db, conv)

      for await (const msg of adapter.readMessages(sourceId)) {
        upsertMessage(db, msg)
      }

      // Emit event for distributor to pick up
      await eventBus.emit({
        type: 'conversation:updated',
        sourceAgent: adapter.name,
        conversationId: conv.id,
        projectPath: conv.projectPath,
        timestamp: Date.now(),
      })

      break
    }
  }
}
