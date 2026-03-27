import { Command } from 'commander'
import { getDb } from '../../store/db.js'
import { getAgentBridgeDbPath } from '../../utils/path.js'
import { getTimeline } from '../../services/timeline.js'

export const timelineCommand = new Command('timeline')
  .description('Show a cross-agent conversation timeline for the current project')
  .option('--project <path>', 'Project path', process.cwd())
  .action((options) => {
    const dbPath = getAgentBridgeDbPath(options.project)
    const db = getDb(dbPath)

    const entries = getTimeline(db, options.project)

    if (entries.length === 0) {
      console.log('No conversations found for this project. Run "agentbridge sync" first.')
      db.close()
      return
    }

    console.log(`Timeline for ${options.project}:\n`)

    for (const entry of entries) {
      const { conversation: conv, formattedTime } = entry
      const agentTag = `[${conv.sourceAgent}]`.padEnd(14)
      console.log(`  ${formattedTime}  ${agentTag} ${conv.title} (${conv.messageCount} msgs)`)
    }

    db.close()
  })
