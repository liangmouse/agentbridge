/**
 * Anti-loop mechanism to prevent infinite write cycles between agents.
 * When AgentBridge writes to an agent's storage, it marks the write
 * so the watcher can skip self-triggered events.
 */

const recentWrites = new Set<string>()
const WRITE_TTL_MS = 5000

export function markWrite(filePath: string): void {
  recentWrites.add(filePath)
  setTimeout(() => recentWrites.delete(filePath), WRITE_TTL_MS)
}

export function isOwnWrite(filePath: string): boolean {
  return recentWrites.has(filePath)
}
