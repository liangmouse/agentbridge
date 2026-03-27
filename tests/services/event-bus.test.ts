import { describe, it, expect, vi } from 'vitest'
import { eventBus } from '../../src/services/event-bus.js'
import type { ConversationUpdatedEvent } from '../../src/models/unified.js'

const sampleEvent: ConversationUpdatedEvent = {
  type: 'conversation:updated',
  sourceAgent: 'claude-code',
  conversationId: 'cc-test-123',
  projectPath: '/Users/test/project',
  timestamp: Date.now(),
}

describe('EventBus', () => {
  it('calls registered handler when event is emitted', async () => {
    const handler = vi.fn()
    const off = eventBus.on(handler)
    await eventBus.emit(sampleEvent)
    expect(handler).toHaveBeenCalledWith(sampleEvent)
    off()
  })

  it('calls multiple handlers', async () => {
    const h1 = vi.fn()
    const h2 = vi.fn()
    const off1 = eventBus.on(h1)
    const off2 = eventBus.on(h2)
    await eventBus.emit(sampleEvent)
    expect(h1).toHaveBeenCalledTimes(1)
    expect(h2).toHaveBeenCalledTimes(1)
    off1()
    off2()
  })

  it('unsubscribes handler when off() is called', async () => {
    const handler = vi.fn()
    const off = eventBus.on(handler)
    off()
    await eventBus.emit(sampleEvent)
    expect(handler).not.toHaveBeenCalled()
  })

  it('does not throw if a handler throws', async () => {
    const bad = vi.fn().mockRejectedValue(new Error('handler error'))
    const good = vi.fn()
    const off1 = eventBus.on(bad)
    const off2 = eventBus.on(good)
    await expect(eventBus.emit(sampleEvent)).resolves.not.toThrow()
    expect(good).toHaveBeenCalled()
    off1()
    off2()
  })
})
