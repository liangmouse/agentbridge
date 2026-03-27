# AgentBridge

跨 AI 编程助手对话同步工具，通过双向原生格式转换实现 Claude Code / OpenCode / Codex 间的对话共享。

## 项目概览

**核心思想**：本机上所有 AI coding agent 的对话历史通过统一中间格式同步，各 agent 成为同一份"记忆"的不同入口。

**架构**：Daemon（发布订阅）+ CLI（管理入口）
- Watcher 检测 Agent 文件变更 → EventBus → DistributorService 写入所有授权 Agent 的原生格式

## 技术栈

- **Language**: TypeScript (ESM, Node.js 20+)
- **Package manager**: pnpm
- **Build**: tsup
- **Test**: vitest
- **DB**: better-sqlite3 (SQLite)
- **File watching**: chokidar

## 项目结构

```
src/
  adapters/         # 各 Agent 的双向 Adapter（fromNative + toNative + watcher）
    claude-code/    # reader.ts / writer.ts / watcher.ts / index.ts
    opencode/
    codex/
    types.ts        # AgentAdapter 接口
    registry.ts     # 适配器注册表
  store/            # SQLite 统一存储
    schema.ts / db.ts / conversations.ts
  services/         # 业务逻辑
    event-bus.ts / sync.ts / distributor.ts / timeline.ts
  daemon/           # 后台进程管理
    index.ts / watcher-manager.ts
  cli/              # CLI 命令
    index.ts / commands/
  models/unified.ts # 统一数据模型
  utils/            # jsonl.ts / path.ts / anti-loop.ts
```

## 关键本地路径

| Agent | 存储位置 |
|-------|---------|
| Claude Code | `~/.claude/projects/<ENCODED_PATH>/<SESSION-ID>.jsonl` |
| OpenCode | `~/.local/share/opencode/opencode.db` (SQLite) |
| Codex | `~/.codex/session_index.jsonl` + `~/.codex/archived_sessions/*.jsonl` |
| AgentBridge DB | `<project>/.agentbridge/store.db` |

## 开发命令

```bash
pnpm build          # 构建
pnpm dev            # watch 模式构建
pnpm test           # 运行测试

# 测试 CLI
node dist/cli/index.js status
node dist/cli/index.js sync
node dist/cli/index.js timeline
node dist/cli/index.js list
node dist/cli/index.js show <conversation-id>
```

## 设计约束

- **不使用 CLAUDE.md / AGENTS.md 存会话记忆**——这些文件是项目配置，直接写入各 Agent 原生存储
- **防循环写入**：`src/utils/anti-loop.ts` 标记自身写入，Watcher 过滤自触发事件
- **只追加新会话**，不修改已有会话，保证 Agent 原有数据安全
- 统一格式与 OpenCode/Codex 开源格式高度一致，便于扩展新 Adapter
