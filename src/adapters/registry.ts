import type { AgentAdapter } from './types.js'
import type { AgentName } from '../models/unified.js'
import { ClaudeCodeAdapter } from './claude-code/index.js'
import { OpenCodeAdapter } from './opencode/index.js'
import { CodexAdapter } from './codex/index.js'

const adapters: Map<AgentName, AgentAdapter> = new Map()

export function registerDefaultAdapters(): void {
  adapters.set('claude-code', new ClaudeCodeAdapter())
  adapters.set('opencode', new OpenCodeAdapter())
  adapters.set('codex', new CodexAdapter())
}

export function getAdapter(name: AgentName): AgentAdapter | undefined {
  return adapters.get(name)
}

export function getAllAdapters(): AgentAdapter[] {
  return Array.from(adapters.values())
}

export async function getAvailableAdapters(): Promise<AgentAdapter[]> {
  const available: AgentAdapter[] = []
  for (const adapter of adapters.values()) {
    if (await adapter.detect()) {
      available.push(adapter)
    }
  }
  return available
}
