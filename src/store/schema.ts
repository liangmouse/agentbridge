export const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  source_agent TEXT NOT NULL,
  source_id TEXT NOT NULL,
  project_path TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  git_branch TEXT,
  started_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  message_count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(source_agent, source_id)
);

CREATE INDEX IF NOT EXISTS idx_conversations_project ON conversations(project_path);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  raw_content TEXT,
  model TEXT,
  timestamp INTEGER NOT NULL,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);

CREATE TABLE IF NOT EXISTS tool_calls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id TEXT NOT NULL,
  name TEXT NOT NULL,
  input TEXT NOT NULL DEFAULT '',
  output TEXT,
  FOREIGN KEY (message_id) REFERENCES messages(id)
);

CREATE INDEX IF NOT EXISTS idx_tool_calls_message ON tool_calls(message_id);

CREATE TABLE IF NOT EXISTS sync_state (
  agent_name TEXT PRIMARY KEY,
  last_sync_at INTEGER NOT NULL,
  last_file_modified TEXT
);
`
