import { describe, it, expect } from 'vitest'
import { homedir } from 'node:os'
import { resolve } from 'node:path'
import {
  encodeClaudeProjectPath,
  decodeClaudeProjectPath,
  getClaudeProjectsDir,
  getOpenCodeDbPath,
  getCodexDir,
  getAgentBridgeDir,
  getAgentBridgeDbPath,
} from '../../src/utils/path.js'

describe('encodeClaudeProjectPath / decodeClaudeProjectPath', () => {
  it('encodes path by replacing / with -', () => {
    expect(encodeClaudeProjectPath('/Users/foo/myproject')).toBe('-Users-foo-myproject')
  })

  it('decodes encoded path (no hyphens in dir names)', () => {
    // Note: decode is lossy for paths with hyphens in directory names,
    // because Claude Code uses the same char (-) for both / separator and dir hyphens.
    expect(decodeClaudeProjectPath('-Users-foo-myproject')).toBe('/Users/foo/myproject')
  })

  it('round-trips correctly for paths without hyphens in dir names', () => {
    const original = '/Users/test/Code/myapp'
    expect(decodeClaudeProjectPath(encodeClaudeProjectPath(original))).toBe(original)
  })

  it('encode is deterministic', () => {
    const path = '/Users/alice/projects/webapp'
    expect(encodeClaudeProjectPath(path)).toBe('-Users-alice-projects-webapp')
  })
})

describe('path helpers', () => {
  it('getClaudeProjectsDir returns ~/.claude/projects', () => {
    expect(getClaudeProjectsDir()).toBe(resolve(homedir(), '.claude', 'projects'))
  })

  it('getOpenCodeDbPath returns correct path', () => {
    expect(getOpenCodeDbPath()).toBe(resolve(homedir(), '.local', 'share', 'opencode', 'opencode.db'))
  })

  it('getCodexDir returns ~/.codex', () => {
    expect(getCodexDir()).toBe(resolve(homedir(), '.codex'))
  })

  it('getAgentBridgeDir returns <project>/.agentbridge', () => {
    expect(getAgentBridgeDir('/Users/test/proj')).toBe('/Users/test/proj/.agentbridge')
  })

  it('getAgentBridgeDbPath returns <project>/.agentbridge/store.db', () => {
    expect(getAgentBridgeDbPath('/Users/test/proj')).toBe('/Users/test/proj/.agentbridge/store.db')
  })
})
