# AgentBridge — Agent Guidelines

## Project Overview

AgentBridge syncs conversation history across AI coding agents (Claude Code, OpenCode, Codex) on the same machine. Each agent stores conversations locally in its own native format; AgentBridge reads from all of them, stores in a unified SQLite format, and writes back to each agent's native storage.

## Architecture

```
Agent A (native) → Adapter.fromNative() → Unified Store (.agentbridge/store.db)
                                                 ↓ EventBus
Agent B (native) ← Adapter.toNative()  ← DistributorService
```

## Key Conventions

### Adapter Pattern
Each agent has a directory under `src/adapters/<agent-name>/` with:
- `reader.ts` — `fromNative()`: parse agent's files → `UnifiedConversation` + `UnifiedMessage`
- `writer.ts` — `toNative()`: `UnifiedConversation` + `UnifiedMessage` → write to agent's native storage
- `watcher.ts` — detect file changes, emit `ConversationUpdatedEvent`
- `index.ts` — exports `class XxxAdapter implements AgentAdapter`

### Anti-Loop Protection
Always call `markWrite(filePath)` from `src/utils/anti-loop.ts` **before** writing to any agent's storage. The watcher will call `isOwnWrite(filePath)` to skip self-triggered events.

### ID Convention
- Claude Code conversations: `cc-<sessionId>`
- OpenCode conversations: `oc-<sessionId>`
- Codex conversations: `cx-<sessionId>`

### Native Storage Paths
Use helpers from `src/utils/path.ts`:
- `getClaudeProjectsDir()` → `~/.claude/projects/`
- `getOpenCodeDbPath()` → `~/.local/share/opencode/opencode.db`
- `getCodexSessionIndexPath()` → `~/.codex/session_index.jsonl`
- `getAgentBridgeDbPath(projectPath)` → `<project>/.agentbridge/store.db`

### Claude Code Path Encoding
Claude Code encodes project paths: `/Users/foo/project` → `-Users-foo-project`.
Use `encodeClaudeProjectPath()` / `decodeClaudeProjectPath()` from `src/utils/path.ts`.

## Important Constraints

1. **Never use CLAUDE.md / AGENTS.md to store conversation memory** — these are project config files only
2. **Never modify existing agent conversations** — only append new sessions
3. **Always mark writes with anti-loop** before writing to any agent storage
4. Conversation writes to target agents should be **idempotent** — multiple writes of the same source conversation are safe

## Adding a New Agent Adapter

1. Create `src/adapters/<name>/reader.ts` implementing `readXxxConversations()` and `readXxxMessages()`
2. Create `src/adapters/<name>/writer.ts` implementing `writeXxxConversation()`
3. Create `src/adapters/<name>/watcher.ts` watching native storage
4. Create `src/adapters/<name>/index.ts` exporting `class XxxAdapter implements AgentAdapter`
5. Register in `src/adapters/registry.ts`
