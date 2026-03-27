import { Command } from 'commander'
import { getDb } from '../../store/db.js'
import { getAgentBridgeDbPath } from '../../utils/path.js'
import { getConversation, getMessages } from '../../store/conversations.js'

export const showCommand = new Command('show')
  .description('Show conversation details and messages')
  .argument('<id>', 'Conversation ID (e.g., cc-abc123, oc-ses_xxx, cx-019c...)')
  .option('--project <path>', 'Project path for the store', process.cwd())
  .action((id, options) => {
    const dbPath = getAgentBridgeDbPath(options.project)
    const db = getDb(dbPath)

    const conv = getConversation(db, id)
    if (!conv) {
      console.log(`Conversation not found: ${id}`)
      db.close()
      return
    }

    console.log(`=== ${conv.title} ===`)
    console.log(`Agent: ${conv.sourceAgent}`)
    console.log(`Project: ${conv.projectPath}`)
    console.log(`Branch: ${conv.gitBranch || 'N/A'}`)
    console.log(`Started: ${new Date(conv.startedAt).toLocaleString()}`)
    console.log(`Updated: ${new Date(conv.updatedAt).toLocaleString()}`)
    console.log(`Messages: ${conv.messageCount}`)
    console.log()

    const messages = getMessages(db, id)
    for (const msg of messages) {
      const time = new Date(msg.timestamp).toLocaleTimeString()
      const model = msg.model ? ` [${msg.model}]` : ''
      const role = msg.role.toUpperCase()

      console.log(`--- ${role} ${time}${model} ---`)
      console.log(msg.content.slice(0, 500))
      if (msg.content.length > 500) console.log('  ... (truncated)')

      if (msg.toolCalls?.length) {
        for (const tc of msg.toolCalls) {
          console.log(`  [tool: ${tc.name}]`)
        }
      }
      console.log()
    }

    db.close()
  })
