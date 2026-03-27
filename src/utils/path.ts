import { homedir } from 'node:os'
import { resolve } from 'node:path'

/**
 * Claude Code encodes project paths by replacing '/' with '-'
 * e.g., /Users/foo/Code/project -> -Users-foo-Code-project
 */
export function encodeClaudeProjectPath(absolutePath: string): string {
  return absolutePath.replace(/\//g, '-')
}

export function decodeClaudeProjectPath(encoded: string): string {
  // The encoded path starts with '-' which maps to the leading '/'
  return encoded.replace(/-/g, '/')
}

export function getClaudeProjectsDir(): string {
  return resolve(homedir(), '.claude', 'projects')
}

export function getClaudeHistoryPath(): string {
  return resolve(homedir(), '.claude', 'history.jsonl')
}

export function getOpenCodeDbPath(): string {
  return resolve(homedir(), '.local', 'share', 'opencode', 'opencode.db')
}

export function getCodexDir(): string {
  return resolve(homedir(), '.codex')
}

export function getCodexSessionIndexPath(): string {
  return resolve(getCodexDir(), 'session_index.jsonl')
}

export function getCodexArchivedSessionsDir(): string {
  return resolve(getCodexDir(), 'archived_sessions')
}

export function getAgentBridgeDir(projectPath: string): string {
  return resolve(projectPath, '.agentbridge')
}

export function getAgentBridgeDbPath(projectPath: string): string {
  return resolve(getAgentBridgeDir(projectPath), 'store.db')
}
