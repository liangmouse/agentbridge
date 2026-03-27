import { Command } from 'commander'
import { getAvailableAdapters } from '../../adapters/registry.js'
import { getDb } from '../../store/db.js'
import { getAgentBridgeDbPath } from '../../utils/path.js'
import { syncAll } from '../../services/sync.js'

export const syncCommand = new Command('sync')
  .description('Manually sync all agent conversations into the unified store')
  .option('--project <path>', 'Project path', process.cwd())
  .action(async (options) => {
    const dbPath = getAgentBridgeDbPath(options.project)
    const db = getDb(dbPath)

    console.log('Scanning for agent conversations...\n')

    const adapters = await getAvailableAdapters()
    if (adapters.length === 0) {
      console.log('No agents detected on this machine.')
      return
    }

    const results = await syncAll(db, adapters)

    console.log('\n--- Sync Summary ---')
    let totalConv = 0
    let totalMsg = 0
    for (const r of results) {
      console.log(`  ${r.agent}: ${r.conversationssynced} conversations, ${r.messagessynced} messages`)
      totalConv += r.conversationssynced
      totalMsg += r.messagessynced
    }
    console.log(`  Total: ${totalConv} conversations, ${totalMsg} messages`)

    db.close()
  })
