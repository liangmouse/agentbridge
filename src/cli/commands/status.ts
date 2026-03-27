import { Command } from 'commander'
import { isDaemonRunning, getDaemonPid } from '../../daemon/index.js'
import { getAllAdapters } from '../../adapters/registry.js'
import { getDb } from '../../store/db.js'
import { getAgentBridgeDbPath } from '../../utils/path.js'
import { getSyncState } from '../../store/conversations.js'

export const statusCommand = new Command('status')
  .description('Show AgentBridge status and detected agents')
  .option('--project <path>', 'Project path', process.cwd())
  .action(async (options) => {
    // Daemon status
    const running = isDaemonRunning()
    const pid = getDaemonPid()
    console.log(`Daemon: ${running ? `running (PID: ${pid})` : 'stopped'}`)
    console.log()

    // Agent detection
    console.log('Agents:')
    const adapters = getAllAdapters()
    for (const adapter of adapters) {
      const detected = await adapter.detect()
      const status = detected ? 'detected' : 'not found'
      console.log(`  ${adapter.name}: ${status}`)

      if (detected) {
        // Show last sync time if available
        try {
          const dbPath = getAgentBridgeDbPath(options.project)
          const db = getDb(dbPath)
          const syncState = getSyncState(db, adapter.name)
          if (syncState) {
            console.log(`    Last sync: ${new Date(syncState.lastSyncAt).toLocaleString()}`)
          } else {
            console.log('    Last sync: never')
          }
          db.close()
        } catch {
          console.log('    Last sync: unknown')
        }
      }
    }
  })
