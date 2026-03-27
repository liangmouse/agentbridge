import type { ConversationUpdatedEvent } from '../models/unified.js'

type EventHandler = (event: ConversationUpdatedEvent) => void | Promise<void>

class EventBus {
  private handlers: EventHandler[] = []

  on(handler: EventHandler): () => void {
    this.handlers.push(handler)
    return () => {
      this.handlers = this.handlers.filter((h) => h !== handler)
    }
  }

  async emit(event: ConversationUpdatedEvent): Promise<void> {
    for (const handler of this.handlers) {
      try {
        await handler(event)
      } catch (err) {
        console.error(`[EventBus] Handler error:`, err)
      }
    }
  }
}

export const eventBus = new EventBus()
