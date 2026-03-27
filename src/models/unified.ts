export type AgentName = 'claude-code' | 'opencode' | 'codex'

export interface UnifiedConversation {
  id: string
  sourceAgent: AgentName
  sourceId: string
  projectPath: string
  title: string
  gitBranch?: string
  startedAt: number
  updatedAt: number
  messageCount: number
}

export interface UnifiedMessage {
  id: string
  conversationId: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  rawContent?: string
  model?: string
  timestamp: number
  toolCalls?: UnifiedToolCall[]
}

export interface UnifiedToolCall {
  name: string
  input: string
  output?: string
}

export interface ConversationUpdatedEvent {
  type: 'conversation:updated'
  sourceAgent: AgentName
  conversationId: string
  projectPath: string
  timestamp: number
}

export interface AgentConfig {
  enabled: boolean
  syncDirection: 'read' | 'write' | 'both'
}

export interface ProjectConfig {
  agents: Record<AgentName, AgentConfig>
}
