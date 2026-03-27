import type Database from 'better-sqlite3'
import type { AgentAdapter } from '../adapters/types.js'
import type { ConversationUpdatedEvent } from '../models/unified.js'
import { eventBus } from '../services/event-bus.js'
import { DistributorService } from '../services/distributor.js'
import { handleConversationUpdate } from '../services/sync.js'
import { getAdapter } from '../adapters/registry.js'

export class WatcherManager {
  private stopFunctions: Array<() => void> = []
  private distributor: DistributorService

  constructor(
    private db: Database.Database,
    private adapters: AgentAdapter[],
  ) {
    this.distributor = new DistributorService(db, adapters)

    // Register distributor as event bus subscriber
    eventBus.on((event) => this.distributor.handleEvent(event))
  }

  async startAll(): Promise<void> {
    for (const adapter of this.adapters) {
      if (!(await adapter.detect())) {
        console.log(`[WatcherManager] ${adapter.name} not detected, skipping`)
        continue
      }

      const stop = adapter.watch((event: ConversationUpdatedEvent) => {
        console.log(`[WatcherManager] ${event.sourceAgent} updated: ${event.conversationId}`)

        const sourceAdapter = getAdapter(event.sourceAgent)
        if (sourceAdapter) {
          handleConversationUpdate(this.db, sourceAdapter, event.conversationId).catch((err) => {
            console.error(`[WatcherManager] Error handling update:`, err)
          })
        }
      })

      this.stopFunctions.push(stop)
      console.log(`[WatcherManager] Watching ${adapter.name}`)
    }
  }

  stopAll(): void {
    for (const stop of this.stopFunctions) {
      stop()
    }
    this.stopFunctions = []
    console.log('[WatcherManager] All watchers stopped')
  }
}
