import { Command } from 'commander'
import { getDb } from '../../store/db.js'
import { getAgentBridgeDbPath } from '../../utils/path.js'
import { getAllConversations, getConversationsByProject } from '../../store/conversations.js'

export const listCommand = new Command('list')
  .description('List all synced conversations')
  .option('--project <path>', 'Filter by project path')
  .option('--agent <name>', 'Filter by agent name')
  .action((options) => {
    const projectPath = options.project || process.cwd()
    const dbPath = getAgentBridgeDbPath(projectPath)
    const db = getDb(dbPath)

    let conversations = options.project
      ? getConversationsByProject(db, options.project)
      : getAllConversations(db)

    if (options.agent) {
      conversations = conversations.filter((c) => c.sourceAgent === options.agent)
    }

    if (conversations.length === 0) {
      console.log('No conversations found. Run "agentbridge sync" first.')
      db.close()
      return
    }

    console.log(`Found ${conversations.length} conversations:\n`)

    for (const conv of conversations) {
      const time = new Date(conv.updatedAt).toLocaleString()
      const branch = conv.gitBranch ? ` (${conv.gitBranch})` : ''
      console.log(`  [${conv.sourceAgent}] ${conv.id}`)
      console.log(`    "${conv.title}"`)
      console.log(`    ${time} | ${conv.messageCount} msgs${branch}`)
      console.log()
    }

    db.close()
  })
