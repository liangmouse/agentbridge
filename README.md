# AgentBridge

> 跨 AI 编程助手的对话同步工具

在 Claude Code、OpenCode、Codex 之间共享会话历史，让本机所有 Agent 成为同一个"大脑"的不同入口。

## 为什么需要它

你在 Claude Code 里讨论了一个架构问题，切到 Codex 时却要从头解释背景。
你用两个账号分别跑不同的 Agent，它们互相不知道对方做了什么。
**AgentBridge 解决的就是这个问题**：无论你在哪个 Agent 里产生的对话，本机所有 Agent 都能看到，都能接力继续。

## 安装

```bash
# npm
npm install -g agentbridge

# pnpm
pnpm add -g agentbridge

# npx（无需安装，直接运行）
npx agentbridge status
```

**系统要求**：Node.js >= 20

## 快速开始

```bash
# 1. 检测本机已安装的 Agent
agentbridge status

# 2. 全量同步一次（首次使用）
agentbridge sync

# 3. 启动实时同步 Daemon（后台运行）
agentbridge start

# 4. 查看当前项目的跨 Agent 时间线
cd /your/project
agentbridge timeline
```

完成后，任意 Agent 产生新对话 → 自动同步到其他所有 Agent。

## 命令一览

| 命令 | 说明 |
|------|------|
| `agentbridge status` | 检测本机 Agent 安装情况及路径 |
| `agentbridge sync` | 全量导入所有 Agent 的历史会话 |
| `agentbridge start` | 启动后台 Daemon，实时监听并同步 |
| `agentbridge start --foreground` | 前台运行（可看实时日志） |
| `agentbridge stop` | 停止 Daemon |
| `agentbridge list` | 列出所有已同步的会话 |
| `agentbridge list --agent claude-code` | 按 Agent 过滤 |
| `agentbridge show <id>` | 查看某次会话详情 |
| `agentbridge timeline` | 当前项目的跨 Agent 时间线 |

## 支持的 Agent

| Agent | 存储格式 | 路径 |
|-------|---------|------|
| **Claude Code** | JSONL | `~/.claude/projects/<encoded-path>/<session>.jsonl` |
| **OpenCode** | SQLite | `~/.local/share/opencode/opencode.db` |
| **Codex** | JSONL | `~/.codex/session_index.jsonl` + `~/.codex/archived_sessions/` |

## 工作原理

```
Agent A 写入新对话
      ↓
  Watcher 检测文件变更
      ↓
  EventBus 广播事件
      ↓
 DistributorService
      ↓
转换为其他 Agent 的原生格式
      ↓
写入 Agent B / C 的存储
```

- **统一中间格式**：所有对话先转为 `UnifiedConversation`，再按目标 Agent 格式输出
- **防循环写入**：`anti-loop` 模块标记自身触发的写入，Watcher 自动过滤，不会无限循环
- **只追加不修改**：新会话追加写入，原有数据不受影响
- **本地 SQLite**：在项目目录下创建 `.agentbridge/store.db`，数据完全本地

## 开发

```bash
git clone https://github.com/liangmouse/agentbridge.git
cd agentbridge
pnpm install
pnpm build        # 构建
pnpm dev          # watch 模式
pnpm test         # 运行测试
```

## License

MIT
